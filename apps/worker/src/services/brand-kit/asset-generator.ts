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
  type SocialCampaignDirection,
} from "./social-creative-director";

import { findReusableLogoVariationUrls } from "./reusable-url-finder";
import type { Database } from "@quicklogo/db";
import {
  normalizeBrandContext,
  type ValidatedBrandContext,
} from "@quicklogo/ai-providers/prompt";

import { createLogger } from "@quicklogo/server-telemetry";

const logger = createLogger("worker");

const LOGO_VARIATION_TIMEOUT_MS = 120000;
const SOCIAL_MEDIA_GENERATION_TIMEOUT_MS = 180000;
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
const FACEBOOK_COVER_SIZE = "820x312"; // ~2.6:1
const YOUTUBE_ART_SIZE = "2560x1440"; // 16:9

export const SOCIAL_MEDIA_ASSET_COUNT = 5;

const SOCIAL_ASSET_SPECS = [
  {
    targetId: "twitter-header",
    platform: "twitter" as const,
    outputKey: "twitterBannerUrl" as const,
    storageKey: "social-twitter-banner",
    dimensions: TWITTER_BANNER_SIZE,
    aspectRatio: "21:9",
    width: 1500,
    height: 500,
  },
  {
    targetId: "linkedin-header",
    platform: "linkedin" as const,
    outputKey: "linkedinBannerUrl" as const,
    storageKey: "social-linkedin-banner",
    dimensions: LINKEDIN_BANNER_SIZE,
    aspectRatio: "21:9",
    width: 1584,
    height: 396,
  },
  {
    targetId: "facebook-header",
    platform: "facebook" as const,
    outputKey: "facebookBannerUrl" as const,
    storageKey: "social-facebook-banner",
    dimensions: FACEBOOK_COVER_SIZE,
    aspectRatio: "21:9",
    width: 820,
    height: 312,
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
  },
] as const;

const placeholder = (size: string, label: string) =>
  `https://placehold.co/${size}/000/FFF?text=${label}`;

function buildPlatformDeliveryUrl(
  sourceUrl: string,
  dimensions: string,
): string {
  try {
    const url = new URL(sourceUrl);
    if (!url.hostname.endsWith("imagekit.io")) return sourceUrl;
    const [width, height] = dimensions.split("x").map(Number);
    if (!width || !height) return sourceUrl;
    const deliveryTransform = `w-${width},h-${height},fo-center,q-90,f-jpg`;
    const existing = url.searchParams.get("tr");
    url.searchParams.set(
      "tr",
      existing ? `${existing},${deliveryTransform}` : deliveryTransform,
    );
    return url.toString();
  } catch {
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
    return {
      socialProfileUrl: iconOnlyLogoUrl,
      failed: iconOnlyLogoUrl ? 0 : 1,
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
  const finalImageMapping = getModelMapping("quick-gpt-image-2");
  const finalImageProvider = createProvider(finalImageMapping, { ai, env });
  const usableExistingMaster =
    existingMasterBannerUrl && !existingMasterBannerUrl.includes("placehold.co")
      ? existingMasterBannerUrl
      : undefined;
  const usableExistingTarget =
    existingTargetAssetUrl && !existingTargetAssetUrl.includes("placehold.co")
      ? existingTargetAssetUrl
      : undefined;
  let masterBannerUrl = targetItemId ? usableExistingMaster : undefined;

  const generateMaster = async (): Promise<string | undefined> => {
    const productReference =
      brief.purpose === "product-promotion" ? productImageUrls?.[0] : undefined;
    return runAssetOrNull(
      (signal) =>
        generateAndUpload(
          masterImageProvider,
          {
            ...masterImageMapping.defaultParams,
            backendModel: masterImageMapping.backendModel,
            prompt: `You are a senior brand campaign art director creating the ONE canonical social-media master background for "${brandName}".

BRAND FACTS — interpret these visually; never render them as text:
- Industry: ${compactPromptValue(normalizedContext.industry, "not specified", 120)}
- Audience: ${compactPromptValue(normalizedContext.targetAudience, "not specified", 280)}
- Personality: ${compactPromptValue(normalizedContext.brandPersonality, "refined and professional", 280)}
- Desired mood: ${compactPromptValue(normalizedContext.selectedVibes?.join(", "), "refined", 180)}
- Requested visual treatment: ${brief.visualDirection}
- Campaign purpose: ${brief.purpose}
- Approved palette: ${normalizedContext.colors?.join(", ") || "use a disciplined, brand-appropriate palette"}
- Additional direction: ${compactPromptValue(normalizedContext.additionalContext, "none", 420)}

CAMPAIGN CONCEPT — use this as the strategic creative hook, then elevate it with your own visual reasoning:
- Concept: ${campaignDirection.conceptTitle}
- Art direction: ${campaignDirection.artDirection || "Invent a distinctive, brand-specific visual metaphor directly from the brand facts above."}

PRODUCTION REQUIREMENTS:
Create one original, immediately memorable campaign key visual that expresses the brand promise without illustrating the industry literally. Treat the campaign concept as strategic intent, not a rigid scene description: improve its composition, originality, material realism, and visual impact where helpful. Create premium editorial advertising art with authentic detail, meaningful foreground-to-background relationships, layered depth, purposeful contrast, controlled cinematic lighting, subtle visual movement, and a sophisticated two-to-four-color palette derived from the approved colors. The image should imply a story, transformation, or point of view at first glance and feel art-directed for a global campaign.

COMPOSITION SYSTEM:
- Reserve the left 40% as calm but visually rich typography space—subtle atmosphere, tonal texture, and depth, never a blank wall or a visible panel.
- Place the signature focal motif center-right, with its essential form still intersecting the centered crop-safe band.
- Keep all essential visual information within the centered middle 76% width and 40% height so it survives wide social crops.
- Extend atmosphere and only nonessential details to every outer edge.
- Use asymmetry, depth cues, scale contrast, selective focus, and material transitions to create visual tension without clutter.
- Make the composition feel dynamic, premium, ownable, and campaign-ready rather than symmetrical product photography.

BACKGROUND ARTWORK ONLY. Render no text, letters, logos, social icons, watermarks, UI, panels, frames, mockups, crop guides, or dimension labels. Avoid literal industry shorthand, generic corporate/AI motifs, isolated product-on-pedestal scenes, staged office stock imagery, and empty studio atmosphere. Do not interpret negative space as a blank half-canvas. The output must look like memorable premium campaign key art—not a reusable background template or literal industry illustration.`,
            width: 2048,
            height: 1152,
            providerOptions: {
              ...(masterImageMapping.defaultParams.providerOptions || {}),
              aspect_ratio: "16:9",
              size: "3K",
              max_images: 1,
              sequential_image_generation: "disabled",
            },
            ...(productReference && {
              referenceImage: productReference,
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
      "social-media:master",
    );
  };

  if (!masterBannerUrl) {
    masterBannerUrl = (await generateMaster()) || usableExistingTarget;
  }

  if (!masterBannerUrl) {
    throw new PipelineError(
      "Social profile kit incomplete: master banner generation failed",
      true,
    );
  }

  const specsToGenerate = selectedSpec ? [selectedSpec] : SOCIAL_ASSET_SPECS;
  const layoutBrief: SocialMediaBrief = {
    ...brief,
    message: campaignDirection.headline || undefined,
    callToAction: campaignDirection.callToAction || undefined,
  };
  const layoutPlans = buildSocialPlatformPlans({
    context: {
      ...creativeContext,
      socials: normalizedContext.socials,
    },
    brief: layoutBrief,
    platforms: specsToGenerate.map((spec) => ({
      platform: spec.platform,
      dimensions: spec.dimensions,
      aspectRatio: spec.aspectRatio,
    })),
  });
  const generated: Partial<SocialMediaAssetUrls> = {
    socialProfileUrl: iconOnlyLogoUrl,
  };
  let failed = iconOnlyLogoUrl ? 0 : 1;

  // Keep provider traffic strictly sequential. Each final image is a direct
  // GPT Image 2 render from the approved master, never an SVG composition.
  for (const spec of specsToGenerate) {
    const plan = layoutPlans.find((item) => item.platform === spec.platform);
    if (!plan) {
      failed++;
      continue;
    }
    const isTargetRefinement = !!targetItemId && !!usableExistingTarget;
    const artworkReference = isTargetRefinement
      ? usableExistingTarget
      : masterBannerUrl;
    const references = brief.includeLogo
      ? [artworkReference, sourceLogoUrl]
      : [artworkReference];
    const logoInstruction = brief.includeLogo
      ? "Figure 2 is the exact approved logo. Place it once, unchanged, undistorted, fully legible, and with generous clear space. Do not redraw or retype it."
      : "Do not add any logo, wordmark, emblem, or invented brand mark.";
    const typographyInstruction = `Use ${headingFont || "a refined brand-appropriate display typeface"} for the headline and ${bodyFont || "a clean complementary sans-serif"} for supporting copy. Match the selected brand typography's character, weight, spacing, and hierarchy consistently.`;
    const platformSafetyInstruction =
      spec.platform === "youtube"
        ? "YOUTUBE DELIVERY REQUIREMENT: compose for a 2560 x 1440 canvas. Keep every critical element—including headline, call to action, social identities, and optional logo—fully inside the centered 1546 x 423 pixel safe zone. Outside that zone, render background artwork only. Keep the result visually calm and balanced on desktop, mobile, and television."
        : `Keep all critical elements inside the centered safe area for the requested ${spec.dimensions} platform crop.`;
    const approvedCopy = [
      plan.headline ? `Headline: "${plan.headline}"` : "",
      plan.callToAction ? `Call to action: "${plan.callToAction}"` : "",
    ].filter(Boolean);
    const url = await runAssetOrNull(
      (signal) =>
        generateAndUpload(
          finalImageProvider,
          {
            ...finalImageMapping.defaultParams,
            backendModel: finalImageMapping.backendModel,
            prompt: `${isTargetRefinement ? "Refine" : "Create"} the final production-ready ${spec.platform} banner for the ${spec.dimensions} (${spec.aspectRatio}) platform crop.

Figure 1 is ${isTargetRefinement ? "the current approved platform banner" : "the approved canonical campaign master"} and its artwork is PIXEL-LOCKED. Use it as the full-bleed background. Do not regenerate, reinterpret, replace, move, remove, redraw, crop out, or repaint its focal motif, palette, lighting, texture, or environment. ${isTargetRefinement && refinementPrompt ? `Apply this requested revision precisely while preserving everything unrelated: ${compactPromptValue(refinementPrompt, "", 700)}` : "Your job is limited to adding the approved typography, requested social identities, and optional approved logo."} Do not present it inside a mockup.

${logoInstruction}

TYPOGRAPHY SYSTEM:
${typographyInstruction}

PLATFORM SAFETY:
${platformSafetyInstruction}

LAYOUT PLAN:
${plan.compositionPrompt}

${approvedCopy.length > 0 ? `RENDER ONLY THIS APPROVED COPY, spelled exactly as written:\n${approvedCopy.join("\n")}` : "Do not render a headline or call to action."}

${plan.socialText ? `SOCIAL IDENTITY ROW: ${plan.socialText}. Render each official platform icon followed only by its exact handle. Make this row a quiet tertiary detail: icons and handles approximately 55–65% of the supporting-copy size, optically aligned, evenly spaced, and positioned near the lower-right edge with 4–6% safe padding. Do not spell platform names and do not render an @ symbol. For YouTube, measure this lower-right placement against the centered 1546 x 423 safe zone, never the full canvas.` : "Do not render social icons, handles, platform names, or an @ symbol."}

Make all approved copy highly legible, professionally typeset, correctly spelled, and naturally integrated with the artwork. Keep the call to action as restrained supporting text—never a large button, pill, outlined control, or dominant element. Never invent or repeat text, usernames, URLs, contact details, claims, logos, or unrequested icons. No crop guides, safe-area boxes, borders, UI, watermarks, or dimension labels. Keep all identity and typography inside the safe area for the requested platform crop. Deliver only the finished edge-to-edge asset.`,
            referenceImages: references,
            canvasMode: "img2img",
            width: spec.width,
            height: spec.height,
            providerOptions: {
              ...(finalImageMapping.defaultParams.providerOptions || {}),
              quality: "low",
            },
            signal,
          },
          storage,
          `${ASSET_ROOT}/${brandKitId}/${spec.storageKey}`,
          signal,
        ),
      SOCIAL_MEDIA_GENERATION_TIMEOUT_MS,
      `social-media:${spec.platform}`,
    );

    if (url) {
      generated[spec.outputKey] = buildPlatformDeliveryUrl(
        url,
        spec.dimensions,
      );
    } else failed++;
  }

  return {
    ...generated,
    masterBannerUrl,
    campaignDirection,
    failed,
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
