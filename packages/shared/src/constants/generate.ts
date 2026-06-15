import type { GenerateConfig } from "../validators/generate";
import { MODEL_IDS } from "./models";

export {
  MODEL_IDS,
  MODELS,
  getModelCredits,
  getModelsForContext,
  getModelsForCanvasMode,
} from "./models";
export type { ModelContext, ModelId, ModelOption } from "./models";

export const DEFAULT_CONFIG: GenerateConfig = {
  model: MODEL_IDS[0],
  style: "",
  brandName: "",
  imageCount: 1,
  colorPalette: "auto",
  customColors: [],
  negativePrompt: "",
  background: "white",
  customBgColor: "#ffffff",
  referenceImage: null,
  referenceImagePreview: null,
  referenceStrength: 50,
  magicPrompt: true,
};
