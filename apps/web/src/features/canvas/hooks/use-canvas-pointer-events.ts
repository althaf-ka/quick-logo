import { useEffect } from "react";
import * as fabric from "fabric";
import { useCanvasStore } from "../store/canvas-store";
import { generateId } from "../utils/fabric-helpers";
import { CANVAS_CONSTANTS } from "../constants";

export function useCanvasPointerEvents(canvas: fabric.Canvas | null) {
  const setActiveTool = useCanvasStore((s) => s.setActiveTool);

  useEffect(() => {
    if (!canvas) return;

    let isDragging = false;
    let lastPosX = 0;
    let lastPosY = 0;
    let shapeRef: fabric.Object | null = null;
    let originX = 0;
    let originY = 0;
    let hoveredObjectForBorder: fabric.Object | null = null;

    const onMouseOver = (opt: fabric.TEvent & { target?: fabric.Object }) => {
      const { activeTool } = useCanvasStore.getState();
      if (activeTool !== "select") return;
      const target = opt.target;
      if (
        target &&
        target.id !== CANVAS_CONSTANTS.ARTBOARD_ID &&
        target !== canvas.getActiveObject()
      ) {
        hoveredObjectForBorder = target;
        canvas.requestRenderAll();
      }
    };

    const onMouseOut = () => {
      if (hoveredObjectForBorder) {
        hoveredObjectForBorder = null;
        canvas.requestRenderAll();
      }
    };

    const onAfterRender = (opt: { ctx: CanvasRenderingContext2D }) => {
      const { activeTool } = useCanvasStore.getState();
      const ctx = opt.ctx;
      if (!ctx) return;
      if (
        hoveredObjectForBorder &&
        activeTool === "select" &&
        hoveredObjectForBorder !== canvas.getActiveObject()
      ) {
        ctx.save();

        const vpt = canvas.viewportTransform;
        if (vpt) {
          ctx.transform(vpt[0], vpt[1], vpt[2], vpt[3], vpt[4], vpt[5]);
        }

        const matrix = hoveredObjectForBorder.calcTransformMatrix();
        ctx.transform(
          matrix[0],
          matrix[1],
          matrix[2],
          matrix[3],
          matrix[4],
          matrix[5],
        );

        ctx.strokeStyle = "#6D28D9";

        const scaleX = hoveredObjectForBorder.scaleX || 1;
        const scaleY = hoveredObjectForBorder.scaleY || 1;
        const avgScale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2;
        const zoom = canvas.getZoom();
        ctx.lineWidth = 2 / (avgScale * zoom);

        const w = hoveredObjectForBorder.width || 0;
        const h = hoveredObjectForBorder.height || 0;
        ctx.strokeRect(-w / 2, -h / 2, w, h);

        ctx.restore();
      }
    };

    const onMouseDown = (opt: fabric.TEvent) => {
      const { activeTool, activeShape, shapeSettings, textSettings } =
        useCanvasStore.getState();
      const e = opt.e as MouseEvent;
      const pointer = canvas.getScenePoint(opt.e);

      if (activeTool === "hand") {
        isDragging = true;
        lastPosX = e.clientX;
        lastPosY = e.clientY;
        canvas.setCursor("grabbing");
      } else if (activeTool === "text") {
        const target = (opt as fabric.TEvent & { target?: fabric.Object })
          .target;
        if (
          target &&
          (target.type === "textbox" ||
            target.type === "text" ||
            target.type === "i-text")
        ) {
          return;
        }

        const text = new fabric.Textbox("Type here", {
          left: pointer.x,
          top: pointer.y,
          width: 200,
          fontSize: textSettings.fontSize,
          fontFamily: textSettings.fontFamily,
          fontWeight: textSettings.fontWeight,
          textAlign: textSettings.textAlign,
          fill: textSettings.fill,
        });
        text.id = generateId();

        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        text.selectAll();
        setActiveTool("select");
        canvas.requestRenderAll();
      } else if (activeTool === "eraser") {
        isDragging = true;
        const target = (opt as fabric.TEvent & { target?: fabric.Object })
          .target;
        if (
          target &&
          target.id !== CANVAS_CONSTANTS.ARTBOARD_ID &&
          target.id !== CANVAS_CONSTANTS.INITIAL_IMAGE_ID &&
          target.id !== CANVAS_CONSTANTS.AI_REGION_ID &&
          target.type !== "image" &&
          target.type !== "Image" &&
          target.type !== "image:FabricImage"
        ) {
          canvas.remove(target);
          canvas.requestRenderAll();
        }
      } else if (activeTool === "shapes") {
        isDragging = true;
        originX = pointer.x;
        originY = pointer.y;

        const commonProps = {
          left: originX,
          top: originY,
          fill: shapeSettings.fill,
          stroke: shapeSettings.stroke,
          strokeWidth: shapeSettings.strokeWidth,
        };

        if (activeShape === "rectangle") {
          shapeRef = new fabric.Rect({ ...commonProps, width: 0, height: 0 });
        } else if (activeShape === "circle") {
          shapeRef = new fabric.Circle({ ...commonProps, radius: 0 });
        } else if (activeShape === "line" || activeShape === "arrow") {
          shapeRef = new fabric.Line(
            [originX, originY, originX, originY],
            commonProps,
          );
        } else if (activeShape === "triangle") {
          shapeRef = new fabric.Triangle({
            ...commonProps,
            width: 0,
            height: 0,
          });
        }

        if (shapeRef) {
          shapeRef.id = generateId();
          canvas.add(shapeRef);
        }
      }
    };

    const onMouseMove = (opt: fabric.TEvent) => {
      const { activeTool, activeShape } = useCanvasStore.getState();
      const e = opt.e as MouseEvent;
      if (!isDragging) return;

      if (activeTool === "hand") {
        const vpt = canvas.viewportTransform;
        if (vpt) {
          vpt[4] += e.clientX - lastPosX;
          vpt[5] += e.clientY - lastPosY;
          canvas.requestRenderAll();
          lastPosX = e.clientX;
          lastPosY = e.clientY;
        }
      } else if (activeTool === "eraser" && isDragging) {
        const target = (opt as fabric.TEvent & { target?: fabric.Object })
          .target;
        if (
          target &&
          target.id !== CANVAS_CONSTANTS.ARTBOARD_ID &&
          target.id !== CANVAS_CONSTANTS.INITIAL_IMAGE_ID &&
          target.id !== CANVAS_CONSTANTS.AI_REGION_ID &&
          target.type !== "image" &&
          target.type !== "Image" &&
          target.type !== "image:FabricImage"
        ) {
          canvas.remove(target);
          canvas.requestRenderAll();
        }
      } else if (activeTool === "shapes" && shapeRef) {
        const pointer = canvas.getScenePoint(opt.e);

        if (activeShape === "rectangle") {
          const rect = shapeRef as fabric.Rect;
          rect.set({
            width: Math.abs(pointer.x - originX),
            height: Math.abs(pointer.y - originY),
          });
          if (pointer.x < originX) rect.set({ left: pointer.x });
          if (pointer.y < originY) rect.set({ top: pointer.y });
        } else if (activeShape === "circle") {
          const circle = shapeRef as fabric.Circle;
          const radius = Math.abs(pointer.x - originX) / 2;
          circle.set({ radius });
          if (pointer.x < originX) circle.set({ left: pointer.x });
          if (pointer.y < originY) circle.set({ top: pointer.y });
        } else if (activeShape === "line" || activeShape === "arrow") {
          const line = shapeRef as fabric.Line;
          line.set({ x2: pointer.x, y2: pointer.y });
        } else if (activeShape === "triangle") {
          const tri = shapeRef as fabric.Triangle;
          tri.set({
            width: Math.abs(pointer.x - originX),
            height: Math.abs(pointer.y - originY),
          });
          if (pointer.x < originX) tri.set({ left: pointer.x });
          if (pointer.y < originY) tri.set({ top: pointer.y });
        }
        canvas.requestRenderAll();
      }
    };

    const onMouseUp = () => {
      const { activeTool } = useCanvasStore.getState();
      if (activeTool === "hand") {
        canvas.setCursor("grab");
      } else if (activeTool === "shapes" && shapeRef) {
        shapeRef.setCoords();
        shapeRef.set({ selectable: true, evented: true });
        canvas.setActiveObject(shapeRef);
        canvas.requestRenderAll();
        canvas.fire("object:modified", { target: shapeRef });
        setActiveTool("select");
      }
      isDragging = false;
      shapeRef = null;
    };

    const onSelection = () => {
      if (hoveredObjectForBorder) {
        hoveredObjectForBorder = null;
        canvas.requestRenderAll();
      }
    };

    canvas.on("mouse:down", onMouseDown);
    canvas.on("mouse:move", onMouseMove);
    canvas.on("mouse:up", onMouseUp);
    canvas.on("mouse:over", onMouseOver);
    canvas.on("mouse:out", onMouseOut);
    canvas.on("after:render", onAfterRender);
    canvas.on("selection:created", onSelection);
    canvas.on("selection:updated", onSelection);

    return () => {
      canvas.off("mouse:down", onMouseDown);
      canvas.off("mouse:move", onMouseMove);
      canvas.off("mouse:up", onMouseUp);
      canvas.off("mouse:over", onMouseOver);
      canvas.off("mouse:out", onMouseOut);
      canvas.off("after:render", onAfterRender);
      canvas.off("selection:created", onSelection);
      canvas.off("selection:updated", onSelection);
    };
  }, [canvas, setActiveTool]);
}
