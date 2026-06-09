/* eslint-disable react-compiler/react-compiler */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef } from "react";
import * as fabric from "fabric";
import { useCanvasStore } from "../store/canvas-store";

export function useRegionSelector(canvas: fabric.Canvas | null) {
  const { canvasMode, activeTool, setRegionBounds } = useCanvasStore();
  const animFrameRef = useRef<number | null>(null);

  // Toggle mode & animate dashed border
  useEffect(() => {
    if (!canvas) return;

    const isRegionMode = canvasMode === "img2img" || canvasMode === "text2img";

    const animateBorder = () => {
      if (!isRegionMode) return;
      const region = canvas.getObjects().find((o) => (o as any).id === "__ai_region__");
      if (region) {
        region.set("strokeDashOffset", (region.get("strokeDashOffset") || 0) - 1);
        canvas.requestRenderAll();
      }
      animFrameRef.current = requestAnimationFrame(animateBorder);
    };

    if (isRegionMode) {
      // Find or hide region
      const region = canvas.getObjects().find((o) => (o as any).id === "__ai_region__");
      if (region) {
        region.set({ visible: true, selectable: true, evented: true });
        // Disable other objects
        canvas.forEachObject((obj) => {
          if ((obj as any).id !== "__ai_region__" && (obj as any).id !== "__artboard__") {
            obj.set({ selectable: false, evented: false });
          }
        });
      }
      
      canvas.defaultCursor = "crosshair";
      
      animFrameRef.current = requestAnimationFrame(animateBorder);
    } else {
      // Hide region when not in region modes
      const region = canvas.getObjects().find((o) => (o as any).id === "__ai_region__");
      if (region) {
        region.set({ visible: false, selectable: false, evented: false });
      }
      
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    }

    canvas.requestRenderAll();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [canvas, canvasMode]);

  // Drawing behavior
  useEffect(() => {
    if (!canvas) return;
    const isRegionMode = canvasMode === "img2img" || canvasMode === "text2img";
    
    // Do not intercept if user is explicitly panning
    if (!isRegionMode || activeTool === "hand") return;

    let isDrawing = false;
    let originX = 0;
    let originY = 0;
    let regionRect: fabric.Rect | null = null;

    const syncBoundsToStore = (rect: fabric.Rect) => {
      // bounds in logical space
      const width = (rect.width || 0) * (rect.scaleX || 1);
      const height = (rect.height || 0) * (rect.scaleY || 1);
      setRegionBounds({
        left: rect.left || 0,
        top: rect.top || 0,
        width,
        height,
      });
    };

    const handleMouseDown = (opt: any) => {
      // If clicking on an existing region, let it handle selection/resizing
      if (opt.target && opt.target.id === "__ai_region__") {
        return;
      }

      // If clicking elsewhere, start drawing a new region
      const pointer = canvas.getPointer(opt.e);
      isDrawing = true;
      originX = pointer.x;
      originY = pointer.y;

      // Remove any existing region
      const existing = canvas.getObjects().find((o) => (o as any).id === "__ai_region__");
      if (existing) {
        canvas.remove(existing);
      }

      regionRect = new fabric.Rect({
        left: originX,
        top: originY,
        width: 0,
        height: 0,
        fill: "rgba(139, 92, 246, 0.08)",
        stroke: "rgba(139, 92, 246, 0.6)",
        strokeDashArray: [8, 4],
        strokeWidth: 2,
        selectable: true,
        hasControls: true,
        cornerColor: "rgba(139, 92, 246, 0.8)",
        cornerSize: 10,
        transparentCorners: false,
        lockRotation: true,
        hasRotatingPoint: false,
        strokeUniform: true, // keeps border 2px regardless of scaling
      });

      (regionRect as any).id = "__ai_region__";
      (regionRect as any).name = "AI Region";

      canvas.add(regionRect);
      canvas.setActiveObject(regionRect);
    };

    const handleMouseMove = (opt: any) => {
      if (!isDrawing || !regionRect) return;

      const pointer = canvas.getPointer(opt.e);
      const w = Math.abs(pointer.x - originX);
      const h = Math.abs(pointer.y - originY);

      regionRect.set({
        width: w,
        height: h,
      });

      if (pointer.x < originX) {
        regionRect.set({ left: pointer.x });
      }
      if (pointer.y < originY) {
        regionRect.set({ top: pointer.y });
      }

      canvas.requestRenderAll();
    };

    const handleMouseUp = () => {
      if (!isDrawing || !regionRect) return;
      isDrawing = false;
      regionRect.setCoords();
      syncBoundsToStore(regionRect);
    };

    const handleModified = (opt: any) => {
      if (opt.target && opt.target.id === "__ai_region__") {
        syncBoundsToStore(opt.target as fabric.Rect);
      }
    };

    canvas.on("mouse:down", handleMouseDown);
    canvas.on("mouse:move", handleMouseMove);
    canvas.on("mouse:up", handleMouseUp);
    canvas.on("object:modified", handleModified);

    return () => {
      canvas.off("mouse:down", handleMouseDown);
      canvas.off("mouse:move", handleMouseMove);
      canvas.off("mouse:up", handleMouseUp);
      canvas.off("object:modified", handleModified);
    };
  }, [canvas, canvasMode, activeTool, setRegionBounds]);

}
