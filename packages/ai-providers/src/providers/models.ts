export const REPLICATE_MODELS = {
  FLUX_1_1_PRO: "black-forest-labs/flux-1.1-pro",
  IDEOGRAM_V3: "ideogram-ai/ideogram-v3-turbo",
  FLUX_KONTEXT: "black-forest-labs/flux-kontext-pro",
  FLUX_2_PRO: "black-forest-labs/flux-2-pro",
  IMAGEN_4: "google/imagen-4",
  FLUX_FILL: "black-forest-labs/flux-fill-pro",
  SEEDREAM: "bytedance/seedream-4.5",
  GPT_IMAGE_2: "openai/gpt-image-2",
} as const;

export type EditingStrategy =
  | {
      type: "inpaint-with-mask";
      imageField: string;
      maskField: string;
      polarity: "standard" | "inverted";
    }
  | { type: "remix-image"; imageField: string; strengthField?: string }
  | { type: "remix-image-array"; imageField: string; strengthField?: string };

export interface ModelCapability {
  aspectRatio: boolean;
  editingStrategy?: EditingStrategy;
  defaultOutputFormat: string;
}

export const MODEL_CAPABILITIES: Readonly<Record<string, ModelCapability>> = {
  [REPLICATE_MODELS.FLUX_1_1_PRO]: {
    aspectRatio: true,
    editingStrategy: { type: "remix-image", imageField: "image_prompt" },
    defaultOutputFormat: "png",
  },
  [REPLICATE_MODELS.IDEOGRAM_V3]: {
    aspectRatio: true,
    editingStrategy: {
      type: "inpaint-with-mask",
      imageField: "image",
      maskField: "mask",
      polarity: "inverted",
    },
    defaultOutputFormat: "",
  },
  [REPLICATE_MODELS.FLUX_KONTEXT]: {
    aspectRatio: true,
    editingStrategy: { type: "remix-image", imageField: "input_image" },
    defaultOutputFormat: "png",
  },
  [REPLICATE_MODELS.FLUX_2_PRO]: {
    aspectRatio: true,
    editingStrategy: { type: "remix-image", imageField: "input_images" },
    defaultOutputFormat: "png",
  },
  [REPLICATE_MODELS.IMAGEN_4]: {
    aspectRatio: true,
    defaultOutputFormat: "png",
  },
  [REPLICATE_MODELS.FLUX_FILL]: {
    aspectRatio: false,
    editingStrategy: {
      type: "inpaint-with-mask",
      imageField: "image",
      maskField: "mask",
      polarity: "standard",
    },
    defaultOutputFormat: "png",
  },
  [REPLICATE_MODELS.SEEDREAM]: {
    aspectRatio: true,
    editingStrategy: {
      type: "remix-image-array",
      imageField: "image_input",
    },
    defaultOutputFormat: "png",
  },
  [REPLICATE_MODELS.GPT_IMAGE_2]: {
    aspectRatio: true,
    editingStrategy: {
      type: "remix-image-array",
      imageField: "input_images",
    },
    defaultOutputFormat: "webp",
  },
} as const;
