import { useState, useEffect } from "react";
import { CanvasToolbar } from "./toolbar/canvas-toolbar";
import { CanvasViewport } from "./canvas-viewport";
import { PropertiesPanel } from "./panels/properties-panel";
import { LayersPanel } from "./panels/layers-panel";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@quicklogo/ui/components/tabs";
import { useCanvasExport } from "../hooks/use-canvas-export";
import { uploadFileToImageKit } from "@/lib/imagekit";
import { api } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@quicklogo/ui/components/sonner";
import { parseApiError } from "@/lib/api-error";
import {
  Download,
  FloppyDisk,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  CornersOut,
  ArrowLeft,
  List,
} from "@phosphor-icons/react";
import * as fabric from "fabric";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@quicklogo/ui/components/drawer";

export interface CanvasEditorProps {
  initialImageUrl: string;
  imageId: string;
  onClose: () => void;
  onSaveComplete: (newImageId: string) => void;
}

export function CanvasEditor({
  initialImageUrl,
  imageId,
  onClose,
  onSaveComplete,
}: CanvasEditorProps) {
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const { exportToPng, exportToJpeg, exportToSvg, exportToWebp } =
    useCanvasExport(canvas);
  const queryClient = useQueryClient();

  const [isDownloading, setIsDownloading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 1024px)").matches;
  });

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
      let ext = format;
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
    } catch (e) {
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

  const rightPanelContent = (
    <Tabs
      defaultValue="properties"
      className="flex h-full w-full flex-col bg-zinc-950"
    >
      <TabsList className="h-12 w-full justify-start rounded-none border-b border-white/[0.06] bg-transparent p-0 px-2">
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
      <div className="flex-1 overflow-y-auto">
        <TabsContent value="properties" className="m-0 h-full">
          <PropertiesPanel />
        </TabsContent>
        <TabsContent value="layers" className="m-0 h-full">
          <LayersPanel />
        </TabsContent>
      </div>
    </Tabs>
  );

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-zinc-900 text-white">
      {/* Top Bar */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.06] bg-zinc-950 px-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-zinc-400 transition-colors hover:text-white"
          >
            <ArrowLeft size={16} />
            <span className="hidden text-xs font-medium tracking-wider uppercase sm:inline">
              Back
            </span>
          </button>
          <div className="h-4 w-px bg-white/10" />
          <span className="font-mono text-[10px] font-bold tracking-wider uppercase">
            Canvas Editor
          </span>
        </div>

        <div className="flex hidden items-center gap-2 md:flex">
          <button
            onClick={() => handleZoom("out")}
            className="rounded-none bg-white/5 p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
          >
            <MagnifyingGlassMinus size={14} />
          </button>
          <span className="w-10 text-center font-mono text-[10px]">
            {currentZoom}%
          </span>
          <button
            onClick={() => handleZoom("in")}
            className="rounded-none bg-white/5 p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
          >
            <MagnifyingGlassPlus size={14} />
          </button>
          <button
            onClick={() => handleZoom("fit")}
            className="ml-1 rounded-none bg-white/5 p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
          >
            <CornersOut size={14} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {isCompact && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex items-center gap-2 border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/10"
            >
              <List size={16} />{" "}
              <span className="hidden sm:inline">Panels</span>
            </button>
          )}
          <div className="hidden h-4 w-px bg-white/10 sm:block" />
          <select
            className="hidden border border-white/10 bg-zinc-900 px-2 py-1.5 text-xs outline-none sm:block"
            onChange={(e) => handleDownload(e.target.value as any)}
            value=""
          >
            <option value="" disabled>
              Export as...
            </option>
            <option value="png">PNG</option>
            <option value="jpeg">JPEG</option>
            <option value="webp">WEBP</option>
            <option value="svg">SVG</option>
          </select>
          <button
            onClick={() => handleDownload("png")}
            disabled={!canvas || isDownloading}
            className="flex items-center gap-2 border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/10 disabled:opacity-50 sm:hidden"
          >
            <Download size={16} />
          </button>
          <button
            onClick={handleSave}
            disabled={!canvas || saveMutation.isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 px-4 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
          >
            <FloppyDisk size={16} />{" "}
            {saveMutation.isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="relative flex flex-1 overflow-hidden">
        <CanvasToolbar />
        <div className="relative flex-1">
          <CanvasViewport
            canvas={canvas}
            setCanvas={setCanvas}
            initialImageUrl={initialImageUrl}
          />
        </div>
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
