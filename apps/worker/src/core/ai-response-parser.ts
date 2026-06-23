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
    const res = response as Record<string, any>;

    // 1. OpenAI-compatible format (choices array)
    if (Array.isArray(res.choices) && res.choices.length > 0) {
      const message = res.choices[0].message || {};

      // Check content, reasoning_content, and reasoning (some gemma models use this)
      const rawContent =
        message.content || message.reasoning_content || message.reasoning || "";

      if (typeof rawContent === "string" && rawContent.length > 0) {
        return cleanAiResponse(rawContent);
      }
    }

    // 2. Standard legacy Workers AI format
    if ("response" in res && typeof res.response === "string") {
      return cleanAiResponse(res.response);
    }

    if ("result" in res && typeof res.result === "string") {
      return cleanAiResponse(res.result);
    }
  }

  return "{}";
}
