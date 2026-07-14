import {
  getModelMapping,
  createProvider,
  SOCIAL_BANNER_MASTER_MODEL_MAPPING,
  SOCIAL_BANNER_REFRAME_MODEL_MAPPING,
} from "@quicklogo/ai-providers/providers";
import type { ModelMapping } from "@quicklogo/ai-providers/providers";
import {
  buildLogoVariationGenerationParams,
  buildBusinessCardGenerationParams,
  buildBrandGraphicGenerationParams,
} from "@quicklogo/ai-providers/prompt";
import type {
  AIProvider,
  GenerationParams,
} from "@quicklogo/ai-providers/types";
import { DEFAULT_BRAND_KIT_MODEL_ID } from "@quicklogo/shared";
import type { SocialMediaBrief } from "@quicklogo/shared";
import type { StorageProvider } from "@quicklogo/storage";
import type { Env } from "../../types";
import {
  runAssetOrNull,
  withRetryableGeneration,
} from "../../core/pipeline-helpers";
import { PipelineError } from "../../core/errors";
import {
  verifySocialBannerCopy,
  type VerifiedSocialCopy,
} from "./social-banner-copy";
import {
  buildSocialReframePrompt,
  buildYoutubeBannerPrompt,
  type SocialBannerPromptSpec,
} from "./social-banner-prompts";

import { findReusableLogoVariationUrls } from "./reusable-url-finder";
import type { Database } from "@quicklogo/db";
import {
  normalizeBrandContext,
  type ValidatedBrandContext,
} from "@quicklogo/ai-providers/prompt";

import { createLogger } from "@quicklogo/server-telemetry";
import { setTimeout as delay } from "node:timers/promises";
import { ensurePng } from "../image/png-transcoder";

const logger = createLogger("worker");

const LOGO_VARIATION_TIMEOUT_MS = 120000;
const SOCIAL_MEDIA_GENERATION_TIMEOUT_MS = 180000;
// Keep expensive image calls serialized and leave a small request-scoped gap
// between attempts so retries and platform reframes cannot create a burst.
const SOCIAL_PREDICTION_MIN_INTERVAL_MS = 12_500;
const ASSET_ROOT = "quick-logo/brand-kits";

const compactPromptValue = (
  value: string | undefined,
  fallback: string,
  maxLength: number,
) => (value?.trim() || fallback).slice(0, maxLength);

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
  /** YouTube master artwork used as the reference for coordinated reframes. */
  masterUrl?: string;
}

/** URLs produced by generateSocialMediaAssets, consumed by the list builder. */
export interface SocialMediaAssetUrls {
  socialProfileUrl?: string;
  masterBannerUrl?: string;
  twitterBannerUrl?: string;
  linkedinBannerUrl?: string;
  facebookBannerUrl?: string;
  youtubeBannerUrl?: string;
  approvedCopy?: VerifiedSocialCopy;
}

const SOCIAL_PROFILE_SIZE = "1024x1024";
const TWITTER_BANNER_SIZE = "1500x500"; // 3:1
const LINKEDIN_BANNER_SIZE = "1584x396"; // 4:1
// Facebook displays Page covers differently across devices. Upload the taller
// cross-device canvas and protect the centered 640x312 intersection below.
const FACEBOOK_COVER_SIZE = "820x360"; // 41:18
const YOUTUBE_ART_SIZE = "2560x1440"; // 16:9

export const SOCIAL_MEDIA_ASSET_COUNT = 5;
export const SOCIAL_MEDIA_PIPELINE_VERSION = 10;

const SOCIAL_ASSET_SPECS: readonly (SocialBannerPromptSpec & {
  targetId: string;
  outputKey:
    | "twitterBannerUrl"
    | "linkedinBannerUrl"
    | "facebookBannerUrl"
    | "youtubeBannerUrl";
  storageKey: string;
})[] = [
  {
    targetId: "twitter-header",
    platform: "twitter" as const,
    outputKey: "twitterBannerUrl" as const,
    storageKey: "social-twitter-banner",
    dimensions: TWITTER_BANNER_SIZE,
    aspectRatio: "3:1",
    renderWidth: 1536,
    renderHeight: 1024,
    safeArea:
      "compose the complete 3:1 banner inside the centered full-width band occupying the middle 50% of canvas height; everything above and below that band must be background-only, and the lower-left profile-overlay area inside the band must stay visually quiet",
  },
  {
    targetId: "linkedin-header",
    platform: "linkedin" as const,
    outputKey: "linkedinBannerUrl" as const,
    storageKey: "social-linkedin-banner",
    dimensions: LINKEDIN_BANNER_SIZE,
    aspectRatio: "4:1",
    renderWidth: 1536,
    renderHeight: 1024,
    safeArea:
      "compose the complete 4:1 banner inside the centered full-width band occupying the middle 37.5% of canvas height; everything above and below that band must be background-only, with clear space inside the band for the profile overlay",
  },
  {
    targetId: "facebook-header",
    platform: "facebook" as const,
    outputKey: "facebookBannerUrl" as const,
    storageKey: "social-facebook-banner",
    dimensions: FACEBOOK_COVER_SIZE,
    aspectRatio: "41:18",
    renderWidth: 1536,
    renderHeight: 1024,
    safeArea:
      "compose the complete 41:18 banner inside the centered full-width band occupying the middle 66% of canvas height; keep essential content within the cross-device area corresponding to 640 x 312 pixels on the 820 x 360 delivery canvas, and leave everything outside the band background-only",
  },
  {
    targetId: "youtube-channel-art",
    platform: "youtube" as const,
    outputKey: "youtubeBannerUrl" as const,
    storageKey: "social-youtube-banner",
    dimensions: YOUTUBE_ART_SIZE,
    aspectRatio: "16:9",
    renderWidth: 1536,
    renderHeight: 1024,
    safeArea:
      "compose the complete 16:9 banner inside the centered full-width band occupying the middle 84.4% of canvas height; keep all essential content inside the invisible centered mobile-safe region occupying about 60% of canvas width and 25% of total canvas height, and leave everything outside the 16:9 band background-only",
  },
] as const;

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
      dimensions: TWITTER_BANNER_SIZE,
      url: urls?.twitterBannerUrl ?? placeholder(TWITTER_BANNER_SIZE, "TW"),
      masterUrl: urls?.masterBannerUrl,
    },
    {
      platform: "LinkedIn",
      type: "Header",
      dimensions: LINKEDIN_BANNER_SIZE,
      url: urls?.linkedinBannerUrl ?? placeholder(LINKEDIN_BANNER_SIZE, "LI"),
      masterUrl: urls?.masterBannerUrl,
    },
    {
      platform: "Facebook",
      type: "Header",
      dimensions: FACEBOOK_COVER_SIZE,
      url: urls?.facebookBannerUrl ?? placeholder(FACEBOOK_COVER_SIZE, "FB"),
      masterUrl: urls?.masterBannerUrl,
    },
    {
      platform: "YouTube",
      type: "Channel Art",
      dimensions: YOUTUBE_ART_SIZE,
      url: urls?.youtubeBannerUrl ?? placeholder(YOUTUBE_ART_SIZE, "YT"),
      masterUrl: urls?.masterBannerUrl,
    },
  ];
}

interface UploadedGeneratedAsset {
  url: string;
  imageData: Uint8Array;
}

async function generateAndUploadResult(
  provider: AIProvider,
  params: GenerationParams,
  storage: StorageProvider,
  key: string,
  signal?: AbortSignal,
  pngBinding?: ImagesBinding,
): Promise<UploadedGeneratedAsset> {
  const result = await withRetryableGeneration(provider, { ...params, signal });
  if (!result.success || !result.imageData) {
    throw new Error(result.error ?? "Asset generation failed");
  }

  const imageData = pngBinding
    ? await ensurePng(pngBinding, result.imageData)
    : result.imageData;
  const extension = pngBinding ? "png" : (result.format ?? "png");
  const uploaded = await storage.upload(`${key}.${extension}`, imageData, {
    overwrite: true,
    ...(pngBinding && { contentType: "image/png" }),
  });
  return { url: uploaded.url, imageData };
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
  return (await generateAndUploadResult(provider, params, storage, key, signal))
    .url;
}

async function generateAssetWithTimeout({
  provider,
  params,
  storage,
  uploadPath,
  timeoutMs,
  label,
}: {
  provider: AIProvider;
  params: GenerationParams;
  storage: StorageProvider;
  uploadPath: string;
  timeoutMs: number;
  label: string;
}): Promise<string | undefined> {
  return runAssetOrNull(
    (signal) =>
      generateAndUpload(provider, params, storage, uploadPath, signal),
    timeoutMs,
    label,
  );
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
    const url = await generateAssetWithTimeout({
      provider,
      params: buildLogoVariationGenerationParams({
        variation: type,
        brandName,
        sourceLogoUrl,
        backendModel: mapping.backendModel,
        defaultParams: mapping.defaultParams,
      }),
      storage,
      uploadPath: `${ASSET_ROOT}/${brandKitId}/logo-${slug}`,
      timeoutMs: LOGO_VARIATION_TIMEOUT_MS,
      label: "asset-generator",
    });
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
  iconOnlyLogoUrl,
  headingFont,
  bodyFont,
  refinementPrompt,
  context,
  socialMediaBrief,
  targetItemId,
  existingTargetAssetUrl,
  existingMasterBannerUrl,
  existingApprovedCopy,
  productImageUrls,
}: {
  ai: Ai;
  env: Env;
  storage: StorageProvider;
  brandKitId: string;
  brandName: string;
  sourceLogoUrl: string;
  iconOnlyLogoUrl?: string;
  headingFont?: string;
  bodyFont?: string;
  refinementPrompt?: string;
  context?: ValidatedBrandContext;
  socialMediaBrief?: SocialMediaBrief;
  targetItemId?: string;
  existingTargetAssetUrl?: string;
  existingMasterBannerUrl?: string;
  existingApprovedCopy?: VerifiedSocialCopy;
  productImageUrls?: string[];
}): Promise<SocialMediaAssetUrls & AssetSectionTally> {
  logger.info("Starting social media kit generation", {
    brandKitId,
    pipelineVersion: SOCIAL_MEDIA_PIPELINE_VERSION,
    workflow: "gpt-image-2-master-reference-reframes",
    targetItemId: targetItemId ?? null,
  });

  const createSocialProvider = (mapping: ModelMapping): AIProvider => {
    if (mapping.provider === "replicate" && !env.REPLICATE_API_TOKEN) {
      throw new PipelineError(
        "REPLICATE_API_TOKEN is required for GPT Image 2 social assets",
        false,
      );
    }
    return createProvider(mapping, { ai, env });
  };

  // The social profile is the already-generated icon-only brand mark. It does
  // not need a creative brief, master artwork, or another image-model call.
  if (targetItemId === "instagram-profile") {
    const currentProfileUrl =
      existingTargetAssetUrl && !existingTargetAssetUrl.includes("placehold.co")
        ? existingTargetAssetUrl
        : iconOnlyLogoUrl || sourceLogoUrl;
    if (refinementPrompt?.trim()) {
      const profileMapping = SOCIAL_BANNER_REFRAME_MODEL_MAPPING;
      const profileProvider = createSocialProvider(profileMapping);
      const refinedProfileUrl = await generateAssetWithTimeout({
        provider: profileProvider,
        params: {
          ...profileMapping.defaultParams,
          backendModel: profileMapping.backendModel,
          prompt: `Refine the supplied social profile asset according to this exact request: ${compactPromptValue(refinementPrompt, "", 700)}

Preserve the recognizable approved brand mark, its proportions, and its identity unless the request explicitly asks to change one of those properties. Keep the mark centered and fully legible inside the central 70% so circular profile crops cannot clip it. Produce one clean 1:1 profile image with no mockup, extra text, social handle, watermark, border, or duplicate logo.`,
          referenceImages: [currentProfileUrl],
          canvasMode: "img2img",
          width: 1024,
          height: 1024,
          providerOptions: {
            ...(profileMapping.defaultParams.providerOptions || {}),
            quality: env.SOCIAL_BANNER_QUALITY || "low",
          },
        },
        storage,
        uploadPath: `${ASSET_ROOT}/${brandKitId}/social-profile-refined`,
        timeoutMs: SOCIAL_MEDIA_GENERATION_TIMEOUT_MS,
        label: "social-media:instagram-profile-refinement",
      });
      return {
        socialProfileUrl: refinedProfileUrl,
        failed: refinedProfileUrl ? 0 : 1,
        total: 1,
      };
    }

    return {
      socialProfileUrl: currentProfileUrl,
      failed: currentProfileUrl ? 0 : 1,
      total: 1,
    };
  }

  const brief: SocialMediaBrief = socialMediaBrief || {
    purpose: "brand-awareness",
    visualDirection: "auto",
    includeLogo: false,
    includeTagline: true,
  };
  const normalizedContext =
    context || normalizeBrandContext(brandName, { colors: [] });
  const selectedSpec = targetItemId
    ? SOCIAL_ASSET_SPECS.find((item) => item.targetId === targetItemId)
    : undefined;
  if (targetItemId && !selectedSpec) {
    throw new PipelineError(
      `Unsupported social media target: ${targetItemId}`,
      false,
    );
  }
  const usableExistingMaster =
    existingMasterBannerUrl && !existingMasterBannerUrl.includes("placehold.co")
      ? existingMasterBannerUrl
      : undefined;
  const approvedCopy =
    existingApprovedCopy &&
    typeof existingApprovedCopy.headline === "string" &&
    typeof existingApprovedCopy.callToAction === "string"
      ? {
          headline: existingApprovedCopy.headline,
          callToAction: existingApprovedCopy.callToAction,
          additionalInstructions:
            typeof existingApprovedCopy.additionalInstructions === "string"
              ? existingApprovedCopy.additionalInstructions
              : "",
        }
      : await verifySocialBannerCopy({
          ai,
          brief,
          context: normalizedContext,
          refinementPrompt: targetItemId ? undefined : refinementPrompt,
        });
  const correctedRefinementPrompt =
    targetItemId && refinementPrompt?.trim()
      ? (
          await verifySocialBannerCopy({
            ai,
            brief: {
              ...brief,
              message: undefined,
              callToAction: undefined,
              includeTagline: false,
            },
            context: {
              ...normalizedContext,
              additionalContext: undefined,
            },
            refinementPrompt,
          })
        ).additionalInstructions
      : undefined;

  const masterProvider = createSocialProvider(
    SOCIAL_BANNER_MASTER_MODEL_MAPPING,
  );
  const reframeProvider = createSocialProvider(
    SOCIAL_BANNER_REFRAME_MODEL_MAPPING,
  );
  const youtubeSpec = SOCIAL_ASSET_SPECS.find(
    (spec) => spec.platform === "youtube",
  );
  if (!youtubeSpec) {
    throw new PipelineError("YouTube banner specification is missing", false);
  }

  const fitPrompt = (prompt: string) => {
    const maxLength = 8000;
    const suffix =
      "\n\nPreserve exact approved copy and references. Return only full-bleed finished banner artwork with no frame, watermark, crop guide, padding, or blank band.";
    if (prompt.length <= maxLength) return prompt;

    // Keep both the brief/copy at the front and the hard negative constraints
    // at the end. A plain tail truncation drops the rules that prevent models
    // from printing metadata or adding device mockups.
    const tailLength = 1500;
    const separator =
      "\n\n[Long non-display context condensed; retain the approved copy and all final constraints.]\n\n";
    const headLength =
      maxLength - tailLength - separator.length - suffix.length;
    return `${prompt.slice(0, headLength).trimEnd()}${separator}${prompt.slice(-tailLength).trimStart()}${suffix}`;
  };

  let lastPredictionStartedAt = 0;
  const waitForPredictionSlot = async (signal?: AbortSignal) => {
    const remainingMs =
      lastPredictionStartedAt + SOCIAL_PREDICTION_MIN_INTERVAL_MS - Date.now();
    if (remainingMs > 0) {
      logger.info("Waiting for social banner prediction rate-limit slot", {
        brandKitId,
        waitMs: remainingMs,
      });
      if (signal) {
        await delay(remainingMs, undefined, { signal });
      } else {
        await delay(remainingMs);
      }
    }
    lastPredictionStartedAt = Date.now();
  };

  const generateBanner = async ({
    provider,
    mapping,
    spec,
    prompt,
    referenceImages,
    storageKey,
    label,
  }: {
    provider: AIProvider;
    mapping: ModelMapping;
    spec: (typeof SOCIAL_ASSET_SPECS)[number];
    prompt: string;
    referenceImages?: string[];
    storageKey: string;
    label: string;
  }) =>
    runAssetOrNull(
      async (signal) => {
        // Schedule at the provider boundary so retries are throttled too, not
        // only the first attempt for each platform.
        const rateLimitedProvider: AIProvider = {
          name: provider.name,
          generate: async (params) => {
            await waitForPredictionSlot(params.signal);
            return provider.generate(params);
          },
        };
        const defaultProviderOptions =
          mapping.defaultParams.providerOptions || {};
        return (
          await generateAndUploadResult(
            rateLimitedProvider,
            {
              ...mapping.defaultParams,
              backendModel: mapping.backendModel,
              prompt: fitPrompt(prompt),
              width: spec.renderWidth,
              height: spec.renderHeight,
              providerOptions: {
                ...defaultProviderOptions,
                quality:
                  env.SOCIAL_BANNER_QUALITY ||
                  defaultProviderOptions.quality ||
                  "low",
              },
              ...(referenceImages?.length
                ? {
                    referenceImages,
                    canvasMode: "img2img" as const,
                  }
                : { canvasMode: "text2img" as const }),
              signal,
            },
            storage,
            `${ASSET_ROOT}/${brandKitId}/${storageKey}`,
            signal,
            env.IMAGES,
          )
        ).url;
      },
      SOCIAL_MEDIA_GENERATION_TIMEOUT_MS,
      label,
    );

  let masterBannerUrl = usableExistingMaster;
  const isYoutubeRevision =
    selectedSpec?.platform === "youtube" &&
    Boolean(correctedRefinementPrompt?.trim());
  if (!targetItemId || !masterBannerUrl || isYoutubeRevision) {
    if (isYoutubeRevision && masterBannerUrl) {
      masterBannerUrl = await generateBanner({
        provider: reframeProvider,
        mapping: SOCIAL_BANNER_REFRAME_MODEL_MAPPING,
        spec: youtubeSpec,
        prompt: buildSocialReframePrompt({
          spec: youtubeSpec,
          brandName,
          context: normalizedContext,
          copy: approvedCopy,
          headingFont,
          bodyFont,
          refinementPrompt: correctedRefinementPrompt,
        }),
        referenceImages: [masterBannerUrl],
        storageKey: youtubeSpec.storageKey,
        label: "social-media:youtube:refinement",
      });
    } else {
      const productReferences = (productImageUrls || []).slice(0, 4);
      const referenceImages = [
        ...(brief.includeLogo ? [sourceLogoUrl] : []),
        ...productReferences,
      ];
      const logoFigure = brief.includeLogo ? 1 : undefined;
      const firstProductFigure = logoFigure ? 2 : 1;
      masterBannerUrl = await generateBanner({
        provider: masterProvider,
        mapping: SOCIAL_BANNER_MASTER_MODEL_MAPPING,
        spec: youtubeSpec,
        prompt: buildYoutubeBannerPrompt({
          brandName,
          context: normalizedContext,
          brief,
          copy: approvedCopy,
          headingFont,
          bodyFont,
          logoFigure,
          productFigures: productReferences.map(
            (_, index) => firstProductFigure + index,
          ),
        }),
        referenceImages,
        storageKey: youtubeSpec.storageKey,
        label: "social-media:youtube-master",
      });
    }
  }

  if (!masterBannerUrl) {
    throw new PipelineError(
      "Social media kit incomplete: YouTube master generation failed",
      true,
    );
  }

  if (selectedSpec?.platform === "youtube") {
    return {
      youtubeBannerUrl: masterBannerUrl,
      masterBannerUrl,
      approvedCopy,
      failed: 0,
      total: 1,
    };
  }

  const specsToReframe = selectedSpec
    ? [selectedSpec]
    : SOCIAL_ASSET_SPECS.filter((spec) => spec.platform !== "youtube");
  const reframeResults: {
    spec: (typeof SOCIAL_ASSET_SPECS)[number];
    url: string | undefined;
  }[] = [];
  for (const spec of specsToReframe) {
    reframeResults.push({
      spec,
      url: await generateBanner({
        provider: reframeProvider,
        mapping: SOCIAL_BANNER_REFRAME_MODEL_MAPPING,
        spec,
        prompt: buildSocialReframePrompt({
          spec,
          brandName,
          context: normalizedContext,
          copy: approvedCopy,
          headingFont,
          bodyFont,
          refinementPrompt: selectedSpec
            ? correctedRefinementPrompt
            : undefined,
        }),
        referenceImages: [masterBannerUrl],
        storageKey: spec.storageKey,
        label: `social-media:${spec.platform}:reframe`,
      }),
    });
  }

  const generated: Partial<SocialMediaAssetUrls> = targetItemId
    ? {}
    : {
        socialProfileUrl: iconOnlyLogoUrl || sourceLogoUrl,
        youtubeBannerUrl: masterBannerUrl,
      };
  for (const result of reframeResults) {
    if (result.url) generated[result.spec.outputKey] = result.url;
  }

  const failedReframes = reframeResults.filter((result) => !result.url).length;
  const failedProfile = targetItemId || generated.socialProfileUrl ? 0 : 1;
  return {
    ...generated,
    masterBannerUrl,
    approvedCopy,
    failed: failedReframes + failedProfile,
    total: targetItemId ? 1 : SOCIAL_MEDIA_ASSET_COUNT,
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
    const url = await generateAssetWithTimeout({
      provider,
      params: buildBrandGraphicGenerationParams({
        variation: variant.variation,
        brandName,
        sourceLogoUrl,
        backendModel: mapping.backendModel,
        defaultParams: mapping.defaultParams,
        refinementPrompt,
        context,
      }),
      storage,
      uploadPath: `${ASSET_ROOT}/${brandKitId}/${variant.storageSuffix}`,
      timeoutMs: LOGO_VARIATION_TIMEOUT_MS,
      label: "asset-generator",
    });
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
    const url = await generateAssetWithTimeout({
      provider,
      params: buildBusinessCardGenerationParams({
        variation: "front",
        brandName,
        sourceLogoUrl,
        backendModel: mapping.backendModel,
        defaultParams: cardDefaultParams,
        refinementPrompt,
        context,
      }),
      storage,
      uploadPath: `${ASSET_ROOT}/${brandKitId}/business-card-front`,
      timeoutMs: LOGO_VARIATION_TIMEOUT_MS,
      label: "asset-generator",
    });
    if (url) frontUrl = url;
    else failed++;
  }

  if (!targetItemId || targetItemId === "back") {
    total++;
    const url = await generateAssetWithTimeout({
      provider,
      params: buildBusinessCardGenerationParams({
        variation: "back",
        brandName,
        sourceLogoUrl,
        backendModel: mapping.backendModel,
        defaultParams: cardDefaultParams,
        refinementPrompt,
        context,
      }),
      storage,
      uploadPath: `${ASSET_ROOT}/${brandKitId}/business-card-back`,
      timeoutMs: LOGO_VARIATION_TIMEOUT_MS,
      label: "asset-generator",
    });
    if (url) backUrl = url;
    else failed++;
  }
  return { frontUrl, backUrl, failed, total };
}
