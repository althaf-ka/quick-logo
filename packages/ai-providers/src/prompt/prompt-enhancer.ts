import type { GenerateImageMessage } from "@quicklogo/shared";
import { buildBasePrompt } from "./prompt-builder";

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

    const basePrompt = message.config.magicPrompt
      ? await this.rewriteWithLLM(message)
      : message.prompt;

    const built = buildBasePrompt(message, basePrompt, hasReference);

    return {
      finalPrompt: built.prompt,
      negativePrompt: built.negativePrompt,
      ...(message.config.magicPrompt && { enhancedPrompt: basePrompt }),
    };
  }

  private async rewriteWithLLM(message: GenerateImageMessage): Promise<string> {
    const style = message.config.style ?? "professional";
    const palette = message.config.colorPalette ?? "vibrant";
    const hasReference = !!message.config.referenceImageUrl;

    const referenceRules = hasReference
      ? `\n- A reference image is provided. The generated image MUST preserve the exact colors from the reference.
- NEVER mention any specific color names (red, blue, green, etc.) in your output — the colors come ONLY from the reference image.
- Do NOT override the reference colors with the color palette setting.
- Focus only on shapes, composition, typography, and layout — NOT colors.`
      : "";

    try {
      const response = await this.ai.run(PromptEnhancer.LLM_MODEL, {
        messages: [
          {
            role: "system",
            content: `You are an expert prompt engineer for AI logo and brand identity image generation.
Your only job is to rewrite a simple logo description into a vivid, detailed image generation prompt.

Rules:
- Output ONLY the rewritten prompt — no explanation, no preamble, no quotes
- Keep it under 150 words
- Be specific about shapes, composition, and visual style
- Never mention real brand names or copyrighted characters
- Always end with: "professional logo, vector-style, sharp edges, clean design"${referenceRules}`,
          },
          {
            role: "user",
            content: `Rewrite this logo description into a detailed generation prompt.

Description: "${message.prompt}"
Style: ${style}${
              !hasReference
                ? `\nColor palette: ${palette}`
                : "\nColor palette: IGNORED — colors come from the reference image"
            }${
              message.config.customColors?.length && !hasReference
                ? `\nCustom colors: ${message.config.customColors.join(", ")}`
                : ""
            }${hasReference ? "\nCRITICAL: A reference image controls all colors. Do NOT mention any color names." : ""}`,
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
        console.warn("[prompt-enhancer] LLM returned empty — using original");
        return message.prompt;
      }

      return text;
    } catch (error) {
      console.error(
        "[prompt-enhancer] LLM call failed:",
        error instanceof Error ? error.message : error,
      );
      return message.prompt;
    }
  }
}
