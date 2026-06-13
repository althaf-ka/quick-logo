import { useEffect } from "react";
import * as fabric from "fabric";
import { useCanvasStore } from "../store/canvas-store";

export function useCanvasModeSync(canvas: fabric.Canvas | null) {
  const canvasMode = useCanvasStore((s) => s.canvasMode);

  useEffect(() => {
    const state = useCanvasStore.getState();
    if (canvasMode === "sketch2img") {
      state.setActiveTool("pencil");
      state.setBrushSettings({ width: 4, color: "#8B5CF6", opacity: 1 });
    } else if (canvasMode === "img2img") {
      state.setActiveTool("select");
    } else if (canvasMode === "inpaint") {
      if (canvas) {
        canvas.discardActiveObject();
        canvas.requestRenderAll();
      }
    }
  }, [canvasMode, canvas]);
}
