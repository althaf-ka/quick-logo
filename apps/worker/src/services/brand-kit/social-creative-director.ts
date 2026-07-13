import type {
  SocialMediaBrief,
  StructuredBrandContext,
} from "@quicklogo/shared";
import type { NormalizedSocials } from "@quicklogo/ai-providers/prompt";
import { createLogger } from "@quicklogo/server-telemetry";
import { extractWorkersAiResponseText } from "../../core/ai-response-parser";

const logger = createLogger("worker");
const CREATIVE_MODEL = "@cf/meta/llama-4-scout-17b-16e-instruct" as const;
const MAX_DIAGNOSTIC_RESPONSE_LENGTH = 6000;

export type SocialPlatform =
  | "instagram"
  | "twitter"
  | "linkedin"
  | "facebook"
  | "youtube";

export interface SocialPlatformRequest {
  platform: SocialPlatform;
  dimensions: string;
  aspectRatio: string;
}

export interface SocialPlatformLayoutPlan {
  platform: SocialPlatform;
  headline: string;
  callToAction: string;
  socialText: string;
  compositionPrompt: string;
}

export interface SocialMasterLayoutPlan {
  headline: string;
  callToAction: string;
  socialText: string;
  compositionPrompt: string;
}

type SocialPlanningContext = Omit<StructuredBrandContext, "socials"> & {
  socials?: NormalizedSocials;
};

export interface SocialCampaignDirection {
  headline: string;
  callToAction: string;
  conceptTitle: string;
  artDirection: string;
}

function logModelResponse(stage: string, model: string, text: string): void {
  // TEMPORARY: remove after the new model prompts have been verified in dev.
  logger.info("Social AI model response (temporary diagnostic)", {
    stage,
    model,
    text: text.slice(0, MAX_DIAGNOSTIC_RESPONSE_LENGTH),
    truncated: text.length > MAX_DIAGNOSTIC_RESPONSE_LENGTH,
  });
}

const cleanText = (value: unknown, fallback: string, maxLength: number) =>
  typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : fallback;

function cleanDisplayCopy(
  value: unknown,
  fallback: string,
  maxLength: number,
): string {
  const normalized = (typeof value === "string" ? value : fallback)
    .replace(/\s+/g, " ")
    .replace(/\b(?:on|in)\s+today\b/gi, "today")
    .replace(/\b([a-z]+)(?:\s+\1\b)+/gi, "$1")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/^["'“”]+|["'“”]+$/g, "")
    .trim();
  if (normalized.length <= maxLength) return normalized;
  const clipped = normalized.slice(0, maxLength + 1);
  return (
    clipped.replace(/\s+\S*$/, "").trim() || normalized.slice(0, maxLength)
  );
}

const PURPOSE_CTA: Record<SocialMediaBrief["purpose"], string> = {
  "brand-awareness": "Discover our story",
  "product-promotion": "Explore the collection",
  launch: "Discover what's new",
  community: "Join the community",
  "personal-brand": "Connect with me",
};

function fallbackDirection(
  brandName: string,
  context: StructuredBrandContext,
  brief: SocialMediaBrief,
): SocialCampaignDirection {
  const suppliedHeadline = brief.message?.trim() || context.tagline?.trim();
  return {
    headline:
      brief.includeTagline && suppliedHeadline
        ? cleanDisplayCopy(suppliedHeadline, "", 64)
        : brief.includeTagline
          ? cleanDisplayCopy(
              `${brandName}, made for what comes next`,
              "Made for what comes next",
              64,
            )
          : "",
    callToAction: cleanDisplayCopy(
      brief.callToAction,
      PURPOSE_CTA[brief.purpose],
      28,
    ),
    conceptTitle: "Signature Campaign",
    artDirection: "",
  };
}

export async function createSocialCampaignDirection({
  ai,
  brandName,
  context,
  brief,
}: {
  ai: Ai;
  brandName: string;
  context: StructuredBrandContext;
  brief: SocialMediaBrief;
}): Promise<SocialCampaignDirection> {
  const fallback = fallbackDirection(brandName, context, brief);
  const systemPrompt = `You are an award-winning senior campaign creative director and meticulous advertising copy editor.
Silently explore at least three distinct campaign concepts, reject the obvious options, and return only the single strongest direction.

The direction must be specific to this brand's promise, audience, personality, and industry. It must translate cleanly into one premium 16:9 hero image. Favor an unexpected but understandable visual metaphor, strong emotional tension, a memorable focal motif, authentic materials, spatial depth, and a sophisticated editorial advertising aesthetic. Build a visual narrative with foreground, midground, and background relationships—not a single object displayed like a product.

Do not return generic mood-board language. Describe the actual hero scene: focal subject, environment, material treatment, lighting, palette behavior, depth, movement, and emotional effect. Avoid isolated objects on pedestals, centered product shots, smoky studio voids, spotlight-on-an-object compositions, luxury marble stages, and empty atmospheric backgrounds. Do not use notebooks, books, pens, gavels, justice scales, paperwork, staged desks, stock offices, handshakes, skylines, floating shapes, generic people posing, or literal industry props. Do not request words, logos, UI, panels, frames, or mockups in the artwork.

Copy rules:
- When includeMessage is true and suppliedMessage is non-empty, professionally correct obvious spelling, filler words, capitalization, and grammar while preserving the intended meaning and tone.
- When includeMessage is true and suppliedMessage is empty, write a specific, attractive headline (maximum 64 characters) based on the brand.
- When includeMessage is false, headline must be an empty string.
- Professionally correct a supplied callToAction without changing its intent. Otherwise create a concise call to action (maximum 28 characters) appropriate to the purpose.
- Never invent social usernames or contact details.
- Prefer natural, confident English. The headline must communicate a recognizable customer benefit, outcome, or brand promise—not an empty word pairing. Reject awkward phrases such as "Join us on today" and vague slogans that do not communicate a clear benefit.

Return only valid JSON matching this exact shape:
{"headline":"approved campaign headline or empty string","callToAction":"concise call to action","conceptTitle":"2-5 word internal concept name","artDirection":"one concrete production-ready hero-scene direction, maximum 450 characters"}`;

  const userPrompt = JSON.stringify({
    brandName,
    industry: context.industry,
    audience: context.targetAudience,
    personality: context.brandPersonality,
    vibes: context.selectedVibes,
    additionalContext: context.additionalContext,
    purpose: brief.purpose,
    visualDirection: brief.visualDirection,
    suppliedMessage: brief.message || context.tagline || "",
    suppliedCallToAction: brief.callToAction || "",
    includeMessage: brief.includeTagline,
    includeLogo: brief.includeLogo,
  });
  try {
    const response = await ai.run(CREATIVE_MODEL, {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.45,
      max_tokens: 1600,
    });
    const responseText = extractWorkersAiResponseText(response);
    logModelResponse("campaign-direction", CREATIVE_MODEL, responseText);
    const parsed: unknown = JSON.parse(responseText);
    if (typeof parsed !== "object" || parsed === null) return fallback;
    const value = parsed as Record<string, unknown>;

    return {
      headline: brief.includeTagline
        ? cleanDisplayCopy(value.headline, fallback.headline, 64)
        : "",
      callToAction: cleanDisplayCopy(
        value.callToAction,
        fallback.callToAction,
        28,
      ),
      conceptTitle: cleanText(value.conceptTitle, fallback.conceptTitle, 60),
      artDirection: cleanText(value.artDirection, fallback.artDirection, 450),
    };
  } catch (error) {
    logger.warn("Social campaign direction failed; using fallback", {
      error: error instanceof Error ? error.message : String(error),
      brandName,
    });
    return fallback;
  }
}

function allowedSocialText(
  socials: NormalizedSocials,
  currentPlatform: SocialPlatform,
): string {
  const maximumAccounts = currentPlatform === "youtube" ? 3 : 2;
  const platformOrder: Array<keyof NormalizedSocials> = [
    "instagram",
    "twitter",
    "linkedin",
    "facebook",
    "youtube",
    "tiktok",
  ];
  return platformOrder
    .filter((platform) => platform !== currentPlatform)
    .flatMap((platform) => {
      const value = socials[platform]?.trim();
      return value ? ([[platform, value]] as const) : [];
    })
    .map(([platform, value]) => {
      const iconName =
        platform === "twitter"
          ? "current official X icon (never the legacy Twitter bird)"
          : `official ${platform} icon`;
      return `${iconName} followed by the exact handle "${value.replace(/^@+/, "").slice(0, 64)}"`;
    })
    .slice(0, maximumAccounts)
    .join("; ");
}

function universalSocialText(socials: NormalizedSocials): string {
  const platformOrder: Array<keyof NormalizedSocials> = [
    "instagram",
    "twitter",
    "linkedin",
    "facebook",
    "youtube",
    "tiktok",
  ];

  return platformOrder
    .flatMap((platform) => {
      const value = socials[platform]?.trim();
      return value ? ([[platform, value]] as const) : [];
    })
    .map(([platform, value]) => {
      const iconName =
        platform === "twitter"
          ? "current official X icon (never the legacy Twitter bird)"
          : `official ${platform} icon`;
      return `${iconName} followed by the exact handle "${value.replace(/^@+/, "").slice(0, 64)}"`;
    })
    .slice(0, 2)
    .join("; ");
}

function fallbackPlatformPlan(
  request: SocialPlatformRequest,
  brief: SocialMediaBrief,
  context: SocialPlanningContext,
): SocialPlatformLayoutPlan {
  const compositionByPlatform: Record<SocialPlatform, string> = {
    instagram:
      "Keep the focal mark centered with generous clear space and no campaign copy.",
    twitter:
      "Preserve the master's visual identity while recomposing it full-bleed for the X delivery crop. Set the headline in the left typography zone, vertically centered inside the crop-safe region, with supporting copy beneath it. Keep the bottom-left profile-overlay area clear. Place one small, understated social row near the lower-right of the same safe region.",
    linkedin:
      "Preserve the master's visual identity while recomposing it full-bleed for a LinkedIn profile cover. Set the headline in the left typography zone, vertically centered inside the crop-safe region, with restrained supporting copy below. Allow generous left inset for the profile overlay. Place one small, understated social row near the lower-right of the same safe region.",
    facebook:
      "Preserve the master's visual identity while recomposing it full-bleed for the responsive Facebook cover. Keep the compact headline, supporting copy, optional logo, and focal subject inside the centered 640 x 312 cross-device intersection. Place one small social row near that safe region's lower-right edge. Fill the full 820 x 360 canvas with background artwork.",
    youtube:
      "Preserve the master's visual identity while recomposing it full-bleed for YouTube. Inside the centered 1546 x 423 safe zone only, place a compact headline on the left half and supporting copy directly beneath. Place one small social row along the lower-right edge of that zone—not the canvas edge. Keep the recognizable focal motif on the right half and render background artwork only outside the zone.",
  };
  return {
    platform: request.platform,
    headline: brief.includeTagline
      ? cleanDisplayCopy(brief.message, context.tagline || "", 64)
      : "",
    callToAction: cleanDisplayCopy(brief.callToAction, "", 28),
    socialText: allowedSocialText(context.socials || {}, request.platform),
    compositionPrompt: compositionByPlatform[request.platform],
  };
}

/**
 * Builds deterministic platform-safe plans. The master is intentionally
 * generated with a stable left typography zone, so a second vision-layout
 * request would add cost and could contradict hard platform safe areas.
 */
export function buildSocialPlatformPlans({
  context,
  brief,
  platforms,
}: {
  context: SocialPlanningContext;
  brief: SocialMediaBrief;
  platforms: readonly SocialPlatformRequest[];
}): SocialPlatformLayoutPlan[] {
  return platforms.map((platform) =>
    fallbackPlatformPlan(platform, brief, context),
  );
}

/**
 * Defines the immutable content and crop-safe composition for the canonical
 * social master. Every platform header is cut from this same rendered image,
 * so the identity row must never vary by destination platform.
 */
export function buildSocialMasterPlan({
  context,
  brief,
}: {
  context: SocialPlanningContext;
  brief: SocialMediaBrief;
}): SocialMasterLayoutPlan {
  return {
    headline: brief.includeTagline
      ? cleanDisplayCopy(brief.message, context.tagline || "", 64)
      : "",
    callToAction: cleanDisplayCopy(brief.callToAction, "", 28),
    socialText: universalSocialText(context.socials || {}),
    compositionPrompt:
      "Inside the centered universal safe band, compose a compact typography group on the left half and the recognizable campaign motif on the right half. Keep the call to action directly beneath the headline, the optional logo as a restrained signature, and one quiet social identity row near the lower-right. Use the surrounding 16:9 area only for continuous atmosphere and nonessential detail.",
  };
}
