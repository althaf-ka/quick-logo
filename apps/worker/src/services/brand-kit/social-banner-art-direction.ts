import type { ValidatedBrandContext } from "@quicklogo/ai-providers/prompt";
import type { SocialMediaBrief } from "@quicklogo/shared";
import { createLogger } from "@quicklogo/server-telemetry";
import { extractWorkersAiResponseText } from "../../core/ai-response-parser";
import type { VerifiedSocialCopy } from "./social-banner-copy";

const logger = createLogger("worker");

// Gemma supplies the complete production art direction. Ideogram executes it
// without another prompt rewrite while the worker controls exact visible copy.
export const SOCIAL_ART_DIRECTION_MODEL =
  "@cf/google/gemma-4-26b-a4b-it" as const;

const MAX_DIRECTION_LENGTH = 3000;

const SOCIAL_ART_DIRECTION_RESPONSE_FORMAT = {
  type: "json_schema",
  json_schema: {
    name: "social_master_production_direction",
    description: "One detailed, executable production direction for a banner.",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        creativeIdea: {
          type: "string",
          description:
            "One ownable campaign idea and visual metaphor rooted in the brand promise, audience, and message.",
        },
        heroMoment: {
          type: "string",
          description:
            "The focal subject, action, expression, styling, and decisive frozen moment.",
        },
        composition: {
          type: "string",
          description:
            "Camera viewpoint, lens feel, depth layers, visual path, negative space, and center-safe geometry.",
        },
        environment: {
          type: "string",
          description:
            "Specific environment, supporting objects, atmospheric depth, and meaningful background continuity.",
        },
        visualLanguage: {
          type: "string",
          description:
            "Concrete medium, materials, tactile textures, finish, realism level, and distinctive craft details.",
        },
        colorLighting: {
          type: "string",
          description:
            "How the approved palette becomes motivated key, fill, rim, shadow, atmosphere, and controlled accents.",
        },
        typographyApproach: {
          type: "string",
          description:
            "Exact hierarchy, alignment, negative-space placement, scale relationships, and scene integration by role only.",
        },
        edgeContinuity: {
          type: "string",
          description:
            "How nonessential environment, light, texture, and atmosphere continue through both outer side fields.",
        },
        avoid: {
          type: "array",
          minItems: 2,
          maxItems: 4,
          items: { type: "string" },
        },
      },
      required: [
        "creativeIdea",
        "heroMoment",
        "composition",
        "environment",
        "visualLanguage",
        "colorLighting",
        "typographyApproach",
        "edgeContinuity",
        "avoid",
      ],
    },
  },
} as const;

interface SocialProductionDirectionResponse {
  creativeIdea?: unknown;
  creative_idea?: unknown;
  concept?: unknown;
  heroMoment?: unknown;
  hero_moment?: unknown;
  composition?: unknown;
  environment?: unknown;
  visualLanguage?: unknown;
  visual_language?: unknown;
  colorLighting?: unknown;
  color_lighting?: unknown;
  typographyApproach?: unknown;
  typography_approach?: unknown;
  typographyIntegration?: unknown;
  edgeContinuity?: unknown;
  edge_continuity?: unknown;
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

function normalizeLine(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;

  const candidate = normalized.slice(0, maxLength + 1);
  const sentenceEnd = Math.max(
    candidate.lastIndexOf(". "),
    candidate.lastIndexOf("! "),
    candidate.lastIndexOf("? "),
    candidate.lastIndexOf("; "),
  );
  const cutoff =
    sentenceEnd >= Math.floor(maxLength * 0.35)
      ? sentenceEnd + 1
      : candidate.lastIndexOf(", ") >= Math.floor(maxLength * 0.55)
        ? candidate.lastIndexOf(", ")
        : candidate.lastIndexOf(" ", maxLength);
  const complete = candidate
    .slice(0, Math.max(cutoff, 1))
    .trim()
    .replace(/[,:;\-]+$/, "");
  return /[.!?]$/.test(complete) ? complete : `${complete}.`;
}

function describeColor(value: string): string {
  const match = value.trim().match(/^#([\da-f]{3}|[\da-f]{6})$/i);
  if (!match) return value;
  const expanded =
    match[1].length === 3
      ? [...match[1]].map((character) => character.repeat(2)).join("")
      : match[1];
  const [red, green, blue] = [0, 2, 4].map(
    (offset) => Number.parseInt(expanded.slice(offset, offset + 2), 16) / 255,
  );
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const lightness = (maximum + minimum) / 2;
  const delta = maximum - minimum;
  if (delta < 0.08) {
    if (lightness < 0.18) return "near-black";
    if (lightness < 0.42) return "charcoal gray";
    if (lightness < 0.72) return "soft gray";
    return "near-white";
  }

  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue = 0;
  if (maximum === red) hue = ((green - blue) / delta) % 6;
  else if (maximum === green) hue = (blue - red) / delta + 2;
  else hue = (red - green) / delta + 4;
  hue = (((hue * 60) % 360) + 360) % 360;
  const hueName =
    hue < 15 || hue >= 345
      ? "red"
      : hue < 45
        ? "orange"
        : hue < 70
          ? "gold"
          : hue < 165
            ? "green"
            : hue < 195
              ? "teal"
              : hue < 250
                ? "blue"
                : hue < 285
                  ? "indigo"
                  : hue < 330
                    ? "magenta"
                    : "rose";
  const tone =
    lightness < 0.28
      ? "deep"
      : lightness > 0.78
        ? "pale"
        : saturation > 0.68
          ? "vivid"
          : saturation < 0.35
            ? "muted"
            : "rich";
  return `${tone} ${hueName}`;
}

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function parseJsonObject(
  value: string,
): SocialProductionDirectionResponse | null {
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
    return parsed as SocialProductionDirectionResponse;
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
  line = line.replace(/#(?:[\da-f]{6}|[\da-f]{3})\b/gi, describeColor);
  return normalizeLine(line, maxLength);
}

interface ProductionDirectionFields {
  creativeIdea: string;
  heroMoment: string;
  composition: string;
  environment: string;
  visualLanguage: string;
  colorLighting: string;
  typography: string;
  edgeContinuity: string;
  avoid: string;
}

type PositiveDirectionField = Exclude<keyof ProductionDirectionFields, "avoid">;

const POSITIVE_DIRECTION_FIELDS: readonly PositiveDirectionField[] = [
  "creativeIdea",
  "heroMoment",
  "composition",
  "environment",
  "visualLanguage",
  "colorLighting",
  "typography",
  "edgeContinuity",
];

function extractProductionDirectionFields(
  response: SocialProductionDirectionResponse,
  input: SocialMasterArtDirectionInput,
): ProductionDirectionFields {
  const avoid = Array.isArray(response.avoid)
    ? response.avoid
        .map((item) => sanitizeLine(item, 80, input))
        .filter(Boolean)
        .slice(0, 4)
        .join(", ")
    : sanitizeLine(response.avoid, 240, input);
  return {
    creativeIdea: sanitizeLine(
      firstValue(
        response.creativeIdea,
        response.creative_idea,
        response.concept,
      ),
      320,
      input,
    ),
    heroMoment: sanitizeLine(
      firstValue(response.heroMoment, response.hero_moment),
      320,
      input,
    ),
    composition: sanitizeLine(response.composition, 300, input),
    environment: sanitizeLine(response.environment, 260, input),
    visualLanguage: sanitizeLine(
      firstValue(response.visualLanguage, response.visual_language),
      280,
      input,
    ),
    colorLighting: sanitizeLine(
      firstValue(response.colorLighting, response.color_lighting),
      260,
      input,
    ),
    typography: sanitizeLine(
      firstValue(
        response.typographyApproach,
        response.typography_approach,
        response.typographyIntegration,
      ),
      260,
      input,
    ),
    edgeContinuity: sanitizeLine(
      firstValue(response.edgeContinuity, response.edge_continuity),
      180,
      input,
    ),
    avoid,
  };
}

function formatProductionDirection(fields: ProductionDirectionFields): string {
  const lines = [
    ["Creative idea", fields.creativeIdea],
    ["Hero moment", fields.heroMoment],
    ["Composition", fields.composition],
    ["Environment", fields.environment],
    ["Visual language", fields.visualLanguage],
    ["Color and lighting", fields.colorLighting],
    ["Typography", fields.typography],
    ["Edge continuity", fields.edgeContinuity],
    ["Avoid", fields.avoid],
  ].map(([label, value]) => `${label}: ${value}`);
  return lines.join("\n").slice(0, MAX_DIRECTION_LENGTH);
}

const FORBIDDEN_POSITIVE_PATTERN =
  /\b(?:phone|smartphone|tablet|laptop|computer screen|digital canvas|app interface|floating UI|dashboard|youtube page|brand[- ]guideline|color swatches?|device mockup|presentation board|flat[- ]colors?|flat vectors?|vector[- ]style|maximalis(?:m|t|tic)|doodles?|busy background|creative clutter|split[- ]color)\b/i;

function recoverProductionDirection(
  generated: ProductionDirectionFields,
  fallback: ProductionDirectionFields,
): {
  fields: ProductionDirectionFields;
  acceptedFieldCount: number;
  fallbackFields: PositiveDirectionField[];
  unsafeFields: PositiveDirectionField[];
} {
  const fields = { ...generated };
  const fallbackFields: PositiveDirectionField[] = [];
  const unsafeFields: PositiveDirectionField[] = [];
  let acceptedFieldCount = 0;

  for (const field of POSITIVE_DIRECTION_FIELDS) {
    const value = generated[field];
    const isUnsafe = FORBIDDEN_POSITIVE_PATTERN.test(value);
    if (value.length < 12 || isUnsafe) {
      fields[field] = fallback[field];
      fallbackFields.push(field);
      if (isUnsafe) unsafeFields.push(field);
    } else {
      acceptedFieldCount += 1;
    }
  }
  if (!fields.avoid) fields.avoid = fallback.avoid;

  return { fields, acceptedFieldCount, fallbackFields, unsafeFields };
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

function fallbackProductionDirectionFields({
  brief,
  context,
  productReferenceCount,
}: Omit<SocialMasterArtDirectionInput, "ai">): ProductionDirectionFields {
  const category = context.industry?.trim() || "the brand's category";
  const audience =
    context.targetAudience
      ?.trim()
      .replace(
        /^(?:make (?:this|it) (?:feel |look |like )?(?:right )?for|designed for|targeting|for)\s+/i,
        "",
      ) || "the intended audience";
  const tone = [context.brandPersonality, ...(context.selectedVibes || [])]
    .filter((value): value is string => Boolean(value?.trim()))
    .slice(0, 4)
    .join(", ");
  const subject = productReferenceCount
    ? "the approved product turns raw material into a finished result"
    : `one oversized artifact from ${category} turns raw material into a finished creation`;
  return {
    creativeIdea: `Show the decisive moment when ${subject}. Make the cause, action, and finished result readable as one ownable visual metaphor rather than a generic celebration scene.`,
    heroMoment:
      "Stage one decisive tactile action at the center with believable gesture, expression, wardrobe, material interaction, and a clear foreground detail that rewards close viewing.",
    composition:
      "Use a cinematic asymmetric 16:9 frame with foreground occlusion, a sharply controlled focal plane, layered midground depth, and intentional negative space for the complete copy lockup inside the mobile-safe center.",
    environment: `Stage the scene in a believable ${category} environment relevant to ${audience}, using only meaningful props, atmospheric separation, and continuous surfaces extending naturally into both outer side fields.`,
    visualLanguage: `Create art-directed editorial campaign imagery for ${audience}, suited to ${brief.purpose}${tone ? `, with a ${tone} character` : ""}. Combine tactile materials, controlled realism, refined surface detail, and one surprising scale or material contrast.`,
    colorLighting:
      "Translate the approved palette into motivated key, fill, rim light, dimensional shadows, subtle atmosphere, and selective accents rather than flat color blocks.",
    typography: `Integrate the headline, brand signature, call to action, and${context.hasSocials ? " social identity" : " supporting copy"} as one disciplined hierarchy anchored to intentional negative space, never a centered template.`,
    edgeContinuity:
      "Continue only environment, texture, atmosphere, and light through both sides; keep all essential meaning and typography in the protected center.",
    avoid:
      "flat color fields, generic gradient posters, interface or device mockups, random decorative clutter",
  };
}

/**
 * Turns the complete private brand context into an executable production art
 * direction. Exact display copy is appended later by the worker so Gemma can
 * plan around its meaning without becoming another source of visible text.
 */
export async function createSocialMasterArtDirection(
  input: SocialMasterArtDirectionInput,
): Promise<string> {
  const fallbackFields = fallbackProductionDirectionFields(input);
  const fallback = formatProductionDirection(fallbackFields);
  const planningContext = {
    brand: {
      name: input.brandName,
      industry: input.context.industry,
      promise: input.context.tagline,
      audience: input.context.targetAudience,
      personality: input.context.brandPersonality,
      vibes: input.context.selectedVibes,
      colors: input.context.colors?.map(describeColor),
      userDirection: input.context.additionalContext,
    },
    campaign: {
      purpose: input.brief.purpose,
      visualDirection: input.brief.visualDirection,
    },
    contentRoles: {
      headlineMeaning: input.copy.headline || undefined,
      callToActionMeaning: input.copy.callToAction || undefined,
      revisionDirection: input.copy.additionalInstructions || undefined,
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
            content: `You are a senior campaign art director writing the complete production art direction that an image model will execute literally. Silently develop at least three materially different, brand-specific concepts, reject the predictable options, and return only the strongest single direction. Do not mention alternatives, reasoning, or evaluation.

Use every relevant piece of supplied brand evidence. Make concrete decisions about the campaign metaphor, focal action, subject styling, camera viewpoint, depth layers, environment, meaningful props, material language, realism level, lighting motivation, palette behavior, typography placement, and side-field continuity. Each field must add new executable visual information rather than repeat adjectives. The result must feel commissioned for this exact brand and audience—not reusable stock art. Build one coherent scene in one consistent visual medium; do not combine photography with floating vector graphics, interface fragments, doodles, or unrelated collage elements.

Design for one 16:9 YouTube master whose complete brand signature, headline, call to action, social identity, faces, and essential product details must fit inside the short centered mobile-safe region. Reserve calm, intentional negative space for a compact typography lockup while keeping the hero scene visually dominant and clearly readable. Both outer sides must remain rich, continuous background extension so wider platform reframes can preserve the protected center. Express the palette through motivated lighting, materials, wardrobe, surfaces, and atmosphere—not flat blocks or a divided canvas. The scene must not be a flat color field, split-color composition, centered text template, generic gradient poster, interface, device mockup, guideline sheet, maximalist collage, cluttered prop collection, or abstract decoration without a brand-specific purpose.

The supplied headline and call to action are semantic planning context. Design around their meaning, but never quote, rewrite, paraphrase, or invent visible copy in your response. Never output handles, contact data, raw color codes, field labels from the input, or metadata. Refer only to typography roles and social-identity roles. Never invent a logo, product, claim, interface, or written background detail.

Write every positive field only as desired visual execution. Never mention an unwanted style inside a positive field, even to say it should be avoided; place all exclusions only in "avoid". Keep each positive field to one or two complete, concise sentences.

Return JSON only with exactly: creativeIdea, heroMoment, composition, environment, visualLanguage, colorLighting, typographyApproach, edgeContinuity, avoid. Write dense, production-ready sentences. "avoid" contains two to four short, concept-specific failure modes.`,
          },
          { role: "user", content: JSON.stringify(planningContext) },
        ],
        temperature: 0.72,
        max_completion_tokens: 1800,
        chat_template_kwargs: { enable_thinking: false },
        response_format: SOCIAL_ART_DIRECTION_RESPONSE_FORMAT,
      },
    );
    const responseText = extractWorkersAiResponseText(response);
    const parsed = parseJsonObject(responseText);
    if (!parsed) {
      logger.warn(
        "Social master production direction was unusable; using detailed fallback",
        {
          model: SOCIAL_ART_DIRECTION_MODEL,
          responseShape: describeResponseShape(response),
          responseTextLength: responseText.length,
          reason: "invalid-json",
        },
      );
      return fallback;
    }

    const generatedFields = extractProductionDirectionFields(parsed, input);
    const recovered = recoverProductionDirection(
      generatedFields,
      fallbackFields,
    );
    if (recovered.acceptedFieldCount < 3) {
      logger.warn(
        "Social master production direction had too little usable content; using detailed fallback",
        {
          model: SOCIAL_ART_DIRECTION_MODEL,
          responseShape: describeResponseShape(response),
          responseTextLength: responseText.length,
          acceptedFieldCount: recovered.acceptedFieldCount,
          fallbackFields: recovered.fallbackFields,
          unsafeFields: recovered.unsafeFields,
        },
      );
      return fallback;
    }

    const direction = formatProductionDirection(recovered.fields);

    logger.info("Created social master production direction", {
      model: SOCIAL_ART_DIRECTION_MODEL,
      directionLength: direction.length,
      acceptedFieldCount: recovered.acceptedFieldCount,
      fallbackFields: recovered.fallbackFields,
      unsafeFields: recovered.unsafeFields,
      ...(input.logGeneratedDirection && { direction }),
    });
    return direction;
  } catch (error) {
    logger.warn(
      "Social master production direction failed; using detailed fallback",
      {
        model: SOCIAL_ART_DIRECTION_MODEL,
        error: error instanceof Error ? error.message : String(error),
      },
    );
    return fallback;
  }
}
