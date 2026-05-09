export interface FontConfig {
  name: string;
  family: string;
  weight: string;
}

export interface TypographyPairing {
  label: string;
  description: string;
  heading: FontConfig;
  body: FontConfig;
}

export const TYPOGRAPHY_REGISTRY: Record<string, TypographyPairing> = {
  "modern-sans": {
    label: "Modern Sans",
    description: "Clean, minimal, and highly legible.",
    heading: { name: "Inter", family: "Inter", weight: "700" },
    body: { name: "Roboto", family: "Roboto", weight: "400" },
  },
  "classic-serif": {
    label: "Classic Serif",
    description: "Elegant, traditional, and professional.",
    heading: { name: "Playfair Display", family: "Playfair Display", weight: "700" },
    body: { name: "Lora", family: "Lora", weight: "400" },
  },
  "playful-display": {
    label: "Playful Display",
    description: "Fun, energetic, and eye-catching.",
    heading: { name: "Fredoka One", family: "Fredoka One", weight: "400" },
    body: { name: "Nunito", family: "Nunito", weight: "400" },
  },
  "elegant-script": {
    label: "Elegant Script",
    description: "Sophisticated, artistic, and flowing.",
    heading: { name: "Dancing Script", family: "Dancing Script", weight: "700" },
    body: { name: "Raleway", family: "Raleway", weight: "400" },
  },
  "tech-mono": {
    label: "Tech Monospace",
    description: "Structured, digital, and modern.",
    heading: { name: "JetBrains Mono", family: "JetBrains Mono", weight: "700" },
    body: { name: "Fira Code", family: "Fira Code", weight: "400" },
  },
};
