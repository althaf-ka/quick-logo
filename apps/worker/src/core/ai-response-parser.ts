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
      true, // assume retryable if generation failed without explicit fatal error
    );
  }

  return {
    imageData: result.imageData,
    format: result.format || "png",
    duration: result.metadata?.duration,
  };
}
