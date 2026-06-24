import { useState, useEffect, useCallback } from "react";
import { CanvasToolbar } from "./toolbar/canvas-toolbar";
import { CanvasViewport } from "./canvas-viewport";
import { ImageLoadingState } from "@/components/global/image-loading-state";

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
import { toast } from "@quicklogo/ui/components/sonner";
import * as fabric from "fabric";
import { PromptInput } from "@/components/global/prompt-input";
import { AnimatePresence, motion } from "motion/react";
import { CanvasHeader } from "./canvas-header";
import { useCanvasSave } from "../hooks/use-canvas-save";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@quicklogo/ui/components/drawer";

export interface CanvasEditorProps {
  initialImageUrl: string;
  initialCanvasState?: string | null;
  imageId: string;
  onSaveComplete: (newImageId: string) => void;
}

export function CanvasEditor({
  initialImageUrl,
  initialCanvasState,
  imageId,
  onSaveComplete,
}: CanvasEditorProps) {
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const { exportToPng, exportToJpeg, exportToSvg, exportToWebp } =
    useCanvasExport(canvas);

  const { isSaving, isDirty, handleSave } = useCanvasSave({
    canvas,
    imageId,
    onSaveComplete,
    exportToPng,
  });

  const {
    handleGenerate,
    isGenerating,
    generationStatus,
    generationBounds,
    credits,
    availableModels,
  } = useCanvasAI(canvas, imageId, isDirty, initialImageUrl);
  useImproveHover(canvas);

  const {
    canvasMode,
    aiPrompt,
    setAiPrompt,
    setRegionBounds,
    maskData,
    selectedObject,
    activeTool,
    aiModel,
  } = useCanvasStore(
    useShallow((s) => ({
      canvasMode: s.canvasMode,
      aiPrompt: s.aiPrompt,
      setAiPrompt: s.setAiPrompt,
      setRegionBounds: s.setRegionBounds,
      maskData: s.maskData,
      selectedObject: s.selectedObject,
      activeTool: s.activeTool,
      aiModel: s.aiModel,
    })),
  );

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("ai");
  const [zoomLevel, setZoomLevel] = useState(100);

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 1024px)").matches;
  });

  // Store previous values to detect changes during render (React recommended pattern to avoid cascading renders)
  const [prevCanvasMode, setPrevCanvasMode] = useState(canvasMode);
  const [prevActiveTool, setPrevActiveTool] = useState(activeTool);

  if (canvasMode !== prevCanvasMode) {
    setPrevCanvasMode(canvasMode);
    if (canvasMode !== "edit") {
      setActiveTab("ai");
      if (isCompact) setSidebarOpen(true);
    }
  }

  if (activeTool !== prevActiveTool) {
    setPrevActiveTool(activeTool);
    if (activeTool && activeTool !== "hand" && activeTool !== "select") {
      setActiveTab("properties");
      if (isCompact) setSidebarOpen(true);
    }
  }

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

  // Handle Unsaved Changes Warning
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const handleDownload = useCallback(
    async (format: "png" | "jpeg" | "svg" | "webp" = "png", quality = 0.92) => {
      if (!canvas) return;
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
      <CanvasHeader
        canvas={canvas}
        zoomLevel={zoomLevel / 100}
        handleZoom={(amount) => handleZoom(amount > 0 ? "in" : "out")}
        handleCenter={() => handleZoom("fit")}
        handleSave={handleSave}
        isSaving={isSaving}
        isDirty={isDirty}
        handleDownload={handleDownload}
      />

      <div className="relative flex flex-1 overflow-hidden">
        <CanvasToolbar />
        {/* Main Canvas Area */}
        <main className="relative min-w-0 flex-1 bg-zinc-950">
          <CanvasViewport
            canvas={canvas}
            setCanvas={setCanvas}
            initialImageUrl={initialImageUrl}
            initialCanvasState={initialCanvasState}
            imageId={imageId}
          />
          <MaskOverlay mainCanvas={canvas} />

          <AnimatePresence>
            {isGenerating &&
              generationBounds &&
              (() => {
                const zoom = canvas?.getZoom() ?? 1;
                const vpt = canvas?.viewportTransform;
                return (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute z-40 overflow-hidden bg-zinc-950/80 shadow-2xl ring-1 ring-white/10 backdrop-blur-sm"
                    style={{
                      left: generationBounds.left * zoom + (vpt?.[4] ?? 0),
                      top: generationBounds.top * zoom + (vpt?.[5] ?? 0),
                      width: generationBounds.width * zoom,
                      height: generationBounds.height * zoom,
                    }}
                  >
                    <ImageLoadingState
                      isOverlay
                      label={
                        generationStatus === "exporting" ||
                        generationStatus === "uploading"
                          ? "Preparing image..."
                          : generationStatus === "polling" ||
                              generationStatus === "compositing"
                            ? "Finalizing result..."
                            : "Generating..."
                      }
                    />
                  </motion.div>
                );
              })()}
          </AnimatePresence>

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
                  const strategy = availableModels.find(
                    (m) => m.id === aiModel,
                  )?.editingStrategy;
                  let validationError = "";
                  if (
                    canvasMode === "inpaint" &&
                    !maskData &&
                    strategy !== "inpaint-with-prompt"
                  ) {
                    validationError = "Please draw a mask first";
                  } else if (canvasMode === "img2img" && !selectedObject) {
                    validationError = "Please select an image first";
                  }

                  return (
                    <PromptInput
                      value={aiPrompt}
                      onChange={setAiPrompt}
                      onSubmit={handleGenerate}
                      targetContext={
                        canvasMode === "inpaint"
                          ? strategy === "inpaint-with-prompt"
                            ? "AI Logo Edit"
                            : "Inpaint Mask"
                          : canvasMode === "img2img"
                            ? "Selected Image"
                            : undefined
                      }
                      onClearTarget={handleClearTarget}
                      isLoading={isGenerating}
                      submitDisabled={!!validationError}
                      validationError={validationError}
                      placeholder={
                        canvasMode === "inpaint"
                          ? strategy === "inpaint-with-prompt"
                            ? "Describe how to modify the logo..."
                            : "Describe what should fill the masked area..."
                          : canvasMode === "img2img"
                            ? "Describe how to improve the selected image..."
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
