import type { AIProvider } from "../types";
import { WorkersAIProvider } from "./workers-ai";

export interface ModelMapping {
  provider: "workers-ai";
  inputType: "json" | "multipart";
  backendModel: string;
  supportsImg2Img: boolean;
  defaultParams: {
    steps?: number;
    width?: number;
    height?: number;
    guidance?: number;
  };
}

const MODEL_REGISTRY: Record<string, ModelMapping> = {
  "quick-v1": {
    provider: "workers-ai",
    inputType: "json",
    backendModel: "@cf/stabilityai/stable-diffusion-xl-base-1.0",
    supportsImg2Img: false,
    defaultParams: { steps: 20 },
  },
  "quick-hd": {
    provider: "workers-ai",
    inputType: "multipart",
    backendModel: "@cf/black-forest-labs/flux-2-klein-9b",
    supportsImg2Img: false,
    defaultParams: { width: 512, height: 512 },
  },
  "quick-pro": {
    provider: "workers-ai",
    inputType: "json",
    backendModel: "@cf/leonardo/phoenix-1.0",
    supportsImg2Img: false,
    defaultParams: { width: 1024, height: 1024, guidance: 2, steps: 25 },
  },
  "quick-remix": {
    provider: "workers-ai",
    inputType: "json",
    backendModel: "@cf/runwayml/stable-diffusion-v1-5-img2img",
    supportsImg2Img: true,
    defaultParams: { steps: 20, guidance: 7.5 },
  },
};

export interface ProviderDeps {
  ai: Ai;
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
    default:
      throw new Error(`Unknown provider: ${mapping.provider}`);
  }
}

export function getRegisteredModelIds(): string[] {
  return Object.keys(MODEL_REGISTRY);
}
