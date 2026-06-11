import { useEffect } from "react";
import * as fabric from "fabric";
import { useCanvasStore } from "../store/canvas-store";

export function useImproveHover(canvas: fabric.Canvas | null) {
  const { canvasMode } = useCanvasStore();

  useEffect(() => {
    if (!canvas) return;

    if (canvasMode !== "img2img") return;

    let hoveredObject: fabric.Object | null = null;
    const originalShadows = new Map<fabric.Object, fabric.Shadow | null>();

    const handleMouseOver = (opt: any) => {
      const target = opt.target;
      if (target && target.id !== "__artboard__" && !target.get("locked")) {
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

    const handleMouseOut = (opt: any) => {
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

    // Pre-set hoverCursor for all objects
    canvas.getObjects().forEach((obj) => {
      if (!obj.get("locked") && (obj as any).id !== "__artboard__") {
        obj.set("hoverCursor", "pointer");
      }
    });

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

    canvas.on("mouse:over", handleMouseOver);
    canvas.on("mouse:out", handleMouseOut);
    canvas.on("selection:created", handleSelection);
    canvas.on("selection:updated", handleSelection);

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

      // Restore hoverCursor
      canvas.getObjects().forEach((obj) => {
        if (!obj.get("locked") && (obj as any).id !== "__artboard__") {
          obj.set("hoverCursor", "move");
        }
      });
    };
  }, [canvas, canvasMode]);
}
