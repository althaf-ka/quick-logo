import { useEffect } from "react";
import * as fabric from "fabric";
import { useCanvasStore } from "../store/canvas-store";

export function useCanvasKeyboardShortcuts(canvas: fabric.Canvas | null) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (canvas && canvas.getActiveObject()?.isEditing)
      ) {
        return;
      }

      if (canvas) {
        const activeObj = canvas.getActiveObject();
        if (activeObj && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const step = e.shiftKey ? 10 : 1;
          let moved = false;
          switch (e.key) {
            case "ArrowLeft":
              e.preventDefault();
              activeObj.set("left", (activeObj.left || 0) - step);
              moved = true;
              break;
            case "ArrowRight":
              e.preventDefault();
              activeObj.set("left", (activeObj.left || 0) + step);
              moved = true;
              break;
            case "ArrowUp":
              e.preventDefault();
              activeObj.set("top", (activeObj.top || 0) - step);
              moved = true;
              break;
            case "ArrowDown":
              e.preventDefault();
              activeObj.set("top", (activeObj.top || 0) + step);
              moved = true;
              break;
          }
          if (moved) {
            activeObj.setCoords();
            canvas.requestRenderAll();
            canvas.fire("object:modified", { target: activeObj });
            return;
          }
        }
      }

      const key = e.key.toLowerCase();
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const state = useCanvasStore.getState();

      switch (key) {
        case "v":
          state.setActiveTool("select");
          break;
        case "t":
          state.setActiveTool("text");
          break;
        case "p":
          state.setActiveTool("pencil");
          break;
        case "s":
          state.setActiveTool("shapes");
          break;
        case "i": {
          const fileInput = document.querySelector(
            'input[type="file"][accept="image/*"]',
          ) as HTMLInputElement;
          if (fileInput) fileInput.click();
          break;
        }
        case "e":
          state.setActiveTool("eraser");
          break;
        case "h":
          state.setActiveTool("hand");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canvas]);
}
