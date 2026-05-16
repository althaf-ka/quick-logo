import { brandKitTypographyResponseSchema } from "@quicklogo/shared";

export const FALLBACK_TYPOGRAPHY = {
  heading: { name: "Inter", family: "Inter", weight: "700" },
  body: { name: "Roboto", family: "Roboto", weight: "400" },
};

export function normalizeTypographyOutput(response: unknown) {
  const result = brandKitTypographyResponseSchema.safeParse(response);

  if (!result.success) {
    return FALLBACK_TYPOGRAPHY;
  }

  const parsed = result.data;
  const headingFamily = parsed.heading.family.trim();
  const bodyFamily = parsed.body.family.trim();

  if (!headingFamily || !bodyFamily) {
    return FALLBACK_TYPOGRAPHY;
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
