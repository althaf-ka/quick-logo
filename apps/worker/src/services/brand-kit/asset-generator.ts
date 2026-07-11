import {
  getModelMapping,
  createProvider,
  REPLICATE_MODELS,
} from "@quicklogo/ai-providers/providers";
import {
  buildLogoVariationGenerationParams,
  buildSocialMediaGenerationParams,
  buildBusinessCardGenerationParams,
  buildBrandGraphicGenerationParams,
  type SocialMediaVariationKind,
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
  createSocialCreativeDirections,
  type SocialCreativeDirection,
} from "./social-creative-director";
import {
  selectBestSocialArtwork,
  type SocialArtworkQuality,
} from "./social-artwork-quality";
import { composeSocialMediaAssets } from "./social-banner-compositor";

import { findReusableLogoVariationUrls } from "./reusable-url-finder";
import type { Database } from "@quicklogo/db";
import type { ValidatedBrandContext } from "@quicklogo/ai-providers/prompt";

import { createLogger } from "@quicklogo/server-telemetry";

const logger = createLogger("worker");

const LOGO_VARIATION_TIMEOUT_MS = 120000;
// A single master generation now serves all platform crops.
const SOCIAL_MEDIA_GENERATION_TIMEOUT_MS = 180000;
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
  /** Canonical artwork used to derive coordinated banner crops. */
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
  creativeDirection?: SocialCreativeDirection;
  quality?: SocialArtworkQuality;
  candidateUrls?: string[];
}

const SOCIAL_PROFILE_SIZE = "1024x1024";
const TWITTER_BANNER_SIZE = "1500x500"; // 3:1
const LINKEDIN_BANNER_SIZE = "1584x396"; // 4:1
const FACEBOOK_COVER_SIZE = "820x312"; // ~2.6:1
const YOUTUBE_ART_SIZE = "2560x1440"; // 16:9
// Seedream 5 Lite only accepts the documented 2K and 3K size presets.
const BANNER_GENERATION_RESOLUTION = "2K";

export const SOCIAL_MEDIA_ASSET_COUNT = 5;

const DEFAULT_BACKGROUND_COLOR = "#111827";

const placeholder = (size: string, label: string) =>
  `https://placehold.co/${size}/000/FFF?text=${label}`;

function buildImageKitCropUrl(sourceUrl: string, dimensions: string): string {
  const [width, height] = dimensions.split("x").map(Number);
  if (!width || !height) return sourceUrl;

  try {
    const url = new URL(sourceUrl);
    // Both dimensions plus a focus produce the exact centered crop required
    // by each platform. `c-maintain_ratio` can return smaller dimensions.
    const crop = `w-${width},h-${height},fo-center,q-90`;
    const existing = url.searchParams.get("tr");
    url.searchParams.set("tr", existing ? `${existing},${crop}` : crop);
    return url.toString();
  } catch (error) {
    logger.warn(`Failed to parse URL for image cropping`, { sourceUrl, error });
    return sourceUrl;
  }
}

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
  refinementPrompt,
  context,
  socialMediaBrief,
  headingFont,
  targetItemId,
  existingTargetAssetUrl,
}: {
  ai: Ai;
  env: Env;
  storage: StorageProvider;
  brandKitId: string;
  brandName: string;
  sourceLogoUrl: string;
  refinementPrompt?: string;
  context?: ValidatedBrandContext;
  socialMediaBrief?: SocialMediaBrief;
  headingFont?: string;
  targetItemId?: string;
  existingTargetAssetUrl?: string;
}): Promise<SocialMediaAssetUrls & AssetSectionTally> {
  const baseSeedreamMapping = getModelMapping("quick-seedream");
  // Never mutate the shared model registry: Workers reuse isolates across
  // queue messages, so a request-local override must remain request-local.
  const seedreamMapping = {
    ...baseSeedreamMapping,
    backendModel: REPLICATE_MODELS.SEEDREAM_5_LITE,
    defaultParams: {
      ...baseSeedreamMapping.defaultParams,
      providerOptions: {
        ...(baseSeedreamMapping.defaultParams.providerOptions || {}),
      },
    },
  };
  const bannerProvider = createProvider(seedreamMapping, { ai, env });

  const urls: SocialMediaAssetUrls = {};
  const generatePlatformAsset = (
    variation: SocialMediaVariationKind,
    aspectRatio: string,
    pathKey: string,
    referenceUrl: string,
    includeReferenceImage: boolean,
  ) =>
    generateAssetWithTimeout({
      provider: bannerProvider,
      params: buildSocialMediaGenerationParams({
        variation,
        brandName,
        sourceLogoUrl: referenceUrl,
        backendModel: seedreamMapping.backendModel,
        defaultParams: {
          ...seedreamMapping.defaultParams,
          providerOptions: {
            ...(seedreamMapping.defaultParams?.providerOptions || {}),
            aspect_ratio: aspectRatio,
            size: BANNER_GENERATION_RESOLUTION,
          },
        },
        refinementPrompt,
        context,
        includeReferenceImage,
      }),
      storage,
      uploadPath: `${ASSET_ROOT}/${brandKitId}/social-${pathKey}`,
      timeoutMs: SOCIAL_MEDIA_GENERATION_TIMEOUT_MS,
      label: `social-media:${variation}`,
    });

  const bannerSpecs = [
    {
      targetId: "twitter-header",
      variation: "twitter-banner",
      aspectRatio: "21:9",
      outputDimensions: TWITTER_BANNER_SIZE,
      pathKey: "twitter-banner",
      urlKey: "twitterBannerUrl",
    },
    {
      targetId: "linkedin-header",
      variation: "linkedin-banner",
      aspectRatio: "21:9",
      outputDimensions: LINKEDIN_BANNER_SIZE,
      pathKey: "linkedin-banner",
      urlKey: "linkedinBannerUrl",
    },
    {
      targetId: "facebook-header",
      variation: "facebook-banner",
      aspectRatio: "21:9",
      outputDimensions: FACEBOOK_COVER_SIZE,
      pathKey: "facebook-banner",
      urlKey: "facebookBannerUrl",
    },
    {
      targetId: "youtube-channel-art",
      variation: "youtube-banner",
      aspectRatio: "16:9",
      outputDimensions: YOUTUBE_ART_SIZE,
      pathKey: "youtube-banner",
      urlKey: "youtubeBannerUrl",
    },
  ] as const;

  if (targetItemId) {
    const referenceUrl =
      existingTargetAssetUrl && !existingTargetAssetUrl.includes("placehold.co")
        ? existingTargetAssetUrl
        : sourceLogoUrl;

    if (targetItemId.endsWith("-profile")) {
      const profileUrl = await generatePlatformAsset(
        "social-profile",
        "1:1",
        "profile",
        referenceUrl,
        true,
      );
      return {
        socialProfileUrl: profileUrl,
        failed: profileUrl ? 0 : 1,
        total: 1,
      };
    }

    const spec = bannerSpecs.find((item) => item.targetId === targetItemId);
    if (!spec) {
      throw new PipelineError(
        `Unsupported social media target: ${targetItemId}`,
        false,
      );
    }

    const url = await generatePlatformAsset(
      spec.variation,
      spec.aspectRatio,
      spec.pathKey,
      referenceUrl,
      true,
    );
    if (url) {
      urls[spec.urlKey] = buildImageKitCropUrl(url, spec.outputDimensions);
    }
    return { ...urls, failed: url ? 0 : 1, total: 1 };
  }

  const brief: SocialMediaBrief = socialMediaBrief || {
    purpose: "brand-awareness",
    visualDirection: "auto",
    includeLogo: true,
    includeTagline: true,
  };
  const creativeContext = {
    industry: context?.industry,
    tagline: context?.tagline,
    targetAudience: context?.targetAudience,
    selectedVibes: context?.selectedVibes,
    brandPersonality: context?.brandPersonality,
    additionalContext: [context?.additionalContext, refinementPrompt]
      .filter(Boolean)
      .join("\n"),
    socialMediaBrief: brief,
  };
  const directions = await createSocialCreativeDirections({
    ai,
    brandName,
    context: creativeContext,
    brief,
  });
  const ideogramMapping = getModelMapping("quick-ideogram");
  const artworkProvider = createProvider(ideogramMapping, { ai, env });
  const candidateResults = await Promise.all(
    directions.map(async (direction, index) => {
      const url = await generateAssetWithTimeout({
        provider: artworkProvider,
        params: {
          ...ideogramMapping.defaultParams,
          backendModel: ideogramMapping.backendModel,
          prompt: `${direction.artworkPrompt}\n\nPRODUCTION REQUIREMENTS: Edge-to-edge 3:1 panoramic campaign background. Background artwork only. One clear visual idea with premium commercial art direction and natural depth. Preserve useful negative space around the center-right for a separate logo and message layer. Do not render any text, letters, logo, icon, watermark, border, frame, rounded rectangle, card, panel, mockup, interface, safe-area guide, connected blocks, puzzle pieces, circuitry, or random decorative 3D objects.`,
          width: 3072,
          height: 1024,
          providerOptions: {
            ...(ideogramMapping.defaultParams.providerOptions || {}),
            aspect_ratio: "3:1",
            magic_prompt_option: "Auto",
            resolution: "None",
            style_type:
              brief.visualDirection === "photographic" ? "Realistic" : "Design",
          },
        },
        storage,
        uploadPath: `${ASSET_ROOT}/${brandKitId}/social-concept-${index + 1}`,
        timeoutMs: SOCIAL_MEDIA_GENERATION_TIMEOUT_MS,
        label: `social-media:concept-${index + 1}`,
      });
      return url ? { url, direction } : null;
    }),
  );
  const candidates = candidateResults.filter(
    (candidate): candidate is NonNullable<typeof candidate> => !!candidate,
  );

  if (candidates.length === 0) {
    throw new PipelineError(
      "Social media kit incomplete: no artwork concept could be generated",
      true,
    );
  }

  let selected = await selectBestSocialArtwork({
    ai,
    candidates,
    brandContext: `${brandName}; ${context?.industry || ""}; ${context?.targetAudience || ""}; ${(context?.selectedVibes || []).join(", ")}`,
  });
  if (
    selected.quality.reviewed &&
    (selected.quality.score < 65 ||
      selected.quality.hasForbiddenElements ||
      selected.quality.genericness > 55)
  ) {
    const recoveryDirection: SocialCreativeDirection = {
      ...selected.candidate.direction,
      id: `${selected.candidate.direction.id}-recovery`,
      title: `${selected.candidate.direction.title} Refined`,
      artworkPrompt: `${selected.candidate.direction.artworkPrompt}\n\nCREATIVE DIRECTOR CORRECTION: ${selected.quality.notes}. Replace any generic or panel-like composition with a specific, edge-to-edge brand campaign image.`,
    };
    const recoveryUrl = await generateAssetWithTimeout({
      provider: artworkProvider,
      params: {
        ...ideogramMapping.defaultParams,
        backendModel: ideogramMapping.backendModel,
        prompt: `${recoveryDirection.artworkPrompt}\n\nBACKGROUND ARTWORK ONLY. 3:1 panoramic, edge-to-edge, one specific visual idea, useful center-right negative space. Absolutely no text, logo, card, panel, frame, mockup, fake UI, safe-area graphic, connected blocks, puzzle pieces, circuitry, or random 3D objects.`,
        width: 3072,
        height: 1024,
        providerOptions: {
          ...(ideogramMapping.defaultParams.providerOptions || {}),
          aspect_ratio: "3:1",
          magic_prompt_option: "Auto",
          resolution: "None",
          style_type:
            brief.visualDirection === "photographic" ? "Realistic" : "Design",
        },
      },
      storage,
      uploadPath: `${ASSET_ROOT}/${brandKitId}/social-concept-recovery`,
      timeoutMs: SOCIAL_MEDIA_GENERATION_TIMEOUT_MS,
      label: "social-media:concept-recovery",
    });
    if (recoveryUrl) {
      const recoveryCandidate = {
        url: recoveryUrl,
        direction: recoveryDirection,
      };
      candidates.push(recoveryCandidate);
      selected = await selectBestSocialArtwork({
        ai,
        candidates: [selected.candidate, recoveryCandidate],
        brandContext: `${brandName}; ${context?.industry || ""}; ${context?.targetAudience || ""}`,
      });
    }
  }
  const composed = await composeSocialMediaAssets({
    storage,
    brandKitId,
    backgroundUrl: selected.candidate.url,
    logoUrl: sourceLogoUrl,
    backgroundColor: context?.colors?.[0] || DEFAULT_BACKGROUND_COLOR,
    message: brief.message || context?.tagline,
    brief,
    headingFont,
  });

  return {
    ...composed,
    masterBannerUrl: selected.candidate.url,
    creativeDirection: selected.candidate.direction,
    quality: selected.quality,
    candidateUrls: candidates.map((candidate) => candidate.url),
    failed: 0,
    total: SOCIAL_MEDIA_ASSET_COUNT,
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
