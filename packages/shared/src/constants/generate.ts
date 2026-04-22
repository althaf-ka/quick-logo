import type { GenerateConfig } from "../validators/generate";
import { MODELS } from "./models";

export { MODELS };

export const DEFAULT_CONFIG: GenerateConfig = {
  model: MODELS[0].id,
  style: "",
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
