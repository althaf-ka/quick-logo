export const FALLBACK_TYPOGRAPHY = {
  heading: { name: "Inter", family: "Inter", weight: "700" },
  body: { name: "Roboto", family: "Roboto", weight: "400" },
};

export function normalizeTypographyOutput(response: unknown) {
  const parsed = response as {
    heading?: { family?: unknown; weight?: unknown; name?: unknown };
    body?: { family?: unknown; weight?: unknown; name?: unknown };
  };

  if (
    typeof parsed.heading?.family !== "string" ||
    typeof parsed.body?.family !== "string"
  ) {
    return FALLBACK_TYPOGRAPHY;
  }

  const headingFamily = parsed.heading.family.trim();
  const bodyFamily = parsed.body.family.trim();

  if (!headingFamily || !bodyFamily) {
    return FALLBACK_TYPOGRAPHY;
  }

  return {
    heading: {
      name:
        typeof parsed.heading.name === "string"
          ? parsed.heading.name
          : headingFamily,
      family: headingFamily,
      weight:
        typeof parsed.heading.weight === "string"
          ? parsed.heading.weight
          : "700",
    },
    body: {
      name:
        typeof parsed.body.name === "string" ? parsed.body.name : bodyFamily,
      family: bodyFamily,
      weight:
        typeof parsed.body.weight === "string" ? parsed.body.weight : "400",
    },
  };
}
