import { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { InferResponseType } from "@quicklogo/api-client";
import type { BrandKitResultsData } from "@/components/brand-kit/brand-kit-results";
import { toast } from "@quicklogo/ui/components/sonner";
import { uploadFileToImageKit } from "@/lib/imagekit";
import { useAuth } from "@/hooks/use-auth";

export type BrandKitResponse = InferResponseType<
  (typeof api.brandKits)[":id"]["$get"],
  200
>;
export type BrandKitRevision = NonNullable<BrandKitResponse>["revisions"][0];

export interface Deliverables {
  logoVariations: boolean;
  socialMedia: boolean;
  businessCard: boolean;
  favicon: boolean;
  brandedBackdrops: boolean;
}

interface UseBrandKitOptions {
  imageId?: string;
  brandKitId?: string;
}

export function useBrandKit({
  imageId,
  brandKitId: initialBrandKitId,
}: UseBrandKitOptions) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [brandKitId, setBrandKitId] = useState<string | null>(
    initialBrandKitId || null,
  );

  // Local state for inputs (Initial Generation)
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isLoadingLogo, setIsLoadingLogo] = useState(!!imageId);
  const isFromPlatform = !!imageId;

  const [brandName, setBrandName] = useState("");
  const [prompt, setPrompt] = useState("");

  const [typography, setTypography] = useState("modern-sans");
  const [deliverables, setDeliverables] = useState<Deliverables>({
    logoVariations: false,
    socialMedia: false,
    businessCard: false,
    favicon: false,
    brandedBackdrops: false,
  });

  const [mockupImages, setMockupImages] = useState<File[]>([]);
  const [extractedColors, setExtractedColors] = useState<string[]>([]);
  const [targetSection, setTargetSection] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refiningSectionId, setRefiningSectionId] = useState<string | null>(
    null,
  );

  // 1. Unified Query for Fetching & Polling
  const {
    data,
    isLoading: isQueryLoading,
    error,
  } = useQuery({
    queryKey: ["brand-kit", brandKitId],
    queryFn: async () => {
      if (!brandKitId) return null;
      const res = await api.brandKits[":id"].$get({
        param: { id: brandKitId },
      });
      if (!res.ok) throw new Error("Failed to fetch Brand Kit");
      return res.json();
    },
    refetchInterval: (query) => {
      const status = query.state.data?.brandKit?.status;
      if (status === "pending" || status === "processing") return 15000;
      return false; // stop polling
    },
    enabled: !!brandKitId,
  });

  const brandKit = data?.brandKit ?? null;
  const revisions = useMemo(() => data?.revisions ?? [], [data?.revisions]);

  const results = useMemo(() => {
    const active = revisions.find((r) => r.isActive);
    return active ? (active.results as unknown as BrandKitResultsData) : null;
  }, [revisions]);

  const isGenerating =
    brandKit?.status === "pending" || brandKit?.status === "processing";

  // Pre-fill logo and brand name if imageId is provided
  useEffect(() => {
    if (!imageId) return;

    const fetchImage = async () => {
      try {
        const res = await api.images[":id"].$get({ param: { id: imageId } });
        if (res.ok) {
          const data = await res.json();
          setLogoUrl(data.image.imageUrl);
          // In a real app, colors would be extracted here or passed down
          setExtractedColors(["#10b981", "#047857", "#064e3b", "#ecfdf5"]);
          const imgConfig = data.image.config as Record<string, unknown>;
          if (imgConfig && typeof imgConfig.brandName === "string") {
            setBrandName(imgConfig.brandName);
          }
        }
      } catch (err) {
        console.error("Failed to fetch image", err);
      } finally {
        setIsLoadingLogo(false);
      }
    };

    fetchImage();
  }, [imageId]);

  // Mutations
  const { mutate: mutateGenerate } = useMutation({
    mutationFn: async () => {
      let finalLogoUrl = !isFromPlatform && logoUrl ? logoUrl : undefined;
      if (!isFromPlatform && logoFile) {
        finalLogoUrl = await uploadFileToImageKit(logoFile, user?.id);
      }

      const uploadedProductImageUrls =
        mockupImages.length > 0
          ? await Promise.all(
              mockupImages.map((file) => uploadFileToImageKit(file, user?.id)),
            )
          : undefined;

      const res = await api.brandKits.index.$post({
        json: {
          sourceImageId: isFromPlatform ? imageId : undefined,
          customLogoUrl: finalLogoUrl,
          brandName,
          prompt,
          typographyStyle: typography,
          deliverables,
          extractedColors,
          productImageUrls: uploadedProductImageUrls,
        },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        let errorMessage = errData?.error || "Failed to generate";
        const errJson = errData as Record<string, unknown>;
        if (
          errJson?.issues &&
          Array.isArray(errJson.issues) &&
          errJson.issues.length > 0
        ) {
          errorMessage = (errJson.issues[0] as { message: string }).message;
        }
        throw new Error(errorMessage);
      }
      return res.json();
    },
    onSuccess: (data: unknown) => {
      const d = data as { brandKitId: string };
      setBrandKitId(d.brandKitId);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to start generation");
    },
  });

  const { mutate: mutateRefine } = useMutation({
    mutationFn: async ({
      sectionId,
      refinementPrompt,
    }: {
      sectionId: string;
      refinementPrompt: string;
    }) => {
      if (!brandKitId) return;
      const res = await api.brandKits[":id"].refine.$post({
        param: { id: brandKitId },
        json: {
          sectionId: sectionId as
            | "logo-variations"
            | "color-palette"
            | "typography"
            | "social-media"
            | "business-card"
            | "favicon"
            | "branded-backdrops",
          refinementPrompt,
          typographyStyle: typography,
        },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        let errorMessage = errData?.error || "Failed to refine";
        const errJson = errData as Record<string, unknown>;
        if (
          errJson?.issues &&
          Array.isArray(errJson.issues) &&
          errJson.issues.length > 0
        ) {
          errorMessage = (errJson.issues[0] as { message: string }).message;
        }
        throw new Error(errorMessage);
      }
      return res.json();
    },
    onMutate: ({ sectionId, refinementPrompt }) => {
      if (!refinementPrompt.startsWith("__FONT_OVERRIDE__")) {
        setRefiningSectionId(sectionId);
      }
    },
    onSuccess: (_data, variables) => {
      // Font overrides use optimistic updates — skip refetch to prevent reverting
      if (variables.refinementPrompt.startsWith("__FONT_OVERRIDE__")) return;
      queryClient.invalidateQueries({ queryKey: ["brand-kit", brandKitId] });
      setPrompt("");
      setTargetSection(null);
    },
    onError: (err: Error, variables) => {
      if (variables.refinementPrompt.startsWith("__FONT_OVERRIDE__")) {
        queryClient.invalidateQueries({ queryKey: ["brand-kit", brandKitId] });
      }
      setRefiningSectionId(null);
      toast.error(err.message || "Failed to start refinement");
    },
    onSettled: () => {
      setRefiningSectionId(null);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async ({
      sectionId,
      sourceRevisionId,
    }: {
      sectionId: string;
      sourceRevisionId: string;
    }) => {
      if (!brandKitId) return;
      const res = await api.brandKits[":id"]["restore-section"].$post({
        param: { id: brandKitId },
        json: {
          sectionId: sectionId as
            | "logo-variations"
            | "color-palette"
            | "typography"
            | "social-media"
            | "business-card"
            | "favicon"
            | "branded-backdrops",
          sourceRevisionId,
        },
      });
      if (!res.ok) throw new Error("Failed to restore");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brand-kit", brandKitId] });
      toast.success("Section restored!");
    },
    onError: () => {
      toast.error("Failed to restore section");
    },
  });

  const handleLogoUpload = useCallback((file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Logo too large", {
        description: "Please use an image under 10MB.",
      });
      return;
    }
    const url = URL.createObjectURL(file);
    setLogoUrl(url);
    setLogoFile(file);
    setExtractedColors(["#3b82f6", "#1d4ed8", "#1e3a8a", "#eff6ff"]);
  }, []);

  const handleLogoRemove = useCallback(() => {
    setLogoUrl(null);
    setLogoFile(null);
    setExtractedColors([]);
  }, []);

  const handleFontChange = useCallback(
    (role: "heading" | "body", family: string) => {
      if (!brandKitId || !results) return;

      queryClient.setQueryData<BrandKitResponse | null>(
        ["brand-kit", brandKitId],
        (current) => {
          if (!current) return current;

          return {
            ...current,
            revisions: current.revisions.map((revision) => {
              if (!revision.isActive) return revision;

              const revisionResults =
                revision.results as unknown as BrandKitResultsData;

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
    [brandKitId, queryClient, mutateRefine, results],
  );

  const getSectionHistory = useCallback(
    (sectionPrefix: string) => {
      return revisions.filter((r) => {
        const type = r.triggerType;
        return (
          type === "initial_generation" ||
          type.startsWith(`refine_${sectionPrefix}`) ||
          type.startsWith(`restore_${sectionPrefix}`)
        );
      });
    },
    [revisions],
  );

  const mockupPreviews = useMemo(() => {
    return mockupImages.map((img) => URL.createObjectURL(img));
  }, [mockupImages]);

  useEffect(() => {
    return () => {
      mockupPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mockupImages]);

  // Credit calculation
  const baseCredits = 5;
  const regenerationCredits = 2;
  const extraCredits = useMemo(
    () =>
      (deliverables.logoVariations ? 2 : 0) +
      (deliverables.socialMedia ? 3 : 0) +
      (deliverables.businessCard ? 2 : 0) +
      (deliverables.favicon ? 1 : 0) +
      (deliverables.brandedBackdrops ? 2 : 0),
    [deliverables],
  );

  const totalCredits = useMemo(
    () => (targetSection ? regenerationCredits : baseCredits + extraCredits),
    [targetSection, extraCredits],
  );

  // Unified submit handler
  const handleGenerate = useCallback(() => {
    if (!logoUrl && !brandKitId) {
      toast.error("Please upload or select a logo first");
      return;
    }
    if (!prompt.trim() && !targetSection) {
      toast.error("Please describe your brand identity");
      return;
    }
    if (!isFromPlatform && !brandName.trim() && !targetSection) {
      toast.error("Brand name is required");
      return;
    }

    if (targetSection) {
      mutateRefine({ sectionId: targetSection, refinementPrompt: prompt });
    } else {
      mutateGenerate();
    }
  }, [
    logoUrl,
    brandKitId,
    prompt,
    targetSection,
    mutateRefine,
    mutateGenerate,
    isFromPlatform,
    brandName,
  ]);

  return {
    // State
    brandKitId,
    brandKit,
    revisions,
    results,
    isGenerating,
    isQueryLoading,
    error,

    // Form State
    logoUrl,
    isLoadingLogo,
    isFromPlatform,
    brandName,
    setBrandName,
    prompt,
    setPrompt,
    typography,
    setTypography,
    deliverables,
    setDeliverables,
    mockupImages,
    setMockupImages,
    mockupPreviews,
    extractedColors,
    sidebarOpen,
    setSidebarOpen,
    refiningSectionId,
    targetSection,
    setTargetSection,
    totalCredits,

    // Actions
    handleLogoUpload,
    handleLogoRemove,
    handleFontChange,
    handleGenerate,
    handleRefine: (sectionId: string, refinementPrompt: string) =>
      mutateRefine({ sectionId, refinementPrompt }),
    handleRestore: (sectionId: string, sourceRevisionId: string) =>
      restoreMutation.mutate({ sectionId, sourceRevisionId }),
    getSectionHistory,
  };
}

export function getSectionLabel(sectionId: string): string {
  const labels: Record<string, string> = {
    "logo-variations": "Logo Variations",
    "color-palette": "Color Palette",
    typography: "Typography System",
    "social-media": "Social Media Kit",
    "business-card": "Business Card",
    favicon: "Favicon & Icons",
    "brand-guidelines": "Brand Guidelines",
  };
  return labels[sectionId] ?? sectionId;
}
