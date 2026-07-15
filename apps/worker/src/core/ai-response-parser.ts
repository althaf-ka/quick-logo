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

function parseJsonText(text: string): unknown | null {
  const cleaned = cleanAiResponse(text);
  if (!cleaned) return null;

  try {
    return JSON.parse(cleaned) as unknown;
  } catch {
    return null;
  }
}

/**
 * Extracts structured JSON from the response shapes used by Workers AI's
 * native and OpenAI-compatible APIs. JSON mode may return the schema object
 * directly instead of serializing it into a text field.
 */
export function extractWorkersAiResponseJson(
  response: unknown,
): unknown | null {
  if (typeof response === "string") return parseJsonText(response);
  if (!response || typeof response !== "object") return null;

  const res = response as Record<string, unknown>;

  if (Array.isArray(res.choices)) {
    for (const choice of res.choices) {
      if (!choice || typeof choice !== "object") continue;
      const message = (choice as Record<string, unknown>).message;
      if (!message || typeof message !== "object") continue;
      const content = (message as Record<string, unknown>).content;
      if (typeof content === "string") {
        const parsed = parseJsonText(content);
        if (parsed !== null) return parsed;
      }
      if (content && typeof content === "object" && !Array.isArray(content)) {
        return content;
      }
      if (Array.isArray(content)) {
        for (const part of content) {
          if (!part || typeof part !== "object") continue;
          const text = (part as Record<string, unknown>).text;
          if (typeof text !== "string") continue;
          const parsed = parseJsonText(text);
          if (parsed !== null) return parsed;
        }
      }
    }
  }

  if ("response" in res) {
    if (typeof res.response === "string") return parseJsonText(res.response);
    if (res.response && typeof res.response === "object") return res.response;
  }

  if (typeof res.output_text === "string") {
    const parsed = parseJsonText(res.output_text);
    if (parsed !== null) return parsed;
  }

  if (Array.isArray(res.output)) {
    for (const item of res.output) {
      if (!item || typeof item !== "object") continue;
      const content = (item as Record<string, unknown>).content;
      if (!Array.isArray(content)) continue;
      for (const part of content) {
        if (!part || typeof part !== "object") continue;
        const text = (part as Record<string, unknown>).text;
        if (typeof text !== "string") continue;
        const parsed = parseJsonText(text);
        if (parsed !== null) return parsed;
      }
    }
  }

  if (typeof res.result === "string") return parseJsonText(res.result);
  if (res.result && typeof res.result === "object") return res.result;

  const knownWrapperKeys = [
    "choices",
    "output",
    "output_text",
    "response",
    "result",
    "usage",
  ];
  return knownWrapperKeys.some((key) => key in res) ? null : res;
}

export function describeWorkersAiResponseShape(response: unknown): string {
  if (response === null) return "null";
  if (Array.isArray(response)) return "array";
  if (typeof response !== "object") return typeof response;

  const keys = [
    "choices",
    "output",
    "output_text",
    "reasoning",
    "response",
    "result",
    "usage",
  ].filter((key) => key in response);
  return keys.length ? `object(${keys.join(",")})` : "object(direct)";
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
