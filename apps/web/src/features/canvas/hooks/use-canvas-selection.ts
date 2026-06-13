import { useEffect } from "react";
import * as fabric from "fabric";
import { useCanvasStore } from "../store/canvas-store";
import type { SelectedObjectProps } from "../types/canvas";

import { useShallow } from "zustand/react/shallow";

export function useCanvasSelection(canvas: fabric.Canvas | null) {
  const { setSelectedObject, setSelectedObjects, setSelectionType } =
    useCanvasStore(
      useShallow((s) => ({
        setSelectedObject: s.setSelectedObject,
        setSelectedObjects: s.setSelectedObjects,
        setSelectionType: s.setSelectionType,
      })),
    );

  useEffect(() => {
    if (!canvas) return;

    const syncSelection = () => {
      const activeObjects = canvas.getActiveObjects();

      if (
        !activeObjects ||
        activeObjects.length === 0 ||
        activeObjects.every((o) => o.id === "__artboard__")
      ) {
        setSelectedObject(null);
        setSelectedObjects([]);
        setSelectionType("none");
        return;
      }

      if (activeObjects.length > 1) {
        setSelectedObject(null);
        setSelectedObjects(
          activeObjects.map((obj) => ({
            id: obj.id!,
            type: obj.type,
            left: Math.round(obj.left || 0),
            top: Math.round(obj.top || 0),
            width: Math.round((obj.width || 0) * (obj.scaleX || 1)),
            height: Math.round((obj.height || 0) * (obj.scaleY || 1)),
            angle: Math.round(obj.angle || 0),
            opacity: obj.opacity ?? 1,
            fill: obj.fill?.toString() || "#000000",
            stroke: obj.stroke?.toString() || "#000000",
            strokeWidth: obj.strokeWidth || 0,
            locked: !!obj.get("locked"),
          })),
        );
        setSelectionType("multi");
        return;
      }

      const active = activeObjects[0];
      const props: SelectedObjectProps = {
        id: active.id!,
        type: active.type,
        left: Math.round(active.left || 0),
        top: Math.round(active.top || 0),
        width: Math.round((active.width || 0) * (active.scaleX || 1)),
        height: Math.round((active.height || 0) * (active.scaleY || 1)),
        angle: Math.round(active.angle || 0),
        opacity: active.opacity ?? 1,
        fill: active.fill?.toString() || "#000000",
        stroke: active.stroke?.toString() || "#000000",
        strokeWidth: active.strokeWidth || 0,
        locked: !!active.get("locked"),
      };

      if (active.type === "textbox" || active.type === "text") {
        const textObj = active as fabric.Textbox;
        props.fontFamily = textObj.fontFamily;
        props.fontSize = textObj.fontSize;
        props.fontWeight = textObj.fontWeight?.toString();
        props.fontStyle = textObj.fontStyle;
        props.textAlign = textObj.textAlign;
        props.text = textObj.text;
      }
      setSelectedObject(props);
      setSelectedObjects([props]);
      setSelectionType("single");
    };

    const handleUpdateObject = (e: Event) => {
      const { detail } = e as CustomEvent;
      const active = canvas.getActiveObject();
      if (active) {
        if (detail.fontFamily && active.type === "textbox") {
          (active as fabric.Textbox).set({ fontFamily: detail.fontFamily });
        }

        if (detail.scaleX !== undefined && active.width) {
          active.set({ scaleX: detail.scaleX });
        }
        if (detail.scaleY !== undefined && active.height) {
          active.set({ scaleY: detail.scaleY });
        }

        const rest = { ...detail };
        delete rest.scaleX;
        delete rest.scaleY;
        active.set(rest);

        active.setCoords();
        canvas.requestRenderAll();
        canvas.fire("object:modified", { target: active });
      }
    };

    const handleSelectObject = (e: Event) => {
      const { id } = (e as CustomEvent).detail;
      const obj = canvas.getObjects().find((o) => o.id === id);
      if (obj && !obj.get("locked")) {
        canvas.setActiveObject(obj);
        canvas.requestRenderAll();
      }
    };

    canvas.on("selection:created", syncSelection);
    canvas.on("selection:updated", syncSelection);
    canvas.on("selection:cleared", syncSelection);
    canvas.on("object:modified", syncSelection);

    window.addEventListener("canvas:update-object", handleUpdateObject);
    window.addEventListener("canvas:select-object", handleSelectObject);

    return () => {
      canvas.off("selection:created", syncSelection);
      canvas.off("selection:updated", syncSelection);
      canvas.off("selection:cleared", syncSelection);
      canvas.off("object:modified", syncSelection);
      window.removeEventListener("canvas:update-object", handleUpdateObject);
      window.removeEventListener("canvas:select-object", handleSelectObject);
    };
  }, [canvas, setSelectedObject, setSelectedObjects, setSelectionType]);
}
