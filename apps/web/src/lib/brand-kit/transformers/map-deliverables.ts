import type {
  DeliverablesConfig,
  BusinessCardConfig,
  SocialMediaConfig,
  PresentationConfig,
} from "../../../types/brand-kit";

export function mapDeliverables(results: any): DeliverablesConfig {
  const logoVariationsExist = !!(
    results.logoVariations && results.logoVariations.length > 0
  );
  const socialMediaExist = !!(
    results.socialMedia && results.socialMedia.length > 0
  );
  const businessCardExist = !!results.businessCard;
  const faviconExist = !!(results.favicons && results.favicons.length > 0);
  const brandedBackdropsExist = !!results.brandedBackdrops;
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
          new Set(results.socialMedia.map((s: any) => s.platform)),
        ),
        dimensions: results.socialMedia.reduce(
          (acc: Record<string, string>, s: any) => {
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
    brandedBackdrops: {
      enabled: brandedBackdropsExist,
      config: results.brandedBackdrops || {},
    },
    brandPresentation: {
      enabled: brandPresentationExist,
      config: presentationConfig,
    },
    brandGuidelines: {
      enabled: !!(results.brandGuidelines || results.logoUrl),
      config: results.brandGuidelines || { depth: "minimal" },
    },
  };
}
