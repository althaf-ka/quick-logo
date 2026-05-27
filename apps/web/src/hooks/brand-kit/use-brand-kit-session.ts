import { useState, useCallback } from "react";
import type {
  DeliverablesConfig,
  TypographyPreference,
  NormalizedBrandKit,
  WorkspaceState,
} from "../../types/brand-kit";
import type { StructuredBrandContext } from "@quicklogo/shared";
import { structuredBrandContextSchema } from "@quicklogo/shared";

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
  
  // Structured Questionnaire Context
  const [structuredContext, setStructuredContext] = useState<StructuredBrandContext>(() => {
    if (typeof window === "undefined") return {};
    try {
      const draft = localStorage.getItem("brandkit-draft-v1");
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.structuredContext) {
          const validated = structuredBrandContextSchema.safeParse(parsed.structuredContext);
          if (validated.success) {
            return validated.data;
          }
        }
      }
    } catch (e) {
      console.warn("Failed to load draft", e);
    }
    return {};
  });

  const saveDraft = useCallback((context: StructuredBrandContext) => {
    try {
      localStorage.setItem("brandkit-draft-v1", JSON.stringify({ structuredContext: context }));
    } catch (e) {
      console.warn("Failed to save draft", e);
    }
  }, []);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem("brandkit-draft-v1");
    } catch {
      // ignore
    }
  }, []);

  const updateStructuredContext = useCallback((context: Partial<StructuredBrandContext>) => {
    setStructuredContext((prev) => {
      const next = { ...prev, ...context };
      saveDraft(next);
      return next;
    });
  }, [saveDraft]);

  const hydrateFromBrandKit = useCallback((normalized: NormalizedBrandKit) => {
    setBrandName(normalized.brandName);
    if (normalized.logoUrl) setLogoUrl(normalized.logoUrl);
    setExtractedColors(normalized.extractedColors);
    setTypographyPreference(normalized.typographyPreference);
    if (normalized.status === "completed" || (normalized.revisions && normalized.revisions.length > 0)) {
      setDeliverables(normalized.deliverables);
    }
    
    // Clear stale draft since we are loading server state
    clearDraft();
    
    // Hydrate structured fields from the normalized kit
    setStructuredContext({
      _hydratedAt: Date.now(),
      industry: normalized.industry,
      tagline: normalized.tagline,
      targetAudience: normalized.targetAudience,
      selectedVibes: normalized.selectedVibes,
      brandPersonality: normalized.brandPersonality,
      additionalContext: normalized.additionalContext,
      socials: normalized.socials,
      contact: normalized.contact,
      guidelines: normalized.guidelines,
    });

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
  }, [clearDraft]);

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
    setStructuredContext({});
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
    structuredContext,
    updateStructuredContext,
    clearDraft,
    hydrateFromBrandKit,
    resetSession,
  };
}
export type UseBrandKitSessionReturn = ReturnType<typeof useBrandKitSession>;
