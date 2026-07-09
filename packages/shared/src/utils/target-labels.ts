export function getSectionLabel(
  sectionId: string,
  targetItemId?: string | null,
): string {
  let label = sectionId;
  switch (sectionId) {
    case "logoVariations":
    case "logo-variations":
      label = "Logo Variations";
      break;
    case "socialMedia":
    case "social-media":
      label = "Social Media Kit";
      break;
    case "businessCard":
    case "business-card":
      label = "Business Cards";
      break;
    case "favicon":
      label = "Favicons";
      break;
    case "brandGraphics":
    case "brand-graphics":
      label = "Brand Graphics";
      break;
    case "brandPresentation":
    case "brand-presentation":
      label = "Brand Presentation";
      break;
    case "typography":
      label = "Typography System";
      break;
  }

  if (targetItemId) {
    const formattedTarget = targetItemId
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    return `${label} · ${formattedTarget}`;
  }
  return label;
}
