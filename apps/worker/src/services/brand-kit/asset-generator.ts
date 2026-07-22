import {
  getModelMapping,
  createProvider,
  REPLICATE_MODELS,
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
import {
  DEFAULT_BRAND_KIT_MODEL_ID,
  DEFAULT_BUSINESS_CARD_BRIEF,
  type BusinessCardBrief,
  type SocialMediaBrief,
} from "@quicklogo/shared";
import type { StorageProvider } from "@quicklogo/storage";
import type { Env } from "../../types";
import {
  runAssetOrNull,
  withRetryableGeneration,
  type GenerationRetryOptions,
} from "../../core/pipeline-helpers";
import { fetchImageWithLimit } from "../../core/bounded-image-fetch";
import { PipelineError } from "../../core/errors";
import {
  createSocialBannerCopyFallback,
  verifySocialBannerCopy,
  type VerifiedSocialCopy,
} from "./social-banner-copy";
import { createSocialMasterProductionPlan } from "./social-banner-art-direction";
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
import { finalizeBusinessCardAsset } from "./business-card-qr";

const logger = createLogger("worker");

const LOGO_VARIATION_TIMEOUT_MS = 120000;
const SOCIAL_MEDIA_GENERATION_TIMEOUT_MS = 180000;
// Keep expensive image calls serialized and leave a small request-scoped gap
// between attempts so retries and explicit refinements cannot create a burst.
const SOCIAL_PREDICTION_MIN_INTERVAL_MS = 12_500;
const ASSET_ROOT = "quick-logo/brand-kits";

const compactPromptValue = (
  value: string | undefined,
  fallback: string,
  maxLength: number,
) => (value?.trim() || fallback).slice(0, maxLength);

function imageStream(data: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(data);
      controller.close();
    },
  });
}

function parseAssetDimensions(dimensions: string): {
  width: number;
  height: number;
} {
  const match = dimensions.match(/^(\d+)x(\d+)$/);
  if (!match) throw new Error(`Invalid social asset dimensions: ${dimensions}`);
  return {
    width: Number.parseInt(match[1], 10),
    height: Number.parseInt(match[2], 10),
  };
}

function centeredAspectTrim(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
): { top?: number; right?: number; bottom?: number; left?: number } | null {
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = targetWidth / targetHeight;
  if (Math.abs(sourceRatio - targetRatio) < 0.001) return null;

  if (sourceRatio > targetRatio) {
    const cropWidth = Math.max(1, Math.round(sourceHeight * targetRatio));
    const excess = Math.max(0, sourceWidth - cropWidth);
    const left = Math.floor(excess / 2);
    return { left, right: excess - left };
  }

  const cropHeight = Math.max(1, Math.round(sourceWidth / targetRatio));
  const excess = Math.max(0, sourceHeight - cropHeight);
  const top = Math.floor(excess / 2);
  return { top, bottom: excess - top };
}

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
  /** Source artwork used for coordinated platform exports. */
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
export const SOCIAL_MEDIA_PIPELINE_VERSION = 37;
export const BUSINESS_CARD_PIPELINE_VERSION = 1;

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
}

async function generateAndUploadResult(
  provider: AIProvider,
  params: GenerationParams,
  storage: StorageProvider,
  key: string,
  signal?: AbortSignal,
  pngBinding?: ImagesBinding,
  retryOptions?: GenerationRetryOptions,
): Promise<UploadedGeneratedAsset> {
  const result = await withRetryableGeneration(
    provider,
    { ...params, signal },
    retryOptions,
  );
  if (!result.success || !result.imageData) {
    const providerMessage = result.error ?? "Asset generation failed";
    const isInvalidInput =
      /input (?:was invalid|validation failed)|ModelError.*E006/i.test(
        providerMessage,
      );
    throw new PipelineError(
      isInvalidInput
        ? "The image model could not process the current artwork. Please try again after regenerating the affected asset."
        : providerMessage,
      result.isRetryable ?? true,
    );
  }

  const imageData = pngBinding
    ? await ensurePng(pngBinding, result.imageData)
    : result.imageData;
  const extension = pngBinding ? "png" : (result.format ?? "png");
  const uploaded = await storage.upload(`${key}.${extension}`, imageData, {
    overwrite: true,
    ...(pngBinding && { contentType: "image/png" }),
  });
  if (pngBinding) {
    logger.info("Stored generated asset as PNG", {
      key,
      sourceFormat: result.format ?? "unknown",
      outputFormat: "png",
    });
  }
  return { url: uploaded.url };
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
  failFastOnNonRetryable = false,
}: {
  provider: AIProvider;
  params: GenerationParams;
  storage: StorageProvider;
  uploadPath: string;
  timeoutMs: number;
  label: string;
  failFastOnNonRetryable?: boolean;
}): Promise<string | undefined> {
  let nonRetryableFailure: PipelineError | undefined;
  const url = await runAssetOrNull(
    async (signal) => {
      try {
        return await generateAndUpload(
          provider,
          params,
          storage,
          uploadPath,
          signal,
        );
      } catch (error) {
        if (error instanceof PipelineError && !error.retryable) {
          nonRetryableFailure = error;
        }
        throw error;
      }
    },
    timeoutMs,
    label,
  );
  if (failFastOnNonRetryable && nonRetryableFailure) {
    throw nonRetryableFailure;
  }
  return url;
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
  onMasterGenerated,
  assetVersionId,
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
  /** Keeps refinement retries idempotent without overwriting prior revisions. */
  assetVersionId?: string;
  onMasterGenerated?: (
    url: string,
    approvedCopy: VerifiedSocialCopy,
  ) => Promise<void>;
}): Promise<SocialMediaAssetUrls & AssetSectionTally> {
  if (!brandName.trim()) {
    throw new PipelineError(
      "A brand name is required for social media generation",
      false,
    );
  }

  logger.info("Starting social media kit generation", {
    brandKitId,
    pipelineVersion: SOCIAL_MEDIA_PIPELINE_VERSION,
    workflow:
      "gemma-4-restrained-creative-plan-seedream-5-pro-1k-master-explicit-center-crop-exports",
    targetItemId: targetItemId ?? null,
  });

  const createSocialProvider = (mapping: ModelMapping): AIProvider => {
    if (mapping.provider === "replicate" && !env.REPLICATE_API_TOKEN) {
      throw new PipelineError(
        "REPLICATE_API_TOKEN is required for social media generation",
        false,
      );
    }
    return createProvider(mapping, { ai, env });
  };
  const socialAssetRoot = assetVersionId
    ? `${ASSET_ROOT}/${brandKitId}/refinements/${assetVersionId}`
    : `${ASSET_ROOT}/${brandKitId}`;

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
            quality: "low",
          },
        },
        storage,
        uploadPath: `${socialAssetRoot}/social-profile-refined`,
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
  const usableExistingTarget =
    existingTargetAssetUrl && !existingTargetAssetUrl.includes("placehold.co")
      ? existingTargetAssetUrl
      : undefined;
  if (targetItemId && !usableExistingTarget) {
    throw new PipelineError(
      "Cannot refine this social asset because its current image is unavailable",
      false,
    );
  }
  let approvedCopy =
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
      : createSocialBannerCopyFallback(
          brief,
          normalizedContext,
          targetItemId ? undefined : refinementPrompt,
        );
  if (!targetItemId && refinementPrompt?.trim()) {
    approvedCopy = {
      ...approvedCopy,
      additionalInstructions: refinementPrompt.trim().slice(0, 700),
    };
  }
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
  // These dimensions derive Seedream's native 16:9 label. The model controls
  // the physical 1K canvas; exact platform dimensions are exported afterward.
  const youtubeMasterSpec = {
    ...youtubeSpec,
    renderWidth: 2560,
    renderHeight: 1440,
  };

  const fitPrompt = (prompt: string, maxLength: number) => {
    const suffix =
      "\n\nPreserve exact approved copy and references. Return only full-bleed finished banner artwork with no frame, watermark, crop guide, padding, or blank band.";
    if (prompt.length <= maxLength) return prompt;

    // Keep both the brief/copy at the front and the hard negative constraints
    // at the end. A plain tail truncation drops the rules that prevent models
    // from printing metadata or adding device mockups.
    const tailLength = maxLength <= 4000 ? 1000 : 1500;
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
    retryOptions,
  }: {
    provider: AIProvider;
    mapping: ModelMapping;
    spec: (typeof SOCIAL_ASSET_SPECS)[number];
    prompt: string;
    referenceImages?: string[];
    storageKey: string;
    label: string;
    retryOptions?: GenerationRetryOptions;
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
        return generateAndUploadResult(
          rateLimitedProvider,
          {
            ...mapping.defaultParams,
            backendModel: mapping.backendModel,
            prompt: fitPrompt(
              prompt,
              mapping.backendModel === REPLICATE_MODELS.SEEDREAM_5_PRO
                ? 4000
                : 8000,
            ),
            width: spec.renderWidth,
            height: spec.renderHeight,
            providerOptions: {
              ...defaultProviderOptions,
              ...(mapping.backendModel === REPLICATE_MODELS.GPT_IMAGE_2 && {
                quality: "low",
              }),
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
          `${socialAssetRoot}/${storageKey}`,
          signal,
          env.IMAGES,
          retryOptions,
        );
      },
      SOCIAL_MEDIA_GENERATION_TIMEOUT_MS,
      label,
    );

  let masterBannerUrl = usableExistingMaster;
  const shouldGenerateMaster =
    !targetItemId && (!masterBannerUrl || Boolean(refinementPrompt?.trim()));
  if (shouldGenerateMaster) {
    const logoReferenceUrl = brief.includeLogo ? sourceLogoUrl : undefined;
    const reservedReferenceSlots =
      (usableExistingMaster ? 1 : 0) + (logoReferenceUrl ? 1 : 0);
    const productReferenceUrls = (productImageUrls || []).slice(
      0,
      10 - reservedReferenceSlots,
    );
    const masterReferenceImages = [
      ...(usableExistingMaster ? [usableExistingMaster] : []),
      ...(logoReferenceUrl ? [logoReferenceUrl] : []),
      ...productReferenceUrls,
    ];
    const logoFigure = logoReferenceUrl
      ? usableExistingMaster
        ? 2
        : 1
      : undefined;
    const productFigures = productReferenceUrls.map(
      (_url, index) =>
        index + (usableExistingMaster ? 2 : 1) + (logoReferenceUrl ? 1 : 0),
    );
    const productionPlan = await createSocialMasterProductionPlan({
      ai,
      brandName,
      context: normalizedContext,
      brief,
      copy: approvedCopy,
      headingFont,
      bodyFont,
      hasLogoReference: Boolean(logoReferenceUrl),
      productReferenceCount: productReferenceUrls.length,
      logGeneratedDirection: env.LOG_SOCIAL_ART_DIRECTION === "true",
    });
    approvedCopy = productionPlan.copy;
    const generatedMaster = await generateBanner({
      provider: masterProvider,
      mapping: SOCIAL_BANNER_MASTER_MODEL_MAPPING,
      spec: youtubeMasterSpec,
      prompt: buildYoutubeBannerPrompt({
        brandName,
        context: normalizedContext,
        copy: approvedCopy,
        artDirection: productionPlan.artDirection,
        headingFont,
        bodyFont,
        logoFigure,
        productFigures,
      }),
      referenceImages: masterReferenceImages,
      storageKey: "social-youtube-master-base",
      label: "social-media:master",
      // Retry once only when Replicate confirms prediction creation was
      // rejected (for example, a 429). Ambiguous failures never retry.
      retryOptions: { maxAttempts: 2, policy: "safe-only" },
    });
    masterBannerUrl = generatedMaster?.url;
    if (masterBannerUrl && onMasterGenerated) {
      await onMasterGenerated(masterBannerUrl, approvedCopy);
    }
  }

  logger.info("Prepared social master content manifest", {
    brandKitId,
    brandNameCharacters: brandName.trim().length,
    headlineCharacters: approvedCopy.headline.length,
    callToActionCharacters: approvedCopy.callToAction.length,
    requestedLogo: brief.includeLogo,
    attachedLogoReference: brief.includeLogo && Boolean(sourceLogoUrl),
    masterTextRequired: true,
    socialIdentityIncludedInMaster: normalizedContext.hasSocials,
    normalizedSocialNetworks: Object.keys(normalizedContext.socials),
  });

  if (!selectedSpec && !masterBannerUrl) {
    throw new PipelineError(
      "Social media kit incomplete: YouTube master generation failed",
      false,
    );
  }

  let exportSourceUrl = selectedSpec ? usableExistingTarget : masterBannerUrl;
  if (selectedSpec && correctedRefinementPrompt?.trim()) {
    const revisedSource = await generateBanner({
      provider: reframeProvider,
      mapping: SOCIAL_BANNER_REFRAME_MODEL_MAPPING,
      spec: selectedSpec,
      prompt: buildSocialReframePrompt({
        spec: selectedSpec,
        brandName,
        context: normalizedContext,
        copy: approvedCopy,
        headingFont,
        bodyFont,
        refinementPrompt: correctedRefinementPrompt,
      }),
      referenceImages: usableExistingTarget
        ? [usableExistingTarget]
        : undefined,
      storageKey: `${selectedSpec.storageKey}-refined-source`,
      label: `social-media:${selectedSpec.platform}:refinement`,
    });
    if (!revisedSource?.url) {
      return { masterBannerUrl, approvedCopy, failed: 1, total: 1 };
    }
    exportSourceUrl = revisedSource.url;
  }
  if (!exportSourceUrl) {
    throw new PipelineError(
      "Social media refinement source is unavailable",
      false,
    );
  }

  const sourceImageData = await runAssetOrNull(
    async (signal) => {
      const response = await fetch(exportSourceUrl, { signal });
      if (!response.ok) {
        throw new Error(`Failed to download social master: ${response.status}`);
      }
      return new Uint8Array(await response.arrayBuffer());
    },
    SOCIAL_MEDIA_GENERATION_TIMEOUT_MS,
    "social-media:master-download",
  );
  if (!sourceImageData) {
    throw new PipelineError(
      "Social media kit incomplete: master download failed",
      true,
    );
  }
  const sourceInfo = await env.IMAGES.info(imageStream(sourceImageData));
  if (!("width" in sourceInfo) || !sourceInfo.width || !sourceInfo.height) {
    throw new PipelineError(
      "Social media kit incomplete: master dimensions are unavailable",
      true,
    );
  }

  const specsToExport = selectedSpec ? [selectedSpec] : SOCIAL_ASSET_SPECS;
  const exportResults: {
    spec: (typeof SOCIAL_ASSET_SPECS)[number];
    url: string | undefined;
  }[] = [];
  for (const spec of specsToExport) {
    const { width, height } = parseAssetDimensions(spec.dimensions);
    exportResults.push({
      spec,
      url: await runAssetOrNull(
        async () => {
          const trim = centeredAspectTrim(
            sourceInfo.width,
            sourceInfo.height,
            width,
            height,
          );
          let transformer = env.IMAGES.input(imageStream(sourceImageData));
          if (trim) {
            transformer = transformer.transform({ trim });
          }
          const transformed = await transformer
            // The source is already center-cropped to the delivery ratio, so
            // this resize cannot introduce padding or letterboxing.
            .transform({ width, height, fit: "squeeze" })
            .output({ format: "image/png" });
          const response = transformed.response();
          if (!response.ok) {
            throw new Error(
              `Social banner export failed with status ${response.status}`,
            );
          }
          const imageData = new Uint8Array(await response.arrayBuffer());
          const info = await env.IMAGES.info(imageStream(imageData));
          if (
            !("width" in info) ||
            info.width !== width ||
            info.height !== height
          ) {
            throw new Error(
              `Social banner export dimensions were not ${width}x${height}`,
            );
          }
          const uploaded = await storage.upload(
            `${socialAssetRoot}/${spec.storageKey}.png`,
            imageData,
            { overwrite: true, contentType: "image/png" },
          );
          logger.info("Created exact social banner export", {
            brandKitId,
            platform: spec.platform,
            width,
            height,
            sourceWidth: sourceInfo.width,
            sourceHeight: sourceInfo.height,
            trim,
            source: selectedSpec ? "selected-master" : "canonical-master",
          });
          return uploaded.url;
        },
        SOCIAL_MEDIA_GENERATION_TIMEOUT_MS,
        `social-media:${spec.platform}:export`,
      ),
    });
  }

  const generated: Partial<SocialMediaAssetUrls> =
    targetItemId || assetVersionId
      ? {}
      : {
          socialProfileUrl: iconOnlyLogoUrl || sourceLogoUrl,
        };
  for (const result of exportResults) {
    if (result.url) generated[result.spec.outputKey] = result.url;
  }

  if (generated.youtubeBannerUrl && !targetItemId) {
    masterBannerUrl = generated.youtubeBannerUrl;
  }

  const failedExports = exportResults.filter((result) => !result.url).length;
  const failedProfile =
    targetItemId || assetVersionId || generated.socialProfileUrl ? 0 : 1;
  return {
    ...generated,
    masterBannerUrl,
    approvedCopy,
    failed: failedExports + failedProfile,
    total: targetItemId
      ? 1
      : assetVersionId
        ? SOCIAL_ASSET_SPECS.length
        : SOCIAL_MEDIA_ASSET_COUNT,
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

function extractEmbeddedBusinessCardRaster(
  svgBytes: Uint8Array,
): Uint8Array | undefined {
  const svg = new TextDecoder().decode(svgBytes);
  const match = svg.match(
    /<image\b[^>]*\bhref=(["'])data:image\/(?:png|jpe?g|webp);base64,([^"']+)\1/i,
  );
  if (!match?.[2]) return undefined;

  try {
    const binary = atob(match[2].replace(/\s/g, ""));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  } catch {
    return undefined;
  }
}

async function prepareBusinessCardReference({
  env,
  storage,
  brandKitId,
  assetRoot,
  referenceKey,
  sourceUrl,
}: {
  env: Env;
  storage: StorageProvider;
  brandKitId: string;
  assetRoot: string;
  referenceKey: "logo" | "front" | "back";
  sourceUrl: string;
}): Promise<string> {
  try {
    const source = await fetchImageWithLimit(sourceUrl);
    const isSvg =
      source.mimeType.includes("svg") || /\.svg(?:$|[?#])/i.test(sourceUrl);
    const rasterSource = isSvg
      ? (extractEmbeddedBusinessCardRaster(source.bytes) ?? source.bytes)
      : source.bytes;
    const png = await ensurePng(env.IMAGES, rasterSource);
    const uploaded = await storage.upload(
      `${assetRoot}/references/${referenceKey}.png`,
      png,
      { overwrite: true, contentType: "image/png" },
    );
    return uploaded.url;
  } catch (error) {
    logger.error("Failed to prepare business-card model reference", error, {
      brandKitId,
      referenceKey,
    });
    const message = error instanceof Error ? error.message : "";
    const statusMatch = message.match(/\((\d{3})\)|status (\d{3})/i);
    const status = Number(statusMatch?.[1] ?? statusMatch?.[2]);
    const isClearlyInvalid =
      /expected an image|exceeds the maximum|has no body|unexpected format|unsupported/i.test(
        message,
      );
    const retryable = Number.isFinite(status)
      ? status === 429 || status >= 500
      : !isClearlyInvalid;
    throw new PipelineError(
      "We couldn't prepare the current Business Card artwork for refinement. Please regenerate the card and try again.",
      retryable,
    );
  }
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
  businessCardBrief,
  headingFont,
  bodyFont,
  existingFrontUrl,
  existingBackUrl,
  assetVersionId,
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
  businessCardBrief?: BusinessCardBrief;
  headingFont?: string;
  bodyFont?: string;
  existingFrontUrl?: string;
  existingBackUrl?: string;
  assetVersionId?: string;
}): Promise<
  {
    frontUrl?: string;
    backUrl?: string;
    frontSourceUrl?: string;
    backSourceUrl?: string;
  } & AssetSectionTally
> {
  if (targetItemId && targetItemId !== "front" && targetItemId !== "back") {
    throw new PipelineError(
      `Unsupported business-card refinement target: ${targetItemId}`,
      false,
    );
  }

  const mapping = getModelMapping(DEFAULT_BRAND_KIT_MODEL_ID);
  const provider = createProvider(mapping, { ai, env });

  const cardDefaultParams = mapping.defaultParams;

  let frontUrl: string | undefined;
  let backUrl: string | undefined;
  let frontSourceUrl: string | undefined;
  let backSourceUrl: string | undefined;
  let failed = 0;
  let total = 0;
  const brief = businessCardBrief || DEFAULT_BUSINESS_CARD_BRIEF;
  const normalizedContext =
    context || normalizeBrandContext(brandName, { colors: [] });
  const businessCardAssetRoot = assetVersionId
    ? `${ASSET_ROOT}/${brandKitId}/refinements/${assetVersionId}`
    : `${ASSET_ROOT}/${brandKitId}`;
  const usableExistingFrontUrl =
    existingFrontUrl && !existingFrontUrl.includes("placehold.co")
      ? existingFrontUrl
      : undefined;
  const usableExistingBackUrl =
    existingBackUrl && !existingBackUrl.includes("placehold.co")
      ? existingBackUrl
      : undefined;
  let modelLogoUrl = sourceLogoUrl;
  let modelFrontUrl = usableExistingFrontUrl;
  let modelBackUrl = usableExistingBackUrl;
  if (assetVersionId) {
    [modelLogoUrl, modelFrontUrl, modelBackUrl] = await Promise.all([
      prepareBusinessCardReference({
        env,
        storage,
        brandKitId,
        assetRoot: businessCardAssetRoot,
        referenceKey: "logo",
        sourceUrl: sourceLogoUrl,
      }),
      usableExistingFrontUrl
        ? prepareBusinessCardReference({
            env,
            storage,
            brandKitId,
            assetRoot: businessCardAssetRoot,
            referenceKey: "front",
            sourceUrl: usableExistingFrontUrl,
          })
        : Promise.resolve(undefined),
      usableExistingBackUrl
        ? prepareBusinessCardReference({
            env,
            storage,
            brandKitId,
            assetRoot: businessCardAssetRoot,
            referenceKey: "back",
            sourceUrl: usableExistingBackUrl,
          })
        : Promise.resolve(undefined),
    ]);
  }

  if (!targetItemId || targetItemId === "front") {
    total++;
    const url = await generateAssetWithTimeout({
      provider,
      params: buildBusinessCardGenerationParams({
        variation: "front",
        brandName,
        sourceLogoUrl: modelLogoUrl,
        backendModel: mapping.backendModel,
        defaultParams: cardDefaultParams,
        refinementPrompt,
        context: normalizedContext,
        businessCardBrief: brief,
        headingFont,
        bodyFont,
        currentSideUrl: modelFrontUrl,
        companionReferenceUrl: modelBackUrl,
      }),
      storage,
      uploadPath: `${businessCardAssetRoot}/business-card-front`,
      timeoutMs: LOGO_VARIATION_TIMEOUT_MS,
      label: "asset-generator",
      failFastOnNonRetryable: Boolean(assetVersionId),
    });
    if (url) {
      frontSourceUrl = url;
      try {
        frontUrl = await finalizeBusinessCardAsset({
          storage,
          brandKitId,
          sourceUrl: url,
          brief,
          context: normalizedContext,
          side: "front",
          assetVersionId,
        });
      } catch (error) {
        logger.error("Failed to finalize business-card front", error, {
          brandKitId,
        });
        failed++;
      }
    } else failed++;
  }

  if (!targetItemId && !frontUrl) {
    return {
      frontSourceUrl,
      failed,
      total,
    };
  }

  if (!targetItemId || targetItemId === "back") {
    total++;
    const generatedBackUrl = await generateAssetWithTimeout({
      provider,
      params: buildBusinessCardGenerationParams({
        variation: "back",
        brandName,
        sourceLogoUrl: modelLogoUrl,
        backendModel: mapping.backendModel,
        defaultParams: cardDefaultParams,
        refinementPrompt,
        context: normalizedContext,
        businessCardBrief: brief,
        headingFont,
        bodyFont,
        currentSideUrl: modelBackUrl,
        companionReferenceUrl: frontSourceUrl || modelFrontUrl,
      }),
      storage,
      uploadPath: `${businessCardAssetRoot}/business-card-back`,
      timeoutMs: LOGO_VARIATION_TIMEOUT_MS,
      label: "asset-generator",
      failFastOnNonRetryable: Boolean(assetVersionId),
    });
    if (generatedBackUrl) {
      backSourceUrl = generatedBackUrl;
      try {
        backUrl = await finalizeBusinessCardAsset({
          storage,
          brandKitId,
          sourceUrl: generatedBackUrl,
          brief,
          context: normalizedContext,
          side: "back",
          assetVersionId,
        });
      } catch (error) {
        logger.error("Failed to finalize business-card back", error, {
          brandKitId,
        });
        failed++;
      }
    } else failed++;
  }
  return {
    frontUrl,
    backUrl,
    frontSourceUrl,
    backSourceUrl,
    failed,
    total,
  };
}
