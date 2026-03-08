import type { GenerateConfig } from "../validators/generate";

export const MODELS = [
  { id: "quick-v1", name: "Quick v1", credits: 2 },
  { id: "quick-hd", name: "Quick HD", credits: 5 },
  { id: "quick-pro", name: "Quick Pro", credits: 8 },
  { id: "quick-remix", name: "Quick Remix", credits: 3 },
] as const;

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
