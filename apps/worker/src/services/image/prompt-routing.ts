import type { GenerateImageMessage } from "@quicklogo/shared";
import type { ModelMapping } from "@quicklogo/ai-providers/providers";
import type { GenerationParams } from "@quicklogo/ai-providers/types";
import { PromptEnhancer } from "@quicklogo/ai-providers/prompt";

export interface PromptRouteResult {
  finalPrompt: string;
  enhancedPromptText?: string;
  negativePrompt?: string;
  params: GenerationParams;
}

export async function routePromptAndBuildParams(
  message: GenerateImageMessage,
  mapping: ModelMapping,
  promptEnhancer: PromptEnhancer,
): Promise<PromptRouteResult> {
  let finalPrompt = message.prompt;
  let enhancedPromptText: string | undefined;
  let negativePrompt: string | undefined;

  // If the model does not support native enhancement (Alchemy/etc.), we process it locally.
  // The PromptEnhancer will respect the magicPrompt flag to either use an LLM or just apply base formatting.
  if (!mapping.capabilities.nativePromptEnhancement) {
    const enhanced = await promptEnhancer.enhance(message);
    finalPrompt = enhanced.finalPrompt;
    enhancedPromptText = enhanced.enhancedPrompt;
    negativePrompt = enhanced.negativePrompt;
  }

  // Model-agnostic prompt engineering based on editing capabilities
  if (message.config.canvasMode === "inpaint") {
    const { editingStrategy, promptTemplate } = mapping.capabilities;

    if (editingStrategy === "inpaint-with-prompt") {
      const hasMask = !!message.config.maskImageUrl;

      const usesFigure = promptTemplate?.figureNaming === "figure-number";
      const label = usesFigure ? "Figure" : "Image";

      const prefix = hasMask
        ? `${label} 1 is the base image. ${label} 2 is a mask highlighting the target region. Exclusively within that highlighted region in ${label} 1,`
        : (promptTemplate?.prefix ?? "In the image,");

      const suffix = hasMask
        ? `Do not alter the unmasked areas of ${label} 1.`
        : (promptTemplate?.suffix ??
          "Ensure any existing text, logos, and brand elements remain exactly unchanged. Do not alter the unedited portions of the image.");

      if (
        !finalPrompt.toLowerCase().includes(`${label.toLowerCase()} 1`) &&
        !finalPrompt.toLowerCase().includes("in the image")
      ) {
        finalPrompt = `${prefix} ${finalPrompt.charAt(0).toLowerCase() + finalPrompt.slice(1)}. ${suffix}`;
      }
    }
  }

  if (
    message.config.canvasMode === "img2img" &&
    mapping.capabilities.imageToImage
  ) {
    const { editingStrategy, promptTemplate } = mapping.capabilities;

    // Check if the model has explicitly defined img2img templates, or if it's a remix model that needs defaults
    if (
      promptTemplate?.img2imgPrefix ||
      promptTemplate?.img2imgSuffix ||
      editingStrategy === "remix-image"
    ) {
      const usesFigure = promptTemplate?.figureNaming === "figure-number";
      const label = usesFigure ? "Figure" : "Image";

      const prefix =
        promptTemplate?.img2imgPrefix ??
        `Based on the provided ${label.toLowerCase()},`;
      const suffix =
        promptTemplate?.img2imgSuffix ??
        "Keep the core subject and composition intact.";

      if (
        !finalPrompt.toLowerCase().includes(`${label.toLowerCase()}`) &&
        !finalPrompt.toLowerCase().includes("based on") &&
        !finalPrompt.toLowerCase().includes("the image")
      ) {
        finalPrompt = `${prefix} ${finalPrompt.charAt(0).toLowerCase() + finalPrompt.slice(1)}. ${suffix}`;
      }
    }
  }

  const params: GenerationParams = {
    prompt: finalPrompt,
    negativePrompt: negativePrompt || "",
    backendModel: mapping.backendModel,
    magicPrompt: message.config.magicPrompt,
    ...mapping.defaultParams,
    maskImage: message.config.maskImageUrl,
    canvasImage: message.config.canvasImageUrl,
    canvasMode: message.config.canvasMode,
  };

  if (mapping.capabilities.imageToImage && message.config.referenceImageUrl) {
    params.referenceImage = message.config.referenceImageUrl;
  }

  const MAX_PROMPT_CHARS = 1500;
  if (finalPrompt.length > MAX_PROMPT_CHARS) {
    console.warn(
      `[Prompt Routing] Final prompt is ${finalPrompt.length} chars (max recommended: ${MAX_PROMPT_CHARS}). ` +
        `Model: ${mapping.backendModel}. This may cause truncation or degraded results.`,
    );
  }

  return {
    finalPrompt,
    enhancedPromptText,
    negativePrompt,
    params,
  };
}
