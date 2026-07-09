import {
  getModelMapping,
  createProvider,
} from "@quicklogo/ai-providers/providers";
import {
  buildLogoVariationGenerationParams,
  buildSocialMediaGenerationParams,
  buildBusinessCardGenerationParams,
  buildBrandGraphicGenerationParams,
} from "@quicklogo/ai-providers/prompt";
import type {
  AIProvider,
  GenerationParams,
} from "@quicklogo/ai-providers/types";
import { DEFAULT_BRAND_KIT_MODEL_ID } from "@quicklogo/shared";
import type { StorageProvider } from "@quicklogo/storage";
import type { Env } from "../../types";
import {
  runAssetOrNull,
  withRetryableGeneration,
} from "../../core/pipeline-helpers";

import { findReusableLogoVariationUrls } from "./reusable-url-finder";
import type { Database } from "@quicklogo/db";
import type { ValidatedBrandContext } from "@quicklogo/ai-providers/prompt";

import { createLogger } from "@quicklogo/server-telemetry";

const logger = createLogger("worker");

const LOGO_VARIATION_TIMEOUT_MS = 120000;
const ASSET_ROOT = "quick-logo/brand-kits";

/**
 * Per-section outcome. `failed`/`total` drive partial-refund accounting in the
 * pipeline: a section refunds its credits prorated by failed/total.
 */
export interface AssetSectionTally {
  failed: number;
  total: number;
}

export interface SocialMediaAsset {
  platform: string;
  type: string;
  dimensions: string;
  url: string;
}

/** URLs produced by generateSocialMediaAssets, consumed by the list builder. */
export interface SocialMediaAssetUrls {
  socialProfileUrl?: string;
  masterBannerUrl?: string;
  facebookBannerUrl?: string;
}

// Generated asset sizes. gpt-image-2 clamps to 1:1 / 3:2, so these are the real
// source dimensions (a square avatar and 3:2 banners), not each platform's
// target crop. Single source of truth for both initial generation and refinement
// so the two paths can never report divergent sizes.
const SOCIAL_PROFILE_SIZE = "1024x1024";
const SOCIAL_BANNER_SIZE = "1536x1024";

/**
 * Distinct social assets a full generation produces (profile, master banner,
 * facebook banner). Used for refund accounting when the section can't run at
 * all (e.g. no source logo) so the count isn't a magic literal in the pipeline.
 */
export const SOCIAL_MEDIA_ASSET_COUNT = 3;

const placeholder = (size: string, label: string) =>
  `https://placehold.co/${size}/000/FFF?text=${label}`;

/**
 * Builds the canonical socialMedia asset list. Each platform falls back to a
 * placeholder of the correct size when its generated URL is missing.
 */
export function buildSocialMediaAssetList(
  urls: SocialMediaAssetUrls | null,
): SocialMediaAsset[] {
  return [
    {
      platform: "Instagram",
      type: "Profile",
      dimensions: SOCIAL_PROFILE_SIZE,
      url: urls?.socialProfileUrl ?? placeholder(SOCIAL_PROFILE_SIZE, "IG"),
    },
    {
      platform: "Twitter",
      type: "Header",
      dimensions: SOCIAL_BANNER_SIZE,
      url: urls?.masterBannerUrl ?? placeholder(SOCIAL_BANNER_SIZE, "TW"),
    },
    {
      platform: "LinkedIn",
      type: "Header",
      dimensions: SOCIAL_BANNER_SIZE,
      url: urls?.masterBannerUrl ?? placeholder(SOCIAL_BANNER_SIZE, "LI"),
    },
    {
      platform: "Facebook",
      type: "Header",
      dimensions: SOCIAL_BANNER_SIZE,
      url: urls?.facebookBannerUrl ?? placeholder(SOCIAL_BANNER_SIZE, "FB"),
    },
    {
      platform: "YouTube",
      type: "Channel Art",
      dimensions: SOCIAL_BANNER_SIZE,
      url: urls?.masterBannerUrl ?? placeholder(SOCIAL_BANNER_SIZE, "YT"),
    },
  ];
}

/**
 * Generates one asset and uploads it to a deterministic, overwrite-safe path.
 * Throws on generation failure so the caller's `runAssetOrNull` records it.
 */
export async function generateAndUpload(
  provider: AIProvider,
  params: GenerationParams,
  storage: StorageProvider,
  key: string,
  signal?: AbortSignal,
): Promise<string> {
  const result = await withRetryableGeneration(provider, { ...params, signal });
  if (!result.success || !result.imageData) {
    throw new Error(result.error ?? "Asset generation failed");
  }
  const uploaded = await storage.upload(
    `${key}.${result.format ?? "png"}`,
    result.imageData,
    { overwrite: true },
  );
  return uploaded.url;
}

export async function generateLogoVariations({
  ai,
  db,
  env,
  storage,
  brandKitId,
  brandName,
  sourceLogoUrl,
  types,
}: {
  ai: Ai;
  db: Database;
  env: Env;
  storage: StorageProvider;
  brandKitId: string;
  brandName: string;
  sourceLogoUrl: string;
  types?: ("dark-mode" | "icon-only")[];
}): Promise<
  { darkModeUrl?: string; iconOnlyUrl?: string } & AssetSectionTally
> {
  const typesToGenerate = types || ["dark-mode", "icon-only"];

  const reusableUrls = await findReusableLogoVariationUrls({
    db,
    brandKitId,
    sourceLogoUrl,
  });
  if (reusableUrls) {
    logger.info(`Reused logo variations`, { brandKitId });
    // Reused → nothing failed, but report the real section size for semantic
    // correctness (refund is 0 either way since failed is 0).
    return { ...reusableUrls, failed: 0, total: typesToGenerate.length };
  }

  const mapping = getModelMapping(DEFAULT_BRAND_KIT_MODEL_ID);
  const provider = createProvider(mapping, { ai, env });

  const results: { type: string; url: string | undefined }[] = [];
  for (const type of typesToGenerate) {
    const slug = type === "dark-mode" ? "dark" : "icon";
    const url = await runAssetOrNull(
      (signal) =>
        generateAndUpload(
          provider,
          buildLogoVariationGenerationParams({
            variation: type,
            brandName,
            sourceLogoUrl,
            backendModel: mapping.backendModel,
            defaultParams: mapping.defaultParams,
          }),
          storage,
          `${ASSET_ROOT}/${brandKitId}/logo-${slug}`,
          signal,
        ),
      LOGO_VARIATION_TIMEOUT_MS,
      "asset-generator",
    );
    results.push({ type, url: url ?? undefined });
  }

  const failed = results.filter((r) => !r.url).length;

  return {
    darkModeUrl: results.find((r) => r.type === "dark-mode")?.url,
    iconOnlyUrl: results.find((r) => r.type === "icon-only")?.url,
    failed,
    total: typesToGenerate.length,
  };
}

export async function generateSocialMediaAssets({
  ai,
  env,
  storage,
  brandKitId,
  brandName,
  sourceLogoUrl,
  refinementPrompt,
  context,
  targetItemId,
}: {
  ai: Ai;
  env: Env;
  storage: StorageProvider;
  brandKitId: string;
  brandName: string;
  sourceLogoUrl: string;
  refinementPrompt?: string;
  context?: ValidatedBrandContext;
  targetItemId?: string;
}): Promise<
  {
    socialProfileUrl?: string;
    masterBannerUrl?: string;
    facebookBannerUrl?: string;
  } & AssetSectionTally
> {
  const mapping = getModelMapping(DEFAULT_BRAND_KIT_MODEL_ID);
  const provider = createProvider(mapping, { ai, env });

  let socialProfileUrl: string | undefined;
  let masterBannerUrl: string | undefined;
  let facebookBannerUrl: string | undefined;
  let failed = 0;
  let total = 0;

  const shouldGenerateProfile =
    !targetItemId || targetItemId.endsWith("-profile");
  const shouldGenerateFacebook =
    !targetItemId || targetItemId === "facebook-header";
  const shouldGenerateMaster =
    !targetItemId ||
    ["twitter-header", "linkedin-header", "youtube-channel-art"].includes(
      targetItemId,
    );

  if (shouldGenerateProfile) {
    total++;
    const url = await runAssetOrNull(
      (signal) =>
        generateAndUpload(
          provider,
          buildSocialMediaGenerationParams({
            variation: "social-profile",
            brandName,
            sourceLogoUrl,
            backendModel: mapping.backendModel,
            defaultParams: mapping.defaultParams,
            refinementPrompt,
            context,
          }),
          storage,
          `${ASSET_ROOT}/${brandKitId}/social-profile`,
          signal,
        ),
      LOGO_VARIATION_TIMEOUT_MS,
      "asset-generator",
    );
    if (url) socialProfileUrl = url;
    else failed++;
  }

  if (shouldGenerateMaster) {
    total++;
    const url = await runAssetOrNull(
      (signal) =>
        generateAndUpload(
          provider,
          buildSocialMediaGenerationParams({
            variation: "master-banner",
            brandName,
            sourceLogoUrl,
            backendModel: mapping.backendModel,
            defaultParams: mapping.defaultParams,
            refinementPrompt,
            context,
          }),
          storage,
          `${ASSET_ROOT}/${brandKitId}/social-master-banner`,
          signal,
        ),
      LOGO_VARIATION_TIMEOUT_MS,
      "asset-generator",
    );
    if (url) masterBannerUrl = url;
    else failed++;
  }

  if (shouldGenerateFacebook) {
    total++;
    const url = await runAssetOrNull(
      (signal) =>
        generateAndUpload(
          provider,
          buildSocialMediaGenerationParams({
            variation: "facebook-banner",
            brandName,
            sourceLogoUrl,
            backendModel: mapping.backendModel,
            defaultParams: mapping.defaultParams,
            refinementPrompt,
            context,
          }),
          storage,
          `${ASSET_ROOT}/${brandKitId}/social-facebook-banner`,
          signal,
        ),
      LOGO_VARIATION_TIMEOUT_MS,
      "asset-generator",
    );
    if (url) facebookBannerUrl = url;
    else failed++;
  }
  return {
    socialProfileUrl,
    masterBannerUrl,
    facebookBannerUrl,
    failed,
    total,
  };
}

export interface BrandGraphicUrls {
  backdropPostUrl?: string;
  backdropStoryUrl?: string;
}

/** All valid brand graphic target item IDs, mapped to their variation kind. */
const BRAND_GRAPHIC_VARIANTS = [
  {
    targetId: "backdrop-post",
    variation: "graphic-backdrop-post" as const,
    storageSuffix: "graphic-backdrop-post",
  },
  {
    targetId: "backdrop-story",
    variation: "graphic-backdrop-story" as const,
    storageSuffix: "graphic-backdrop-story",
  },
] as const;

/** Maps a targetId like "backdrop-post" to the URL key like "backdropPostUrl". */
function toUrlKey(targetId: string): keyof BrandGraphicUrls {
  const camel = targetId.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  return `${camel}Url` as keyof BrandGraphicUrls;
}

export async function generateBrandGraphics({
  ai,
  env,
  storage,
  brandKitId,
  brandName,
  sourceLogoUrl,
  refinementPrompt,
  context,
  targetItemId,
}: {
  ai: Ai;
  env: Env;
  storage: StorageProvider;
  brandKitId: string;
  brandName: string;
  sourceLogoUrl: string;
  refinementPrompt?: string;
  context?: ValidatedBrandContext;
  targetItemId?: string;
}): Promise<BrandGraphicUrls & AssetSectionTally> {
  const mapping = getModelMapping(DEFAULT_BRAND_KIT_MODEL_ID);
  const provider = createProvider(mapping, { ai, env });

  const urls: BrandGraphicUrls = {};
  let failed = 0;
  let total = 0;

  const variants = targetItemId
    ? BRAND_GRAPHIC_VARIANTS.filter((v) => v.targetId === targetItemId)
    : BRAND_GRAPHIC_VARIANTS;

  for (const variant of variants) {
    total++;
    const url = await runAssetOrNull(
      (signal) =>
        generateAndUpload(
          provider,
          buildBrandGraphicGenerationParams({
            variation: variant.variation,
            brandName,
            sourceLogoUrl,
            backendModel: mapping.backendModel,
            defaultParams: mapping.defaultParams,
            refinementPrompt,
            context,
          }),
          storage,
          `${ASSET_ROOT}/${brandKitId}/${variant.storageSuffix}`,
          signal,
        ),
      LOGO_VARIATION_TIMEOUT_MS,
      "asset-generator",
    );
    if (url) urls[toUrlKey(variant.targetId)] = url;
    else failed++;
  }

  return { ...urls, failed, total };
}

export async function generateBusinessCardAssets({
  ai,
  env,
  storage,
  brandKitId,
  brandName,
  sourceLogoUrl,
  refinementPrompt,
  context,
  targetItemId,
}: {
  ai: Ai;
  env: Env;
  storage: StorageProvider;
  brandKitId: string;
  brandName: string;
  sourceLogoUrl: string;
  refinementPrompt?: string;
  context?: ValidatedBrandContext;
  targetItemId?: string;
}): Promise<{ frontUrl?: string; backUrl?: string } & AssetSectionTally> {
  const mapping = getModelMapping(DEFAULT_BRAND_KIT_MODEL_ID);
  const provider = createProvider(mapping, { ai, env });

  // Leonardo-style print card look; shared by both faces.
  const cardDefaultParams = {
    ...mapping.defaultParams,
    providerOptions: {
      ...mapping.defaultParams?.providerOptions,
      styleUUID: "703d6fe5-7f1c-4a9e-8da0-5331f214d5cf",
    },
  };

  let frontUrl: string | undefined;
  let backUrl: string | undefined;
  let failed = 0;
  let total = 0;

  if (!targetItemId || targetItemId === "front") {
    total++;
    const url = await runAssetOrNull(
      (signal) =>
        generateAndUpload(
          provider,
          buildBusinessCardGenerationParams({
            variation: "front",
            brandName,
            sourceLogoUrl,
            backendModel: mapping.backendModel,
            defaultParams: cardDefaultParams,
            refinementPrompt,
            context,
          }),
          storage,
          `${ASSET_ROOT}/${brandKitId}/business-card-front`,
          signal,
        ),
      LOGO_VARIATION_TIMEOUT_MS,
      "asset-generator",
    );
    if (url) frontUrl = url;
    else failed++;
  }

  if (!targetItemId || targetItemId === "back") {
    total++;
    const url = await runAssetOrNull(
      (signal) =>
        generateAndUpload(
          provider,
          buildBusinessCardGenerationParams({
            variation: "back",
            brandName,
            sourceLogoUrl,
            backendModel: mapping.backendModel,
            defaultParams: cardDefaultParams,
            refinementPrompt,
            context,
          }),
          storage,
          `${ASSET_ROOT}/${brandKitId}/business-card-back`,
          signal,
        ),
      LOGO_VARIATION_TIMEOUT_MS,
      "asset-generator",
    );
    if (url) backUrl = url;
    else failed++;
  }
  return { frontUrl, backUrl, failed, total };
}
