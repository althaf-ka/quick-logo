export interface ModelOption {
  id: string;
  name: string;
  description: string;
  credits: number;
  icon: "lightning" | "brain" | "crown" | "shuffle";
  features: string[];
  supportsReferenceImage: boolean;
}

export const MODELS: ModelOption[] = [
  {
    id: "quick-v1",
    name: "Quick v1",
    description: "Fast generation, good for drafts",
    credits: 2,
    icon: "lightning",
    features: ["Fast", "Simple logos"],
    supportsReferenceImage: false,
  },
  {
    id: "quick-hd",
    name: "Quick HD",
    description: "Higher resolution, detailed output",
    credits: 5,
    icon: "brain",
    features: ["HD output", "Better details"],
    supportsReferenceImage: false,
  },
  {
    id: "quick-pro",
    name: "Quick Pro",
    description: "Best quality, production-ready",
    credits: 8,
    icon: "crown",
    features: ["Best quality", "Complex designs", "Production-ready"],
    supportsReferenceImage: false,
  },
  {
    id: "quick-remix",
    name: "Quick Remix",
    description: "Generate variations from a reference image",
    credits: 3,
    icon: "shuffle",
    features: ["Reference image", "Style transfer", "Variations"],
    supportsReferenceImage: true,
  },
  {
    id: "quick-ideogram",
    name: "Ideogram V3",
    description: "Industry-leading typography and detailed illustration model.",
    credits: 8,
    icon: "crown",
    features: ["Cinematic", "High detail", "Professional typography"],
    supportsReferenceImage: false,
  },
  {
    id: "quick-leo-fast",
    name: "Leonardo Vision",
    description: "Lightning fast model configured for serene renders",
    credits: 6,
    icon: "lightning",
    features: ["Custom Style", "Fast render", "Contrast-tuned"],
    supportsReferenceImage: true,
  },
  {
    id: "quick-seedream",
    name: "SeeDream 4.5",
    description:
      "Versatile and highly detailed generations, excellent for both text-to-image and reference edits.",
    credits: 8,
    icon: "brain",
    features: ["Highly detailed", "Reference image support", "Versatile"],
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
