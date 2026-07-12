export const MODEL_IDS = [
  "quick-v1",
  "quick-hd",
  "quick-pro",
  "quick-remix",
  "quick-ideogram",
  "quick-leo-fast",
  "quick-seedream",
  "quick-gpt-image-2",
  "quick-imagen",
  "quick-flux-fill",
  "quick-flux-kontext",
  "quick-flux-2-pro",
] as const;

export type ModelId = (typeof MODEL_IDS)[number];
export type ModelContext = "generate" | "edit";

export const DEFAULT_BRAND_KIT_MODEL_ID: ModelId = "quick-gpt-image-2";

/**
 * Defines mask color convention for inpainting models.
 * - "standard": White pixels = area to inpaint, Black pixels = area to keep
 * - "inverted": Black pixels = area to inpaint, White pixels = area to keep
 */
export type MaskPolarity = "standard" | "inverted";

export interface ModelOption {
  id: ModelId;
  name: string;
  description: string;
  credits: number;
  icon:
    | "lightning"
    | "brain"
    | "crown"
    | "shuffle"
    | "aperture"
    | "typography"
    | "palette"
    | "magic"
    | "star"
    | "brush"
    | "swatches"
    | "diamond";
  features: string[];
  supportsReferenceImage: boolean;
  label: string;
  friendlyDescription: string;
  recommended?: boolean;
  bestForEdits?: boolean;
  supportsInpaint?: boolean;
  /** Mask polarity for inpainting. Only relevant when supportsInpaint is true. */
  maskPolarity?: MaskPolarity;
  editingStrategy?: "inpaint-with-mask" | "remix-image" | "remix-image-array";
  /** If defined, replaces generic STYLES with model-native style options */
  nativeStyles?: { id: string; label: string }[];
}

export const MODELS: ModelOption[] = [
  {
    id: "quick-v1",
    name: "Quick v1",
    label: "Fast",
    description: "Fast generation, good for drafts",
    friendlyDescription: "Quick drafts in seconds - great for exploring ideas",
    credits: 2,
    icon: "lightning",
    features: ["Fast", "Simple logos"],
    supportsReferenceImage: false,
  },
  {
    id: "quick-hd",
    name: "Quick HD",
    label: "Balanced",
    description: "Higher resolution, detailed output",
    friendlyDescription: "Sharp details with higher resolution output",
    credits: 5,
    icon: "aperture",
    features: ["HD output", "Better details"],
    supportsReferenceImage: false,
  },
  {
    id: "quick-pro",
    name: "Quick Pro",
    label: "Best Quality",
    description: "Best quality, production-ready",
    friendlyDescription: "Production-ready logos with maximum detail",
    credits: 8,
    icon: "crown",
    features: ["Best quality", "Complex designs", "Production-ready"],
    supportsReferenceImage: false,
    recommended: true,
  },
  {
    id: "quick-remix",
    name: "Quick Remix",
    label: "Remix",
    description: "Generate variations from a reference image",
    friendlyDescription: "Upload a reference image and create variations",
    credits: 3,
    icon: "shuffle",
    features: ["Reference image", "Style transfer", "Variations"],
    supportsReferenceImage: true,
  },
  {
    id: "quick-ideogram",
    name: "Ideogram V3",
    label: "Typography Expert",
    description: "Industry-leading typography and detailed illustration model.",
    friendlyDescription: "Best for logos that need perfect text and lettering",
    credits: 8,
    icon: "typography",
    features: ["Cinematic", "High detail", "Professional typography"],
    supportsReferenceImage: false,
    supportsInpaint: true,
    maskPolarity: "inverted",
    editingStrategy: "inpaint-with-mask",
    nativeStyles: [
      { id: "FLAT_VECTOR", label: "Flat Vector" },
      { id: "ICONIC", label: "Iconic" },
      { id: "MINIMAL_ILLUSTRATION", label: "Minimal" },
      { id: "GEO_MINIMALIST", label: "Geometric" },
      { id: "BAUHAUS", label: "Bauhaus" },
      { id: "ART_DECO", label: "Art Deco" },
      { id: "MONOCHROME", label: "Monochrome" },
    ],
  },
  {
    id: "quick-leo-fast",
    name: "Leonardo Vision",
    label: "Creative",
    description: "Lightning fast model configured for serene renders",
    friendlyDescription: "Fast and artistic - great for unique visual styles",
    credits: 6,
    icon: "palette",
    features: ["Custom Style", "Fast render", "Contrast-tuned"],
    supportsReferenceImage: true,
    editingStrategy: "remix-image",
  },
  {
    id: "quick-seedream",
    name: "Seedream 5 Lite",
    label: "Versatile",
    description:
      "Fast, detailed generation with strong text-to-image and reference editing.",
    friendlyDescription:
      "Highly detailed - best results when editing existing logos",
    credits: 8,
    icon: "magic",
    features: ["Highly detailed", "Reference image support", "Versatile"],
    supportsReferenceImage: true,
    bestForEdits: true,
    editingStrategy: "remix-image-array",
  },
  {
    id: "quick-gpt-image-2",
    name: "GPT Image 2",
    label: "Professional",
    description: "Professional model supporting image edits and remixing.",
    friendlyDescription: "Professional generation and reliable image remixing",
    credits: 4,
    icon: "brain",
    features: ["Professional", "Remix Support", "Low Cost Variant"],
    supportsReferenceImage: true,
    editingStrategy: "remix-image-array",
  },
  {
    id: "quick-imagen",
    name: "Imagen 4",
    label: "Google Flagship",
    description: "Google's Imagen 4 flagship model for stunning realism.",
    friendlyDescription: "Highly realistic and top-tier generation quality",
    credits: 8,
    icon: "star",
    features: ["High quality", "Realism", "Flagship"],
    supportsReferenceImage: false,
  },
  {
    id: "quick-flux-fill",
    name: "Flux Fill Pro",
    label: "Inpaint Expert",
    description:
      "Purpose-built inpainting model for precise area modifications.",
    friendlyDescription:
      "Best for modifying specific areas of an image with a mask",
    credits: 8,
    icon: "brush",
    features: ["Inpainting", "Outpainting", "Precision edits"],
    supportsReferenceImage: false,
    supportsInpaint: true,
    maskPolarity: "standard",
    editingStrategy: "inpaint-with-mask",
  },
  {
    id: "quick-flux-kontext",
    name: "Flux Kontext",
    label: "Style Matcher",
    description: "Highly capable model for matching styles from a reference.",
    friendlyDescription:
      "Perfect for matching the style of your uploaded reference image",
    credits: 6,
    icon: "swatches",
    features: ["Reference image", "Style transfer", "High fidelity"],
    supportsReferenceImage: true,
    editingStrategy: "remix-image",
  },
  {
    id: "quick-flux-2-pro",
    name: "Flux 2 Pro",
    label: "Professional",
    description:
      "High-end professional image generation with full remix support.",
    friendlyDescription: "Professional-grade generation with remix support",
    credits: 8,
    icon: "diamond",
    features: ["Best quality", "Remix Support", "Production-ready"],
    supportsReferenceImage: true,
    editingStrategy: "remix-image",
  },
];

export function getModelCredits(modelId: string): number {
  const model = MODELS.find((m) => m.id === modelId);
  if (!model) {
    throw new Error(`Unknown model: ${modelId}`);
  }
  return model.credits;
}

export function getModelsForContext(context: ModelContext): ModelOption[] {
  if (context === "edit") {
    return MODELS.filter((m) => m.supportsReferenceImage);
  }
  return [...MODELS];
}

export function getModelsForCanvasMode(mode: string): ModelOption[] {
  if (mode === "inpaint") {
    return MODELS.filter((m) => m.supportsInpaint);
  }
  if (mode === "img2img") {
    return MODELS.filter((m) => m.supportsReferenceImage);
  }
  return [...MODELS];
}

/**
 * Returns the mask polarity for a given model.
 * Defaults to "standard" if the model doesn't specify.
 */
export function getModelMaskPolarity(modelId: string): MaskPolarity {
  const model = MODELS.find((m) => m.id === modelId);
  return model?.maskPolarity ?? "standard";
}
