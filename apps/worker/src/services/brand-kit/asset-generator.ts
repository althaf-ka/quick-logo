import {
  getModelMapping,
  createProvider,
} from "@quicklogo/ai-providers/providers";
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
  createSocialCampaignDirection,
  buildSocialPlatformPlans,
  buildSocialMasterPlan,
  type SocialCampaignDirection,
} from "./social-creative-director";

import { findReusableLogoVariationUrls } from "./reusable-url-finder";
import type { Database } from "@quicklogo/db";
import {
  normalizeBrandContext,
  type ValidatedBrandContext,
} from "@quicklogo/ai-providers/prompt";

import { createLogger } from "@quicklogo/server-telemetry";
import { fetchImageWithLimit } from "../../core/bounded-image-fetch";
import {
  CloudflareExactImageProcessor,
  type ExactImageProcessor,
  type ExactPngSpec,
} from "../image/exact-image-processor";

const logger = createLogger("worker");

const LOGO_VARIATION_TIMEOUT_MS = 120000;
const SOCIAL_MEDIA_GENERATION_TIMEOUT_MS = 180000;
const ASSET_ROOT = "quick-logo/brand-kits";
const SOCIAL_MASTER_PROMPT_MAX_LENGTH = 3900;

const compactPromptValue = (
  value: string | undefined,
  fallback: string,
  maxLength: number,
) => (value?.trim() || fallback).slice(0, maxLength);

function fitSocialMasterPrompt(prompt: string): string {
  if (prompt.length <= SOCIAL_MASTER_PROMPT_MAX_LENGTH) return prompt;

  const closingRules =
    "\n\nRender only the approved copy and references. No extra words, duplicate letters, invented marks, UI, frames, watermarks, crop guides, or padding. Deliver only the finished full-bleed master.";
  logger.warn("Social master prompt exceeded provider limit; compacting", {
    originalLength: prompt.length,
    maximumLength: SOCIAL_MASTER_PROMPT_MAX_LENGTH,
  });
  return `${prompt.slice(0, SOCIAL_MASTER_PROMPT_MAX_LENGTH - closingRules.length)}${closingRules}`;
}

const MASTER_VISUAL_TREATMENTS: Record<
  SocialMediaBrief["visualDirection"],
  string
> = {
  auto: "Choose the visual medium that expresses this campaign concept most distinctively; commit to one coherent treatment.",
  minimal:
    "Use disciplined minimalism: one strong idea, refined material detail, restrained contrast, and generous but intentional space.",
  editorial:
    "Use premium editorial art direction: sophisticated framing, tactile detail, expressive cropping, and a magazine-campaign finish.",
  photographic:
    "Create believable campaign photography with a specific camera viewpoint, natural optical depth, realistic materials, controlled practical lighting, and no synthetic CGI look.",
  geometric:
    "Build an ownable geometric art system with meaningful structure, dimensional material behavior, precise rhythm, and no generic floating shapes.",
  "product-focused":
    "Make the supplied product the unmistakable hero while preserving its real identity, proportions, materials, and commercial-product credibility.",
};

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
  campaignDirection?: SocialCampaignDirection;
}

const SOCIAL_PROFILE_SIZE = "1024x1024";
const TWITTER_BANNER_SIZE = "1500x500"; // 3:1
const LINKEDIN_BANNER_SIZE = "1584x396"; // 4:1
// Facebook displays Page covers differently across devices. Upload the taller
// cross-device canvas and protect the centered 640x312 intersection below.
const FACEBOOK_COVER_SIZE = "820x360"; // 41:18
const YOUTUBE_ART_SIZE = "2560x1440"; // 16:9
const YOUTUBE_MAX_FILE_SIZE_BYTES = 6_000_000;
const LINKEDIN_MAX_FILE_SIZE_BYTES = 8_000_000;
const SOCIAL_MASTER_MAX_BYTES = 20 * 1024 * 1024;
const FINAL_WORKING_CANVAS_WIDTH = 2048;
const FINAL_WORKING_CANVAS_HEIGHT = 1152;

export const SOCIAL_MEDIA_ASSET_COUNT = 5;

const SOCIAL_ASSET_SPECS = [
  {
    targetId: "twitter-header",
    platform: "twitter" as const,
    outputKey: "twitterBannerUrl" as const,
    storageKey: "social-twitter-banner",
    dimensions: TWITTER_BANNER_SIZE,
    aspectRatio: "3:1",
    width: 1500,
    height: 500,
    safeWidth: 1350,
    safeHeight: 380,
    maxBytes: undefined,
  },
  {
    targetId: "linkedin-header",
    platform: "linkedin" as const,
    outputKey: "linkedinBannerUrl" as const,
    storageKey: "social-linkedin-banner",
    dimensions: LINKEDIN_BANNER_SIZE,
    aspectRatio: "4:1",
    width: 1584,
    height: 396,
    safeWidth: 1346,
    safeHeight: 316,
    maxBytes: LINKEDIN_MAX_FILE_SIZE_BYTES,
  },
  {
    targetId: "facebook-header",
    platform: "facebook" as const,
    outputKey: "facebookBannerUrl" as const,
    storageKey: "social-facebook-banner",
    dimensions: FACEBOOK_COVER_SIZE,
    aspectRatio: "41:18",
    width: 820,
    height: 360,
    safeWidth: 640,
    safeHeight: 312,
    maxBytes: undefined,
  },
  {
    targetId: "youtube-channel-art",
    platform: "youtube" as const,
    outputKey: "youtubeBannerUrl" as const,
    storageKey: "social-youtube-banner",
    dimensions: YOUTUBE_ART_SIZE,
    aspectRatio: "16:9",
    width: 2560,
    height: 1440,
    safeWidth: 1546,
    safeHeight: 423,
    maxBytes: YOUTUBE_MAX_FILE_SIZE_BYTES,
  },
] as const;

function getUniversalSocialSafeArea(): { width: number; height: number } {
  const workingAspectRatio =
    FINAL_WORKING_CANVAS_WIDTH / FINAL_WORKING_CANVAS_HEIGHT;
  return {
    width: Math.floor(
      Math.min(
        ...SOCIAL_ASSET_SPECS.map(
          (spec) => (spec.safeWidth / spec.width) * 100,
        ),
      ),
    ),
    height: Math.floor(
      Math.min(
        ...SOCIAL_ASSET_SPECS.map((spec) => {
          const deliveryAspectRatio = spec.width / spec.height;
          const deliveryBand = Math.min(
            1,
            workingAspectRatio / deliveryAspectRatio,
          );
          return deliveryBand * (spec.safeHeight / spec.height) * 100;
        }),
      ),
    ),
  };
}

const UNIVERSAL_SOCIAL_SAFE_AREA = getUniversalSocialSafeArea();

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
  outputTransform?: {
    processor: ExactImageProcessor;
    spec: ExactPngSpec;
  },
): Promise<UploadedGeneratedAsset> {
  const result = await withRetryableGeneration(provider, { ...params, signal });
  if (!result.success || !result.imageData) {
    throw new Error(result.error ?? "Asset generation failed");
  }

  const processed = outputTransform
    ? await outputTransform.processor.cropToExactPng(
        result.imageData,
        outputTransform.spec,
      )
    : undefined;
  const imageData = processed?.data ?? result.imageData;
  const extension = processed?.extension ?? result.format ?? "png";
  if (processed) {
    logger.info("Prepared exact social banner delivery", {
      key,
      dimensions: `${processed.width}x${processed.height}`,
      contentType: processed.contentType,
      bytes: processed.data.byteLength,
    });
  }
  const uploaded = await storage.upload(`${key}.${extension}`, imageData, {
    overwrite: true,
    ...(processed?.contentType && { contentType: processed.contentType }),
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
  outputTransform?: {
    processor: ExactImageProcessor;
    spec: ExactPngSpec;
  },
): Promise<string> {
  return (
    await generateAndUploadResult(
      provider,
      params,
      storage,
      key,
      signal,
      outputTransform,
    )
  ).url;
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

async function cropAndUploadSocialMaster({
  processor,
  storage,
  source,
  brandKitId,
  spec,
}: {
  processor: ExactImageProcessor;
  storage: StorageProvider;
  source: Uint8Array;
  brandKitId: string;
  spec: (typeof SOCIAL_ASSET_SPECS)[number];
}): Promise<string> {
  const processed = await processor.cropToExactPng(source, {
    width: spec.width,
    height: spec.height,
    ...(spec.maxBytes !== undefined && { maxBytes: spec.maxBytes }),
  });
  const uploaded = await storage.upload(
    `${ASSET_ROOT}/${brandKitId}/${spec.storageKey}.png`,
    processed.data,
    {
      overwrite: true,
      contentType: processed.contentType,
    },
  );
  logger.info("Derived exact social banner from canonical master", {
    platform: spec.platform,
    dimensions: spec.dimensions,
    bytes: processed.data.byteLength,
  });
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
  existingCampaignDirection,
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
  existingCampaignDirection?: SocialCampaignDirection;
  productImageUrls?: string[];
}): Promise<SocialMediaAssetUrls & AssetSectionTally> {
  // The social profile is the already-generated icon-only brand mark. It does
  // not need a creative brief, master artwork, or another image-model call.
  if (targetItemId === "instagram-profile") {
    const currentProfileUrl =
      existingTargetAssetUrl && !existingTargetAssetUrl.includes("placehold.co")
        ? existingTargetAssetUrl
        : iconOnlyLogoUrl || sourceLogoUrl;
    if (refinementPrompt?.trim()) {
      const profileMapping = getModelMapping("quick-gpt-image-2");
      const profileProvider = createProvider(profileMapping, { ai, env });
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
  const creativeContext = {
    industry: normalizedContext.industry,
    tagline: normalizedContext.tagline,
    targetAudience: normalizedContext.targetAudience,
    selectedVibes: normalizedContext.selectedVibes,
    brandPersonality: normalizedContext.brandPersonality,
    additionalContext: [normalizedContext.additionalContext, refinementPrompt]
      .filter(Boolean)
      .join("\n"),
    socialMediaBrief: brief,
  };
  const campaignDirection =
    existingCampaignDirection ??
    (await createSocialCampaignDirection({
      ai,
      brandName,
      context: creativeContext,
      brief,
    }));
  const selectedSpec = targetItemId
    ? SOCIAL_ASSET_SPECS.find((item) => item.targetId === targetItemId)
    : undefined;
  if (targetItemId && !selectedSpec) {
    throw new PipelineError(
      `Unsupported social media target: ${targetItemId}`,
      false,
    );
  }

  const masterImageMapping = getModelMapping("quick-seedream");
  const masterImageProvider = createProvider(masterImageMapping, { ai, env });
  const exactImageProcessor = new CloudflareExactImageProcessor(env.IMAGES);
  const usableExistingMaster =
    existingMasterBannerUrl && !existingMasterBannerUrl.includes("placehold.co")
      ? existingMasterBannerUrl
      : undefined;
  const usableExistingTarget =
    existingTargetAssetUrl && !existingTargetAssetUrl.includes("placehold.co")
      ? existingTargetAssetUrl
      : undefined;
  const layoutBrief: SocialMediaBrief = {
    ...brief,
    message: campaignDirection.headline || undefined,
    callToAction: campaignDirection.callToAction || undefined,
  };
  const planningContext = {
    ...creativeContext,
    socials: normalizedContext.socials,
  };
  const masterPlan = buildSocialMasterPlan({
    context: planningContext,
    brief: layoutBrief,
  });
  let masterBannerUrl = targetItemId ? usableExistingMaster : undefined;
  let generatedMasterBytes: Uint8Array | undefined;

  // A targeted revision is the only path allowed to invoke a second image
  // render. It intentionally changes one delivery asset without pretending
  // that independently generated platform variants are a uniform campaign.
  const refinementSource = usableExistingTarget || usableExistingMaster;
  if (selectedSpec && refinementPrompt?.trim() && refinementSource) {
    const finalImageMapping = getModelMapping("quick-gpt-image-2");
    const finalImageProvider = createProvider(finalImageMapping, { ai, env });
    const platformPlan = buildSocialPlatformPlans({
      context: planningContext,
      brief: layoutBrief,
      platforms: [
        {
          platform: selectedSpec.platform,
          dimensions: selectedSpec.dimensions,
          aspectRatio: selectedSpec.aspectRatio,
        },
      ],
    })[0];
    const references = brief.includeLogo
      ? [refinementSource, sourceLogoUrl]
      : [refinementSource];
    const refinedUrl = await runAssetOrNull(
      (signal) =>
        generateAndUpload(
          finalImageProvider,
          {
            ...finalImageMapping.defaultParams,
            backendModel: finalImageMapping.backendModel,
            prompt: `Refine Figure 1 into one premium, edge-to-edge ${selectedSpec.platform} header according to this request: ${compactPromptValue(refinementPrompt, "", 700)}

Preserve every unrelated campaign decision: concept, recognizable motif, palette, lighting, material depth, exact approved copy, typographic character, logo treatment, and social identity row. Do not redesign the campaign. Keep the result full-bleed with no frame, padding, mockup, crop guide, safe-area box, or watermark.

The output is generated on a 16:9 working canvas and then center-cropped to ${selectedSpec.dimensions} (${selectedSpec.aspectRatio}). Keep every headline, call to action, logo, social identity, and essential motif inside the centered middle ${UNIVERSAL_SOCIAL_SAFE_AREA.width}% of canvas width and ${UNIVERSAL_SOCIAL_SAFE_AREA.height}% of canvas height. ${platformPlan?.compositionPrompt || masterPlan.compositionPrompt}

Use ${headingFont || "the established display typeface"} for the headline character and ${bodyFont || "the established complementary sans-serif"} for supporting copy. Typography must feel physically integrated into the art through scene-aware lighting, material, shadow, reflection, and depth while remaining crisp and immediately legible—not like a flat software overlay.

${brief.includeLogo ? "Figure 2 is the approved logo reference. Preserve the existing logo when present; never add a duplicate, redraw it, or retype it." : "Do not introduce a logo or invented brand mark."}
Render no new words, handles, claims, icons, or contact details. Deliver only the finished artwork.`,
            referenceImages: references,
            canvasMode: "img2img",
            width: FINAL_WORKING_CANVAS_WIDTH,
            height: FINAL_WORKING_CANVAS_HEIGHT,
            providerOptions: {
              ...(finalImageMapping.defaultParams.providerOptions || {}),
              quality: env.SOCIAL_BANNER_QUALITY || "low",
            },
            signal,
          },
          storage,
          `${ASSET_ROOT}/${brandKitId}/${selectedSpec.storageKey}`,
          signal,
          {
            processor: exactImageProcessor,
            spec: {
              width: selectedSpec.width,
              height: selectedSpec.height,
              ...(selectedSpec.maxBytes !== undefined && {
                maxBytes: selectedSpec.maxBytes,
              }),
            },
          },
        ),
      SOCIAL_MEDIA_GENERATION_TIMEOUT_MS,
      `social-media:${selectedSpec.platform}:refinement`,
    );

    return {
      ...(refinedUrl && { [selectedSpec.outputKey]: refinedUrl }),
      masterBannerUrl,
      campaignDirection,
      failed: refinedUrl ? 0 : 1,
      total: 1,
    };
  }

  const generateMaster = async (): Promise<
    UploadedGeneratedAsset | undefined
  > => {
    const productReference =
      brief.purpose === "product-promotion" ? productImageUrls?.[0] : undefined;
    const referenceImages = [
      ...(brief.includeLogo ? [sourceLogoUrl] : []),
      ...(productReference ? [productReference] : []),
    ];
    const logoFigure = brief.includeLogo ? 1 : undefined;
    const productFigure = productReference
      ? brief.includeLogo
        ? 2
        : 1
      : undefined;
    const approvedCopy = [
      masterPlan.headline ? `Headline: "${masterPlan.headline}"` : "",
      masterPlan.callToAction
        ? `Call to action: "${masterPlan.callToAction}"`
        : "",
    ].filter(Boolean);

    return runAssetOrNull(
      (signal) =>
        generateAndUploadResult(
          masterImageProvider,
          {
            ...masterImageMapping.defaultParams,
            backendModel: masterImageMapping.backendModel,
            prompt: fitSocialMasterPrompt(
              `Create the ONE canonical, finished 16:9 social campaign master for "${compactPromptValue(brandName, "Brand", 100)}". Every X, LinkedIn, Facebook, and YouTube header will be a deterministic center crop of this exact image, so solve the complete artwork now—background, typography, optional logo, and social identities in one coherent render.

BRAND: ${compactPromptValue(normalizedContext.industry, "unspecified industry", 100)}; audience ${compactPromptValue(normalizedContext.targetAudience, "not specified", 120)}; personality ${compactPromptValue(normalizedContext.brandPersonality, "refined and professional", 120)}; mood ${compactPromptValue(normalizedContext.selectedVibes?.join(", "), "refined", 90)}; palette ${compactPromptValue(normalizedContext.colors?.join(", "), "disciplined brand-appropriate colors", 100)}. Treatment: ${MASTER_VISUAL_TREATMENTS[brief.visualDirection]} Purpose: ${brief.purpose}. Additional direction: ${compactPromptValue(creativeContext.additionalContext, "none", 220)}.

CONCEPT: ${compactPromptValue(campaignDirection.conceptTitle, "Signature Campaign", 60)}. ${compactPromptValue(campaignDirection.artDirection, "Invent a distinctive, brand-specific visual metaphor with premium editorial depth.", 450)}

COMPOSITION: ${masterPlan.compositionPrompt} The universal safe region is the invisible centered middle ${UNIVERSAL_SOCIAL_SAFE_AREA.width}% of canvas width and ${UNIVERSAL_SOCIAL_SAFE_AREA.height}% of canvas height. Keep the complete headline, CTA, social row, optional logo, and recognizable core of the hero motif fully inside it with comfortable internal padding. Keep the headline compact, left-aligned, and at most two lines. Let only atmosphere, lighting, texture, and nonessential environmental detail extend above and below. Fill every pixel to all edges; never draw the safe region.

TYPOGRAPHY: Use ${headingFont || "a distinctive brand-appropriate display typeface"} for the headline and ${bodyFont || "a clean complementary sans-serif"} for supporting copy. Create a disciplined hierarchy with deliberate kerning, tracking, leading, optical alignment, and contrast. Make the letters belong to the scene through art-directed material, ambient light, contact shadow, reflection, translucency, embossing, or dimensional depth appropriate to the concept. The result must retain the polish of expert advertising art while staying crisp and easy to read—never a flat pasted-on overlay, generic template, button, pill, or UI label.

${approvedCopy.length ? `RENDER ONLY THIS APPROVED COPY, exactly spelled:\n${approvedCopy.join("\n")}` : "Do not render a headline or call to action."}
${masterPlan.socialText ? `SOCIAL ROW: ${masterPlan.socialText}. Render exactly these identities on one quiet baseline using consistent official icon boxes followed by the handle without an @ symbol. Do not spell platform names.` : "Do not render social icons, handles, platform names, or an @ symbol."}
${logoFigure ? `Figure ${logoFigure} is the exact approved logo. Place it once as a small, restrained signature, unchanged and undistorted; never redraw, retype, or duplicate it.` : "Do not add a logo, wordmark, emblem, or invented brand mark."}
${productFigure ? `Figure ${productFigure} is the approved product reference. Preserve its identity, proportions, materials, and commercial credibility as part of the campaign scene.` : ""}

Create original premium campaign art with a specific focal metaphor, layered foreground-to-background depth, authentic materials, controlled cinematic lighting, purposeful contrast, and a coherent limited palette. Avoid generic corporate imagery, literal industry props, isolated pedestal products, stock-office scenes, floating-shape filler, empty studio backgrounds, frames, mockups, borders, watermarks, crop guides, URLs, contact details, invented claims, extra words, duplicate letters, or unrequested icons. Deliver only the finished full-bleed master.`,
            ),
            width: FINAL_WORKING_CANVAS_WIDTH,
            height: FINAL_WORKING_CANVAS_HEIGHT,
            providerOptions: {
              ...(masterImageMapping.defaultParams.providerOptions || {}),
              aspect_ratio: "16:9",
              size: "3K",
              max_images: 1,
              sequential_image_generation: "disabled",
            },
            ...(referenceImages.length > 0 && {
              referenceImages,
              referenceStrength: 35,
              canvasMode: "img2img" as const,
            }),
            signal,
          },
          storage,
          `${ASSET_ROOT}/${brandKitId}/social-master`,
          signal,
        ),
      SOCIAL_MEDIA_GENERATION_TIMEOUT_MS,
      "social-media:golden-master",
    );
  };

  if (!masterBannerUrl) {
    const generatedMaster = await generateMaster();
    masterBannerUrl = generatedMaster?.url;
    generatedMasterBytes = generatedMaster?.imageData;
  }
  if (!masterBannerUrl) {
    throw new PipelineError(
      "Social media kit incomplete: Golden Master generation failed",
      true,
    );
  }

  const specsToGenerate = selectedSpec ? [selectedSpec] : SOCIAL_ASSET_SPECS;
  const generated: Partial<SocialMediaAssetUrls> = {
    ...(!targetItemId && { socialProfileUrl: iconOnlyLogoUrl }),
  };
  let masterBytes = generatedMasterBytes;
  try {
    masterBytes ??= (
      await fetchImageWithLimit(masterBannerUrl, SOCIAL_MASTER_MAX_BYTES)
    ).bytes;
  } catch (error) {
    logger.error("Unable to read canonical social master for delivery crops", {
      brandKitId,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      ...generated,
      masterBannerUrl,
      campaignDirection,
      failed: targetItemId
        ? 1
        : specsToGenerate.length + (iconOnlyLogoUrl ? 0 : 1),
      total: targetItemId ? 1 : SOCIAL_MEDIA_ASSET_COUNT,
    };
  }

  if (!masterBytes) {
    throw new PipelineError(
      "Social media kit incomplete: Golden Master bytes are unavailable",
      true,
    );
  }

  const cropResults = await Promise.all(
    specsToGenerate.map(async (spec) => {
      try {
        const url = await cropAndUploadSocialMaster({
          processor: exactImageProcessor,
          storage,
          source: masterBytes,
          brandKitId,
          spec,
        });
        return { spec, url };
      } catch (error) {
        logger.warn("Social master crop failed", {
          brandKitId,
          platform: spec.platform,
          error: error instanceof Error ? error.message : String(error),
        });
        return { spec, url: undefined };
      }
    }),
  );

  for (const result of cropResults) {
    if (result.url) generated[result.spec.outputKey] = result.url;
  }
  const failedCrops = cropResults.filter((result) => !result.url).length;

  return {
    ...generated,
    masterBannerUrl,
    campaignDirection,
    failed: failedCrops + (!targetItemId && !iconOnlyLogoUrl ? 1 : 0),
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
