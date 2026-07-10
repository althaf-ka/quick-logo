import { useState, useCallback, useEffect, useRef } from "react";
import type {
  DeliverablesConfig,
  TypographyPreference,
  NormalizedBrandKit,
  WorkspaceState,
} from "../../types/brand-kit";
import type { StructuredBrandContext } from "@quicklogo/shared";
import { structuredBrandContextSchema } from "@quicklogo/shared";

interface BrandKitDraft {
  version: 2;
  workspaceState: WorkspaceState;
  logoUrl: string | null;
  brandName: string;
  typographyPreference: TypographyPreference;
  deliverables: DeliverablesConfig;
  productImageUrls: string[];
  extractedColors: string[];
  structuredContext: StructuredBrandContext;
}

const DEFAULT_TYPOGRAPHY: TypographyPreference = {
  mood: "modern-sans",
  locked: false,
};

const DEFAULT_DELIVERABLES: DeliverablesConfig = {
  logoVariations: { enabled: false, config: {} },
  socialMedia: { enabled: false, config: {} },
  businessCard: { enabled: false, config: {} },
  favicon: { enabled: false, config: {} },
  brandGraphics: { enabled: false, config: {} },
  brandPresentation: { enabled: false, config: {} },
  brandGuidelines: { enabled: false, config: {} },
};

const SETUP_STATES = new Set<WorkspaceState>([
  "foundation",
  "creative-direction",
  "deliverables",
  "review",
]);

const migratedStorageKeys = new Set<string>();

export function useBrandKitSession(storageKeySuffix: string) {
  const storageKey = `brandkit-draft-v1-${storageKeySuffix}`;
  const draftPersistenceEnabled = useRef(true);

  if (typeof window !== "undefined" && !migratedStorageKeys.has(storageKey)) {
    migratedStorageKeys.add(storageKey);
    try {
      if (!localStorage.getItem("brandkit-draft-migrated")) {
        const legacy = localStorage.getItem("brandkit-draft-v1");
        if (legacy) {
          if (!localStorage.getItem(storageKey)) {
            localStorage.setItem(storageKey, legacy);
          }
          localStorage.removeItem("brandkit-draft-v1");
        }
        localStorage.setItem("brandkit-draft-migrated", "true");
      }
    } catch {
      // Storage can be unavailable in private or restricted browser modes.
    }
  }

  // 1. Initialize with defaults (SSR safe)
  const [workspaceState, setWorkspaceState] =
    useState<WorkspaceState>("foundation");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [brandName, setBrandName] = useState("");
  const [typographyPreference, setTypographyPreference] =
    useState<TypographyPreference>(DEFAULT_TYPOGRAPHY);
  const [deliverables, setDeliverables] =
    useState<DeliverablesConfig>(DEFAULT_DELIVERABLES);
  const [productImageUrls, setProductImageUrls] = useState<string[]>([]);
  const [extractedColors, setExtractedColors] = useState<string[]>([]);
  const [structuredContext, setStructuredContext] =
    useState<StructuredBrandContext>({});

  // Helper to load and parse draft from localStorage
  const loadDraft = useCallback(() => {
    try {
      const rawDraft = localStorage.getItem(storageKey);
      if (!rawDraft) return null;
      const parsed = JSON.parse(rawDraft) as Partial<BrandKitDraft>;
      const validatedContext = structuredBrandContextSchema.safeParse(
        parsed.structuredContext,
      );
      return {
        ...parsed,
        structuredContext: validatedContext.success
          ? validatedContext.data
          : undefined,
      };
    } catch (error) {
      console.warn("Failed to load brand kit draft", error);
      return null;
    }
  }, [storageKey]);

  // Apply parsed draft to state
  const applyDraft = useCallback((draft: Partial<BrandKitDraft>) => {
    if (draft.workspaceState && SETUP_STATES.has(draft.workspaceState)) {
      setWorkspaceState(draft.workspaceState);
    }
    if (draft.logoUrl !== undefined) setLogoUrl(draft.logoUrl);
    if (draft.brandName !== undefined) setBrandName(draft.brandName);
    if (draft.typographyPreference)
      setTypographyPreference(draft.typographyPreference);
    if (draft.deliverables) setDeliverables(draft.deliverables);
    if (draft.productImageUrls) setProductImageUrls(draft.productImageUrls);
    if (draft.extractedColors) setExtractedColors(draft.extractedColors);
    if (draft.structuredContext) setStructuredContext(draft.structuredContext);
  }, []);

  // 2. Hydrate once on mount
  useEffect(() => {
    const draft = loadDraft();
    if (draft) applyDraft(draft);
  }, [loadDraft, applyDraft]);

  // 3. Listen to cross-tab storage events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as Partial<BrandKitDraft>;
          applyDraft(parsed);
        } catch {
          // ignore parsing errors from other tabs
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [storageKey, applyDraft]);

  // 4. Save to localStorage with Quota checking
  useEffect(() => {
    if (!draftPersistenceEnabled.current) return;
    const draft: BrandKitDraft = {
      version: 2,
      workspaceState,
      logoUrl,
      brandName,
      typographyPreference,
      deliverables,
      productImageUrls,
      extractedColors,
      structuredContext,
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(draft));
    } catch (error) {
      if (
        error instanceof DOMException &&
        (error.name === "QuotaExceededError" ||
          error.name === "NS_ERROR_DOM_QUOTA_REACHED")
      ) {
        console.warn(
          "localStorage quota exceeded! The draft is too large to save. Try removing large images.",
          error,
        );
      } else {
        console.warn("Failed to save brand kit draft", error);
      }
    }
  }, [
    storageKey,
    workspaceState,
    logoUrl,
    brandName,
    typographyPreference,
    deliverables,
    productImageUrls,
    extractedColors,
    structuredContext,
  ]);

  const clearDraft = useCallback(() => {
    draftPersistenceEnabled.current = false;
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }, [storageKey]);

  const updateStructuredContext = useCallback(
    (context: Partial<StructuredBrandContext>) => {
      setStructuredContext((prev) => ({ ...prev, ...context }));
    },
    [],
  );

  const hydrateFromBrandKit = useCallback(
    (normalized: NormalizedBrandKit) => {
      setBrandName(normalized.brandName);
      if (normalized.logoUrl) setLogoUrl(normalized.logoUrl);
      setExtractedColors(normalized.extractedColors);
      setTypographyPreference(normalized.typographyPreference);
      if (
        normalized.status === "completed" ||
        (normalized.revisions && normalized.revisions.length > 0)
      ) {
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
        socialMediaBrief: normalized.socialMediaBrief,
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
    },
    [clearDraft],
  );

  const resetSession = useCallback(() => {
    draftPersistenceEnabled.current = true;
    setLogoUrl(null);
    setBrandName("");
    setTypographyPreference(DEFAULT_TYPOGRAPHY);
    setDeliverables(DEFAULT_DELIVERABLES);
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
