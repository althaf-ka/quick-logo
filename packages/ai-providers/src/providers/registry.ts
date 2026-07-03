import type { ModelId } from "@quicklogo/shared";
import type { AIProvider } from "../types";
import { WorkersAIProvider } from "./workers-ai";
import { LeonardoProvider } from "./leonardo";
import { ReplicateProvider } from "./replicate";

export interface ModelMapping {
  provider: "workers-ai" | "leonardo" | "replicate";
  inputType: "json" | "multipart";
  backendModel: string;
  capabilities: {
    nativePromptEnhancement: boolean;
    imageToImage: boolean;
    inpaint?: boolean;
    editingStrategy?: "inpaint-with-mask" | "remix-image" | "remix-image-array";
    /** Mask polarity: "standard" = white=inpaint, "inverted" = black=inpaint */
    maskPolarity?: "standard" | "inverted";
    apiSchema?: "v1" | "v2";
    /** Prompt template config */
    promptTemplate?: {
      /** Prefix for img2img mode */
      img2imgPrefix?: string;
      /** Suffix for img2img mode */
      img2imgSuffix?: string;
      /** Convention for naming images in prompts */
      figureNaming?: "figure-number" | "image-number";
    };
  };
  defaultParams: {
    steps?: number;
    width?: number;
    height?: number;
    guidance?: number;
    providerOptions?: Record<string, unknown>;
  };
}

const MODEL_REGISTRY: Record<ModelId, ModelMapping> = {
  "quick-v1": {
    provider: "workers-ai",
    inputType: "json",
    backendModel: "@cf/stabilityai/stable-diffusion-xl-base-1.0",
    capabilities: {
      nativePromptEnhancement: false,
      imageToImage: false,
    },
    defaultParams: { steps: 20, width: 512, height: 512 },
  },
  "quick-hd": {
    provider: "workers-ai",
    inputType: "multipart",
    backendModel: "@cf/black-forest-labs/flux-2-klein-9b",
    capabilities: {
      nativePromptEnhancement: false,
      imageToImage: false,
    },
    defaultParams: { width: 512, height: 512 },
  },
  "quick-pro": {
    provider: "workers-ai",
    inputType: "json",
    backendModel: "@cf/leonardo/phoenix-1.0",
    capabilities: {
      nativePromptEnhancement: false,
      imageToImage: false,
    },
    defaultParams: { width: 512, height: 512, guidance: 2, steps: 25 },
  },
  "quick-remix": {
    provider: "workers-ai",
    inputType: "json",
    backendModel: "@cf/runwayml/stable-diffusion-v1-5-img2img",
    capabilities: {
      nativePromptEnhancement: false,
      imageToImage: true,
    },
    defaultParams: { steps: 20, guidance: 7.5 },
  },
  "quick-leo-fast": {
    provider: "replicate",
    inputType: "json",
    backendModel: "black-forest-labs/flux-1.1-pro",
    capabilities: {
      nativePromptEnhancement: true,
      imageToImage: true,
      inpaint: false,
      editingStrategy: "remix-image",
      promptTemplate: {
        img2imgPrefix: "Based on the provided image,",
        img2imgSuffix: "Keep the core subject and composition intact.",
      },
    },
    defaultParams: {
      width: 1024,
      height: 1024,
    },
  },
  "quick-ideogram": {
    provider: "replicate",
    inputType: "json",
    backendModel: "ideogram-ai/ideogram-v3-turbo",
    capabilities: {
      nativePromptEnhancement: true,
      imageToImage: false,
      inpaint: true,
      editingStrategy: "inpaint-with-mask",
      maskPolarity: "inverted",
    },
    defaultParams: {
      width: 1024,
      height: 1024,
    },
  },
  "quick-seedream": {
    provider: "replicate",
    inputType: "json",
    backendModel: "bytedance/seedream-4.5",
    capabilities: {
      nativePromptEnhancement: true,
      imageToImage: true,
      inpaint: false,
      editingStrategy: "remix-image-array",
      promptTemplate: {
        img2imgPrefix: "Based on Figure 1,",
        img2imgSuffix: "Keep the core subject and composition intact.",
        figureNaming: "figure-number",
      },
    },
    defaultParams: {
      width: 1024,
      height: 1024,
    },
  },
  "quick-gpt-image-2": {
    provider: "replicate",
    inputType: "json",
    backendModel: "openai/gpt-image-2",
    capabilities: {
      nativePromptEnhancement: true,
      imageToImage: true,
      inpaint: false,
      editingStrategy: "remix-image-array",
      promptTemplate: {
        img2imgPrefix: "Based on the provided image,",
        img2imgSuffix: "Keep the core subject and composition intact.",
      },
    },
    defaultParams: {
      width: 1024,
      height: 1024,
    },
  },
  "quick-imagen": {
    provider: "replicate",
    inputType: "json",
    backendModel: "google/imagen-4",
    capabilities: {
      nativePromptEnhancement: false,
      imageToImage: false,
    },
    defaultParams: {
      width: 1024,
      height: 1024,
    },
  },
  "quick-flux-fill": {
    provider: "replicate",
    inputType: "json",
    backendModel: "black-forest-labs/flux-fill-pro",
    capabilities: {
      nativePromptEnhancement: true,
      imageToImage: false,
      inpaint: true,
      editingStrategy: "inpaint-with-mask",
      maskPolarity: "standard",
    },
    defaultParams: {
      width: 1024,
      height: 1024,
    },
  },
};

const MODEL_REGISTRY_BY_ID: Partial<Record<string, ModelMapping>> =
  MODEL_REGISTRY;

export interface ProviderDeps {
  ai: Ai;
  env?: {
    LEONARDO_API_KEY?: string;
    REPLICATE_API_TOKEN?: string;
  };
}

export function getModelMapping(modelId: string): ModelMapping {
  const mapping = MODEL_REGISTRY_BY_ID[modelId];
  if (!mapping) throw new Error(`Unknown model: ${modelId}`);
  return mapping;
}

export function createProvider(
  mapping: ModelMapping,
  deps: ProviderDeps,
): AIProvider {
  switch (mapping.provider) {
    case "workers-ai":
      return new WorkersAIProvider(deps.ai, mapping.inputType);
    case "leonardo": {
      if (!deps.env?.LEONARDO_API_KEY) {
        throw new Error("LEONARDO_API_KEY is missing in ProviderDeps");
      }
      return new LeonardoProvider(deps.env.LEONARDO_API_KEY);
    }
    case "replicate": {
      if (!deps.env?.REPLICATE_API_TOKEN) {
        throw new Error("REPLICATE_API_TOKEN is missing in ProviderDeps");
      }
      return new ReplicateProvider(deps.env.REPLICATE_API_TOKEN);
    }
    default:
      throw new Error(`Unknown provider: ${mapping.provider}`);
  }
}

export function getRegisteredModelIds(): string[] {
  return Object.keys(MODEL_REGISTRY);
}
