import { useState, useCallback, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { toast } from "@quicklogo/ui/components/sonner";
import type { BrandKitResultsData } from "@/components/brand-kit/brand-kit-results";
import { getFontById } from "@/components/brand-kit/brand-kit-fonts";

export interface Deliverables {
  colorPalette: boolean;
  typography: boolean;
  socialMedia: boolean;
  businessCard: boolean;
  favicon: boolean;
}

interface UseBrandKitOptions {
  imageId?: string;
  brandKitId?: string;
}

export function useBrandKit({ imageId, brandKitId }: UseBrandKitOptions) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoadingLogo, setIsLoadingLogo] = useState(!!imageId || !!brandKitId);
  const isFromPlatform = !!imageId;

  const [brandName, setBrandName] = useState("");
  const [prompt, setPrompt] = useState("");

  const [typography, setTypography] = useState("modern-sans");
  const [deliverables, setDeliverables] = useState<Deliverables>({
    colorPalette: true,
    typography: true,
    socialMedia: false,
    businessCard: false,
    favicon: false,
  });

  const [mockupImages, setMockupImages] = useState<File[]>([]);
  const [extractedColors, setExtractedColors] = useState<string[]>([]);
  const [targetSection, setTargetSection] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [refiningSectionId, setRefiningSectionId] = useState<string | null>(null);
  const [results, setResults] = useState<BrandKitResultsData | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const mockupPreviews = useMemo(() => {
    return mockupImages.map((img) => URL.createObjectURL(img));
  }, [mockupImages]);

  useEffect(() => {
    return () => {
      mockupPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mockupImages]);

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

  useEffect(() => {
    if (!imageId) return;

    api.images[":id"]
      .$get({ param: { id: imageId } })
      .then((res) => {
        if (res.ok) {
          res.json().then((data) => {
            setLogoUrl(data.image.imageUrl);
            setExtractedColors(["#10b981", "#047857", "#064e3b", "#ecfdf5"]);

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

  useEffect(() => {
    if (!brandKitId) return;
    // TODO: Wire up to brand-kit API endpoint via RPC
    setIsLoadingLogo(false);
  }, [brandKitId]);

  const handleLogoUpload = useCallback((file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Logo too large", {
        description: "Please use an image under 10MB.",
      });
      return;
    }

    const url = URL.createObjectURL(file);
    setLogoUrl(url);
    setExtractedColors(["#3b82f6", "#1d4ed8", "#1e3a8a", "#eff6ff"]);
  }, []);

  const handleLogoRemove = useCallback(() => {
    setLogoUrl(null);
    setExtractedColors([]);
  }, []);

  const handleGenerate = useCallback(() => {
    if (!logoUrl) {
      toast.error("Please upload or select a logo first");
      return;
    }
    if (!prompt.trim() && !targetSection) {
      toast.error("Please describe your brand identity");
      return;
    }

    if (targetSection) {
      setRefiningSectionId(targetSection);
    } else {
      setIsGenerating(true);
    }

    // TODO: Wire up to AI generation endpoint via RPC
    setTimeout(() => {
      setIsGenerating(false);
      setRefiningSectionId(null);

      if (targetSection) {
        toast.success(`${getSectionLabel(targetSection)} regenerated`);
        setTargetSection(null);
      } else {
        const selectedFont = getFontById(typography);

        const mockResults: BrandKitResultsData = {
          brandName: brandName || "Your Brand",
          logoUrl: logoUrl,
          productImages: mockupPreviews.length > 0 ? mockupPreviews : undefined,
          logoVariations: [
            { id: "primary", label: "Primary", url: logoUrl, background: "light" },
            { id: "dark", label: "On Dark", url: logoUrl, background: "dark" },
            { id: "mono", label: "Monochrome", url: logoUrl, background: "light" },
            { id: "icon", label: "Icon Only", url: logoUrl, background: "transparent" },
          ],
          colorPalette: [
            { hex: extractedColors[0] || "#3b82f6", role: "Primary", rgb: "59, 130, 246" },
            { hex: extractedColors[1] || "#1d4ed8", role: "Dark", rgb: "29, 78, 216" },
            { hex: extractedColors[2] || "#1e3a8a", role: "Accent", rgb: "30, 58, 138" },
            { hex: extractedColors[3] || "#eff6ff", role: "Light", rgb: "239, 246, 255" },
            { hex: "#f8fafc", role: "Background", rgb: "248, 250, 252" },
            { hex: "#0f172a", role: "Text", rgb: "15, 23, 42" },
          ],
          typography: {
            heading: {
              name: selectedFont.name,
              family: selectedFont.family,
              weight: "700",
            },
            body: {
              name: selectedFont.name,
              family: selectedFont.family,
              weight: "400",
            },
          },
          ...(deliverables.socialMedia && {
            socialMedia: [
              { platform: "Instagram", type: "Profile", dimensions: "320×320", url: logoUrl },
              { platform: "LinkedIn", type: "Cover", dimensions: "1584×396", url: logoUrl },
              { platform: "X / Twitter", type: "Header", dimensions: "1500×500", url: logoUrl },
            ],
          }),
          ...(deliverables.businessCard && {
            businessCard: { frontUrl: logoUrl, backUrl: logoUrl },
          }),
          ...(deliverables.favicon && {
            favicons: [
              { size: 16, label: "Favicon", url: logoUrl },
              { size: 32, label: "Favicon 2x", url: logoUrl },
              { size: 180, label: "Apple Touch", url: logoUrl },
              { size: 512, label: "App Icon", url: logoUrl },
            ],
          }),
        };

        setResults(mockResults);
        toast.success("Brand Kit generated successfully!");
      }
    }, 2000);
  }, [logoUrl, prompt, targetSection, brandName, extractedColors, deliverables, mockupPreviews, typography]);

  return {
    logoUrl,
    isLoadingLogo,
    handleLogoUpload,
    handleLogoRemove,
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
    targetSection,
    setTargetSection,
    isGenerating,
    refiningSectionId,
    handleGenerate,
    totalCredits,
    results,
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
    "brand-guidelines": "Brand Guidelines",
  };
  return labels[sectionId] ?? sectionId;
}

export { getSectionLabel };
