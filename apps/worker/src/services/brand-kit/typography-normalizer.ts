import { brandKitTypographyResponseSchema } from "@quicklogo/shared";

export const FALLBACK_TYPOGRAPHY = {
  heading: { name: "Inter", family: "Inter", weight: "700" },
  body: { name: "Roboto", family: "Roboto", weight: "400" },
};

const STYLE_FALLBACK_TYPOGRAPHY = {
  "modern-sans": FALLBACK_TYPOGRAPHY,
  "classic-serif": {
    heading: {
      name: "Playfair Display",
      family: "Playfair Display",
      weight: "700",
    },
    body: { name: "Source Sans 3", family: "Source Sans 3", weight: "400" },
  },
  "playful-display": {
    heading: { name: "Fredoka", family: "Fredoka", weight: "700" },
    body: { name: "Nunito", family: "Nunito", weight: "400" },
  },
  "elegant-script": {
    heading: { name: "Italiana", family: "Italiana", weight: "400" },
    body: { name: "Manrope", family: "Manrope", weight: "400" },
  },
  "tech-mono": {
    heading: { name: "Space Mono", family: "Space Mono", weight: "700" },
    body: { name: "Inter", family: "Inter", weight: "400" },
  },
  "bold-impact": {
    heading: { name: "Anton", family: "Anton", weight: "400" },
    body: { name: "Roboto", family: "Roboto", weight: "400" },
  },
  "friendly-round": {
    heading: { name: "Nunito", family: "Nunito", weight: "700" },
    body: { name: "Nunito Sans", family: "Nunito Sans", weight: "400" },
  },
  "luxury-minimal": {
    heading: {
      name: "Cormorant Garamond",
      family: "Cormorant Garamond",
      weight: "700",
    },
    body: { name: "Montserrat", family: "Montserrat", weight: "400" },
  },
} as const;

export function getFallbackTypography(styleKey?: string) {
  return (
    STYLE_FALLBACK_TYPOGRAPHY[
      styleKey as keyof typeof STYLE_FALLBACK_TYPOGRAPHY
    ] ?? FALLBACK_TYPOGRAPHY
  );
}

export function tryNormalizeTypographyOutput(response: unknown) {
  const result = brandKitTypographyResponseSchema.safeParse(response);

  if (!result.success) {
    return null;
  }

  const parsed = result.data;
  const headingFamily = parsed.heading.family.trim();
  const bodyFamily = parsed.body.family.trim();

  if (!headingFamily || !bodyFamily) {
    return null;
  }

  return {
    heading: {
      name: parsed.heading.name?.trim() || headingFamily,
      family: headingFamily,
      weight: parsed.heading.weight?.trim() || "700",
    },
    body: {
      name: parsed.body.name?.trim() || bodyFamily,
      family: bodyFamily,
      weight: parsed.body.weight?.trim() || "400",
    },
  };
}

export function normalizeTypographyOutput(response: unknown) {
  return tryNormalizeTypographyOutput(response) ?? FALLBACK_TYPOGRAPHY;
}
