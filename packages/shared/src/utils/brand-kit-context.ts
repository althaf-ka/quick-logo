export const SOCIAL_BANNER_PURPOSES = [
  "brand-awareness",
  "product-promotion",
  "launch",
  "community",
  "personal-brand",
] as const;

export const SOCIAL_BANNER_VISUAL_DIRECTIONS = [
  "auto",
  "minimal",
  "editorial",
  "photographic",
  "geometric",
  "product-focused",
] as const;

export type SocialBannerPurpose = (typeof SOCIAL_BANNER_PURPOSES)[number];
export type SocialBannerVisualDirection =
  (typeof SOCIAL_BANNER_VISUAL_DIRECTIONS)[number];

export const BUSINESS_CARD_STYLES = [
  "auto",
  "minimal",
  "classic",
  "bold",
] as const;
export const BUSINESS_CARD_FORMATS = ["us", "eu"] as const;
export const BUSINESS_CARD_ORIENTATIONS = ["landscape", "portrait"] as const;
export const BUSINESS_CARD_CONTACT_FIELDS = [
  "name",
  "title",
  "phone",
  "email",
  "website",
  "address",
] as const;
export const BUSINESS_CARD_SOCIAL_PLATFORMS = [
  "instagram",
  "twitter",
  "linkedin",
  "facebook",
  "youtube",
  "tiktok",
] as const;
export const BUSINESS_CARD_QR_TARGETS = ["website", "vcard", "custom"] as const;

export type BusinessCardContactField =
  (typeof BUSINESS_CARD_CONTACT_FIELDS)[number];
export type BusinessCardSocialPlatform =
  (typeof BUSINESS_CARD_SOCIAL_PLATFORMS)[number];

export interface BusinessCardBrief {
  style: (typeof BUSINESS_CARD_STYLES)[number];
  format: (typeof BUSINESS_CARD_FORMATS)[number];
  orientation: (typeof BUSINESS_CARD_ORIENTATIONS)[number];
  includedContactFields: BusinessCardContactField[];
  includedSocialPlatforms: BusinessCardSocialPlatform[];
  includeQr: boolean;
  qrTarget: (typeof BUSINESS_CARD_QR_TARGETS)[number];
  customQrValue?: string;
  notes?: string;
}

export const DEFAULT_BUSINESS_CARD_BRIEF: BusinessCardBrief = {
  style: "auto",
  format: "us",
  orientation: "landscape",
  includedContactFields: ["name", "title", "phone", "email"],
  includedSocialPlatforms: [],
  includeQr: false,
  qrTarget: "website",
};

export function isValidBusinessCardQrUrl(value?: string): boolean {
  if (!value?.trim()) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export interface SocialMediaBrief {
  purpose: SocialBannerPurpose;
  visualDirection: SocialBannerVisualDirection;
  message?: string;
  callToAction?: string;
  includeLogo: boolean;
  includeTagline: boolean;
}

export interface StructuredBrandContext {
  industry?: string;
  tagline?: string;
  targetAudience?: string;
  selectedVibes?: string[];
  brandPersonality?: string;
  additionalContext?: string;
  socials?: Record<string, string>;
  contact?: Record<string, string>;
  guidelines?: { depth?: "essential" | "complete" };
  socialMediaBrief?: SocialMediaBrief;
  businessCardBrief?: BusinessCardBrief;
  _hydratedAt?: number;
}

export function buildBrandContextSummary(
  context: StructuredBrandContext,
  fallbackPrompt?: string,
): string {
  const parts: string[] = [];

  if (context.tagline) parts.push(`Tagline: ${context.tagline}`);
  if (context.industry) parts.push(`Industry: ${context.industry}`);
  if (context.targetAudience)
    parts.push(`Target Audience: ${context.targetAudience}`);
  if (context.selectedVibes && context.selectedVibes.length > 0)
    parts.push(`Brand Vibe: ${context.selectedVibes.join(", ")}`);
  if (context.brandPersonality?.trim()) {
    parts.push(`Brand Personality:\n${context.brandPersonality.trim()}`);
  }
  if (context.additionalContext?.trim()) {
    parts.push(`Additional Instructions:\n${context.additionalContext.trim()}`);
  }
  if (context.socialMediaBrief) {
    parts.push(
      `Social Banner Purpose: ${context.socialMediaBrief.purpose}`,
      `Social Banner Direction: ${context.socialMediaBrief.visualDirection}`,
    );
    if (context.socialMediaBrief.message?.trim()) {
      parts.push(`Social Banner Message: ${context.socialMediaBrief.message}`);
    }
  }
  if (context.businessCardBrief?.notes?.trim()) {
    parts.push(
      `Business Card Direction: ${context.businessCardBrief.notes.trim()}`,
    );
  }

  // If there's literally nothing, return fallback
  if (parts.length === 0) {
    return fallbackPrompt || "";
  }

  return parts.join("\n");
}
