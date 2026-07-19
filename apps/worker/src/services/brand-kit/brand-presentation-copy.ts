import { buildBrandPresentationTextRequest } from "@quicklogo/ai-providers/prompt";
import { createLogger } from "@quicklogo/server-telemetry";
import { extractWorkersAiResponseJson } from "../../core/ai-response-parser";
import { withRetry } from "../../core/pipeline-helpers";

const logger = createLogger("worker");

export const BRAND_PRESENTATION_COPY_MODEL =
  "@cf/google/gemma-4-26b-a4b-it" as const;

const BRAND_PRESENTATION_COPY_RESPONSE_FORMAT = {
  type: "json_schema",
  json_schema: {
    name: "brand_presentation_copy",
    description: "A concise description for a visual brand presentation.",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        description: {
          type: "string",
          minLength: 1,
          maxLength: 300,
        },
      },
      required: ["description"],
    },
  },
} as const;

export interface BrandPresentationCopyInput {
  ai: Ai;
  brandName: string;
  description: string;
  industry?: string;
  targetAudience?: string;
  selectedVibes?: string[];
  brandPersonality?: string;
}

export async function generateBrandPresentationDescription({
  ai,
  ...brandContext
}: BrandPresentationCopyInput): Promise<string | undefined> {
  try {
    const { messages } = buildBrandPresentationTextRequest(brandContext);
    const response = await withRetry(
      () =>
        ai.run(BRAND_PRESENTATION_COPY_MODEL as Parameters<Ai["run"]>[0], {
          messages,
          temperature: 0.2,
          max_completion_tokens: 180,
          chat_template_kwargs: {
            enable_thinking: false,
          },
          response_format: BRAND_PRESENTATION_COPY_RESPONSE_FORMAT,
        }),
      2,
      500,
    );
    const parsed = extractWorkersAiResponseJson(response);

    if (!parsed || typeof parsed !== "object") {
      return undefined;
    }

    const description = Reflect.get(parsed, "description");
    if (typeof description !== "string" || !description.trim()) {
      return undefined;
    }

    return description.trim();
  } catch (error) {
    logger.warn("Brand presentation copy generation failed; using context", {
      model: BRAND_PRESENTATION_COPY_MODEL,
      error: error instanceof Error ? error.message : String(error),
      prefix: "brand-presentation-copy",
    });
    return undefined;
  }
}
