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

  // If there's literally nothing, return fallback
  if (parts.length === 0) {
    return fallbackPrompt || "";
  }

  return parts.join("\n");
}
