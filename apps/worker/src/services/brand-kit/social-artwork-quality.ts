import { createLogger } from "@quicklogo/server-telemetry";
import { extractWorkersAiResponseText } from "../../core/ai-response-parser";
import type { SocialCreativeDirection } from "./social-creative-director";
import { fetchImageAsDataUrl } from "../../core/bounded-image-fetch";

const logger = createLogger("worker");
const VISION_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct" as const;
const MAX_QA_IMAGE_BYTES = 10 * 1024 * 1024;

export interface SocialArtworkCandidate {
  url: string;
  direction: SocialCreativeDirection;
}

export interface SocialArtworkQuality {
  reviewed: boolean;
  score: number;
  brandRelevance: number;
  composition: number;
  genericness: number;
  hasForbiddenElements: boolean;
  notes: string;
}

function clampScore(value: unknown, fallback: number): number {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric)
    ? Math.max(0, Math.min(100, Math.round(numeric)))
    : fallback;
}

async function scoreCandidate(
  ai: Ai,
  candidate: SocialArtworkCandidate,
  brandContext: string,
): Promise<SocialArtworkQuality> {
  try {
    const dataUrl = await fetchImageAsDataUrl(
      candidate.url,
      MAX_QA_IMAGE_BYTES,
    );
    const response = await ai.run(VISION_MODEL, {
      messages: [
        {
          role: "system",
          content: `You are a strict creative director reviewing panoramic social-header BACKGROUND ARTWORK.
Score the image for brand relevance, professional campaign composition, useful negative space, and originality.
Penalize generic SaaS imagery, connected blocks, puzzle pieces, circuitry, random 3D objects, stock scenes, visible cards, frames, rounded panels, mockups, text, logos, fake UI, watermarks, and safe-zone graphics.
The artwork must work edge-to-edge in a 3:1 banner. A separate layout engine adds logo and typography later.
Return JSON only: {"score":0,"brandRelevance":0,"composition":0,"genericness":0,"hasForbiddenElements":false,"notes":"short actionable review"}.
genericness is 0 for original/specific and 100 for generic.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Brand context: ${brandContext}\nConcept: ${candidate.direction.title}\nRationale: ${candidate.direction.rationale}`,
            },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 350,
    });
    const parsed = JSON.parse(extractWorkersAiResponseText(response)) as Record<
      string,
      unknown
    >;
    return {
      reviewed: true,
      score: clampScore(parsed.score, 50),
      brandRelevance: clampScore(parsed.brandRelevance, 50),
      composition: clampScore(parsed.composition, 50),
      genericness: clampScore(parsed.genericness, 50),
      hasForbiddenElements: parsed.hasForbiddenElements === true,
      notes:
        typeof parsed.notes === "string"
          ? parsed.notes.slice(0, 300)
          : "Automated review completed.",
    };
  } catch (error) {
    logger.warn("Social artwork QA failed", {
      error,
      conceptId: candidate.direction.id,
    });
    return {
      reviewed: false,
      score: 50,
      brandRelevance: 50,
      composition: 50,
      genericness: 50,
      hasForbiddenElements: false,
      notes: "Quality review unavailable; selected using generation order.",
    };
  }
}

export async function selectBestSocialArtwork({
  ai,
  candidates,
  brandContext,
}: {
  ai: Ai;
  candidates: SocialArtworkCandidate[];
  brandContext: string;
}): Promise<{
  candidate: SocialArtworkCandidate;
  quality: SocialArtworkQuality;
  reviews: SocialArtworkQuality[];
}> {
  if (candidates.length === 0) {
    throw new Error("No social artwork candidates were generated");
  }
  const reviews: SocialArtworkQuality[] = [];
  for (const candidate of candidates) {
    reviews.push(await scoreCandidate(ai, candidate, brandContext));
  }
  let winnerIndex = 0;
  let winnerScore = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < candidates.length; index++) {
    const review = reviews[index];
    if (!review) continue;
    const adjustedScore =
      review.score -
      review.genericness * 0.35 -
      (review.hasForbiddenElements ? 30 : 0);
    if (adjustedScore > winnerScore) {
      winnerIndex = index;
      winnerScore = adjustedScore;
    }
  }
  return {
    candidate: candidates[winnerIndex] as SocialArtworkCandidate,
    quality: reviews[winnerIndex] as SocialArtworkQuality,
    reviews,
  };
}
