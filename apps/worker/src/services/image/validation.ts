import type { GenerateImageMessage } from "@quicklogo/shared";
import type { ModelMapping } from "@quicklogo/ai-providers/providers";
import { PipelineError } from "../../core/errors";

export function validateImageGenerationInput(
  message: GenerateImageMessage,
  mapping: ModelMapping,
): void {
  if (!message.prompt || message.prompt.trim() === "") {
    throw new PipelineError("Prompt cannot be empty", false);
  }

  if (message.config.referenceImageUrl && !mapping.capabilities.imageToImage) {
    throw new PipelineError(
      `Model ${mapping.backendModel} does not support image-to-image capabilities`,
      false,
    );
  }
}
