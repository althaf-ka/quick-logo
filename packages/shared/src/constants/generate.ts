import type { GenerateConfig } from "../validators/generate";
import { MODEL_IDS } from "./models";

export {
  MODEL_IDS,
  MODELS,
  getModelCredits,
  getModelsForContext,
  getModelsForCanvasMode,
  getModelMaskPolarity,
  DEFAULT_BRAND_KIT_MODEL_ID,
} from "./models";
export type {
  ModelContext,
  ModelId,
  ModelOption,
  MaskPolarity,
} from "./models";

export const DEFAULT_CONFIG: GenerateConfig = {
  model: MODEL_IDS[0],
  style: "",
  nativeStyle: "",
  brandName: "",
  imageCount: 1,
  colorPalette: "auto",
  customColors: [],
  negativePrompt: "",
  background: "white",
  customBgColor: "#ffffff",
  referenceImage: null,
  referenceImagePreview: null,
  magicPrompt: true,
};
