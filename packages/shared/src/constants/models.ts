export const MODELS = [
  { id: "quick-v1", name: "Quick v1", credits: 2 },
  { id: "quick-hd", name: "Quick HD", credits: 5 },
  { id: "quick-pro", name: "Quick Pro", credits: 8 },
  { id: "quick-remix", name: "Quick Remix", credits: 3 },
] as const;

export type ModelId = (typeof MODELS)[number]["id"];
