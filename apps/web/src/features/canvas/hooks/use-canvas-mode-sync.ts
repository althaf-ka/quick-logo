import { useEffect } from "react";
import * as fabric from "fabric";
import { useCanvasStore } from "../store/canvas-store";

export function useCanvasModeSync(canvas: fabric.Canvas | null) {
  const canvasMode = useCanvasStore((s) => s.canvasMode);

  useEffect(() => {
    const state = useCanvasStore.getState();
    if (canvasMode === "img2img") {
      state.setActiveTool("select");
    } else if (canvasMode === "inpaint") {
      if (canvas) {
        canvas.discardActiveObject();
        canvas.requestRenderAll();
      }
    }
  }, [canvasMode, canvas]);
}
