import type { GenerateImageMessage } from "@quicklogo/shared";
import { createLogger } from "@quicklogo/server-telemetry";
import { buildBasePrompt } from "./prompt-builder";

const logger = createLogger("ai-providers");

/**
 * Single entry point for prompt construction.
 *
 *  magicPrompt OFF → buildBasePrompt (static modifiers only)
 *  magicPrompt ON  → LLM rewrite → buildBasePrompt modifiers on top
 */
export class PromptEnhancer {
  private static readonly LLM_MODEL: keyof AiModels =
    "@cf/meta/llama-3.1-8b-instruct-fp8" as const;

  constructor(private ai: Ai) {}

  async enhance(message: GenerateImageMessage) {
    const hasReference = !!message.config.referenceImageUrl;

    // For edits, ALWAYS use LLM rewrite regardless of magicPrompt flag.
    // Edit instructions like "add green bg" must be expanded into full visual
    // descriptions or V2 models produce gibberish from vague 2-word prompts.
    const shouldRewrite = message.config.magicPrompt || message.isEdit;

    const basePrompt = shouldRewrite
      ? await this.rewriteWithLLM(message)
      : message.prompt;

    const built = buildBasePrompt(message, basePrompt, hasReference);

    return {
      finalPrompt: built.prompt,
      negativePrompt: built.negativePrompt,
      ...(shouldRewrite && { enhancedPrompt: basePrompt }),
    };
  }

  private async rewriteWithLLM(message: GenerateImageMessage): Promise<string> {
    const style = message.config.style ?? "professional";
    const palette = message.config.colorPalette ?? "vibrant";
    const hasReference = !!message.config.referenceImageUrl;

    const isEdit = message.isEdit;

    const referenceRules =
      hasReference && !isEdit
        ? `\n- A reference image is provided. The generated image MUST preserve the exact colors from the reference.
- NEVER mention any specific color names (red, blue, green, etc.) in your output — the colors come ONLY from the reference image.
- Do NOT override the reference colors with the color palette setting.
- Focus only on shapes, composition, typography, and layout — NOT colors.`
        : hasReference && isEdit
          ? `\n- A reference image is provided representing the current logo.
- You MAY change colors, styles, or compositions if the user requests it.
- Keep the core un-edited elements intact.`
          : "";

    const systemPrompt = isEdit
      ? `You are an expert AI tasked with interpreting edit instructions for an existing logo.
The user will provide a short instruction on how to modify their current logo.
Your job is to output a complete, vivid visual description of what the logo should look like AFTER this edit is applied, keeping the original core subject intact.

Rules:
- CRITICAL: ONLY apply the specific changes the user requested. If they ask to "make the background green", do NOT change the main subject (e.g., if it's an owl, describe an owl, do not describe a leaf). Preserve the original subject conceptually and only alter what is explicitly mentioned in the edit instruction.
- Output ONLY the rewritten detailed prompt — no explanation, no preamble, no quotes
- Keep it under 150 words
- Be specific about shapes, composition, and visual style
- Never mention real brand names or copyrighted characters
- Always end with: "professional logo, vector-style, sharp edges, clean design"${referenceRules}`
      : `You are an expert prompt engineer for AI logo and brand identity image generation.
Your only job is to rewrite a simple logo description into a vivid, detailed image generation prompt.

Rules:
- Output ONLY the rewritten prompt — no explanation, no preamble, no quotes
- Keep it under 150 words
- Be specific about shapes, composition, and visual style
- Never mention real brand names or copyrighted characters (except the provided Brand Name)
- Always end with: "professional logo, vector-style, sharp edges, clean design"${referenceRules}`;

    const userPrompt = isEdit
      ? `Rewrite this instruction into a complete detailed visual description of the final edited logo.

Edit Instruction: "${message.prompt}"
Style: ${style}
${
  message.config.customColors?.length
    ? `Custom colors: ${message.config.customColors.join(", ")}`
    : `Color palette: ${palette}`
}`
      : `Rewrite this logo description into a detailed generation prompt.

Description: "${message.prompt}"
Style: ${style}
${message.config.brandName ? `Brand Name: "${message.config.brandName}" (Incorporate this text into the logo UNLESS the description explicitly asks for an icon-only logo, no text, or an abbreviation)\n` : ""}${
          !hasReference
            ? `Color palette: ${palette}`
            : "Color palette: IGNORED — colors come from the reference image"
        }${
          message.config.customColors?.length && !hasReference
            ? `\nCustom colors: ${message.config.customColors.join(", ")}`
            : ""
        }${hasReference ? "\nCRITICAL: A reference image controls all colors. Do NOT mention any color names." : ""}`;

    try {
      const response = await this.ai.run(PromptEnhancer.LLM_MODEL, {
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        max_tokens: 250,
        temperature: hasReference ? 0.4 : 0.7,
      });

      const text =
        typeof response === "object" &&
        response !== null &&
        "response" in response
          ? String((response as { response: string }).response).trim()
          : null;

      if (!text || text.length < 10) {
        logger.warn("LLM returned empty — using original", {
          originalPrompt: message.prompt,
        });
        return message.prompt;
      }

      return text;
    } catch (error) {
      logger.error("LLM call failed", error, {
        originalPrompt: message.prompt,
      });
      return message.prompt;
    }
  }
}
