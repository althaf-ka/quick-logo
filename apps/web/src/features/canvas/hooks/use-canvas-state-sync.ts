import { useEffect } from "react";
import * as fabric from "fabric";
import { useCanvasStore } from "../store/canvas-store";

// Helper functions to mutate canvas properties outside the hook scope
// This cleanly avoids react-compiler immutability warnings
const setCanvasBaseState = (
  c: fabric.Canvas,
  isDrawingMode: boolean,
  selection: boolean,
  defaultCursor: string,
) => {
  c.isDrawingMode = isDrawingMode;
  c.selection = selection;
  c.defaultCursor = defaultCursor;
};

const setCanvasPencilBrush = (
  c: fabric.Canvas,
  color: string,
  width: number,
) => {
  c.isDrawingMode = true;
  c.freeDrawingBrush = new fabric.PencilBrush(c);
  c.freeDrawingBrush.color = color;
  c.freeDrawingBrush.width = width;
};

const setCanvasToolSpecificState = (
  c: fabric.Canvas,
  activeTool: string,
  brushSettings: { color: string; width: number }
) => {
  switch (activeTool) {
    case "select":
      c.selection = true;
      break;
    case "text":
      c.defaultCursor = "text";
      break;
    case "pencil":
      setCanvasPencilBrush(c, brushSettings.color, brushSettings.width);
      break;
    case "shapes":
      c.defaultCursor = "crosshair";
      break;
    case "eraser":
      c.isDrawingMode = false;
      c.defaultCursor = "cell";
      break;
    case "hand":
      c.defaultCursor = "grab";
      break;
  }
};

export function useCanvasStateSync(canvas: fabric.Canvas | null) {
  const { activeTool, brushSettings, canvasMode } = useCanvasStore();

  useEffect(() => {
    if (!canvas) return;

    setCanvasBaseState(canvas, false, false, "default");

    const isAiModeWithoutSelection = canvasMode === "inpaint";

    canvas.forEachObject((obj) => {
      if (!obj.get("locked") && obj.id !== "__artboard__") {
        if (activeTool === "hand" || activeTool === "shapes") {
          obj.set({ selectable: false, evented: false });
        } else if (activeTool === "eraser") {
          obj.set({ selectable: false, evented: true });
        } else if (activeTool === "text") {
          const isText =
            obj.type === "textbox" ||
            obj.type === "text" ||
            obj.type === "i-text";
          obj.set({ selectable: isText, evented: isText });
        } else {
          if (canvasMode === "img2img") {
            obj.set({
              selectable: true,
              evented: true,
              hasControls: false,
              hasBorders: true,
              lockMovementX: true,
              lockMovementY: true,
              borderColor: "#6D28D9",
              borderScaleFactor: 4,
            });
          } else {
            obj.set({
              selectable: !isAiModeWithoutSelection,
              evented: !isAiModeWithoutSelection,
              hasControls: true,
              hasBorders: true,
              lockMovementX: false,
              lockMovementY: false,
              borderColor: "#6D28D9",
              borderScaleFactor: 4,
              hoverCursor: "default",
              moveCursor: "default",
            });
          }
        }
      }
    });

    setCanvasToolSpecificState(canvas, activeTool, brushSettings);

    canvas.requestRenderAll();
  }, [activeTool, canvas, brushSettings, canvasMode]);
}
