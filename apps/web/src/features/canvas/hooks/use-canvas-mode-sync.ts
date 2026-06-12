import { useEffect } from "react";
import * as fabric from "fabric";
import { useCanvasStore } from "../store/canvas-store";

export function useCanvasModeSync(canvas: fabric.Canvas | null) {
  const { canvasMode, setActiveTool, setBrushSettings } = useCanvasStore();

  useEffect(() => {
    if (canvasMode === "sketch2img") {
      setActiveTool("pencil");
      setBrushSettings({ width: 4, color: "#8B5CF6", opacity: 1 });
    } else if (canvasMode === "img2img") {
      setActiveTool("select");
    } else if (canvasMode === "inpaint") {
      if (canvas) {
        canvas.discardActiveObject();
        canvas.requestRenderAll();
      }
    }
  }, [canvasMode, setActiveTool, setBrushSettings, canvas]);
}
