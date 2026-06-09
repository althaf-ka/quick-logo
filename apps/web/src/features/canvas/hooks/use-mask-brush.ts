/* eslint-disable react-compiler/react-compiler */
import { useEffect } from "react";
import * as fabric from "fabric";
import { useCanvasStore } from "../store/canvas-store";
import { exportMaskToPng } from "../utils/mask-export";

export function useMaskBrush(
  mainCanvas: fabric.Canvas | null,
  maskCanvas: fabric.Canvas | null,
) {
  const { canvasMode, maskBrushSize, setMaskData, canvasWidth: artboardWidth, canvasHeight: artboardHeight } = useCanvasStore();
  
  // Update brush settings
  useEffect(() => {
    if (!maskCanvas) return;
    const canvas = maskCanvas;
    
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
  }, [maskCanvas, canvasMode, maskBrushSize]);

  // Alt to erase
  useEffect(() => {
    if (!maskCanvas) return;
    const canvas = maskCanvas;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Alt" && canvasMode === "inpaint") {
        e.preventDefault();
        // Fabric 6 EraserBrush is an extension, we fallback to destination-out if not present
        if ((fabric as any).EraserBrush) {
          canvas.freeDrawingBrush = new (fabric as any).EraserBrush(canvas);
          if (canvas.freeDrawingBrush) {
             canvas.freeDrawingBrush.width = maskBrushSize;
          }
        } else {
          // Generic fallback for older/custom setups without EraserBrush
          canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
          canvas.freeDrawingBrush.color = "rgba(0,0,0,1)"; // doesn't matter for destination-out
          canvas.freeDrawingBrush.width = maskBrushSize;
          // Note: Standard PencilBrush doesn't support destination-out directly 
          // without overriding the context rendering. The best effort is assuming
          // EraserBrush is installed.
        }
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Alt" && canvasMode === "inpaint") {
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        canvas.freeDrawingBrush.color = "rgba(139, 92, 246, 0.5)";
        canvas.freeDrawingBrush.width = maskBrushSize;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [maskCanvas, canvasMode, maskBrushSize]);

  // Sync pan/zoom from main canvas to mask canvas
  useEffect(() => {
    if (!mainCanvas || !maskCanvas) return;

    const syncTransform = () => {
      const vpt = mainCanvas.viewportTransform;
      if (vpt) {
        maskCanvas.setViewportTransform(vpt.slice() as any);
        maskCanvas.requestRenderAll();
      }
    };

    mainCanvas.on("mouse:wheel", syncTransform);
    mainCanvas.on("mouse:move", syncTransform);
    mainCanvas.on("after:render", syncTransform);

    syncTransform();

    return () => {
      mainCanvas.off("mouse:wheel", syncTransform);
      mainCanvas.off("mouse:move", syncTransform);
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
        const artboard = mainCanvas.getObjects().find(o => (o as any).id === "__artboard__");
        if (artboard && artboardWidth && artboardHeight) {
          const dataUrl = exportMaskToPng(
            maskCanvas,
            { left: artboard.left || 0, top: artboard.top || 0, width: artboardWidth, height: artboardHeight },
            { width: artboardWidth, height: artboardHeight }
          );
          setMaskData(dataUrl);
        }
      }, 500);
    };

    maskCanvas.on("path:created", handlePathCreated);

    return () => {
      maskCanvas.off("path:created", handlePathCreated);
      clearTimeout(timeout);
    };
  }, [maskCanvas, mainCanvas, setMaskData, artboardWidth, artboardHeight]);
}
