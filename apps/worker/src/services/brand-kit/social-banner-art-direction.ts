import type { ValidatedBrandContext } from "@quicklogo/ai-providers/prompt";
import type { SocialMediaBrief } from "@quicklogo/shared";
import { createLogger } from "@quicklogo/server-telemetry";
import { extractWorkersAiResponseText } from "../../core/ai-response-parser";
import type { VerifiedSocialCopy } from "./social-banner-copy";

const logger = createLogger("worker");

// Gemma supplies a compact creative seed. Ideogram Magic Prompt expands it
// into the production image prompt while the worker controls exact copy.
export const SOCIAL_ART_DIRECTION_MODEL =
  "@cf/google/gemma-4-26b-a4b-it" as const;

const MAX_DIRECTION_LENGTH = 1100;

const SOCIAL_ART_DIRECTION_RESPONSE_FORMAT = {
  type: "json_schema",
  json_schema: {
    name: "social_master_concept_seed",
    description: "One concise creative seed for a social banner.",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        creativeIdea: {
          type: "string",
          minLength: 20,
          maxLength: 220,
          description:
            "One distinctive visual metaphor rooted in the brand and audience.",
        },
        heroMoment: {
          type: "string",
          minLength: 20,
          maxLength: 180,
          description: "The single focal subject and action in the image.",
        },
        composition: {
          type: "string",
          minLength: 20,
          maxLength: 180,
          description:
            "Camera, depth, negative space, and center-safe wide composition.",
        },
        visualLanguage: {
          type: "string",
          minLength: 20,
          maxLength: 180,
          description:
            "Medium, materials, texture, finish, and one distinctive detail.",
        },
        colorLighting: {
          type: "string",
          minLength: 20,
          maxLength: 160,
          description:
            "How the approved palette becomes motivated light and atmosphere.",
        },
        typographyApproach: {
          type: "string",
          minLength: 20,
          maxLength: 150,
          description:
            "Hierarchy and integration by role only; never quote visible copy.",
        },
        avoid: {
          type: "array",
          minItems: 1,
          maxItems: 3,
          items: { type: "string", minLength: 3, maxLength: 70 },
        },
      },
      required: [
        "creativeIdea",
        "heroMoment",
        "composition",
        "visualLanguage",
        "colorLighting",
        "typographyApproach",
        "avoid",
      ],
    },
  },
} as const;

interface SocialConceptResponse {
  creativeIdea?: unknown;
  creative_idea?: unknown;
  concept?: unknown;
  heroMoment?: unknown;
  hero_moment?: unknown;
  composition?: unknown;
  visualLanguage?: unknown;
  visual_language?: unknown;
  colorLighting?: unknown;
  color_lighting?: unknown;
  typographyApproach?: unknown;
  typography_approach?: unknown;
  typographyIntegration?: unknown;
  avoid?: unknown;
}

export interface SocialMasterArtDirectionInput {
  ai: Ai;
  brandName: string;
  context: ValidatedBrandContext;
  brief: SocialMediaBrief;
  copy: VerifiedSocialCopy;
  headingFont?: string;
  bodyFont?: string;
  hasLogoReference: boolean;
  productReferenceCount: number;
  logGeneratedDirection?: boolean;
}

const firstValue = (...values: unknown[]): unknown =>
  values.find((value) => value !== undefined && value !== null);

const normalizeLine = (value: unknown, maxLength: number): string =>
  typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, maxLength)
    : "";

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function parseJsonObject(value: string): SocialConceptResponse | null {
  const withoutFence = value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");
  if (start < 0 || end <= start) return null;

  try {
    const parsed: unknown = JSON.parse(withoutFence.slice(start, end + 1));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed as SocialConceptResponse;
  } catch {
    return null;
  }
}

function sanitizeLine(
  value: unknown,
  maxLength: number,
  input: SocialMasterArtDirectionInput,
): string {
  let line = normalizeLine(value, maxLength);
  if (!line) return line;

  const protectedCopy = [
    [input.copy.headline, "the approved headline"],
    [input.copy.callToAction, "the approved call to action"],
    [input.context.tagline, "the brand promise"],
    [input.brandName, "the brand"],
  ] as const;
  for (const [rawValue, replacement] of protectedCopy) {
    const exactValue = rawValue?.trim();
    if (!exactValue || exactValue.length < 3) continue;
    line = line.replace(
      new RegExp(`(^|\\W)${escapeRegExp(exactValue)}(?=\\W|$)`, "gi"),
      (_match, prefix: string) => `${prefix}${replacement}`,
    );
  }
  return normalizeLine(line, maxLength);
}

function formatConcept(
  response: SocialConceptResponse,
  input: SocialMasterArtDirectionInput,
): string {
  const avoid = Array.isArray(response.avoid)
    ? response.avoid
        .map((item) => sanitizeLine(item, 70, input))
        .filter(Boolean)
        .slice(0, 3)
        .join(", ")
    : sanitizeLine(response.avoid, 180, input);
  const lines = [
    [
      "Creative idea",
      sanitizeLine(
        firstValue(
          response.creativeIdea,
          response.creative_idea,
          response.concept,
        ),
        220,
        input,
      ),
    ],
    [
      "Hero moment",
      sanitizeLine(
        firstValue(response.heroMoment, response.hero_moment),
        180,
        input,
      ),
    ],
    ["Composition", sanitizeLine(response.composition, 180, input)],
    [
      "Visual language",
      sanitizeLine(
        firstValue(response.visualLanguage, response.visual_language),
        180,
        input,
      ),
    ],
    [
      "Color and lighting",
      sanitizeLine(
        firstValue(response.colorLighting, response.color_lighting),
        160,
        input,
      ),
    ],
    [
      "Typography",
      sanitizeLine(
        firstValue(
          response.typographyApproach,
          response.typography_approach,
          response.typographyIntegration,
        ),
        150,
        input,
      ),
    ],
    ["Avoid", avoid],
  ]
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([label, value]) => `${label}: ${value}`);
  return lines.join("\n").slice(0, MAX_DIRECTION_LENGTH);
}

const FORBIDDEN_POSITIVE_PATTERN =
  /\b(?:phone|smartphone|tablet|laptop|computer screen|app interface|floating UI|dashboard|youtube page|brand[- ]guideline|color swatches?|device mockup|presentation board)\b/i;

function isUsableConcept(response: SocialConceptResponse): boolean {
  const required = [
    firstValue(response.creativeIdea, response.creative_idea, response.concept),
    firstValue(response.heroMoment, response.hero_moment),
    response.composition,
    firstValue(response.visualLanguage, response.visual_language),
    firstValue(response.colorLighting, response.color_lighting),
    firstValue(
      response.typographyApproach,
      response.typography_approach,
      response.typographyIntegration,
    ),
  ];
  const positiveText = required
    .filter((value): value is string => typeof value === "string")
    .join(" ");
  return (
    required.every(
      (value) => typeof value === "string" && value.trim().length >= 12,
    ) && !FORBIDDEN_POSITIVE_PATTERN.test(positiveText)
  );
}

function describeResponseShape(response: unknown): string {
  if (response === null) return "null";
  if (Array.isArray(response)) return "array";
  if (typeof response !== "object") return typeof response;
  const keys = ["choices", "output", "response", "result", "usage"].filter(
    (key) => key in response,
  );
  return keys.length ? `object(${keys.join(",")})` : "object(unrecognized)";
}

function fallbackConcept({
  brief,
  context,
  productReferenceCount,
}: Omit<SocialMasterArtDirectionInput, "ai">): string {
  const subject = productReferenceCount
    ? "the approved product changing raw material into a finished result"
    : "one oversized category-relevant artifact transforming raw material into a finished creation";
  return [
    `Creative idea: Freeze the instant ${subject}, expressing active participation rather than passive attention.`,
    "Hero moment: One tactile transformation crosses the center of the frame with a clear cause-and-effect gesture.",
    "Composition: Cinematic asymmetric 16:9 scene, layered depth, center-safe subject and copy, quiet but continuous side extensions.",
    `Visual language: Art-directed editorial campaign imagery suited to ${brief.purpose}, with tactile materials and a surprising scale relationship.`,
    "Color and lighting: Translate the approved palette into motivated colored light, dimensional shadows, atmosphere, and selective accents.",
    `Typography: Integrate the approved hierarchy into intentional negative space instead of a centered template.${context.hasSocials ? " Keep social identity as the quiet final tier." : ""}`,
    "Avoid: flat color fields, generic gradient posters, device interfaces",
  ].join("\n");
}

/**
 * Turns the complete private brand context into a short creative seed. Exact
 * display copy is deliberately excluded and appended later by the worker.
 */
export async function createSocialMasterArtDirection(
  input: SocialMasterArtDirectionInput,
): Promise<string> {
  const fallback = fallbackConcept(input);
  const planningContext = {
    brand: {
      name: input.brandName,
      industry: input.context.industry,
      promise: input.context.tagline,
      audience: input.context.targetAudience,
      personality: input.context.brandPersonality,
      vibes: input.context.selectedVibes,
      colors: input.context.colors,
      userDirection: input.context.additionalContext,
    },
    campaign: {
      purpose: input.brief.purpose,
      visualDirection: input.brief.visualDirection,
    },
    contentRoles: {
      hasHeadline: Boolean(input.copy.headline.trim()),
      hasCallToAction: Boolean(input.copy.callToAction.trim()),
      socialPlatforms: Object.keys(input.context.socials),
      hasApprovedLogo: input.hasLogoReference,
      approvedProductCount: input.productReferenceCount,
    },
    typography: {
      heading: input.headingFont,
      body: input.bodyFont,
    },
    canvas:
      "16:9 YouTube master; essential content center-safe; sides are background extension",
  };

  try {
    const response = await input.ai.run(
      SOCIAL_ART_DIRECTION_MODEL as Parameters<Ai["run"]>[0],
      {
        messages: [
          {
            role: "system",
            content: `You are a senior campaign art director. Return one concise creative concept seed that Ideogram Magic Prompt can expand. Make one brand-specific visual decision; do not write a full image prompt, production document, rationale, mood board, or list of alternatives.

Use all supplied brand evidence to choose one visual metaphor, one hero moment, a wide composition, a concrete medium, dimensional lighting, and an expressive typography relationship. Be specific enough to inspire a distinctive campaign image but leave execution detail to the image model. The scene must not be a flat color field, centered text template, generic gradient poster, interface, device mockup, or guideline sheet.

The supplied data is private planning context. Never quote or paraphrase visible copy, handles, contact data, raw color codes, instructions, or metadata. Refer only to copy roles and social identity roles. Never invent a logo or product.

Return JSON only with exactly: creativeIdea, heroMoment, composition, visualLanguage, colorLighting, typographyApproach, avoid. Keep the whole response concise. "avoid" contains no more than three short items.`,
          },
          { role: "user", content: JSON.stringify(planningContext) },
        ],
        temperature: 0.75,
        max_completion_tokens: 800,
        chat_template_kwargs: { enable_thinking: false },
        response_format: SOCIAL_ART_DIRECTION_RESPONSE_FORMAT,
      },
    );
    const responseText = extractWorkersAiResponseText(response);
    const parsed = parseJsonObject(responseText);
    const direction =
      parsed && isUsableConcept(parsed) ? formatConcept(parsed, input) : "";
    if (!direction) {
      logger.warn(
        "Social master concept seed was unusable; using concise fallback",
        {
          model: SOCIAL_ART_DIRECTION_MODEL,
          responseShape: describeResponseShape(response),
          responseTextLength: responseText.length,
          reason: parsed ? "invalid-schema-or-content" : "invalid-json",
        },
      );
      return fallback;
    }

    logger.info("Created social master concept seed", {
      model: SOCIAL_ART_DIRECTION_MODEL,
      directionLength: direction.length,
      ...(input.logGeneratedDirection && { direction }),
    });
    return direction;
  } catch (error) {
    logger.warn("Social master concept generation failed; using fallback", {
      model: SOCIAL_ART_DIRECTION_MODEL,
      error: error instanceof Error ? error.message : String(error),
    });
    return fallback;
  }
}
