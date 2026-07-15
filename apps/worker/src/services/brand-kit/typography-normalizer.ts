import { brandKitTypographyResponseSchema } from "@quicklogo/shared";

export const FALLBACK_TYPOGRAPHY = {
  heading: { name: "Inter", family: "Inter", weight: "700" },
  body: { name: "Roboto", family: "Roboto", weight: "400" },
};

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
