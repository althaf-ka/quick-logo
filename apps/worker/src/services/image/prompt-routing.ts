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
  if (!mapping.capabilities.nativePromptEnhancement) {
    const enhanced = await promptEnhancer.enhance(message);
    finalPrompt = enhanced.finalPrompt;
    enhancedPromptText = enhanced.enhancedPrompt;
    negativePrompt = enhanced.negativePrompt;
  }

  const params: GenerationParams = {
    prompt: finalPrompt,
    negativePrompt: negativePrompt || "",
    backendModel: mapping.backendModel,
    ...mapping.defaultParams,
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
