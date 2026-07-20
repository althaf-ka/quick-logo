import type {
  DeliverablesConfig,
  BusinessCardConfig,
  SocialMediaConfig,
  PresentationConfig,
} from "../../../types/brand-kit";

type GenerateResults = {
  logoVariations?: unknown[];
  socialMedia?: Array<{
    platform: string;
    type: string;
    size?: string;
    contentText?: string;
  }>;
  businessCard?: {
    layout?: "minimal" | "classic" | "bold";
    includeQr?: boolean;
    name?: string;
    title?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  favicons?: unknown[];
  brandGraphics?: Record<string, unknown>;
  /** @deprecated Use brandGraphics instead. Kept for backward compatibility. */
  brandedBackdrops?: Record<string, unknown>;
  brandPresentation?: {
    slidesCount?: number;
    theme?: "dark" | "light" | "dynamic";
  };
  brandGuidelines?: Record<string, unknown>;
  logoUrl?: string;
};

export function mapDeliverables(results: GenerateResults): DeliverablesConfig {
  const logoVariationsExist = !!(
    results.logoVariations && results.logoVariations.length > 0
  );
  const socialMediaExist = !!(
    results.socialMedia && results.socialMedia.length > 0
  );
  const businessCardExist = !!results.businessCard;
  const faviconExist = !!(results.favicons && results.favicons.length > 0);
  const brandGraphicsExist = !!(
    results.brandGraphics || results.brandedBackdrops
  );
  const brandPresentationExist = !!results.brandPresentation;

  // Map business card config
  const businessCardConfig: BusinessCardConfig = results.businessCard
    ? {
        layout: results.businessCard.layout || "minimal",
        includeQr: results.businessCard.includeQr || false,
        name: results.businessCard.name || "",
        title: results.businessCard.title || "",
        email: results.businessCard.email || "",
        phone: results.businessCard.phone || "",
        address: results.businessCard.address || "",
      }
    : {};

  // Map social media config
  const socialMediaConfig: SocialMediaConfig = results.socialMedia
    ? {
        platforms: Array.from(
          new Set(
            (results.socialMedia as Array<{ platform: string }>).map(
              (s) => s.platform,
            ),
          ),
        ),
        dimensions: results.socialMedia.reduce(
          (acc: Record<string, string>, s) => {
            if (s.size) acc[s.type] = s.size;
            return acc;
          },
          {},
        ),
      }
    : {};

  // Map presentation config
  const presentationConfig: PresentationConfig = results.brandPresentation
    ? {
        slidesCount: results.brandPresentation.slidesCount || 5,
        theme: results.brandPresentation.theme || "dark",
      }
    : {};

  return {
    logoVariations: {
      enabled: logoVariationsExist,
      config: results.logoVariations
        ? { variations: results.logoVariations }
        : {},
    },
    socialMedia: {
      enabled: socialMediaExist,
      config: socialMediaConfig,
    },
    businessCard: {
      enabled: businessCardExist,
      config: businessCardConfig,
    },
    favicon: {
      enabled: faviconExist,
      config: results.favicons ? { sizes: results.favicons } : {},
    },
    brandGraphics: {
      enabled: brandGraphicsExist,
      config: results.brandGraphics || results.brandedBackdrops || {},
    },
    brandPresentation: {
      enabled: brandPresentationExist,
      config: presentationConfig,
    },
    brandGuidelines: {
      enabled: !!results.brandGuidelines,
      config: {
        depth:
          results.brandGuidelines?.depth === "complete"
            ? "complete"
            : "essential",
      },
    },
  };
}
