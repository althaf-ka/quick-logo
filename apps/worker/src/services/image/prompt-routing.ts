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
    const { editingStrategy } = mapping.capabilities;

    if (editingStrategy === "inpaint-with-prompt") {
      if (!finalPrompt.toLowerCase().includes("figure 1")) {
        finalPrompt = `In Figure 1, ${finalPrompt.charAt(0).toLowerCase() + finalPrompt.slice(1)}. Ensure the rest of the image remains exactly the same.`;
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
    params.referenceStrength = message.config.referenceStrength ?? 50;
  }

  return {
    finalPrompt,
    enhancedPromptText,
    negativePrompt,
    params,
  };
}
