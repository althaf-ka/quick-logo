import { useState, useEffect, useCallback } from "react";
import { CanvasToolbar } from "./toolbar/canvas-toolbar";
import { CanvasViewport } from "./canvas-viewport";

import { useCanvasStore } from "../store/canvas-store";
import { useShallow } from "zustand/react/shallow";
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
import { useImproveHover } from "../hooks/use-improve-hover";

import { useCanvasAI } from "../hooks/use-canvas-ai";
import { uploadFileToImageKit } from "@/lib/imagekit";
import { api } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@quicklogo/ui/components/sonner";
import { parseApiError } from "@/lib/api-error";
import {
  ArrowCounterClockwiseIcon,
  ArrowClockwiseIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  DownloadIcon,
  ListIcon,
  CornersOutIcon,
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
  const {
    canvasMode,
    aiPrompt,
    setAiPrompt,
    setRegionBounds,
    maskData,
    canUndo,
    canRedo,
    selectedObject,
    activeTool,
  } = useCanvasStore(
    useShallow((s) => ({
      canvasMode: s.canvasMode,
      aiPrompt: s.aiPrompt,
      setAiPrompt: s.setAiPrompt,
      setRegionBounds: s.setRegionBounds,
      maskData: s.maskData,
      canUndo: s.canUndo,
      canRedo: s.canRedo,
      selectedObject: s.selectedObject,
      activeTool: s.activeTool,
    })),
  );
  const { handleGenerate, isGenerating, generationStatus, credits } =
    useCanvasAI(canvas, imageId);
  useImproveHover(canvas);
  const queryClient = useQueryClient();

  const [isDownloading, setIsDownloading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("ai");
  const [zoomLevel, setZoomLevel] = useState(100);

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 1024px)").matches;
  });

  useEffect(() => {
    if (canvasMode !== "edit") {
      setActiveTab("ai");
      if (isCompact) setSidebarOpen(true);
    }
  }, [canvasMode, isCompact]);

  useEffect(() => {
    // If a manual editing tool is selected (not hand/select), switch to properties tab
    if (activeTool && activeTool !== "hand" && activeTool !== "select") {
      setActiveTab("properties");
      if (isCompact) setSidebarOpen(true);
    }
  }, [activeTool, isCompact]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 1024px)");
    const onChange = (e: MediaQueryListEvent) => setIsCompact(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    // Set global professional selection styles once
    Object.assign(fabric.Object.prototype, {
      transparentCorners: false,
      cornerColor: "#FFFFFF",
      cornerStrokeColor: "#6D28D9",
      borderColor: "#6D28D9",
      cornerSize: 10,
      padding: 0,
      cornerStyle: "circle",
      borderScaleFactor: 2,
    });
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

  const { mutateAsync: saveImage } = saveMutation;

  const handleSave = useCallback(async () => {
    if (!canvas) return;
    try {
      const blob = await Promise.resolve(exportToPng());
      if (!blob) throw new Error("Export failed");
      const file = new File([blob], `canvas-edit-${Date.now()}.png`, {
        type: "image/png",
      });
      const uploadUrl = await uploadFileToImageKit(file);
      const saved = await saveImage({ imageUrl: uploadUrl });
      toast.success("Design saved successfully!");
      onSaveComplete(saved.imageId || imageId);
    } catch (e) {
      console.error(e);
      toast.error("Failed to save edited design");
    }
  }, [canvas, exportToPng, saveImage, imageId, onSaveComplete]);

  const handleDownload = useCallback(
    async (format: "png" | "jpeg" | "svg" | "webp" = "png", quality = 0.92) => {
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
    },
    [canvas, exportToSvg, exportToJpeg, exportToWebp, exportToPng],
  );

  useEffect(() => {
    const handleExport = (e: Event) => {
      const { format } = (e as CustomEvent).detail;
      handleDownload(format);
    };
    window.addEventListener("canvas:export", handleExport);
    return () => window.removeEventListener("canvas:export", handleExport);
  }, [canvas, handleDownload]);

  useEffect(() => {
    if (!canvas) return;
    const updateZoom = () => setZoomLevel(Math.round(canvas.getZoom() * 100));
    canvas.on("mouse:wheel", updateZoom);
    updateZoom();
    return () => {
      canvas.off("mouse:wheel", updateZoom);
    };
  }, [canvas]);

  const handleZoom = useCallback(
    (direction: "in" | "out" | "fit") => {
      if (!canvas) return;

      if (direction === "fit") {
        const artboard = canvas
          .getObjects()
          .find((o) => o.id === "__artboard__");
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
          setZoomLevel(Math.round(canvas.getZoom() * 100));
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
        setZoomLevel(Math.round(zoom * 100));
      }
    },
    [canvas],
  );

  const handleClearAIInputs = useCallback(() => {
    if (!canvas) return;

    const objects = canvas.getObjects();
    const toRemove = objects.filter(
      (o) => o.id === "__ai_region__" || o.isAiSketch,
    );

    if (toRemove.length > 0) {
      toRemove.forEach((obj) => canvas.remove(obj));
    }

    // Deselect active object when AI inputs are cleared (like clicking cancel)
    canvas.discardActiveObject();
    canvas.requestRenderAll();

    setRegionBounds(null);
  }, [canvas, setRegionBounds]);

  const handleClearTarget = useCallback(() => {
    useCanvasStore.getState().resetAIWorkflow();
  }, []);

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
            handleClearRegion={handleClearAIInputs}
          />
        </TabsContent>
        <TabsContent
          value="properties"
          className="scrollbar-subtle m-0 h-full overflow-y-auto"
        >
          <PropertiesPanel />
        </TabsContent>
        <TabsContent
          value="layers"
          className="scrollbar-subtle m-0 h-full overflow-y-auto"
        >
          <LayersPanel />
        </TabsContent>
      </div>
    </Tabs>
  );

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Compact control strip — NOT a second header */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-white/[0.06] bg-zinc-950/50 px-3">
        {/* Left: Zoom controls & History */}
        <div className="hidden items-center gap-1.5 md:flex">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("canvas:undo"))}
            disabled={!canUndo}
            className="text-muted-foreground/50 hover:text-muted-foreground p-1 transition-colors disabled:opacity-50"
          >
            <ArrowCounterClockwiseIcon size={14} />
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("canvas:redo"))}
            disabled={!canRedo}
            className="text-muted-foreground/50 hover:text-muted-foreground p-1 transition-colors disabled:opacity-50"
          >
            <ArrowClockwiseIcon size={14} />
          </button>
          <div className="mx-2 h-3 w-px bg-white/10" />
          <button
            onClick={() => handleZoom("out")}
            className="text-muted-foreground/50 hover:text-muted-foreground p-1 transition-colors"
          >
            <MagnifyingGlassMinusIcon size={14} />
          </button>
          <span className="text-muted-foreground/60 w-10 text-center font-mono text-[9px] tabular-nums">
            {zoomLevel}%
          </span>
          <button
            onClick={() => handleZoom("in")}
            className="text-muted-foreground/50 hover:text-muted-foreground p-1 transition-colors"
          >
            <MagnifyingGlassPlusIcon size={14} />
          </button>
          <button
            onClick={() => handleZoom("fit")}
            className="text-muted-foreground/50 hover:text-muted-foreground p-1 transition-colors"
          >
            <CornersOutIcon size={14} />
          </button>
        </div>

        {/* Center: Empty for now (or filename) */}
        <div className="flex flex-1 justify-start overflow-hidden md:justify-center"></div>

        {/* Right: Export + Save */}
        <div className="flex items-center gap-2">
          {isCompact && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-muted-foreground/50 hover:text-muted-foreground flex items-center gap-1 px-2 py-1 transition-colors"
            >
              <ListIcon size={14} />
            </button>
          )}
          <select
            className="text-muted-foreground/50 hover:text-muted-foreground hidden cursor-pointer appearance-none border border-white/[0.06] bg-transparent px-2 py-1 font-mono text-[9px] font-bold tracking-wider uppercase outline-none sm:block"
            onChange={(e) =>
              handleDownload(e.target.value as "png" | "jpeg" | "svg" | "webp")
            }
            value=""
          >
            <option value="" disabled>
              Export
            </option>
            <option value="png">PNG</option>
            <option value="jpeg">JPEG</option>
            <option value="webp">WEBP</option>
            <option value="svg">SVG</option>
          </select>
          <button
            onClick={() => handleDownload("png")}
            disabled={!canvas || isDownloading}
            className="text-muted-foreground/50 hover:text-muted-foreground flex items-center gap-1 px-2 py-1 transition-colors disabled:opacity-50 sm:hidden"
          >
            <DownloadIcon size={14} />
          </button>
          <button
            onClick={handleSave}
            disabled={!canvas || saveMutation.isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1 font-mono text-[9px] font-bold tracking-wider uppercase transition-colors disabled:opacity-50"
          >
            {saveMutation.isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="relative flex flex-1 overflow-hidden">
        <CanvasToolbar />
        {/* Main Canvas Area */}
        <main className="relative min-w-0 flex-1 bg-zinc-950">
          <CanvasViewport
            canvas={canvas}
            setCanvas={setCanvas}
            initialImageUrl={initialImageUrl}
          />
          <MaskOverlay mainCanvas={canvas} />

          <AnimatePresence>
            {canvasMode !== "edit" && !isGenerating && (
              <motion.div
                initial={{ y: 20, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 20, opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="absolute bottom-3 left-1/2 z-50 w-full max-w-2xl -translate-x-1/2 px-4"
              >
                {(() => {
                  let validationError = "";
                  if (canvasMode === "inpaint" && !maskData) {
                    validationError = "Please draw a mask first";
                  } else if (canvasMode === "img2img" && !selectedObject) {
                    validationError = "Please select an image first";
                  } else if (canvasMode === "sketch2img") {
                    const hasPaths = canvas
                      ?.getObjects()
                      .some((o) => o.type === "path");
                    if (!hasPaths)
                      validationError = "Please draw a sketch first";
                  }

                  return (
                    <PromptInput
                      value={aiPrompt}
                      onChange={setAiPrompt}
                      onSubmit={handleGenerate}
                      targetContext={
                        canvasMode === "inpaint"
                          ? "Inpaint Mask"
                          : canvasMode === "img2img"
                            ? "Selected Image"
                            : canvasMode === "sketch2img"
                              ? "Sketch Drawing"
                              : undefined
                      }
                      onClearTarget={handleClearTarget}
                      isLoading={isGenerating}
                      submitDisabled={!!validationError}
                      validationError={validationError}
                      placeholder={
                        canvasMode === "inpaint"
                          ? "Describe what should fill the masked area..."
                          : canvasMode === "img2img"
                            ? "Describe how to improve the selected image..."
                            : canvasMode === "sketch2img"
                              ? "Describe what your sketch represents..."
                              : "Describe what to generate..."
                      }
                      credits={credits}
                      size="compact"
                      className="!p-0 shadow-2xl [&>div>div]:rounded-none [&>div>div]:!border-white/10"
                    />
                  );
                })()}
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
