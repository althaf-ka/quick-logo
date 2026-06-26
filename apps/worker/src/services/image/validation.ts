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

  const isInpaint = message.config.canvasMode === "inpaint";

  // Reject conflicting inputs: mask data sent with a non-inpaint mode
  if (!isInpaint && message.config.maskImageUrl) {
    throw new PipelineError(
      "Mask image was provided but canvas mode is not 'inpaint'",
      false,
    );
  }

  if (isInpaint) {
    if (!message.config.canvasImageUrl) {
      throw new PipelineError("Inpainting requires a canvas image", false);
    }
    if (
      mapping.capabilities.editingStrategy !== "inpaint-with-prompt" &&
      !message.config.maskImageUrl
    ) {
      throw new PipelineError(
        "Inpainting requires a mask image for this model",
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
