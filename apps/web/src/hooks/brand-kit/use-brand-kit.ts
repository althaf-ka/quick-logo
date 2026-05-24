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
  const generation = useBrandKitGeneration({
    brandKitId: initialBrandKitId,
    onGenerationSuccess: () => {
      // Move to generating state while waiting for polling to complete
      session.setWorkspaceState("generating");
    },
  });

  // Use state to track logo upload process
  const [isLoadingLogo, setIsLoadingLogo] = useState(false);
  // Track uploaded logo file if needed locally

  // Track mockup uploads
  // Track mockup files if needed locally
  const [isUploadingMockups, setIsUploadingMockups] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const refinement = useBrandKitRefinement({
    brandKitId: generation.brandKitId,
    typographyStyle: session.typographyPreference.mood,
  });

  // 2. Hydration Flow (Sync query changes exactly once)
  const normalizedData = generation.normalizedData;
  useEffect(() => {
    if (normalizedData) {
      session.hydrateFromBrandKit(normalizedData);
      refinement.hydrateFromBrandKit(normalizedData);
    }
  }, [normalizedData, session, refinement]);

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
      if (img.imageUrl && !session.logoUrl) {
        session.setLogoUrl(img.imageUrl);
        session.setExtractedColors([
          "#3b82f6",
          "#1d4ed8",
          "#1e3a8a",
          "#eff6ff",
        ]);
      }
      if (img.brandName && !session.brandName) {
        session.setBrandName(img.brandName);
      }
    }
  }, [imageDetails, session]);

  // Derived state
  const isGenerating = useMemo(() => {
    const status = normalizedData?.status;
    return (
      status === "pending" ||
      status === "processing" ||
      generation.isGeneratingKit ||
      refinement.isRefiningKit
    );
  }, [
    normalizedData?.status,
    generation.isGeneratingKit,
    refinement.isRefiningKit,
  ]);

  const results = useMemo(() => {
    if (!normalizedData) return null;
    const activeRev = normalizedData.revisions.find((r) => r.isActive);
    if (!activeRev) return null;
    return activeRev.results as any;
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
        session.setLogoUrl(url);
        // Optimistically seed palette derived from placeholder/image
        session.setExtractedColors([
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
    [user?.id, session],
  );

  const handleLogoRemove = useCallback(() => {
    session.setLogoUrl(null);
    session.setExtractedColors([]);
  }, [session]);

  const handleMockupUpload = useCallback(
    async (files: File[]) => {
      setIsUploadingMockups(true);
      try {
        const urls = await Promise.all(
          files.map((file) => uploadFileToImageKit(file, user?.id)),
        );
        session.setProductImageUrls(urls);
        toast.success("Product images uploaded successfully!");
      } catch {
        toast.error("Failed to upload mockup images.");
      } finally {
        setIsUploadingMockups(false);
      }
    },
    [user?.id, session],
  );

  const handleFontChange = useCallback(
    (role: "heading" | "body", family: string) => {
      const bkId = generation.brandKitId;
      if (!bkId || !results) return;

      queryClient.setQueryData<NormalizedBrandKit | null>(
        ["brand-kit", bkId],
        (current) => {
          if (!current) return current;
          return {
            ...current,
            revisions: current.revisions.map((revision) => {
              if (!revision.isActive) return revision;
              const revisionResults = revision.results as any;
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

      refinement.mutateRefine({
        sectionId: "typography",
        refinementPrompt: `__FONT_OVERRIDE__:${role}:${family}`,
      });
    },
    [generation.brandKitId, results, queryClient, refinement],
  );

  // Credit calculation
  const baseCredits = 5;
  const regenerationCredits = 2;
  const extraCredits = useMemo(() => {
    const d = session.deliverables;
    return (
      (d.logoVariations.enabled ? 2 : 0) +
      (d.socialMedia.enabled ? 3 : 0) +
      (d.businessCard.enabled ? 2 : 0) +
      (d.favicon.enabled ? 1 : 0) +
      (d.brandedBackdrops.enabled ? 2 : 0) +
      (d.brandPresentation.enabled ? 3 : 0)
    );
  }, [session.deliverables]);

  const totalCredits = useMemo(
    () =>
      refinement.targetSection
        ? regenerationCredits
        : baseCredits + extraCredits,
    [refinement.targetSection, extraCredits],
  );

  // Conversational Submit Handler
  const handleGenerate = useCallback(
    async (customPrompt?: string) => {
      const activePrompt =
        customPrompt !== undefined ? customPrompt : refinement.prompt;

      if (!session.logoUrl && !generation.brandKitId) {
        toast.error("Please upload or select a logo first");
        return;
      }
      if (!activePrompt.trim() && !refinement.targetSection) {
        toast.error("Please describe your brand identity");
        return;
      }
      if (!imageId && !session.brandName.trim() && !refinement.targetSection) {
        toast.error("Brand name is required");
        return;
      }
      if (
        session.deliverables.brandPresentation.enabled &&
        session.productImageUrls.length === 0
      ) {
        toast.error("Brand Presentation requires at least one product image");
        return;
      }

      if (customPrompt !== undefined) {
        refinement.setPrompt(customPrompt);
      }

      if (refinement.targetSection) {
        refinement.mutateRefine({
          sectionId: refinement.targetSection,
          refinementPrompt: activePrompt,
        });
      } else {
        const d = session.deliverables;
        generation.mutateGenerate({
          sourceImageId: imageId,
          customLogoUrl: session.logoUrl || undefined,
          brandName: session.brandName,
          prompt: activePrompt,
          typographyStyle: session.typographyPreference.mood,
          extractedColors: session.extractedColors,
          productImageUrls:
            session.productImageUrls.length > 0
              ? session.productImageUrls
              : undefined,
          deliverables: {
            logoVariations: d.logoVariations.enabled,
            socialMedia: d.socialMedia.enabled,
            businessCard: d.businessCard.enabled,
            favicon: d.favicon.enabled,
            brandedBackdrops: d.brandedBackdrops.enabled,
            brandPresentation: d.brandPresentation.enabled,
            brandGuidelines: d.brandGuidelines.enabled,
          },
        });
      }
    },
    [imageId, session, generation, refinement],
  );

  return {
    // Session State
    workspaceState: session.workspaceState,
    setWorkspaceState: session.setWorkspaceState,
    logoUrl: session.logoUrl,
    brandName: session.brandName,
    setBrandName: session.setBrandName,
    typography: session.typographyPreference.mood,
    setTypography: (mood: string) =>
      session.setTypographyPreference((prev) => ({ ...prev, mood })),
    deliverables: session.deliverables,
    setDeliverables: session.setDeliverables,
    productImageUrls: session.productImageUrls,
    setProductImageUrls: session.setProductImageUrls,
    extractedColors: session.extractedColors,

    // Upload Progress States
    isLoadingLogo,
    isUploadingMockups,

    // Generation & Polling State
    brandKitId: generation.brandKitId,
    normalizedData,
    results,
    isGenerating,
    isQueryLoading: generation.isQueryLoading,
    error: generation.error,
    totalCredits,
    isFromPlatform: !!imageId,

    // Refinement State
    prompt: refinement.prompt,
    setPrompt: refinement.setPrompt,
    targetSection: refinement.targetSection,
    setTargetSection: refinement.setTargetSection,
    refiningSectionId: refinement.refiningSectionId,
    conversationHistory: refinement.conversationHistory,
    refinementHistory: refinement.refinementHistory,

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
      refinement.mutateRefine({ sectionId, refinementPrompt }),
    handleRestore: (sectionId: string, sourceRevisionId: string) =>
      refinement.mutateRestore({ sectionId, sourceRevisionId }),
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
