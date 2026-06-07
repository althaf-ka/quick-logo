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

    const handleResize = () => {
      if (containerRef.current) {
        fabricCanvas.setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
        fabricCanvas.requestRenderAll();
      }
    };

    window.addEventListener("resize", handleResize);

    const loadInitialImage = async () => {
      if (!initialImageUrl) return;

      const FabricImageClass = (fabric as any).FabricImage || fabric.Image;
      FabricImageClass.fromURL(initialImageUrl, {
        crossOrigin: "anonymous",
      }).then((img: fabric.Image) => {
        const width = img.width || 1024;
        const height = img.height || 1024;

        // Define an artboard rectangle
        const artboard = new fabric.Rect({
          left: (fabricCanvas.width! - width) / 2,
          top: (fabricCanvas.height! - height) / 2,
          width,
          height,
          fill: "#ffffff",
          selectable: false,
          evented: false,
          hoverCursor: "default",
        });
        (artboard as any).id = "__artboard__";
        (artboard as any).name = "Artboard";

        // Center the image on the artboard
        img.set({
          left: artboard.left,
          top: artboard.top,
          selectable: true,
        });
        (img as any).id = "obj_initial_image";
        (img as any).name = "Source Image";

        fabricCanvas.add(artboard);
        fabricCanvas.add(img);

        setCanvasDimensions(width, height);

        // Setup initial zoom to fit artboard with padding
        const padding = 40;
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
      window.removeEventListener("resize", handleResize);
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
      className="relative h-full w-full overflow-hidden bg-zinc-900"
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
