import type { AIProvider } from "../types";
import { WorkersAIProvider } from "./workers-ai";
import { LeonardoProvider } from "./leonardo";

export interface ModelMapping {
  provider: "workers-ai" | "leonardo";
  inputType: "json" | "multipart";
  backendModel: string;
  capabilities: {
    nativePromptEnhancement: boolean;
    imageToImage: boolean;
    apiSchema?: "v1" | "v2";
  };
  defaultParams: {
    steps?: number;
    width?: number;
    height?: number;
    guidance?: number;
    providerOptions?: Record<string, any>;
  };
}

const MODEL_REGISTRY: Record<string, ModelMapping> = {
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
    provider: "leonardo",
    inputType: "json",
    backendModel: "nano-banana-2",
    capabilities: {
      nativePromptEnhancement: true,
      imageToImage: true,
      apiSchema: "v2",
    },
    defaultParams: {
      width: 1024,
      height: 1024,
      providerOptions: {
        apiSchema: "v2",
        alchemy: false,
        ultra: false,
        contrast: 3.5,
      },
    },
  },
  "quick-ideogram": {
    provider: "leonardo",
    inputType: "json",
    backendModel: "ideogram-v3.0",
    capabilities: {
      nativePromptEnhancement: true,
      imageToImage: false,
      apiSchema: "v2",
    },
    defaultParams: {
      width: 1024,
      height: 1024,
      providerOptions: {
        apiSchema: "v2",
        mode: "TURBO",
      },
    },
  },
  "quick-seedream": {
    provider: "leonardo",
    inputType: "json",
    backendModel: "seedream-4.5",
    capabilities: {
      nativePromptEnhancement: true,
      imageToImage: true,
      apiSchema: "v2",
    },
    defaultParams: {
      width: 1024,
      height: 1024,
      providerOptions: {
        apiSchema: "v2",
      },
    },
  },
};

export interface ProviderDeps {
  ai: Ai;
  env?: {
    LEONARDO_API_KEY?: string;
  };
}

export function getModelMapping(modelId: string): ModelMapping {
  const mapping = MODEL_REGISTRY[modelId];
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
    default:
      throw new Error(`Unknown provider: ${mapping.provider}`);
  }
}

export function getRegisteredModelIds(): string[] {
  return Object.keys(MODEL_REGISTRY);
}
