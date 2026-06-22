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

  const isInpaint =
    message.config.canvasMode === "inpaint" || !!message.config.maskImageUrl;

  if (isInpaint) {
    if (!message.config.canvasImageUrl || !message.config.maskImageUrl) {
      throw new PipelineError(
        "Inpainting requires both a canvas image and a mask image",
        false,
      );
    }
  }

  if (isInpaint && !mapping.capabilities.inpaint) {
    throw new PipelineError(
      `Model ${mapping.backendModel} does not support inpainting capabilities`,
      false,
    );
  }

  if (
    message.config.referenceImageUrl &&
    !isInpaint &&
    !mapping.capabilities.imageToImage
  ) {
    throw new PipelineError(
      `Model ${mapping.backendModel} does not support image-to-image capabilities`,
      false,
    );
  }
}
