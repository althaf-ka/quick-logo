export const MODELS = [
  { id: "quick-v1", name: "Quick v1", credits: 2 },
  { id: "quick-hd", name: "Quick HD", credits: 5 },
  { id: "quick-pro", name: "Quick Pro", credits: 8 },
  { id: "quick-remix", name: "Quick Remix", credits: 3 },
  { id: "quick-ideogram", name: "Ideogram V3", credits: 8 },
  { id: "quick-leo-fast", name: "Leonardo Vision", credits: 6 },
  { id: "quick-seedream", name: "SeeDream 4.5", credits: 8 },
] as const;

export type ModelId = (typeof MODELS)[number]["id"];
