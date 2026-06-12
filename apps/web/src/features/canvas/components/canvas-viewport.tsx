import { useEffect, useRef } from "react";
import * as fabric from "fabric";
import { useCanvasStore } from "../store/canvas-store";
import { useCanvasTools } from "../hooks/use-canvas-tools";
import { useCanvasHistory } from "../hooks/use-canvas-history";

export interface CanvasViewportProps {
  canvas: fabric.Canvas | null;
  setCanvas: (canvas: fabric.Canvas | null) => void;
  initialImageUrl?: string;
}

export function CanvasViewport({
  canvas,
  setCanvas,
  initialImageUrl,
}: CanvasViewportProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { setCanvasDimensions } = useCanvasStore();

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      backgroundColor: "#09090b", // zinc-950/900
      preserveObjectStacking: true,
      selection: true,
    });

    setCanvas(fabricCanvas);

    // Debounce resize to avoid flash during sidebar collapse/expand animation (200ms CSS transition)
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width <= 0 || height <= 0) return;

        // Immediately update canvas size so it doesn't show a gap
        fabricCanvas.setDimensions({ width, height });

        // Debounce the viewport transform recalculation to after the CSS transition ends
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          const artboard = fabricCanvas.getObjects().find(o => o.id === "__artboard__");
          if (artboard) {
            const artWidth = artboard.width || 1024;
            const artHeight = artboard.height || 1024;
            const padding = 60;
            const currentW = fabricCanvas.width!;
            const currentH = fabricCanvas.height!;
            const scaleX = (currentW - padding * 2) / artWidth;
            const scaleY = (currentH - padding * 2) / artHeight;
            const scale = Math.min(scaleX, scaleY, 1);

            fabricCanvas.setViewportTransform([
              scale,
              0,
              0,
              scale,
              currentW / 2 - (artWidth * scale) / 2,
              currentH / 2 - (artHeight * scale) / 2,
            ]);
          }
          fabricCanvas.requestRenderAll();
        }, 250);
      }
    });

    resizeObserver.observe(containerRef.current);

    const loadInitialImage = async () => {
      if (!initialImageUrl) return;

      const fabricAny = fabric as Record<string, unknown>;
      const FabricImageClass = (fabricAny.FabricImage || fabricAny.Image) as typeof fabric.FabricImage;
      FabricImageClass.fromURL(initialImageUrl, {
        crossOrigin: "anonymous",
      }).then((img: fabric.FabricImage) => {
        const width = img.width || 1024;
        const height = img.height || 1024;

        // Define an artboard rectangle at 0,0. Viewport transform will center it.
        const artboard = new fabric.Rect({
          left: 0,
          top: 0,
          width,
          height,
          fill: "#ffffff",
          selectable: false,
          evented: false,
          hoverCursor: "default",
        });
        artboard.id = "__artboard__";
        artboard.name = "Artboard";

        // Scale image to fit within the artboard bounds
        const imgWidth = img.width || 1;
        const imgHeight = img.height || 1;
        const imgScaleX = width / imgWidth;
        const imgScaleY = height / imgHeight;
        const imgScale = Math.min(imgScaleX, imgScaleY, 1);

        // Center the image on the artboard
        img.set({
          left: artboard.left! + (width - imgWidth * imgScale) / 2,
          top: artboard.top! + (height - imgHeight * imgScale) / 2,
          scaleX: imgScale,
          scaleY: imgScale,
          selectable: false,
          evented: true,
          locked: true,
          hoverCursor: "default",
        });
        img.id = "obj_initial_image";
        img.name = "Source Image";

        fabricCanvas.add(artboard);
        fabricCanvas.add(img);

        setCanvasDimensions(width, height);

        // Setup initial zoom to fit artboard with padding
        const padding = 60;
        const scaleX = (fabricCanvas.width! - padding * 2) / width;
        const scaleY = (fabricCanvas.height! - padding * 2) / height;
        const scale = Math.min(scaleX, scaleY, 1);

        fabricCanvas.setViewportTransform([
          scale,
          0,
          0,
          scale,
          fabricCanvas.width! / 2 - (width * scale) / 2,
          fabricCanvas.height! / 2 - (height * scale) / 2,
        ]);

        fabricCanvas.requestRenderAll();
      });
    };

    loadInitialImage();

    return () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeObserver.disconnect();
      fabricCanvas.dispose();
      setCanvas(null);
    };
  }, [initialImageUrl, setCanvas, setCanvasDimensions]);

  // Connect hooks
  useCanvasTools(canvas);
  useCanvasHistory(canvas);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-zinc-950"
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
