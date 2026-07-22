import type { BrandKitJsonRequest } from "@quicklogo/ai-providers/prompt";
import { brandGuidelinesRefinementResponseSchema } from "@quicklogo/shared";
import {
  describeWorkersAiResponseShape,
  extractWorkersAiResponseJson,
} from "../../core/ai-response-parser";
import { withRetry } from "../../core/pipeline-helpers";

export const BRAND_GUIDELINES_REFINEMENT_MODEL =
  "@cf/google/gemma-4-26b-a4b-it" as const;

const NULLABLE_STRING_SCHEMA = {
  anyOf: [{ type: "string" }, { type: "null" }],
} as const;

const BRAND_GUIDELINES_REFINEMENT_RESPONSE_FORMAT = {
  type: "json_schema",
  json_schema: {
    name: "brand_guidelines_refinement",
    description:
      "Only the written Brand Guidelines fields affected by the refinement request.",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        missionStatement: NULLABLE_STRING_SCHEMA,
        tagline: NULLABLE_STRING_SCHEMA,
        personality: NULLABLE_STRING_SCHEMA,
        targetAudience: NULLABLE_STRING_SCHEMA,
        industry: NULLABLE_STRING_SCHEMA,
        additionalContext: NULLABLE_STRING_SCHEMA,
        voice: {
          anyOf: [
            {
              type: "object",
              additionalProperties: false,
              properties: {
                traits: { type: "array", items: { type: "string" } },
                dos: { type: "array", items: { type: "string" } },
                donts: { type: "array", items: { type: "string" } },
              },
              required: ["traits", "dos", "donts"],
            },
            { type: "null" },
          ],
        },
      },
      required: [
        "missionStatement",
        "tagline",
        "personality",
        "targetAudience",
        "industry",
        "additionalContext",
        "voice",
      ],
    },
  },
} as const;

export async function generateBrandGuidelinesRefinement({
  ai,
  request,
}: {
  ai: Ai;
  request: BrandKitJsonRequest;
}) {
  return withRetry(
    async () => {
      const response = await ai.run(
        BRAND_GUIDELINES_REFINEMENT_MODEL as Parameters<Ai["run"]>[0],
        {
          messages: request.messages,
          temperature: 0.2,
          max_completion_tokens: request.max_tokens,
          chat_template_kwargs: { enable_thinking: false },
          response_format: BRAND_GUIDELINES_REFINEMENT_RESPONSE_FORMAT,
        },
      );
      const parsed = extractWorkersAiResponseJson(response);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error(
          `Gemma returned an unusable Brand Guidelines response (${describeWorkersAiResponseShape(response)})`,
        );
      }

      const updates = Object.fromEntries(
        Object.entries(parsed).filter(([, value]) => value !== null),
      );
      const validated =
        brandGuidelinesRefinementResponseSchema.safeParse(updates);
      if (!validated.success || Object.keys(validated.data).length === 0) {
        throw new Error("Gemma returned invalid Brand Guidelines updates");
      }

      return validated.data;
    },
    2,
    500,
  );
}
