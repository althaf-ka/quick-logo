import type { GenerateImageMessage } from "@quicklogo/shared";
import { createLogger } from "@quicklogo/server-telemetry";
import { buildBasePrompt } from "./prompt-builder";
import { matchIndustryProfile } from "./industry-profiles";
import {
  GENERATE_EXAMPLES,
  EDIT_EXAMPLES,
  formatExamples,
} from "./prompt-examples";

const logger = createLogger("ai-providers");

// ── System Prompts ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT_GENERATE = `You are a senior logo designer translating client briefs into precise AI image generation prompts.

Internally reason through these aspects in order:
- Subject/symbol: what is the primary icon or mark?
- Composition: how are elements arranged?
- Typography: how does the brand name integrate (if provided)?
- Style: what rendering approach matches the requested style?
- Color: how are colors applied to specific elements?

Then output ONE natural flowing prompt that covers all of the above.

CRITICAL RULES:
- Describe a single logo mark — never multiple logos, scenes, or compositions
- The logo must work at small sizes — avoid tiny details, fine textures, or small text
- NEVER describe realistic photographs, human faces, hands, landscapes, or 3D scenes
- NEVER add text the user didn't ask for — only include brand name if one is provided
- Keep the prompt concise while including enough detail for reliable image generation
- Output ONLY the prompt — no labels, no numbering, no explanations, no preamble`;

const SYSTEM_PROMPT_EDIT = `You are an expert AI tasked with interpreting edit instructions for an existing logo.
The user will provide a short instruction on how to modify their current logo.
Your job is to output a complete, vivid visual description of what the logo should look like AFTER this edit is applied, keeping the original core subject intact.

CRITICAL RULES:
- ONLY apply the specific changes the user requested
- If they ask to "make the background green", do NOT change the main subject
- Preserve the original subject conceptually and only alter what is explicitly mentioned
- Keep the prompt concise while including enough detail for reliable image generation
- Output ONLY the rewritten prompt — no explanation, no preamble, no quotes
- Never mention real brand names or copyrighted characters
- Always end with: "professional logo, vector-style, sharp edges, clean design"`;

// ── Prompt Sanitizer ────────────────────────────────────────────────────────

/**
 * Strips common LLM output artifacts that would degrade image model performance.
 * Handles preambles, fenced code blocks, numbered lists, label prefixes, and
 * wrapping quotes that LLMs reliably emit despite instructions not to.
 */
function sanitizeLLMOutput(text: string): string {
  let cleaned = text.trim();

  // Strip "Here's the prompt:" / "Final prompt:" style preambles FIRST,
  // so the code fence regex's ^ anchor can match after preamble removal.
  cleaned = cleaned.replace(
    /^(?:(?:here(?:'s| is)|final) (?:the |your |an? )?(?:improved |rewritten |enhanced |detailed )?prompt[:\s]*)/i,
    "",
  );
  cleaned = cleaned.trim();

  // Strip fenced code blocks (```...``` or ```json...```)
  cleaned = cleaned.replace(/^```(?:\w+)?\s*\n?([\s\S]*?)\n?\s*```$/g, "$1");

  // Strip wrapping quotes
  cleaned = cleaned.replace(/^["']|["']$/g, "");

  // Strip numbered list prefixes (1. Subject: ...)
  cleaned = cleaned.replace(/^\d+\.\s*/gm, "");

  // Strip label prefixes (Subject: ..., Style: ...)
  cleaned = cleaned.replace(
    /^(?:subject|composition|typography|style|color|output):\s*/gim,
    "",
  );

  // Collapse newlines and multiple spaces
  cleaned = cleaned.replace(/\n+/g, " ").replace(/\s{2,}/g, " ");

  return cleaned.trim();
}

// ── Prompt Enhancer ─────────────────────────────────────────────────────────

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

    // We should respect the magicPrompt toggle even for edits.
    // This allows passing raw instructions (like "add text OMINGLE") to the model
    // which is the professional way to handle instruct-based models or standard inpainting.
    const shouldRewrite = message.config.magicPrompt;

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

    // Build system prompt with few-shot examples
    const baseSystemPrompt = isEdit
      ? SYSTEM_PROMPT_EDIT
      : SYSTEM_PROMPT_GENERATE;

    const examples = isEdit ? EDIT_EXAMPLES : GENERATE_EXAMPLES;

    const systemPrompt = `${baseSystemPrompt}${referenceRules}\n\nEXAMPLES:\n\n${formatExamples(examples)}`;

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
        }${hasReference ? "\nCRITICAL: A reference image controls all colors. Do NOT mention any color names." : ""}${this.buildIndustryContext(message.prompt, hasReference)}`;

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
        temperature: hasReference ? 0.2 : 0.25,
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

      return sanitizeLLMOutput(text);
    } catch (error) {
      logger.error("LLM call failed", error, {
        originalPrompt: message.prompt,
      });
      return message.prompt;
    }
  }

  /**
   * Builds industry context hints for the LLM user prompt.
   * Provides symbol ideas and color suggestions to guide the LLM rewrite.
   */
  private buildIndustryContext(prompt: string, hasReference: boolean): string {
    const industry = matchIndustryProfile(prompt);
    if (!industry) return "";

    const parts: string[] = [];

    if (industry.symbolSuggestions.length > 0) {
      parts.push(
        `\nIndustry symbol ideas (use as inspiration, not mandatory): ${industry.symbolSuggestions.join(", ")}`,
      );
    }

    if (!hasReference && industry.colorSuggestions.length > 0) {
      parts.push(
        `Industry color direction: ${industry.colorSuggestions.join(", ")}`,
      );
    }

    return parts.join("\n");
  }
}
