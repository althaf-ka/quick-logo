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
      label = "Business Card";
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
    case "colorPalette":
    case "color-palette":
      label = "Color Palette";
      break;
    case "brandGuidelines":
    case "brand-guidelines":
      label = "Brand Guidelines";
      break;
  }

  if (targetItemId) {
    if (sectionId === "businessCard" || sectionId === "business-card") {
      const businessCardTargetLabels: Record<string, string> = {
        front: "Front Side",
        back: "Back Side",
      };
      const businessCardTargetLabel = businessCardTargetLabels[targetItemId];
      if (businessCardTargetLabel) {
        return `${label} · ${businessCardTargetLabel}`;
      }
    }
    if (sectionId === "socialMedia" || sectionId === "social-media") {
      const socialTargetLabels: Record<string, string> = {
        "instagram-profile": "Profile Picture",
        "twitter-header": "X Cover",
        "linkedin-header": "LinkedIn Cover",
        "facebook-header": "Facebook Cover",
        "youtube-channel-art": "YouTube Cover",
      };
      const socialTargetLabel = socialTargetLabels[targetItemId];
      if (socialTargetLabel) return `${label} · ${socialTargetLabel}`;
    }
    const formattedTarget = targetItemId
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    return `${label} · ${formattedTarget}`;
  }
  return label;
}
