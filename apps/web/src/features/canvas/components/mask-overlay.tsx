import { useEffect, useRef, useState } from "react";
import * as fabric from "fabric";
import { useCanvasStore } from "../store/canvas-store";
import { useMaskBrush } from "../hooks/use-mask-brush";
import { useShallow } from "zustand/react/shallow";
import { useSelectedModel } from "../hooks/use-selected-model";

interface MaskOverlayProps {
  mainCanvas: fabric.Canvas | null;
}

export function MaskOverlay({ mainCanvas }: MaskOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [maskCanvas, setMaskCanvas] = useState<fabric.Canvas | null>(null);
  const { canvasMode, activeTool, setMaskData, maskData } = useCanvasStore(
    useShallow((s) => ({
      canvasMode: s.canvasMode,
      activeTool: s.activeTool,
      setMaskData: s.setMaskData,
      maskData: s.maskData,
    })),
  );

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      selection: false,
      preserveObjectStacking: true,
    });

    setMaskCanvas(fabricCanvas);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width <= 0 || height <= 0) return;
        fabricCanvas.setDimensions({ width, height });
        fabricCanvas.requestRenderAll();
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      fabricCanvas.dispose();
      setMaskCanvas(null);
    };
  }, []);

  // Clear mask canvas when maskData is cleared externally (e.g., when tool is cancelled)
  useEffect(() => {
    if (!maskData && maskCanvas) {
      maskCanvas.clear();
    }
  }, [maskData, maskCanvas]);

  useMaskBrush(mainCanvas, maskCanvas);

  useEffect(() => {
    const handleClear = () => {
      if (!maskCanvas) return;
      maskCanvas.clear();
      setMaskData(null);
    };

    const handleUndo = () => {
      if (!maskCanvas) return;
      const objects = maskCanvas.getObjects();
      if (objects.length > 0) {
        maskCanvas.remove(objects[objects.length - 1]);
        maskCanvas.requestRenderAll();

        // Fire custom event to trigger mask re-export
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (maskCanvas as any).fire("mask:updated");
      }
    };

    window.addEventListener("canvas:mask:clear", handleClear);
    window.addEventListener("canvas:mask:undo", handleUndo);
    return () => {
      window.removeEventListener("canvas:mask:clear", handleClear);
      window.removeEventListener("canvas:mask:undo", handleUndo);
    };
  }, [maskCanvas, setMaskData]);

  const { editingStrategy } = useSelectedModel();

  const isInteractive = activeTool !== "hand";
  const isVisible =
    canvasMode === "inpaint" && editingStrategy !== "inpaint-with-prompt";

  return (
    <div
      className={`absolute inset-0 z-40 ${isVisible ? (isInteractive ? "pointer-events-auto" : "pointer-events-none") : "hidden"}`}
    >
      <div ref={containerRef} className="absolute inset-0 h-full w-full">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
