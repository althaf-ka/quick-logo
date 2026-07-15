import { buildBrandKitTypographyRequest } from "@quicklogo/ai-providers/prompt";
import { createLogger } from "@quicklogo/server-telemetry";

const logger = createLogger("worker");

export const TYPOGRAPHY_MODEL = "@cf/google/gemma-4-26b-a4b-it" as const;

const TYPOGRAPHY_RESPONSE_FORMAT = {
  type: "json_schema",
  json_schema: {
    name: "brand_kit_typography",
    description: "One validated Google Fonts heading and body pairing.",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        heading: {
          type: "object",
          additionalProperties: false,
          properties: {
            family: { type: "string", minLength: 1, maxLength: 80 },
            weight: { type: "string", pattern: "^[1-9]00$" },
            name: { type: "string", minLength: 1, maxLength: 80 },
          },
          required: ["family", "weight", "name"],
        },
        body: {
          type: "object",
          additionalProperties: false,
          properties: {
            family: { type: "string", minLength: 1, maxLength: 80 },
            weight: { type: "string", pattern: "^[1-9]00$" },
            name: { type: "string", minLength: 1, maxLength: 80 },
          },
          required: ["family", "weight", "name"],
        },
      },
      required: ["heading", "body"],
    },
  },
} as const;

export interface TypographySelectionInput {
  ai: Ai;
  brandName: string;
  description: string;
  typographyStyleHint: string;
  typographyStyleKey?: string;
  industry?: string;
  tagline?: string;
  targetAudience?: string;
  selectedVibes?: string[];
  brandPersonality?: string;
}

/**
 * Selects the brand's Google Fonts pairing independently of any optional
 * deliverable. Social-media generation may reuse the result, but does not
 * control whether this request runs.
 */
export async function runTypographySelectionRequest({
  ai,
  ...brandContext
}: TypographySelectionInput): Promise<unknown | null> {
  try {
    const { messages } = buildBrandKitTypographyRequest(brandContext);
    return await ai.run(TYPOGRAPHY_MODEL as Parameters<Ai["run"]>[0], {
      messages,
      temperature: 0.2,
      max_completion_tokens: 500,
      chat_template_kwargs: {
        enable_thinking: false,
      },
      response_format: TYPOGRAPHY_RESPONSE_FORMAT,
    });
  } catch (error) {
    logger.warn("Typography generation failed; using fallback", {
      model: TYPOGRAPHY_MODEL,
      error: error instanceof Error ? error.message : String(error),
      prefix: "typography-selection",
    });
    return null;
  }
}
