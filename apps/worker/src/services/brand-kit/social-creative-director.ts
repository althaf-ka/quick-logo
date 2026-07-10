import type {
  SocialMediaBrief,
  StructuredBrandContext,
} from "@quicklogo/shared";
import { createLogger } from "@quicklogo/server-telemetry";
import { extractWorkersAiResponseText } from "../../core/ai-response-parser";

const logger = createLogger("worker");
const CREATIVE_MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8" as const;

export interface SocialCreativeDirection {
  id: string;
  title: string;
  rationale: string;
  artworkPrompt: string;
  focalPosition: "center" | "right";
}

const cleanText = (value: unknown, fallback: string, maxLength: number) =>
  typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : fallback;

function fallbackDirections(
  brandName: string,
  context: StructuredBrandContext,
  brief: SocialMediaBrief,
): SocialCreativeDirection[] {
  const paletteLanguage = context.selectedVibes?.join(", ") || "refined";
  const industry = context.industry || "its market";
  return [
    {
      id: "signature-system",
      title: "Signature System",
      rationale: `A restrained, ownable visual system for ${brandName}.`,
      focalPosition: "right",
      artworkPrompt: `Panoramic campaign background for ${brandName}, ${industry}. ${paletteLanguage} visual language, one distinctive brand-relevant motif, premium editorial restraint, strong negative space on the right for a brand signature, seamless edge-to-edge composition.`,
    },
    {
      id: "human-outcome",
      title: "Human Outcome",
      rationale: `Expresses the result customers get rather than illustrating technology literally.`,
      focalPosition: "center",
      artworkPrompt: `Panoramic brand campaign artwork for ${brandName} focused on the human outcome of ${brief.purpose.replaceAll("-", " ")}. ${paletteLanguage}, confident art direction, authentic atmosphere, one clear focal idea, generous negative space, premium commercial finish.`,
    },
  ];
}

export async function createSocialCreativeDirections({
  ai,
  brandName,
  context,
  brief,
}: {
  ai: Ai;
  brandName: string;
  context: StructuredBrandContext;
  brief: SocialMediaBrief;
}): Promise<SocialCreativeDirection[]> {
  const fallback = fallbackDirections(brandName, context, brief);
  const systemPrompt = `You are a senior brand campaign creative director.
Create exactly two DISTINCT panoramic social-header artwork directions.
The image generator will create BACKGROUND ARTWORK ONLY. A layout engine adds the real logo and message later.

Reject generic SaaS imagery: connected blocks, puzzle pieces, circuitry, floating UI cards, dashboards, generic neon shapes, random 3D blobs, handshakes, stock skylines, and logo-derived wallpaper.
Each direction must communicate this specific brand's value through one ownable visual idea. Prefer an authentic subject, material, environment, or editorial metaphor grounded in the industry and audience.
Do not request text, typography, logos, watermarks, frames, rounded panels, cards, mockups, safe-zone guides, or interface elements.
The artwork must be edge-to-edge and composed for a 3:1 panoramic canvas. Keep useful negative space around the center-right, without describing a visible box or safe zone.

Return only JSON:
{"directions":[{"id":"short-slug","title":"2-4 words","rationale":"one sentence","artworkPrompt":"production image prompt","focalPosition":"center|right"},{"id":"short-slug","title":"2-4 words","rationale":"one sentence","artworkPrompt":"production image prompt","focalPosition":"center|right"}]}`;

  const userPrompt = JSON.stringify({
    brandName,
    industry: context.industry,
    audience: context.targetAudience,
    personality: context.brandPersonality,
    vibes: context.selectedVibes,
    additionalContext: context.additionalContext,
    purpose: brief.purpose,
    visualDirection: brief.visualDirection,
    message: brief.message || context.tagline,
  });

  try {
    const response = await ai.run(CREATIVE_MODEL, {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 900,
    });
    const parsed = JSON.parse(extractWorkersAiResponseText(response)) as {
      directions?: Array<Record<string, unknown>>;
    };
    if (!Array.isArray(parsed.directions) || parsed.directions.length < 2) {
      return fallback;
    }

    return parsed.directions.slice(0, 2).map((direction, index) => ({
      id: cleanText(direction.id, fallback[index]?.id || `concept-${index}`, 40)
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-"),
      title: cleanText(
        direction.title,
        fallback[index]?.title || `Direction ${index + 1}`,
        60,
      ),
      rationale: cleanText(
        direction.rationale,
        fallback[index]?.rationale || "Brand-specific campaign direction.",
        180,
      ),
      artworkPrompt: cleanText(
        direction.artworkPrompt,
        fallback[index]?.artworkPrompt || "Premium panoramic brand artwork.",
        1800,
      ),
      focalPosition: direction.focalPosition === "center" ? "center" : "right",
    }));
  } catch (error) {
    logger.warn("Social creative direction failed; using curated fallback", {
      error,
      brandName,
    });
    return fallback;
  }
}
