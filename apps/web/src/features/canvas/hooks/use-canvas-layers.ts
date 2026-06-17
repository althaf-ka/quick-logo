import { useEffect } from "react";
import * as fabric from "fabric";
import { useCanvasStore } from "../store/canvas-store";
import type { CanvasObjectInfo } from "../types/canvas";
import { generateId } from "../utils/fabric-helpers";

export function useCanvasLayers(canvas: fabric.Canvas | null) {
  const setLayers = useCanvasStore((s) => s.setLayers);

  useEffect(() => {
    if (!canvas) return;

    let isLoaded = false;

    const syncLayers = () => {
      if (!isLoaded) return;
      const objects = canvas
        .getObjects()
        .filter((o) => o.id !== "__artboard__");

      objects.forEach((obj: fabric.Object, idx) => {
        if (!obj.id) obj.id = generateId();

        if (
          obj.type === "text" ||
          obj.type === "textbox" ||
          obj.type === "i-text"
        ) {
          const textContent = (obj as fabric.IText).text || "";
          obj.name =
            textContent.length > 15
              ? textContent.substring(0, 15) + "..."
              : textContent || "Text";
        } else if (!obj.name) {
          obj.name = `${obj.type} ${idx + 1}`;
        }
      });

      const layerList: CanvasObjectInfo[] = objects
        .map((obj: fabric.Object, idx) => ({
          id: obj.id!,
          type: obj.type,
          name: obj.name!,
          visible: obj.visible ?? true,
          locked: !!obj.get("locked"),
          zIndex: idx,
        }))
        .reverse();

      setLayers(layerList);
    };

    const handleEvent = () => syncLayers();

    const handleReorderObject = (e: Event) => {
      const { id, action } = (e as CustomEvent).detail;
      const obj =
        canvas.getObjects().find((o) => o.id === id) ||
        canvas.getActiveObject();
      if (obj) {
        if (action === "front") canvas.bringObjectToFront(obj);
        if (action === "back") {
          canvas.sendObjectToBack(obj);
          const artboard = canvas
            .getObjects()
            .find((o) => o.id === "__artboard__");
          if (artboard) canvas.sendObjectToBack(artboard);
        }
        if (action === "forward") canvas.bringObjectForward(obj);
        if (action === "backward") {
          canvas.sendObjectBackwards(obj);
          const objects = canvas.getObjects();
          if (
            objects[0] === obj &&
            objects.length > 1 &&
            objects[1].id === "__artboard__"
          ) {
            canvas.bringObjectForward(obj);
          }
        }
        canvas.requestRenderAll();
        canvas.fire("object:modified", { target: obj });
      }
    };

    const handleToggleLayer = (e: Event) => {
      const { id, prop } = (e as CustomEvent).detail;
      const obj = canvas.getObjects().find((o) => o.id === id);
      if (obj) {
        if (prop === "visible") obj.set({ visible: !obj.visible });
        if (prop === "locked") {
          const isLocked = !obj.get("locked");
          obj.set({
            locked: isLocked,
            selectable: !isLocked,
            evented: !isLocked,
            hoverCursor: "default",
            moveCursor: "default",
          });
          if (isLocked) canvas.discardActiveObject();
        }
        canvas.requestRenderAll();
        canvas.fire("object:modified", { target: obj });
      }
    };

    const handleFlattenImage = (e: Event) => {
      const { id } = (e as CustomEvent).detail;
      const obj = canvas.getObjects().find((o) => o.id === id);
      if (obj && (obj.type === "image" || obj.type === "Image")) {
        const objects = canvas.getObjects();
        const index = objects.indexOf(obj);
        if (index > 0) {
          const belowObj = objects[index - 1];
          if (belowObj.id === "__artboard__" || !belowObj) {
            return;
          }

          const group = new fabric.Group([belowObj, obj], { canvas });
          const dataUrl = group.toDataURL({ format: "png" });

          const fabricAny = fabric as Record<string, unknown>;
          const FabricImageClass = (fabricAny.FabricImage ||
            fabricAny.Image) as typeof fabric.FabricImage;
          FabricImageClass.fromURL(dataUrl).then((img: fabric.FabricImage) => {
            img.id = generateId();
            img.set({
              left: group.left,
              top: group.top,
              scaleX: 1,
              scaleY: 1,
              name: "Flattened Image",
            });

            canvas.remove(belowObj);
            canvas.remove(obj);
            canvas.insertAt(index - 1, img);
            canvas.setActiveObject(img);
            canvas.requestRenderAll();
          });
        }
      }
    };

    canvas.on("object:modified", handleEvent);
    canvas.on("object:added", handleEvent);
    canvas.on("object:removed", handleEvent);

    // Wait for canvas to load before syncing to avoid mutating objects during loadFromJSON
    const handleLoaded = () => {
      isLoaded = true;
      syncLayers();
    };
    window.addEventListener("canvas:loaded", handleLoaded);

    window.addEventListener("canvas:reorder-object", handleReorderObject);
    window.addEventListener("canvas:toggle-layer", handleToggleLayer);
    window.addEventListener("canvas:flatten-image", handleFlattenImage);

    return () => {
      canvas.off("object:modified", handleEvent);
      canvas.off("object:added", handleEvent);
      canvas.off("object:removed", handleEvent);
      window.removeEventListener("canvas:loaded", handleLoaded);
      window.removeEventListener("canvas:reorder-object", handleReorderObject);
      window.removeEventListener("canvas:toggle-layer", handleToggleLayer);
      window.removeEventListener("canvas:flatten-image", handleFlattenImage);
    };
  }, [canvas, setLayers]);
}
