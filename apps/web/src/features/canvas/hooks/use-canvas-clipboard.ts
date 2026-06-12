import { useEffect } from "react";
import * as fabric from "fabric";
import { generateId } from "../utils/fabric-helpers";

export function useCanvasClipboard(canvas: fabric.Canvas | null) {


  useEffect(() => {
    if (!canvas) return;

    const handleDeleteObject = () => {
      const activeObjects = canvas.getActiveObjects();
      if (activeObjects.length) {
        let deletedAny = false;
        activeObjects.forEach((obj) => {
          if (
            obj.id !== "__artboard__" &&
            obj.id !== "obj_initial_image" &&
            !obj.get("locked")
          ) {
            canvas.remove(obj);
            deletedAny = true;
          }
        });
        if (deletedAny) {
          canvas.discardActiveObject();
          canvas.requestRenderAll();
        }
      }
    };

    const handleDuplicateObject = () => {
      const active = canvas.getActiveObject();
      if (active) {
        active.clone().then((cloned: fabric.Object) => {
          cloned.set({
            left: (active.left || 0) + 20,
            top: (active.top || 0) + 20,
            evented: true,
          });
          cloned.id = generateId();

          if (cloned.type === "activeSelection") {
            const selection = cloned as fabric.ActiveSelection;
            selection.canvas = canvas;
            selection.forEachObject((obj: fabric.Object) => {
              obj.id = generateId();
              canvas.add(obj);
            });
            selection.setCoords();
          } else {
            canvas.add(cloned);
          }
          canvas.setActiveObject(cloned);
          canvas.requestRenderAll();
        });
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (canvas && canvas.getActiveObject()?.isEditing)
      ) {
        return;
      }

      const activeObj = canvas.getActiveObject();
      if (activeObj && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === "Delete" || e.key === "Backspace") {
          e.preventDefault();
          handleDeleteObject();
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("canvas:delete-object", handleDeleteObject);
    window.addEventListener("canvas:duplicate-object", handleDuplicateObject);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("canvas:delete-object", handleDeleteObject);
      window.removeEventListener("canvas:duplicate-object", handleDuplicateObject);
    };
  }, [canvas]);
}
