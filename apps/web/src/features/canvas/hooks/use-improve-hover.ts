import { useEffect } from "react";
import * as fabric from "fabric";
import { useCanvasStore } from "../store/canvas-store";

export function useImproveHover(canvas: fabric.Canvas | null) {
  const canvasMode = useCanvasStore((s) => s.canvasMode);

  useEffect(() => {
    if (!canvas) return;

    if (canvasMode !== "img2img") return;

    let hoveredObject: fabric.Object | null = null;
    const originalShadows = new Map<fabric.Object, fabric.Shadow | null>();
    const originalStates = new Map<
      fabric.Object,
      {
        selectable: boolean;
        evented: boolean;
        locked: boolean;
        hoverCursor: string;
        lockMovementX: boolean;
        lockMovementY: boolean;
        lockScalingX: boolean;
        lockScalingY: boolean;
        lockRotation: boolean;
        hasControls: boolean;
      }
    >();

    // Pre-set states for img2img mode
    canvas.getObjects().forEach((obj) => {
      if (obj.id === "__artboard__") return;

      originalStates.set(obj, {
        selectable: obj.get("selectable") ?? true,
        evented: obj.get("evented") ?? true,
        locked: obj.get("locked") ?? false,
        hoverCursor: obj.get("hoverCursor") ?? "default",
        lockMovementX: obj.get("lockMovementX") ?? false,
        lockMovementY: obj.get("lockMovementY") ?? false,
        lockScalingX: obj.get("lockScalingX") ?? false,
        lockScalingY: obj.get("lockScalingY") ?? false,
        lockRotation: obj.get("lockRotation") ?? false,
        hasControls: obj.get("hasControls") ?? true,
      });

      if (obj.type === "image" || obj.type === "Image") {
        obj.set({
          selectable: true,
          evented: true,
          locked: false,
          hoverCursor: "pointer",
          lockMovementX: true,
          lockMovementY: true,
          lockScalingX: true,
          lockScalingY: true,
          lockRotation: true,
          hasControls: false,
        });
      } else {
        obj.set({
          selectable: false,
          evented: false,
          hoverCursor: "default",
        });
      }
    });

    const handleMouseOver = (
      opt: fabric.TEvent & { target?: fabric.Object },
    ) => {
      const target = opt.target;
      if (
        target &&
        target.id !== "__artboard__" &&
        (target.type === "image" || target.type === "Image")
      ) {
        hoveredObject = target;
        target.set({ hoverCursor: "pointer" });

        // Save original shadow to restore it later
        if (!originalShadows.has(target)) {
          originalShadows.set(target, target.shadow || null);
        }

        // Add a smooth native glowing shadow
        target.set(
          "shadow",
          new fabric.Shadow({
            color: "rgba(109, 40, 217, 0.8)", // Darker professional purple, more opaque
            blur: 35,
            offsetX: 0,
            offsetY: 0,
          }),
        );
        target.set("dirty", true);

        canvas.requestRenderAll();
      }
    };

    const handleMouseOut = (
      opt: fabric.TEvent & { target?: fabric.Object },
    ) => {
      const target = opt.target;
      if (target && target.id !== "__artboard__") {
        // Restore original shadow
        if (originalShadows.has(target)) {
          target.set("shadow", originalShadows.get(target) || null);
        } else {
          target.set("shadow", null);
        }
        target.set("dirty", true);
        canvas.requestRenderAll();
        hoveredObject = null;
      }
    };

    const handleSelection = () => {
      if (hoveredObject) {
        if (originalShadows.has(hoveredObject)) {
          hoveredObject.set(
            "shadow",
            originalShadows.get(hoveredObject) || null,
          );
        } else {
          hoveredObject.set("shadow", null);
        }
        hoveredObject.set("dirty", true);
        canvas.requestRenderAll();
        hoveredObject = null;
      }
    };

    const handleSelectionCleared = () => {
      if (currentlyPulsingObject) {
        currentlyPulsingObject.set("shadow", savedSelectionShadow);
        currentlyPulsingObject.set("dirty", true);
        currentlyPulsingObject = null;
      }
    };

    // (Hover cursor was already set in the pre-set loop above)

    // --- SELECTION GLOW ANIMATION ---
    let animationFrameId: number;
    let pulsePhase = 0;
    let currentlyPulsingObject: fabric.Object | null = null;
    let savedSelectionShadow: fabric.Shadow | null = null;

    const renderPulse = () => {
      if (!canvas) return;

      const activeObj = canvas.getActiveObject();

      // If selection changed
      if (activeObj !== currentlyPulsingObject) {
        // Clean up old object
        if (currentlyPulsingObject) {
          currentlyPulsingObject.set("shadow", savedSelectionShadow);
          currentlyPulsingObject.set("dirty", true);
        }

        currentlyPulsingObject = activeObj || null;

        // Setup new object
        if (currentlyPulsingObject) {
          savedSelectionShadow = currentlyPulsingObject.shadow || null;
        }
      }

      // Animate current object
      if (currentlyPulsingObject) {
        pulsePhase += 0.05;
        const pulseAlpha = 0.5 + Math.sin(pulsePhase) * 0.4; // 0.1 to 0.9 opacity
        const pulseBlur = 25 + Math.sin(pulsePhase) * 15; // 10 to 40 blur radius

        currentlyPulsingObject.set(
          "shadow",
          new fabric.Shadow({
            color: `rgba(109, 40, 217, ${pulseAlpha})`,
            blur: pulseBlur,
            offsetX: 0,
            offsetY: 0,
          }),
        );
        currentlyPulsingObject.set("dirty", true);
        canvas.requestRenderAll();
      }

      animationFrameId = requestAnimationFrame(renderPulse);
    };

    // Start the animation loop
    animationFrameId = requestAnimationFrame(renderPulse);

    const onAfterRender = (opt: { ctx: CanvasRenderingContext2D }) => {
      const ctx = opt.ctx;
      if (!ctx || !currentlyPulsingObject || currentlyPulsingObject !== canvas.getActiveObject()) return;

      ctx.save();

      const vpt = canvas.viewportTransform;
      if (vpt) {
        ctx.transform(vpt[0], vpt[1], vpt[2], vpt[3], vpt[4], vpt[5]);
      }

      const matrix = currentlyPulsingObject.calcTransformMatrix();
      ctx.transform(
        matrix[0],
        matrix[1],
        matrix[2],
        matrix[3],
        matrix[4],
        matrix[5],
      );

      ctx.strokeStyle = "#6D28D9";

      const scaleX = currentlyPulsingObject.scaleX || 1;
      const scaleY = currentlyPulsingObject.scaleY || 1;
      const avgScale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2;
      const zoom = canvas.getZoom();
      ctx.lineWidth = 4 / (avgScale * zoom);

      const w = currentlyPulsingObject.width || 0;
      const h = currentlyPulsingObject.height || 0;
      ctx.strokeRect(-w / 2, -h / 2, w, h);

      ctx.restore();
    };

    canvas.on("mouse:over", handleMouseOver);
    canvas.on("mouse:out", handleMouseOut);
    canvas.on("selection:created", handleSelection);
    canvas.on("selection:updated", handleSelection);
    canvas.on("selection:cleared", handleSelectionCleared);
    canvas.on("after:render", onAfterRender);

    return () => {
      cancelAnimationFrame(animationFrameId);

      if (currentlyPulsingObject) {
        currentlyPulsingObject.set("shadow", savedSelectionShadow);
        currentlyPulsingObject.set("dirty", true);
      }
      canvas.off("mouse:over", handleMouseOver);
      canvas.off("mouse:out", handleMouseOut);
      canvas.off("selection:created", handleSelection);
      canvas.off("selection:updated", handleSelection);
      canvas.off("selection:cleared", handleSelectionCleared);
      canvas.off("after:render", onAfterRender);

      // Cleanup any remaining shadow
      if (hoveredObject) {
        if (originalShadows.has(hoveredObject)) {
          hoveredObject.set(
            "shadow",
            originalShadows.get(hoveredObject) || null,
          );
        } else {
          hoveredObject.set("shadow", null);
        }
        hoveredObject.set("dirty", true);
        canvas.requestRenderAll();
      }
      originalShadows.clear();

      // Restore original object states
      canvas.getObjects().forEach((obj) => {
        const state = originalStates.get(obj);
        if (state) {
          obj.set({
            selectable: state.selectable,
            evented: state.evented,
            locked: state.locked,
            hoverCursor: state.hoverCursor,
            lockMovementX: state.lockMovementX,
            lockMovementY: state.lockMovementY,
            lockScalingX: state.lockScalingX,
            lockScalingY: state.lockScalingY,
            lockRotation: state.lockRotation,
            hasControls: state.hasControls,
          });
        }
      });
      originalStates.clear();
    };
  }, [canvas, canvasMode]);
}
