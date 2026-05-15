import { TYPOGRAPHY_REGISTRY } from "@quicklogo/shared";

export const STYLE_ALIASES: Record<string, string> = {
  playful: "playful-display",
  tech: "tech-mono",
  mono: "tech-mono",
  modern: "modern-sans",
  classic: "classic-serif",
  serif: "classic-serif",
  elegant: "elegant-script",
  script: "elegant-script",
  bold: "bold-impact",
  impact: "bold-impact",
  round: "friendly-round",
  luxury: "luxury-minimal",
  premium: "luxury-minimal",
};

export function resolveTypographyStyle(style: string): {
  key: string;
  hint: string;
} {
  const key = Object.entries(STYLE_ALIASES).reduce<string>(
    (acc, [alias, resolved]) =>
      style.toLowerCase().includes(alias) ? resolved : acc,
    "modern-sans",
  );

  const entry = TYPOGRAPHY_REGISTRY[key];
  const hint = entry
    ? `${entry.label}: ${entry.description}`
    : "Clean, minimal, and highly legible";

  return { key, hint };
}
