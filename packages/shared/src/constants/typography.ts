export interface TypographyStyleHint {
  label: string;
  description: string;
}

export const TYPOGRAPHY_REGISTRY: Record<string, TypographyStyleHint> = {
  "modern-sans": {
    label: "Modern Sans",
    description: "Clean, minimal, and highly legible",
  },
  "classic-serif": {
    label: "Classic Serif",
    description: "Elegant, traditional, and professional",
  },
  "playful-display": {
    label: "Playful Display",
    description: "Fun, energetic, and eye-catching",
  },
  "elegant-script": {
    label: "Elegant Script",
    description: "Sophisticated, artistic, and flowing",
  },
  "tech-mono": {
    label: "Tech Monospace",
    description: "Structured, digital, and modern",
  },
  "bold-impact": {
    label: "Bold Impact",
    description: "Strong, powerful, and attention-grabbing",
  },
  "friendly-round": {
    label: "Friendly Rounded",
    description: "Warm, approachable, and inviting",
  },
  "luxury-minimal": {
    label: "Luxury Minimal",
    description: "Premium, refined, and understated",
  },
};
