import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useIsMobile } from "@quicklogo/ui/hooks/use-mobile";
import { PromptInput } from "@/components/global/prompt-input";
import { BrandKitSidebar } from "@/components/brand-kit/brand-kit-sidebar";
import { api } from "@/lib/api";
import { toast } from "@quicklogo/ui/components/sonner";
import { UploadSimpleIcon, SlidersHorizontalIcon } from "@phosphor-icons/react";
import { Button } from "@quicklogo/ui/components/button";
import { Skeleton } from "@quicklogo/ui/components/skeleton";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@quicklogo/ui/components/drawer";

const searchSchema = z.object({
  imageId: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/brand-kit/create")({
  validateSearch: searchSchema,
  component: BrandKitCreatePage,
  head: () => ({
    meta: [
      { title: "Create Brand Kit | QuickLogo" },
      {
        name: "description",
        content: "Generate a full brand identity from your logo.",
      },
    ],
  }),
});

function BrandKitCreatePage() {
  const { imageId } = Route.useSearch();
  const isMobile = useIsMobile();

  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // State
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(!!imageId);
  const [typography, setTypography] = useState("modern-sans");

  // Deliverables
  const [deliverables, setDeliverables] = useState({
    colorPalette: true,
    typography: true,
    socialMedia: false,
    businessCard: false,
    favicon: false,
  });

  // Mockups and Extracted colors
  const [mockupImages, setMockupImages] = useState<File[]>([]);
  const [mockupPreviews, setMockupPreviews] = useState<string[]>([]);
  const [extractedColors, setExtractedColors] = useState<string[]>([]);

  const baseCredits = 5;
  const extraCredits =
    (deliverables.socialMedia ? 3 : 0) +
    (deliverables.businessCard ? 2 : 0) +
    (deliverables.favicon ? 1 : 0);
  const totalCredits = baseCredits + extraCredits;

  useEffect(() => {
    if (imageId) {
      // Fetch image details
      api.images[":id"]
        .$get({ param: { id: imageId } })
        .then((res) => {
          if (res.ok) {
            res.json().then((data) => {
              setLogoUrl(data.image.imageUrl);
              // Mock extracted colors
              setExtractedColors(["#10b981", "#047857", "#064e3b", "#ecfdf5"]);
            });
          } else {
            toast.error("Failed to load logo");
          }
        })
        .catch(() => toast.error("Failed to load logo"))
        .finally(() => setIsLoadingImage(false));
    }
  }, [imageId]);

  useEffect(() => {
    const urls = mockupImages.map((img) => URL.createObjectURL(img));
    setMockupPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [mockupImages]);

  const handleGenerate = () => {
    if (!logoUrl) {
      toast.error("Please upload or select a logo first");
      return;
    }
    setIsGenerating(true);
    // Mock generation
    setTimeout(() => {
      setIsGenerating(false);
      toast.success("Brand Kit generated successfully!");
    }, 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setLogoUrl(url);
      setExtractedColors(["#3b82f6", "#1d4ed8", "#1e3a8a", "#eff6ff"]);
    }
  };

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 overflow-hidden p-4 md:p-6">
          <div className="border-border/40 relative flex min-h-[300px] w-full max-w-md shrink-0 flex-col items-center justify-center border border-dashed p-8">
            {isLoadingImage ? (
              <div className="flex flex-col items-center gap-4">
                <Skeleton className="size-32 rounded-full" />
                <p className="text-muted-foreground animate-pulse font-mono text-xs">
                  Loading logo...
                </p>
              </div>
            ) : logoUrl ? (
              <div className="relative flex aspect-square w-full items-center justify-center">
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="max-h-full max-w-full object-contain drop-shadow-xl"
                />
                {!imageId && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2 rounded-none font-mono text-[10px]"
                    onClick={() => {
                      setLogoUrl(null);
                      setExtractedColors([]);
                    }}
                  >
                    Change
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center">
                <UploadSimpleIcon className="text-muted-foreground/30 mx-auto mb-4 size-12" />
                <p className="mb-2 font-mono text-sm font-black uppercase">
                  Upload your logo
                </p>
                <p className="text-muted-foreground mb-6 font-mono text-[10px]">
                  Or select one from your projects
                </p>
                <Button className="group relative overflow-hidden rounded-none font-mono text-[11px] tracking-widest uppercase">
                  <span className="relative z-10 flex items-center gap-2">
                    <UploadSimpleIcon /> Browse Files
                  </span>
                  <input
                    type="file"
                    className="absolute inset-0 z-20 cursor-pointer opacity-0"
                    accept="image/*"
                    onChange={handleFileUpload}
                  />
                </Button>
              </div>
            )}
          </div>
        </div>

        <PromptInput
          value={prompt}
          onChange={setPrompt}
          onSubmit={handleGenerate}
          isLoading={isGenerating}
          placeholder="Describe your brand identity, target audience, or specific aesthetic preferences..."
          credits={totalCredits}
          showConfigTrigger={isMobile}
          onConfigTrigger={() => setSidebarOpen(true)}
          configIcon={
            <SlidersHorizontalIcon weight="bold" className="size-4" />
          }
        />
      </div>

      {!isMobile && (
        <BrandKitSidebar
          typography={typography}
          setTypography={setTypography}
          deliverables={deliverables}
          setDeliverables={setDeliverables}
          mockupImages={mockupImages}
          setMockupImages={setMockupImages}
          mockupPreviews={mockupPreviews}
          extractedColors={extractedColors}
        />
      )}

      {isMobile && (
        <Drawer open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <DrawerContent className="max-h-[85vh] px-0 pb-0">
            <DrawerHeader className="border-border/50 border-b px-4 pb-2 text-left">
              <DrawerTitle className="font-mono text-sm font-black tracking-widest uppercase">
                Brand Settings
              </DrawerTitle>
            </DrawerHeader>
            <div className="overflow-y-auto p-0">
              <BrandKitSidebar
                typography={typography}
                setTypography={setTypography}
                deliverables={deliverables}
                setDeliverables={setDeliverables}
                mockupImages={mockupImages}
                setMockupImages={setMockupImages}
                mockupPreviews={mockupPreviews}
                extractedColors={extractedColors}
                className="h-auto max-h-none w-full overflow-visible border-none"
              />
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}
