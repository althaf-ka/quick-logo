import { useState, useEffect } from "react";
import { CanvasToolbar } from "./toolbar/canvas-toolbar";
import { CanvasViewport } from "./canvas-viewport";
import { CanvasModeSelector } from "./canvas-mode-selector";
import { useCanvasStore } from "../store/canvas-store";
import { MaskOverlay } from "./mask-overlay";
import { AiPanel } from "./panels/ai-panel";
import { PropertiesPanel } from "./panels/properties-panel";
import { LayersPanel } from "./panels/layers-panel";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@quicklogo/ui/components/tabs";
import { useCanvasExport } from "../hooks/use-canvas-export";
import { useRegionSelector } from "../hooks/use-region-selector";
import { useCanvasAI } from "../hooks/use-canvas-ai";
import { uploadFileToImageKit } from "@/lib/imagekit";
import { api } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@quicklogo/ui/components/sonner";
import { parseApiError } from "@/lib/api-error";
import {
  Download,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  CornersOut,
  List,
} from "@phosphor-icons/react";
import * as fabric from "fabric";
import { PromptInput } from "@/components/global/prompt-input";
import { AnimatePresence, motion } from "motion/react";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@quicklogo/ui/components/drawer";

export interface CanvasEditorProps {
  initialImageUrl: string;
  imageId: string;
  onSaveComplete: (newImageId: string) => void;
}

export function CanvasEditor({
  initialImageUrl,
  imageId,
  onSaveComplete,
}: CanvasEditorProps) {
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const { exportToPng, exportToJpeg, exportToSvg, exportToWebp } =
    useCanvasExport(canvas);
  const { canvasMode, aiPrompt, setAiPrompt, setRegionBounds } = useCanvasStore();
  const {
    handleGenerate,
    isGenerating,
    generationStatus,
    credits,
  } = useCanvasAI(canvas, imageId);
  useRegionSelector(canvas);
  const queryClient = useQueryClient();

  const [isDownloading, setIsDownloading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("properties");

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 1024px)").matches;
  });

  useEffect(() => {
    if (canvasMode !== "edit") {
      setActiveTab("ai");
      if (isCompact) setSidebarOpen(true);
    } else {
      setActiveTab("properties");
    }
  }, [canvasMode, isCompact]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 1024px)");
    const onChange = (e: MediaQueryListEvent) => setIsCompact(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const saveMutation = useMutation({
    mutationFn: async ({ imageUrl }: { imageUrl: string }) => {
      const res = await api.images[":id"]["canvas-save"].$post({
        param: { id: imageId },
        json: { imageUrl, prompt: "Canvas Edit" },
      });
      if (!res.ok) throw await parseApiError(res);
      return res.json() as Promise<{ imageId: string }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["image-history", imageId] });
    },
  });

  const handleSave = async () => {
    if (!canvas) return;
    try {
      const blob = await Promise.resolve(exportToPng());
      if (!blob) throw new Error("Export failed");
      const file = new File([blob], `canvas-edit-${Date.now()}.png`, {
        type: "image/png",
      });
      const uploadUrl = await uploadFileToImageKit(file);
      const saved = await saveMutation.mutateAsync({ imageUrl: uploadUrl });
      toast.success("Design saved successfully!");
      onSaveComplete(saved.imageId || imageId);
    } catch (e) {
      console.error(e);
      toast.error("Failed to save edited design");
    }
  };

  const handleDownload = async (
    format: "png" | "jpeg" | "svg" | "webp" = "png",
    quality = 0.92,
  ) => {
    if (!canvas) return;
    setIsDownloading(true);
    try {
      let data: Blob | string;
      const ext = format;
      if (format === "svg") {
        data = exportToSvg();
        data = new Blob([data as string], { type: "image/svg+xml" });
      } else if (format === "jpeg") {
        data = await exportToJpeg(quality);
      } else if (format === "webp") {
        data = await exportToWebp(quality);
      } else {
        data = await exportToPng();
      }

      const url = URL.createObjectURL(data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `quicklogo-export-${Date.now()}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download image");
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    const handleExport = (e: Event) => {
      const { format } = (e as CustomEvent).detail;
      handleDownload(format);
    };
    window.addEventListener("canvas:export", handleExport);
    return () => window.removeEventListener("canvas:export", handleExport);
  }, [canvas]);

  const handleZoom = (direction: "in" | "out" | "fit") => {
    if (!canvas) return;

    if (direction === "fit") {
      const artboard = canvas
        .getObjects()
        .find((o) => (o as any).id === "__artboard__");
      if (artboard) {
        const width = artboard.width! * (artboard.scaleX || 1);
        const height = artboard.height! * (artboard.scaleY || 1);
        const padding = 40;
        const scaleX = (canvas.width! - padding * 2) / width;
        const scaleY = (canvas.height! - padding * 2) / height;
        const scale = Math.min(scaleX, scaleY, 1);
        canvas.setViewportTransform([
          scale,
          0,
          0,
          scale,
          canvas.width! / 2 - (width * scale) / 2,
          canvas.height! / 2 - (height * scale) / 2,
        ]);
        canvas.requestRenderAll();
      }
    } else {
      let zoom = canvas.getZoom();
      zoom *= direction === "in" ? 1.1 : 0.9;
      if (zoom > 20) zoom = 20;
      if (zoom < 0.01) zoom = 0.01;
      canvas.zoomToPoint(
        new fabric.Point(canvas.width! / 2, canvas.height! / 2),
        zoom,
      );
    }
  };

  const currentZoom = Math.round((canvas?.getZoom() || 1) * 100);

  const handleClearRegion = () => {
    if (!canvas) return;
    const region = canvas.getObjects().find((o) => (o as any).id === "__ai_region__");
    if (region) {
      canvas.remove(region);
      canvas.requestRenderAll();
    }
    setRegionBounds(null);
  };

  const rightPanelContent = (
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      className="flex h-full w-full flex-col bg-zinc-950"
    >
      <TabsList className="h-10 w-full justify-start rounded-none border-b border-white/[0.06] bg-transparent p-0 px-2">
        <TabsTrigger
          value="ai"
          className="h-full rounded-none px-4 text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white"
        >
          AI
        </TabsTrigger>
        <TabsTrigger
          value="properties"
          className="h-full rounded-none px-4 text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white"
        >
          Properties
        </TabsTrigger>
        <TabsTrigger
          value="layers"
          className="h-full rounded-none px-4 text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white"
        >
          Layers
        </TabsTrigger>
      </TabsList>
      <div className="flex-1 overflow-hidden">
        <TabsContent value="ai" className="m-0 h-full">
          <AiPanel
            isGenerating={isGenerating}
            generationStatus={generationStatus}
            handleClearRegion={handleClearRegion}
          />
        </TabsContent>
        <TabsContent value="properties" className="m-0 h-full overflow-y-auto scrollbar-subtle">
          <PropertiesPanel />
        </TabsContent>
        <TabsContent value="layers" className="m-0 h-full overflow-y-auto scrollbar-subtle">
          <LayersPanel />
        </TabsContent>
      </div>
    </Tabs>
  );

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Compact control strip — NOT a second header */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-white/[0.06] bg-zinc-950/50 px-3">
        {/* Left: Zoom controls */}
        <div className="hidden md:flex items-center gap-1.5">
          <button
            onClick={() => handleZoom("out")}
            className="p-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            <MagnifyingGlassMinus size={14} />
          </button>
          <span className="w-10 text-center font-mono text-[9px] text-muted-foreground/60 tabular-nums">
            {currentZoom}%
          </span>
          <button
            onClick={() => handleZoom("in")}
            className="p-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            <MagnifyingGlassPlus size={14} />
          </button>
          <button
            onClick={() => handleZoom("fit")}
            className="p-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            <CornersOut size={14} />
          </button>
        </div>

        {/* Center: Mode selector */}
        <div className="flex flex-1 justify-start md:justify-center">
          <CanvasModeSelector />
        </div>

        {/* Right: Export + Save */}
        <div className="flex items-center gap-2">
          {isCompact && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex items-center gap-1 px-2 py-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              <List size={14} />
            </button>
          )}
          <select
            className="hidden sm:block border border-white/[0.06] bg-transparent px-2 py-1 font-mono text-[9px] font-bold tracking-wider uppercase text-muted-foreground/50 outline-none hover:text-muted-foreground cursor-pointer appearance-none"
            onChange={(e) => handleDownload(e.target.value as any)}
            value=""
          >
            <option value="" disabled>Export</option>
            <option value="png">PNG</option>
            <option value="jpeg">JPEG</option>
            <option value="webp">WEBP</option>
            <option value="svg">SVG</option>
          </select>
          <button
            onClick={() => handleDownload("png")}
            disabled={!canvas || isDownloading}
            className="flex items-center gap-1 px-2 py-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors disabled:opacity-50 sm:hidden"
          >
            <Download size={14} />
          </button>
          <button
            onClick={handleSave}
            disabled={!canvas || saveMutation.isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1 font-mono text-[9px] font-bold tracking-wider uppercase disabled:opacity-50 transition-colors"
          >
            {saveMutation.isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="relative flex flex-1 overflow-hidden">
        <CanvasToolbar />
        {/* Main Canvas Area */}
        <main className="relative flex-1 min-w-0 bg-zinc-950">
          <CanvasViewport
            canvas={canvas}
            setCanvas={setCanvas}
            initialImageUrl={initialImageUrl}
          />
          <MaskOverlay mainCanvas={canvas} />

          <AnimatePresence>
            {canvasMode !== "edit" && !isGenerating && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                transition={{ type: "spring", bounce: 0.1, duration: 0.4 }}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 w-full max-w-2xl z-50 px-4"
              >
                <PromptInput
                  value={aiPrompt}
                  onChange={setAiPrompt}
                  onSubmit={handleGenerate}
                  isLoading={isGenerating}
                  placeholder={
                    canvasMode === "inpaint" ? "Describe what should fill the masked area..." :
                    canvasMode === "img2img" ? "Describe how to transform the selected region..." :
                    canvasMode === "text2img" ? "Describe what to generate in the selected region..." :
                    canvasMode === "sketch2img" ? "Describe what your sketch represents..." :
                    "Describe what to generate..."
                  }
                  credits={credits}
                  size="compact"
                  className="shadow-2xl !p-0 [&>div>div]:rounded-none [&>div>div]:!border-white/10"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
        {!isCompact && (
          <div className="flex w-72 shrink-0 flex-col border-l border-white/[0.06] bg-zinc-950">
            {rightPanelContent}
          </div>
        )}
      </div>

      {isCompact && (
        <Drawer open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <DrawerContent className="max-h-[85vh] rounded-none border-t border-white/10 bg-zinc-950 px-0 pb-0">
            <DrawerHeader className="border-b border-white/[0.06] px-4 pb-2 text-left">
              <DrawerTitle className="font-mono text-sm font-black tracking-widest text-white uppercase">
                Editor Panels
              </DrawerTitle>
            </DrawerHeader>
            <div className="h-[60vh] overflow-hidden">{rightPanelContent}</div>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}
