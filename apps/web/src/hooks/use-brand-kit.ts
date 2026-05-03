import { useState, useCallback, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { toast } from "@quicklogo/ui/components/sonner";

export interface Deliverables {
  colorPalette: boolean;
  typography: boolean;
  socialMedia: boolean;
  businessCard: boolean;
  favicon: boolean;
}

export interface BrandKitSection {
  id: string;
  type: "logo-variations" | "color-palette" | "typography" | "social-media" | "business-card" | "favicon";
  label: string;
  data: unknown;
}

export interface BrandKitResults {
  id: string;
  sections: BrandKitSection[];
  createdAt: Date;
}

interface UseBrandKitOptions {
  /** For create mode: optional platform imageId from search params */
  imageId?: string;
  /** For view mode: saved brand kit ID to fetch from DB */
  brandKitId?: string;
}

export function useBrandKit({ imageId, brandKitId }: UseBrandKitOptions) {
  // ── Logo State ──────────────────────────────────────────────
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoadingLogo, setIsLoadingLogo] = useState(!!imageId || !!brandKitId);
  const isFromPlatform = !!imageId;

  // ── Brand Identity ──────────────────────────────────────────
  const [brandName, setBrandName] = useState("");
  const [prompt, setPrompt] = useState("");

  // ── Config ──────────────────────────────────────────────────
  const [typography, setTypography] = useState("modern-sans");
  const [deliverables, setDeliverables] = useState<Deliverables>({
    colorPalette: true,
    typography: true,
    socialMedia: false,
    businessCard: false,
    favicon: false,
  });

  // ── Product Images ──────────────────────────────────────────
  const [mockupImages, setMockupImages] = useState<File[]>([]);
  const [extractedColors, setExtractedColors] = useState<string[]>([]);

  // ── Targeting (for section regeneration) ────────────────────
  const [targetSection, setTargetSection] = useState<string | null>(null);

  // ── Generation ──────────────────────────────────────────────
  const [isGenerating, setIsGenerating] = useState(false);
  const [results] = useState<BrandKitResults | null>(null);

  // ── UI State ────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Derived: mockup preview URLs ────────────────────────────
  const mockupPreviews = useMemo(() => {
    return mockupImages.map((img) => URL.createObjectURL(img));
  }, [mockupImages]);

  // Cleanup mockup preview URLs
  useEffect(() => {
    return () => {
      mockupPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
    // Only cleanup on unmount or when mockupImages changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mockupImages]);

  // ── Credit Calculation ──────────────────────────────────────
  const baseCredits = 5;
  const regenerationCredits = 2;

  const extraCredits = useMemo(
    () =>
      (deliverables.socialMedia ? 3 : 0) +
      (deliverables.businessCard ? 2 : 0) +
      (deliverables.favicon ? 1 : 0),
    [deliverables],
  );

  const totalCredits = useMemo(
    () => (targetSection ? regenerationCredits : baseCredits + extraCredits),
    [targetSection, extraCredits],
  );

  // ── Fetch Platform Logo (when imageId is provided) ──────────
  useEffect(() => {
    if (!imageId) return;

    api.images[":id"]
      .$get({ param: { id: imageId } })
      .then((res) => {
        if (res.ok) {
          res.json().then((data) => {
            setLogoUrl(data.image.imageUrl);
            // TODO: Extract colors from actual image (use a vision API or canvas-based extraction)
            setExtractedColors(["#10b981", "#047857", "#064e3b", "#ecfdf5"]);

            // Auto-populate brand name if available from the original generation
            const imgData = data.image as Record<string, unknown>;
            if (typeof imgData.brandName === "string" && imgData.brandName) {
              setBrandName(imgData.brandName);
            }
          });
        } else {
          toast.error("Failed to load logo");
        }
      })
      .catch(() => toast.error("Failed to load logo"))
      .finally(() => setIsLoadingLogo(false));
  }, [imageId]);

  // ── Fetch Saved Brand Kit (when brandKitId is provided) ─────
  useEffect(() => {
    if (!brandKitId) return;

    // TODO: Fetch from brand-kit API endpoint when backend is ready
    // api.brandKit[":id"].$get({ param: { id: brandKitId } })
    //   .then(res => res.json())
    //   .then(data => {
    //     setLogoUrl(data.logoUrl);
    //     setExtractedColors(data.extractedColors);
    //     setBrandName(data.brandName);
    //     setTypography(data.typography);
    //     setDeliverables(data.deliverables);
    //     setResults(data.results);
    //   })
    //   .finally(() => setIsLoadingLogo(false));

    setIsLoadingLogo(false);
  }, [brandKitId]);

  // ── Logo Upload (user uploads their own) ────────────────────
  const handleLogoUpload = useCallback((file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Logo too large", {
        description: "Please use an image under 10MB.",
      });
      return;
    }

    const url = URL.createObjectURL(file);
    setLogoUrl(url);
    // TODO: Replace with real color extraction
    setExtractedColors(["#3b82f6", "#1d4ed8", "#1e3a8a", "#eff6ff"]);
  }, []);

  const handleLogoRemove = useCallback(() => {
    setLogoUrl(null);
    setExtractedColors([]);
  }, []);

  // ── Generation Handler ──────────────────────────────────────
  const handleGenerate = useCallback(() => {
    if (!logoUrl) {
      toast.error("Please upload or select a logo first");
      return;
    }
    if (!prompt.trim() && !targetSection) {
      toast.error("Please describe your brand identity");
      return;
    }

    setIsGenerating(true);

    // TODO: Wire up to actual AI generation endpoint via RPC
    // For now, mock the generation
    setTimeout(() => {
      setIsGenerating(false);

      if (targetSection) {
        toast.success(`${getSectionLabel(targetSection)} regenerated`);
        setTargetSection(null);
      } else {
        toast.success("Brand Kit generated successfully!");
        // TODO: Save to DB and redirect to /brand-kit/$id
      }
    }, 2000);
  }, [logoUrl, prompt, targetSection]);

  return {
    // Logo
    logoUrl,
    isLoadingLogo,
    handleLogoUpload,
    handleLogoRemove,
    isFromPlatform,

    // Brand Identity
    brandName,
    setBrandName,
    prompt,
    setPrompt,

    // Config
    typography,
    setTypography,
    deliverables,
    setDeliverables,
    mockupImages,
    setMockupImages,
    mockupPreviews,
    extractedColors,

    // Targeting
    targetSection,
    setTargetSection,

    // Generation
    isGenerating,
    handleGenerate,
    totalCredits,

    // Results
    results,

    // UI
    sidebarOpen,
    setSidebarOpen,
  };
}

function getSectionLabel(sectionId: string): string {
  const labels: Record<string, string> = {
    "logo-variations": "Logo Variations",
    "color-palette": "Color Palette",
    "typography": "Typography System",
    "social-media": "Social Media Kit",
    "business-card": "Business Card",
    "favicon": "Favicon & Icons",
  };
  return labels[sectionId] ?? sectionId;
}

export { getSectionLabel };
