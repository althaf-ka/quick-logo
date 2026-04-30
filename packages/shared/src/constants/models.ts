export const MODEL_IDS = [
  "quick-v1",
  "quick-hd",
  "quick-pro",
  "quick-remix",
  "quick-ideogram",
  "quick-leo-fast",
  "quick-seedream",
  "quick-nano-banana",
] as const;

export type ModelId = (typeof MODEL_IDS)[number];
export type ModelContext = "generate" | "edit";

export interface ModelOption {
  id: ModelId;
  name: string;
  description: string;
  credits: number;
  icon: "lightning" | "brain" | "crown" | "shuffle";
  features: string[];
  supportsReferenceImage: boolean;
  label: string;
  friendlyDescription: string;
  recommended?: boolean;
  bestForEdits?: boolean;
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
    icon: "brain",
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
    icon: "crown",
    features: ["Cinematic", "High detail", "Professional typography"],
    supportsReferenceImage: false,
  },
  {
    id: "quick-leo-fast",
    name: "Leonardo Vision",
    label: "Creative",
    description: "Lightning fast model configured for serene renders",
    friendlyDescription: "Fast and artistic - great for unique visual styles",
    credits: 6,
    icon: "lightning",
    features: ["Custom Style", "Fast render", "Contrast-tuned"],
    supportsReferenceImage: true,
  },
  {
    id: "quick-seedream",
    name: "SeeDream 4.5",
    label: "Versatile",
    description:
      "Versatile and highly detailed generations, excellent for both text-to-image and reference edits.",
    friendlyDescription:
      "Highly detailed - best results when editing existing logos",
    credits: 8,
    icon: "brain",
    features: ["Highly detailed", "Reference image support", "Versatile"],
    supportsReferenceImage: true,
    bestForEdits: true,
  },
  {
    id: "quick-nano-banana",
    name: "Nano Banana",
    label: "Playful",
    description: "Ultra-fast, playful model for minimalist concepts.",
    friendlyDescription:
      "Ultra-fast and playful - perfect for minimal logo concepts",
    credits: 8,
    icon: "lightning",
    features: ["Ultra-fast", "Playful", "Minimalist"],
    supportsReferenceImage: true,
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
