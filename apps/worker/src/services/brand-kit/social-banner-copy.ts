import type { SocialMediaBrief } from "@quicklogo/shared";
import type { ValidatedBrandContext } from "@quicklogo/ai-providers/prompt";
import { createLogger } from "@quicklogo/server-telemetry";
import { extractWorkersAiResponseText } from "../../core/ai-response-parser";

const logger = createLogger("worker");
const COPY_REVIEW_MODEL = "@cf/meta/llama-3.2-3b-instruct" as const;

export interface VerifiedSocialCopy {
  headline: string;
  callToAction: string;
  additionalInstructions: string;
}

const HEADLINE_MAX_LENGTH = 64;
const CALL_TO_ACTION_MAX_LENGTH = 28;

const normalizeCopy = (value: unknown, fallback: string, maxLength: number) => {
  if (typeof value !== "string") return fallback;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, maxLength) : fallback;
};

function editDistance(left: string, right: string): number {
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex++) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex++) {
      current[rightIndex] = Math.min(
        (current[rightIndex - 1] ?? 0) + 1,
        (previous[rightIndex] ?? 0) + 1,
        (previous[rightIndex - 1] ?? 0) +
          (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[right.length] ?? 0;
}

const protectedTokens = (value: string) =>
  value.match(/(?:https?:\/\/|www\.)\S+|@[\w.-]+|\b\d+(?:[.,]\d+)*\b/gi) || [];

const normalizeReview = (
  value: unknown,
  original: string,
  maxLength: number,
) => {
  if (!original) return "";
  const reviewed = normalizeCopy(value, original, maxLength);
  if (
    JSON.stringify(protectedTokens(reviewed)) !==
    JSON.stringify(protectedTokens(original))
  ) {
    return original;
  }
  const changeRatio =
    editDistance(original, reviewed) / Math.max(original.length, 1);
  return changeRatio <= 0.4 ? reviewed : original;
};

function fallbackCopy(
  brief: SocialMediaBrief,
  context: ValidatedBrandContext,
  refinementPrompt?: string,
): VerifiedSocialCopy {
  return {
    headline: brief.includeTagline
      ? normalizeCopy(brief.message || context.tagline, "", HEADLINE_MAX_LENGTH)
      : "",
    callToAction: normalizeCopy(
      brief.callToAction,
      "",
      CALL_TO_ACTION_MAX_LENGTH,
    ),
    additionalInstructions: normalizeCopy(
      [context.additionalContext, refinementPrompt].filter(Boolean).join("\n"),
      "",
      700,
    ),
  };
}

/**
 * Reviews only user-authored banner copy. It is deliberately not a creative
 * direction step: it may repair obvious language errors, but it cannot invent
 * copy, alter identifiers, or redesign the user's message.
 */
export async function verifySocialBannerCopy({
  ai,
  brief,
  context,
  refinementPrompt,
}: {
  ai: Ai;
  brief: SocialMediaBrief;
  context: ValidatedBrandContext;
  refinementPrompt?: string;
}): Promise<VerifiedSocialCopy> {
  const fallback = fallbackCopy(brief, context, refinementPrompt);
  if (
    !fallback.headline &&
    !fallback.callToAction &&
    !fallback.additionalInstructions
  ) {
    return fallback;
  }

  try {
    const response = await ai.run(COPY_REVIEW_MODEL, {
      messages: [
        {
          role: "system",
          content: `You are a conservative advertising proofreader. Correct only clear spelling, punctuation, capitalization, and grammar errors in user-supplied banner text. Preserve meaning, tone, names, numbers, URLs, @handles, product terms, and the user's language. Do not improve the marketing, invent copy, add claims, translate, summarize, or remove instructions. Empty input must remain empty. Return JSON only with exactly these string fields: headline, callToAction, additionalInstructions.`,
        },
        {
          role: "user",
          content: JSON.stringify(fallback),
        },
      ],
      temperature: 0,
      max_tokens: 500,
    });
    const parsed: unknown = JSON.parse(extractWorkersAiResponseText(response));
    if (!parsed || typeof parsed !== "object") return fallback;
    const result = parsed as Record<string, unknown>;

    return {
      headline: normalizeReview(
        result.headline,
        fallback.headline,
        HEADLINE_MAX_LENGTH,
      ),
      callToAction: normalizeReview(
        result.callToAction,
        fallback.callToAction,
        CALL_TO_ACTION_MAX_LENGTH,
      ),
      additionalInstructions: normalizeReview(
        result.additionalInstructions,
        fallback.additionalInstructions,
        700,
      ),
    };
  } catch (error) {
    logger.warn("Social banner copy review failed; preserving original copy", {
      error: error instanceof Error ? error.message : String(error),
    });
    return fallback;
  }
}
