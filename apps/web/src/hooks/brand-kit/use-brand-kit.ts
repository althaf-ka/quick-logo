import { useEffect, useCallback, useMemo, useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useBrandKitSession } from "./use-brand-kit-session";
import { useBrandKitGeneration } from "./use-brand-kit-generation";
import { useBrandKitRefinement } from "./use-brand-kit-refinement";
import { uploadFileToImageKit } from "@/lib/imagekit";
import {
  extractColorsFromFile,
  extractColorsFromUrl,
} from "@/lib/brand-kit/extract-colors";
import { toast } from "@quicklogo/ui/components/sonner";
import type { BrandKitResultsData } from "@/components/brand-kit/results/brand-kit-results";
import type {
  StructuredBrandContext,
  RefinementSectionId,
  RestoreSectionId,
} from "@quicklogo/shared";
import {
  computeBrandKitCost,
  computeBrandKitRefinementCost,
} from "@quicklogo/shared";

interface UseBrandKitOptions {
  imageId?: string;
  brandKitId?: string;
}

export function useBrandKit({
  imageId,
  brandKitId: initialBrandKitId,
}: UseBrandKitOptions) {
  const { user } = useAuth();

  // 1. Instantiate lower-level hooks
  const storageKeySuffix = initialBrandKitId
    ? `kit-${initialBrandKitId}`
    : imageId
      ? `img-${imageId}`
      : "new";
  const session = useBrandKitSession(storageKeySuffix);
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
    clearDraft,
    hydrateFromBrandKit: hydrateSession,
  } = session;

  const generation = useBrandKitGeneration({
    brandKitId: initialBrandKitId,
    onGenerationSuccess: () => {
      clearDraft();
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

  // Track mockup uploads
  const [isUploadingMockups, setIsUploadingMockups] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeOperationCredits, setActiveOperationCredits] = useState<
    number | null
  >(null);

  const refinement = useBrandKitRefinement({
    brandKitId: brandKitId,
    typographyStyle: typographyPreference.mood,
    activeRefinement: normalizedData?.activeRefinement,
  });
  const {
    isRefiningKit,
    prompt,
    setPrompt,
    targetSection,
    setTargetSection,
    refiningSectionId,
    targetItemId,
    setTargetItemId,
    conversationHistory,
    refinementHistory,
    hydrateFromBrandKit: hydrateRefinement,
    mutateRefine,
    mutateEdit,
    isSavingEdit,
    mutateRestore,
    mutateRestoreFull,
  } = refinement;

  // 2. Hydration Flow (Sync query changes exactly once)
  const initialLoadDone = useRef(false);

  useEffect(() => {
    if (
      normalizedData &&
      !initialLoadDone.current &&
      (normalizedData.status === "completed" ||
        (normalizedData.revisions?.length ?? 0) > 0)
    ) {
      initialLoadDone.current = true;
      hydrateSession(normalizedData);
      hydrateRefinement(normalizedData);
    }
  }, [normalizedData, hydrateSession, hydrateRefinement]);

  useEffect(() => {
    if (
      normalizedData?.status === "pending" ||
      normalizedData?.status === "processing"
    ) {
      setWorkspaceState("generating");
    } else if (normalizedData?.status === "completed") {
      setWorkspaceState("results");
    }
  }, [normalizedData?.status, setWorkspaceState]);

  const { data: imageDetails, isError: isImageError } = useQuery({
    queryKey: ["image-details", imageId],
    queryFn: async () => {
      if (!imageId) return null;
      const res = await api.images[":id"].$get({ param: { id: imageId } });
      if (!res.ok) throw new Error("Failed to fetch image details");
      return res.json();
    },
    enabled: !!imageId,
  });

  // Guard ref prevents double-extraction during React StrictMode mount
  // (the !logoUrl check already prevents normal re-renders from triggering this).
  const colorExtractionStarted = useRef(false);

  useEffect(() => {
    if (imageDetails?.image) {
      const img = imageDetails.image as {
        imageUrl?: string;
        brandName?: string;
        config?: { brandName?: string; industry?: string };
      };
      if (img.imageUrl && !logoUrl) {
        setLogoUrl(img.imageUrl);

        if (!colorExtractionStarted.current) {
          colorExtractionStarted.current = true;
          extractColorsFromUrl(img.imageUrl)
            .then((colors) => {
              if (colors.length > 0) setExtractedColors(colors);
            })
            .catch(() => {});
        }
      }

      const extractedBrandName = img.brandName || img.config?.brandName;
      if (extractedBrandName && extractedBrandName !== brandName) {
        setBrandName(extractedBrandName);
      }

      const extractedIndustry = img.config?.industry;
      if (
        extractedIndustry &&
        extractedIndustry.trim() !== "" &&
        extractedIndustry.toLowerCase() !== "auto" &&
        extractedIndustry !== structuredContext.industry
      ) {
        updateStructuredContext({
          industry: extractedIndustry,
          _hydratedAt: Date.now(),
        });
      }
    }
  }, [
    imageDetails,
    logoUrl,
    setLogoUrl,
    setExtractedColors,
    brandName,
    setBrandName,
    structuredContext.industry,
    updateStructuredContext,
  ]);

  // Derived state
  const status = normalizedData?.status;
  const isImageLoading = !!imageId && !logoUrl && !isImageError;

  const isGenerating =
    status === "pending" ||
    status === "processing" ||
    isGeneratingKit ||
    isRefiningKit;

  const results = useMemo(() => {
    if (!normalizedData) return null;
    const activeRev = normalizedData.revisions?.find((r) => r.isActive);
    if (!activeRev) return null;
    const revisionResults = activeRev.results as unknown as BrandKitResultsData;
    return {
      ...revisionResults,
      brandName: revisionResults.brandName || normalizedData.brandName,
      logoUrl: revisionResults.logoUrl || normalizedData.logoUrl,
    };
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
        const [url, colors] = await Promise.all([
          uploadFileToImageKit(file, user?.id),
          extractColorsFromFile(file).catch(() => [] as string[]),
        ]);

        setLogoUrl(url);
        setExtractedColors(colors);

        if (!colors || colors.length === 0) {
          toast.warning("Could not read colors from this logo.", {
            description: "A default professional palette will be used instead.",
          });
        }
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
    colorExtractionStarted.current = false;
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
        return undefined;
      } finally {
        setIsUploadingMockups(false);
      }
    },
    [user?.id, setProductImageUrls],
  );

  const handleFontChange = useCallback(
    (role: "heading" | "body", family: string) => {
      if (!brandKitId || !results) return;
      mutateEdit({ action: "set-font", role, family });
    },
    [brandKitId, results, mutateEdit],
  );

  const handlePaletteChange = useCallback(
    (colors: Array<{ hex: string; role: string }>) => {
      if (!brandKitId || !results) return;
      mutateEdit({ action: "set-palette", colors });
    },
    [brandKitId, results, mutateEdit],
  );

  const generationCredits = computeBrandKitCost({
    logoVariations: deliverables.logoVariations.enabled,
    socialMedia: deliverables.socialMedia.enabled,
    businessCard: deliverables.businessCard.enabled,
    favicon: deliverables.favicon.enabled,
    brandGraphics: deliverables.brandGraphics.enabled,
    brandPresentation: deliverables.brandPresentation.enabled,
    brandGuidelines: deliverables.brandGuidelines.enabled,
  });
  const pendingOperationCredits =
    targetSection || brandKitId
      ? computeBrandKitRefinementCost(targetSection, targetItemId)
      : generationCredits;
  const totalCredits = isGenerating
    ? (activeOperationCredits ??
      normalizedData?.activeRefinement?.creditsUsed ??
      normalizedData?.creditsUsed ??
      pendingOperationCredits)
    : pendingOperationCredits;

  // Conversational Submit Handler
  const handleGenerate = useCallback(
    async (
      customPrompt?: string,
      customContext?: Partial<StructuredBrandContext>,
      customProductImageUrls?: string[],
    ) => {
      if (isGeneratingKit || isRefiningKit) return;
      const activePrompt = customPrompt !== undefined ? customPrompt : prompt;

      const contextToUse = customContext || structuredContext;

      if (!logoUrl && !brandKitId) {
        toast.error("Please upload or select a logo first");
        return;
      }
      if (
        !activePrompt.trim() &&
        !targetSection &&
        Object.keys(contextToUse).length === 0
      ) {
        toast.error("Please describe your brand identity");
        return;
      }
      if (!imageId && !brandName.trim() && !targetSection) {
        toast.error("Brand name is required");
        return;
      }
      if (customPrompt !== undefined) {
        setPrompt(customPrompt);
      }

      const presentationImageUrls = customProductImageUrls ?? productImageUrls;

      setActiveOperationCredits(
        targetSection || brandKitId
          ? computeBrandKitRefinementCost(targetSection, targetItemId)
          : generationCredits,
      );

      if (targetSection) {
        mutateRefine({
          sectionId: targetSection as RefinementSectionId,
          refinementPrompt: activePrompt,
          targetItemId: targetItemId || undefined,
        });
      } else if (brandKitId) {
        mutateRefine({
          sectionId: "global",
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
            presentationImageUrls.length > 0
              ? presentationImageUrls
              : undefined,
          deliverables: {
            logoVariations: deliverables.logoVariations.enabled,
            socialMedia: deliverables.socialMedia.enabled,
            businessCard: deliverables.businessCard.enabled,
            favicon: deliverables.favicon.enabled,
            brandGraphics: deliverables.brandGraphics.enabled,
            brandPresentation: deliverables.brandPresentation.enabled,
            brandGuidelines: deliverables.brandGuidelines.enabled,
          },
          ...contextToUse,
        });
      }
    },
    [
      isGeneratingKit,
      isRefiningKit,
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
      targetItemId,
      generationCredits,
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
    isImageLoading,
    error: generationError,
    totalCredits,
    isFromPlatform: !!imageId,

    // Refinement State
    prompt,
    setPrompt,
    targetSection,
    setTargetSection,
    targetItemId,
    setTargetItemId,
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
    handlePaletteChange,
    isSavingEdit,
    handleGenerate,
    handleRefine: (
      sectionId: string,
      refinementPrompt: string,
      targetItemId?: string,
    ) => {
      if (
        isRefiningKit ||
        refinement.isRestoringKit ||
        refinement.isRestoringFull
      )
        return;
      mutateRefine({
        sectionId: sectionId as RefinementSectionId,
        refinementPrompt,
        targetItemId,
      });
    },
    handleRestore: (sectionId: string, sourceRevisionId: string) => {
      if (
        isRefiningKit ||
        refinement.isRestoringKit ||
        refinement.isRestoringFull
      )
        return;
      mutateRestore({
        sectionId: sectionId as RestoreSectionId,
        sourceRevisionId,
      });
    },
    handleRestoreFull: (sourceRevisionId: string) => {
      if (
        isRefiningKit ||
        refinement.isRestoringKit ||
        refinement.isRestoringFull
      )
        return;
      mutateRestoreFull({ sourceRevisionId });
    },
    getSectionHistory: (sectionPrefix: string) => {
      if (!normalizedData) return [];
      return normalizedData.revisions.filter(
        (revision) =>
          revision.revisionType === "initial" ||
          revision.sectionId === sectionPrefix,
      );
    },
  };
}
