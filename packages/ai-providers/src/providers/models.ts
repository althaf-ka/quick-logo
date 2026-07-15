export const REPLICATE_MODELS = {
  FLUX_1_1_PRO: "black-forest-labs/flux-1.1-pro",
  IDEOGRAM_V3: "ideogram-ai/ideogram-v3-turbo",
  FLUX_KONTEXT: "black-forest-labs/flux-kontext-pro",
  FLUX_2_PRO: "black-forest-labs/flux-2-pro",
  IMAGEN_4: "google/imagen-4",
  FLUX_FILL: "black-forest-labs/flux-fill-pro",
  SEEDREAM_4: "bytedance/seedream-4",
  SEEDREAM_4_5: "bytedance/seedream-4.5",
  SEEDREAM_5_LITE: "bytedance/seedream-5-lite",
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
  /**
   * Aspect-ratio labels this model actually accepts. When set, requested
   * dimensions are clamped to the closest supported ratio (a model that only
   * offers 1:1/3:2/2:3 must not be sent 16:9). When omitted, the full ratio
   * table is used.
   */
  supportedAspectRatios?: readonly string[];
  maxPromptLength?: number;
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
    supportedAspectRatios: [
      "1:3",
      "3:1",
      "1:2",
      "2:1",
      "9:16",
      "16:9",
      "10:16",
      "16:10",
      "2:3",
      "3:2",
      "3:4",
      "4:3",
      "4:5",
      "5:4",
      "1:1",
    ],
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
  [REPLICATE_MODELS.SEEDREAM_4]: {
    aspectRatio: true,
    editingStrategy: {
      type: "remix-image-array",
      imageField: "image_input",
    },
    defaultOutputFormat: "",
    maxPromptLength: 4000,
  },
  [REPLICATE_MODELS.SEEDREAM_4_5]: {
    aspectRatio: true,
    editingStrategy: {
      type: "remix-image-array",
      imageField: "image_input",
    },
    defaultOutputFormat: "",
  },
  [REPLICATE_MODELS.SEEDREAM_5_LITE]: {
    aspectRatio: true,
    editingStrategy: {
      type: "remix-image-array",
      imageField: "image_input",
    },
    defaultOutputFormat: "png",
    supportedAspectRatios: [
      "1:1",
      "4:3",
      "3:4",
      "16:9",
      "9:16",
      "3:2",
      "2:3",
      "21:9",
    ],
    maxPromptLength: 4000,
  },
  [REPLICATE_MODELS.GPT_IMAGE_2]: {
    aspectRatio: true,
    editingStrategy: {
      type: "remix-image-array",
      imageField: "input_images",
    },
    defaultOutputFormat: "png",
    // The Replicate wrapper currently exposes only these aspect-ratio values,
    // even though OpenAI's native API accepts additional custom resolutions.
    supportedAspectRatios: ["1:1", "3:2", "2:3"],
  },
} as const;
