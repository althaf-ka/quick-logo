import type { GenerationParams } from "../types";
import { REPLICATE_MODELS } from "../providers/models";
// Adapter imports
import { IdeogramAdapter } from "./ideogram";
import { FluxAdapter } from "./flux";
import { ImagenAdapter } from "./imagen";
import { GptImageAdapter } from "./gpt-image";

export interface ModelAdapter {
  applyParams(input: Record<string, unknown>, params: GenerationParams): void;
}

export const REPLICATE_ADAPTERS: Record<string, ModelAdapter> = {
  [REPLICATE_MODELS.IDEOGRAM_V3]: new IdeogramAdapter(),
  [REPLICATE_MODELS.FLUX_1_1_PRO]: new FluxAdapter(),
  [REPLICATE_MODELS.FLUX_2_PRO]: new FluxAdapter(),
  [REPLICATE_MODELS.FLUX_KONTEXT]: new FluxAdapter(),
  [REPLICATE_MODELS.FLUX_FILL]: new FluxAdapter(true),
  [REPLICATE_MODELS.IMAGEN_4]: new ImagenAdapter(),
  [REPLICATE_MODELS.GPT_IMAGE_2]: new GptImageAdapter(),
};
