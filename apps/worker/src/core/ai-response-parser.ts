import { AiProviderError } from "./errors";
import type { GenerationResult } from "@quicklogo/ai-providers/types";

export function parseAndValidateAiResponse(result: GenerationResult): {
  imageData: Uint8Array;
  format: string;
  duration?: number;
} {
  if (!result.success || !result.imageData) {
    throw new AiProviderError(
      result.error ?? "Generation returned no image data",
      result.isRetryable ?? true, // use provider's retryable flag, fallback to true
    );
  }

  return {
    imageData: result.imageData,
    format: result.format || "png",
    duration: result.metadata?.duration,
  };
}

/**
 * Cleans an AI response string by removing markdown code blocks and
 * extracting the first valid JSON object if present.
 */
export function cleanAiResponse(text: string): string {
  let cleaned = text.trim();

  // Remove markdown code blocks if present (e.g., ```json ... ```)
  cleaned = cleaned.replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/g, "$1");

  // If the string still contains potential JSON, try to extract the outermost {} block
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0].trim();
  }

  return cleaned;
}

/**
 * Robustly extracts the JSON or text content from various Workers AI response formats.
 * Handles legacy formats, OpenAI-compatible formats, and "thinking" models
 * that use 'reasoning' or 'reasoning_content' fields.
 */
export function extractWorkersAiResponseText(response: unknown): string {
  if (!response) return "{}";

  if (typeof response === "string") {
    return cleanAiResponse(response);
  }

  if (typeof response === "object" && response !== null) {
    const res = response as Record<string, unknown>;

    // 1. OpenAI-compatible format (choices array)
    if (Array.isArray(res.choices) && res.choices.length > 0) {
      const firstChoice = res.choices[0];
      const message =
        typeof firstChoice === "object" && firstChoice !== null
          ? (firstChoice as Record<string, unknown>).message
          : undefined;
      const messageRecord =
        typeof message === "object" && message !== null
          ? (message as Record<string, unknown>)
          : {};

      // Check content, reasoning_content, and reasoning (some gemma models use this)
      const rawContent =
        messageRecord.content ||
        messageRecord.reasoning_content ||
        messageRecord.reasoning ||
        "";

      if (typeof rawContent === "string" && rawContent.length > 0) {
        return cleanAiResponse(rawContent);
      }
    }

    // 2. Workers AI Responses API format (used by GPT-OSS models).
    if (typeof res.output_text === "string") {
      return cleanAiResponse(res.output_text);
    }
    if (Array.isArray(res.output)) {
      for (const item of res.output) {
        if (typeof item !== "object" || item === null) continue;
        const content = (item as Record<string, unknown>).content;
        if (!Array.isArray(content)) continue;
        for (const part of content) {
          if (typeof part !== "object" || part === null) continue;
          const text = (part as Record<string, unknown>).text;
          if (typeof text === "string" && text.length > 0) {
            return cleanAiResponse(text);
          }
        }
      }
    }

    // 3. Standard Workers AI format. JSON mode may return an object directly.
    if ("response" in res) {
      if (typeof res.response === "string") {
        return cleanAiResponse(res.response);
      }
      if (typeof res.response === "object" && res.response !== null) {
        return JSON.stringify(res.response);
      }
    }

    if ("result" in res && typeof res.result === "string") {
      return cleanAiResponse(res.result);
    }
  }

  return "{}";
}
