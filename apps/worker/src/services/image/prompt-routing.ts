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
  } else {
    const modifiers = promptEnhancer.applyModifiersOnly(message);
    finalPrompt = modifiers.finalPrompt;
    negativePrompt = modifiers.negativePrompt;
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

      // Use a stricter regex to ensure they are actually referencing the source image,
      // rather than just using common words like "stick figure" or "based on true events".
      const hasExplicitReference =
        /\b(?:based on|using|preserve|keep)(?:\s+(?:the|this|provided))?\s+(?:image|figure|picture|original)\b/i.test(
          finalPrompt,
        );

      if (!hasExplicitReference) {
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
    providerOptions: {
      ...mapping.defaultParams.providerOptions,
      ...(message.config.nativeStyle && {
        nativeStyle: message.config.nativeStyle,
      }),
    },
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
