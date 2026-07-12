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
        ? suppliedHeadline.slice(0, 120)
        : brief.includeTagline
          ? `${brandName}, made for what comes next`
          : "",
    callToAction:
      brief.callToAction?.trim().slice(0, 40) || PURPOSE_CTA[brief.purpose],
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
- When includeMessage is true and suppliedMessage is empty, write a specific, attractive headline (maximum 90 characters) based on the brand.
- When includeMessage is false, headline must be an empty string.
- Professionally correct a supplied callToAction without changing its intent. Otherwise create a concise call to action (maximum 32 characters) appropriate to the purpose.
- Never invent social usernames or contact details.
- Prefer natural, confident English. Reject awkward phrases such as "Join us on today" or vague slogans that do not communicate a clear benefit.

Return only valid JSON matching this exact shape:
{"headline":"approved campaign headline or empty string","callToAction":"concise call to action","conceptTitle":"2-5 word internal concept name","artDirection":"one concrete production-ready hero-scene direction, maximum 900 characters"}`;

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
        ? cleanText(value.headline, fallback.headline, 120)
        : "",
      callToAction: cleanText(value.callToAction, fallback.callToAction, 40),
      conceptTitle: cleanText(value.conceptTitle, fallback.conceptTitle, 80),
      artDirection: cleanText(value.artDirection, fallback.artDirection, 900),
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
  return Object.entries(socials)
    .filter(
      (entry): entry is [keyof NormalizedSocials, string] =>
        entry[0] !== currentPlatform && !!entry[1]?.trim(),
    )
    .map(
      ([platform, value]) =>
        `official ${platform} icon followed by the exact handle "${value.trim().replace(/^@+/, "")}"`,
    )
    .slice(0, 3)
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
      "Use the master unchanged. Set the headline in the upper-left typography zone and supporting copy beneath it. Keep the bottom-left profile-overlay area clear. Place one small, understated social row near the lower-right edge with safe padding.",
    linkedin:
      "Use the master unchanged. Set the headline in the upper-left typography zone with restrained supporting copy below. Allow generous left inset for profile overlays. Place one small, understated social row near the lower-right edge with safe padding.",
    facebook:
      "Use the master unchanged. Set a compact headline and supporting copy in the left typography zone. Place one small, understated social row near the lower-right edge, inset enough to survive the 820 x 312 crop.",
    youtube:
      "Use the master unchanged. Inside the centered 1546 x 423 safe zone only, place the headline on the left half and supporting copy directly beneath. Place one small, understated social row along the lower-right edge of that safe zone—not the canvas edge. Keep the focal motif on the right half of the safe zone and render background artwork only outside it.",
  };
  return {
    platform: request.platform,
    headline: brief.includeTagline
      ? (brief.message || context.tagline || "").trim().slice(0, 100)
      : "",
    callToAction: (brief.callToAction || "").trim().slice(0, 40),
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
