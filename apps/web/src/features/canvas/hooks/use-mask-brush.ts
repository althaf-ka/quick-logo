import { useEffect } from "react";
import * as fabric from "fabric";
import { useCanvasStore } from "../store/canvas-store";
import { exportMaskToPng } from "../utils/mask-export";

function syncMaskBrushSettings(
  canvas: fabric.Canvas,
  canvasMode: string,
  maskBrushSize: number,
) {
  if (canvasMode === "inpaint") {
    canvas.isDrawingMode = true;
    if (!canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
    }
    canvas.freeDrawingBrush.color = "rgba(139, 92, 246, 0.5)";
    canvas.freeDrawingBrush.width = maskBrushSize;
  } else {
    canvas.isDrawingMode = false;
  }
}

export function useMaskBrush(
  mainCanvas: fabric.Canvas | null,
  maskCanvas: fabric.Canvas | null,
) {
  const { canvasMode, maskBrushSize, setMaskData, canvasWidth: artboardWidth, canvasHeight: artboardHeight } = useCanvasStore();
  
  // Update brush settings
  useEffect(() => {
    if (!maskCanvas) return;
    const canvas = maskCanvas;
    
    syncMaskBrushSettings(canvas, canvasMode, maskBrushSize);
  }, [maskCanvas, canvasMode, maskBrushSize]);

  // Sync pan/zoom from main canvas to mask canvas
  useEffect(() => {
    if (!mainCanvas || !maskCanvas) return;

    const syncTransform = () => {
      const vpt = mainCanvas.viewportTransform;
      if (vpt) {
        maskCanvas.setViewportTransform(vpt.slice() as [number, number, number, number, number, number]);
        maskCanvas.requestRenderAll();
      }
    };

    mainCanvas.on("mouse:wheel", syncTransform);
    mainCanvas.on("after:render", syncTransform);

    syncTransform();

    return () => {
      mainCanvas.off("mouse:wheel", syncTransform);
      mainCanvas.off("after:render", syncTransform);
    };
  }, [mainCanvas, maskCanvas]);

  // Export mask data on brush end
  useEffect(() => {
    if (!maskCanvas || !mainCanvas) return;

    let timeout: NodeJS.Timeout;

    const handlePathCreated = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const artboard = mainCanvas.getObjects().find(o => o.id === "__artboard__");
        if (artboard && artboardWidth && artboardHeight) {
          const dataUrl = exportMaskToPng(
            maskCanvas,
            { left: artboard.left || 0, top: artboard.top || 0, width: artboardWidth, height: artboardHeight },
            { width: artboardWidth, height: artboardHeight }
          );
          setMaskData(dataUrl);
        }
      }, 50);
    };

    maskCanvas.on("path:created", handlePathCreated);

    return () => {
      maskCanvas.off("path:created", handlePathCreated);
      clearTimeout(timeout);
    };
  }, [maskCanvas, mainCanvas, setMaskData, artboardWidth, artboardHeight]);
}
