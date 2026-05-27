import { useEffect, useCallback, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useBrandKitSession } from "./use-brand-kit-session";
import { useBrandKitGeneration } from "./use-brand-kit-generation";
import { useBrandKitRefinement } from "./use-brand-kit-refinement";
import { uploadFileToImageKit } from "@/lib/imagekit";
import { toast } from "@quicklogo/ui/components/sonner";
import type { NormalizedBrandKit } from "../../types/brand-kit";
import type { BrandKitResultsData } from "@/components/brand-kit/results/brand-kit-results";
import type { StructuredBrandContext } from "@quicklogo/shared";

interface UseBrandKitOptions {
  imageId?: string;
  brandKitId?: string;
}

export function useBrandKit({
  imageId,
  brandKitId: initialBrandKitId,
}: UseBrandKitOptions) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // 1. Instantiate lower-level hooks
  const session = useBrandKitSession();
  const {
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
    hydrateFromBrandKit: hydrateSession,
  } = session;

  const generation = useBrandKitGeneration({
    brandKitId: initialBrandKitId,
    onGenerationSuccess: () => {
      // Move to generating state while waiting for polling to complete
      setWorkspaceState("generating");
    },
  });
  const {
    brandKitId,
    isGeneratingKit,
    normalizedData,
    isQueryLoading,
    error: generationError,
    mutateGenerate,
  } = generation;

  // Use state to track logo upload process
  const [isLoadingLogo, setIsLoadingLogo] = useState(false);
  // Track uploaded logo file if needed locally

  // Track mockup uploads
  // Track mockup files if needed locally
  const [isUploadingMockups, setIsUploadingMockups] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const refinement = useBrandKitRefinement({
    brandKitId: brandKitId,
    typographyStyle: typographyPreference.mood,
  });
  const {
    isRefiningKit,
    prompt,
    setPrompt,
    targetSection,
    setTargetSection,
    refiningSectionId,
    conversationHistory,
    refinementHistory,
    hydrateFromBrandKit: hydrateRefinement,
    mutateRefine,
    mutateRestore,
  } = refinement;

  // 2. Hydration Flow (Sync query changes exactly once)
  useEffect(() => {
    if (normalizedData) {
      hydrateSession(normalizedData);
      hydrateRefinement(normalizedData);
      if (normalizedData.status === "completed") {
        setWorkspaceState("results");
      }
    }
  }, [
    normalizedData,
    hydrateSession,
    setWorkspaceState,
    hydrateRefinement,
  ]);

  const { data: imageDetails } = useQuery({
    queryKey: ["image-details", imageId],
    queryFn: async () => {
      if (!imageId) return null;
      const res = await api.images[":id"].$get({ param: { id: imageId } });
      if (!res.ok) throw new Error("Failed to fetch image details");
      return res.json();
    },
    enabled: !!imageId,
  });

  useEffect(() => {
    if (imageDetails?.image) {
      const img = imageDetails.image as {
        imageUrl?: string;
        brandName?: string;
      };
      if (img.imageUrl && !logoUrl) {
        setLogoUrl(img.imageUrl);
        setExtractedColors([
          "#3b82f6",
          "#1d4ed8",
          "#1e3a8a",
          "#eff6ff",
        ]);
      }
      if (img.brandName && !brandName) {
        setBrandName(img.brandName);
      }
    }
  }, [
    imageDetails,
    logoUrl,
    setLogoUrl,
    setExtractedColors,
    brandName,
    setBrandName,
  ]);

  // Derived state
  const status = normalizedData?.status;
  const isGenerating =
    status === "pending" ||
    status === "processing" ||
    isGeneratingKit ||
    isRefiningKit;

  const results = useMemo(() => {
    if (!normalizedData) return null;
    const activeRev = normalizedData.revisions.find((r) => r.isActive);
    if (!activeRev) return null;
    return activeRev.results as unknown as BrandKitResultsData;
  }, [normalizedData]);

  // 3. Orchestrated File Uploads & Generation
  const handleLogoUpload = useCallback(
    async (file: File) => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Logo too large", {
          description: "Please use an image under 10MB.",
        });
        return;
      }
      setIsLoadingLogo(true);
      try {
        const url = await uploadFileToImageKit(file, user?.id);
        setLogoUrl(url);
        // Optimistically seed palette derived from placeholder/image
        setExtractedColors([
          "#3b82f6",
          "#1d4ed8",
          "#1e3a8a",
          "#eff6ff",
        ]);
      } catch {
        toast.error("Failed to upload logo. Please try again.");
      } finally {
        setIsLoadingLogo(false);
      }
    },
    [user?.id, setLogoUrl, setExtractedColors],
  );

  const handleLogoRemove = useCallback(() => {
    setLogoUrl(null);
    setExtractedColors([]);
  }, [setLogoUrl, setExtractedColors]);

  const handleMockupUpload = useCallback(
    async (files: File[]) => {
      setIsUploadingMockups(true);
      try {
        const urls = await Promise.all(
          files.map((file) => uploadFileToImageKit(file, user?.id)),
        );
        setProductImageUrls(urls);
        return urls;
      } catch {
        toast.error("Failed to upload mockup images.");
        return [];
      } finally {
        setIsUploadingMockups(false);
      }
    },
    [user?.id, setProductImageUrls],
  );

  const handleFontChange = useCallback(
    (role: "heading" | "body", family: string) => {
      if (!brandKitId || !results) return;

      queryClient.setQueryData<NormalizedBrandKit | null>(
        ["brand-kit", brandKitId],
        (current) => {
          if (!current) return current;
          return {
            ...current,
            revisions: current.revisions.map((revision) => {
              if (!revision.isActive) return revision;
              const revisionResults = revision.results as unknown as BrandKitResultsData;
              return {
                ...revision,
                results: {
                  ...revisionResults,
                  typography: {
                    ...revisionResults.typography,
                    [role]: {
                      ...revisionResults.typography[role],
                      family,
                      name: family,
                    },
                  },
                },
              };
            }),
          };
        },
      );

      mutateRefine({
        sectionId: "typography",
        refinementPrompt: `__FONT_OVERRIDE__:${role}:${family}`,
      });
    },
    [brandKitId, results, queryClient, mutateRefine],
  );

  // Credit calculation
  const baseCredits = 5;
  const regenerationCredits = 2;
  const extraCredits =
    (deliverables.logoVariations.enabled ? 2 : 0) +
    (deliverables.socialMedia.enabled ? 3 : 0) +
    (deliverables.businessCard.enabled ? 2 : 0) +
    (deliverables.favicon.enabled ? 1 : 0) +
    (deliverables.brandedBackdrops.enabled ? 2 : 0) +
    (deliverables.brandPresentation.enabled ? 3 : 0);

  const totalCredits = targetSection
    ? regenerationCredits
    : baseCredits + extraCredits;

  // Conversational Submit Handler
  const handleGenerate = useCallback(
    async (customPrompt?: string, customContext?: Partial<StructuredBrandContext>) => {
      const activePrompt =
        customPrompt !== undefined ? customPrompt : prompt;
      
      const contextToUse = customContext || structuredContext;

      if (!logoUrl && !brandKitId) {
        toast.error("Please upload or select a logo first");
        return;
      }
      if (!activePrompt.trim() && !targetSection && Object.keys(contextToUse).length === 0) {
        toast.error("Please describe your brand identity");
        return;
      }
      if (!imageId && !brandName.trim() && !targetSection) {
        toast.error("Brand name is required");
        return;
      }
      if (
        deliverables.brandPresentation.enabled &&
        productImageUrls.length === 0
      ) {
        toast.error("Brand Presentation requires at least one product image");
        return;
      }

      if (customPrompt !== undefined) {
        setPrompt(customPrompt);
      }

      if (targetSection) {
        mutateRefine({
          sectionId: targetSection,
          refinementPrompt: activePrompt,
        });
      } else {
        mutateGenerate({
          sourceImageId: imageId,
          customLogoUrl: logoUrl || undefined,
          brandName: brandName,
          prompt: activePrompt,
          typographyStyle: typographyPreference.mood,
          extractedColors: extractedColors,
          productImageUrls:
            productImageUrls.length > 0
              ? productImageUrls
              : undefined,
          deliverables: {
            logoVariations: deliverables.logoVariations.enabled,
            socialMedia: deliverables.socialMedia.enabled,
            businessCard: deliverables.businessCard.enabled,
            favicon: deliverables.favicon.enabled,
            brandedBackdrops: deliverables.brandedBackdrops.enabled,
            brandPresentation: deliverables.brandPresentation.enabled,
            brandGuidelines: deliverables.brandGuidelines.enabled,
          },
          ...contextToUse,
        });
      }
    },
    [
      imageId,
      prompt,
      targetSection,
      setPrompt,
      mutateRefine,
      logoUrl,
      brandName,
      deliverables,
      productImageUrls,
      typographyPreference.mood,
      extractedColors,
      brandKitId,
      mutateGenerate,
      structuredContext,
    ],
  );

  return {
    // Session State
    workspaceState,
    setWorkspaceState,
    logoUrl,
    brandName,
    setBrandName,
    typography: typographyPreference.mood,
    setTypography: (mood: string) =>
      setTypographyPreference((prev) => ({ ...prev, mood })),
    deliverables,
    setDeliverables,
    productImageUrls,
    setProductImageUrls,
    extractedColors,
    structuredContext,
    updateStructuredContext,

    // Upload Progress States
    isLoadingLogo,
    isUploadingMockups,

    // Generation & Polling State
    brandKitId,
    normalizedData,
    results,
    isGenerating,
    isQueryLoading,
    error: generationError,
    totalCredits,
    isFromPlatform: !!imageId,

    // Refinement State
    prompt,
    setPrompt,
    targetSection,
    setTargetSection,
    refiningSectionId,
    conversationHistory,
    refinementHistory,

    // UI state
    sidebarOpen,
    setSidebarOpen,

    // Actions
    handleLogoUpload,
    handleLogoRemove,
    handleMockupUpload,
    handleFontChange,
    handleGenerate,
    handleRefine: (sectionId: string, refinementPrompt: string) =>
      mutateRefine({ sectionId, refinementPrompt }),
    handleRestore: (sectionId: string, sourceRevisionId: string) =>
      mutateRestore({ sectionId, sourceRevisionId }),
    getSectionHistory: (sectionPrefix: string) => {
      if (!normalizedData) return [];
      return normalizedData.revisions.filter((r) => {
        const type = r.triggerType;
        return (
          type === "initial_generation" ||
          type.startsWith(`refine_${sectionPrefix}`) ||
          type.startsWith(`restore_${sectionPrefix}`)
        );
      });
    },
  };
}

export function getSectionLabel(sectionId: string): string {
  switch (sectionId) {
    case "logoVariations":
      return "Logo Variations";
    case "socialMedia":
      return "Social Media Kit";
    case "businessCard":
      return "Business Cards";
    case "favicon":
      return "Favicons";
    case "brandedBackdrops":
      return "Branded Backdrops";
    case "brandPresentation":
      return "Brand Presentation";
    case "typography":
      return "Typography System";
    default:
      return sectionId;
  }
}
