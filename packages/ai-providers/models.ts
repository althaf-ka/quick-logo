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
];

export function getModelCredits(modelId: string): number {
  const model = MODELS.find((m) => m.id === modelId);
  if (!model) {
    throw new Error(`Unknown model: ${modelId}`);
  }
  return model.credits;
}
