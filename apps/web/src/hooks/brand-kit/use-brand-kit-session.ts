import { useState, useCallback } from "react";
import type {
  DeliverablesConfig,
  TypographyPreference,
  NormalizedBrandKit,
  WorkspaceState,
} from "../../types/brand-kit";

export function useBrandKitSession() {
  const [workspaceState, setWorkspaceState] =
    useState<WorkspaceState>("foundation");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [brandName, setBrandName] = useState("");
  const [typographyPreference, setTypographyPreference] =
    useState<TypographyPreference>(() => ({
      mood: "modern-sans",
      locked: false,
    }));

  const [deliverables, setDeliverables] = useState<DeliverablesConfig>(() => ({
    logoVariations: { enabled: false, config: {} },
    socialMedia: { enabled: false, config: {} },
    businessCard: { enabled: false, config: {} },
    favicon: { enabled: false, config: {} },
    brandedBackdrops: { enabled: false, config: {} },
    brandPresentation: { enabled: false, config: {} },
    brandGuidelines: { enabled: false, config: {} },
  }));

  const [productImageUrls, setProductImageUrls] = useState<string[]>([]);
  const [extractedColors, setExtractedColors] = useState<string[]>([]);

  const hydrateFromBrandKit = useCallback((normalized: NormalizedBrandKit) => {
    setBrandName(normalized.brandName);
    if (normalized.logoUrl) setLogoUrl(normalized.logoUrl);
    setExtractedColors(normalized.extractedColors);
    setTypographyPreference(normalized.typographyPreference);
    setDeliverables(normalized.deliverables);

    // Extract product images from presentation if available
    if (normalized.revisions && normalized.revisions.length > 0) {
      const active = normalized.revisions.find((r) => r.isActive);
      if (
        active &&
        active.results &&
        Array.isArray(active.results.productImages)
      ) {
        setProductImageUrls(active.results.productImages);
      }
    }
  }, []);

  const resetSession = useCallback(() => {
    setLogoUrl(null);
    setBrandName("");
    setTypographyPreference({ mood: "modern-sans", locked: false });
    setDeliverables({
      logoVariations: { enabled: false, config: {} },
      socialMedia: { enabled: false, config: {} },
      businessCard: { enabled: false, config: {} },
      favicon: { enabled: false, config: {} },
      brandedBackdrops: { enabled: false, config: {} },
      brandPresentation: { enabled: false, config: {} },
      brandGuidelines: { enabled: false, config: {} },
    });
    setProductImageUrls([]);
    setExtractedColors([]);
    setWorkspaceState("foundation");
  }, []);

  return {
    workspaceState,
    setWorkspaceState,
    logoUrl,
    setLogoUrl,
    brandName,
    setBrandName,
    typographyPreference,
    setTypographyPreference,
    deliverables,
    setDeliverables,
    productImageUrls,
    setProductImageUrls,
    extractedColors,
    setExtractedColors,
    hydrateFromBrandKit,
    resetSession,
  };
}
export type UseBrandKitSessionReturn = ReturnType<typeof useBrandKitSession>;
