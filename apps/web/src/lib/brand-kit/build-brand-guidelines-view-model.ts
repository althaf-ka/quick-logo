import type { BrandGuidelinesContent } from "@quicklogo/shared";
import type { BrandKitResultsData } from "@/components/brand-kit/results/brand-kit-results";

const DEFAULT_MISUSE_RULES = [
  "Do not stretch, squash, or rotate the logo.",
  "Do not recolor the logo outside the approved palette.",
  "Do not add shadows, outlines, or decorative effects.",
  "Do not place the logo on a low-contrast background.",
];

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

function hexToRgb(hex: string): RgbColor {
  const normalized = hex.trim().replace(/^#/, "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((character) => `${character}${character}`)
          .join("")
      : normalized;
  const match = /^[\da-f]{6}$/i.exec(expanded);
  if (!match) return { r: 0, g: 0, b: 0 };
  return {
    r: Number.parseInt(expanded.slice(0, 2), 16),
    g: Number.parseInt(expanded.slice(2, 4), 16),
    b: Number.parseInt(expanded.slice(4, 6), 16),
  };
}

function rgbToApproximateCmyk({ r, g, b }: RgbColor) {
  const cyan = 1 - r / 255;
  const magenta = 1 - g / 255;
  const yellow = 1 - b / 255;
  const black = Math.min(cyan, magenta, yellow);
  if (black === 1) return "0 / 0 / 0 / 100";

  return [cyan, magenta, yellow]
    .map((component) => Math.round(((component - black) / (1 - black)) * 100))
    .concat(Math.round(black * 100))
    .join(" / ");
}

function relativeLuminance({ r, g, b }: RgbColor) {
  const linearize = (channel: number) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

function contrastRatio(first: string, second: string) {
  const firstLuminance = relativeLuminance(hexToRgb(first));
  const secondLuminance = relativeLuminance(hexToRgb(second));
  const lightest = Math.max(firstLuminance, secondLuminance);
  const darkest = Math.min(firstLuminance, secondLuminance);
  return (lightest + 0.05) / (darkest + 0.05);
}

function normalizeGuidelines(
  content: BrandKitResultsData["brandGuidelines"],
): BrandGuidelinesContent | null {
  if (!content) return null;
  const legacyContent = content as BrandGuidelinesContent & {
    rules?: { depth?: "essential" | "complete" };
  };
  const depth =
    legacyContent.depth || legacyContent.rules?.depth || "essential";

  return {
    ...legacyContent,
    version: 1,
    depth,
    logoRules: legacyContent.logoRules || {
      clearSpaceRatio: 0.25,
      minimumDigitalWidth: 120,
      minimumMarkSize: 32,
      misuseRules: DEFAULT_MISUSE_RULES,
    },
  };
}

export interface BrandGuidelinesViewModel {
  brandName: string;
  depth: "essential" | "complete";
  isComplete: boolean;
  primaryLogoUrl?: string;
  logoVariations: NonNullable<BrandKitResultsData["logoVariations"]>;
  foundation: {
    tagline?: string;
    missionStatement?: string;
    personality?: string;
    targetAudience?: string;
    industry?: string;
  };
  logoRules: BrandGuidelinesContent["logoRules"];
  colors: Array<{
    role: string;
    hex: string;
    rgb: string;
    approximateCmyk: string;
    preferredTextColor: "#000000" | "#ffffff";
    contrastRatio: number;
  }>;
  typography: BrandKitResultsData["typography"];
  voice?: BrandGuidelinesContent["voice"];
  applications: Array<{ label: string; url: string }>;
}

export function buildBrandGuidelinesViewModel(
  results: BrandKitResultsData,
): BrandGuidelinesViewModel | null {
  const guidelines = normalizeGuidelines(results.brandGuidelines);
  if (!guidelines) return null;

  const primaryLogoUrl = results.logoVariations?.[0]?.url || results.logoUrl;
  const colors = results.colorPalette.map((color, index) => {
    const rgb = hexToRgb(color.hex);
    const whiteRatio = contrastRatio(color.hex, "#ffffff");
    const blackRatio = contrastRatio(color.hex, "#000000");
    const preferredTextColor: "#000000" | "#ffffff" =
      whiteRatio >= blackRatio ? "#ffffff" : "#000000";
    const ratio = Math.max(whiteRatio, blackRatio);

    return {
      role: color.role || `Color ${index + 1}`,
      hex: color.hex.toUpperCase(),
      rgb: `${rgb.r} / ${rgb.g} / ${rgb.b}`,
      approximateCmyk: rgbToApproximateCmyk(rgb),
      preferredTextColor,
      contrastRatio: ratio,
    };
  });

  const applications: BrandGuidelinesViewModel["applications"] = [];
  if (results.brandPresentation?.presentationUrl) {
    applications.push({
      label: "Brand presentation",
      url: results.brandPresentation.presentationUrl,
    });
  }
  if (results.brandGraphics?.backdropPostUrl) {
    applications.push({
      label: "Brand graphic",
      url: results.brandGraphics.backdropPostUrl,
    });
  }
  if (results.businessCard?.frontUrl) {
    applications.push({
      label: "Business card",
      url: results.businessCard.frontUrl,
    });
  }
  if (results.socialMedia?.[0]?.url) {
    applications.push({
      label: "Social media",
      url: results.socialMedia[0].url,
    });
  }

  return {
    brandName: results.brandName || "Brand",
    depth: guidelines.depth,
    isComplete: guidelines.depth === "complete",
    primaryLogoUrl,
    logoVariations: results.logoVariations || [],
    foundation: {
      tagline: guidelines.tagline || results.brandPresentation?.tagline,
      missionStatement:
        guidelines.missionStatement || results.brandPresentation?.description,
      personality: guidelines.personality,
      targetAudience: guidelines.targetAudience,
      industry: guidelines.industry,
    },
    logoRules: guidelines.logoRules,
    colors,
    typography: results.typography,
    voice: guidelines.voice,
    applications,
  };
}
