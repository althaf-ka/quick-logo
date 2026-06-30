import { useEffect, useRef } from "react";
import * as fabric from "fabric";
import { useCanvasStore } from "../store/canvas-store";
import { useCanvasTools } from "../hooks/use-canvas-tools";
import { useCanvasHistory } from "../hooks/use-canvas-history";
import { findArtboard } from "../utils/artboard";
import {
  restoreCustomProperties,
  type CustomFabricObject,
  FABRIC_CUSTOM_PROPERTIES,
} from "../utils/fabric-properties";
import { decompressCanvasState } from "../utils/canvas-compression";

export interface CanvasViewportProps {
  canvas: fabric.Canvas | null;
  setCanvas: (canvas: fabric.Canvas | null) => void;
  initialImageUrl?: string;
  initialCanvasState?: string | null;
  imageId: string;
}

async function loadCanvasState(
  fabricCanvas: fabric.Canvas,
  stateToLoad: string,
  containerRef: React.RefObject<HTMLDivElement | null>,
  setCanvasDimensions: (w: number, h: number) => void,
  centerArtboard: () => void,
) {
  try {
    const jsonStr = decompressCanvasState(stateToLoad);
    const parsedState = JSON.parse(jsonStr);

    delete parsedState.viewportTransform;

    const customPropsSnapshot = (parsedState.objects || []).map(
      (o: Record<string, unknown>) => {
        const snap: Record<string, unknown> = {};
        FABRIC_CUSTOM_PROPERTIES.forEach((prop) => {
          snap[prop] = o[prop];
        });
        snap.type = o.type;
        snap.left = o.left;
        snap.top = o.top;
        return snap;
      },
    );

    await fabricCanvas.loadFromJSON(parsedState);

    const objects = fabricCanvas.getObjects();

    restoreCustomProperties(fabricCanvas, { objects: customPropsSnapshot });

    const hasArtboard = objects.some((o) => o.id === "__artboard__");
    if (!hasArtboard) {
      const savedArtboard = customPropsSnapshot.find(
        (o: {
          id?: string;
          name?: string;
          type?: string;
          left?: number;
          top?: number;
        }) => o.id === "__artboard__" || o.name === "Artboard",
      );
      if (savedArtboard) {
        const match = objects.find(
          (o) =>
            o.type === (savedArtboard.type || "rect") &&
            Math.abs((o.left || 0) - (savedArtboard.left || 0)) < 1 &&
            Math.abs((o.top || 0) - (savedArtboard.top || 0)) < 1,
        );
        if (match) {
          const customMatch = match as CustomFabricObject;
          customMatch.id = "__artboard__";
          customMatch.name = "Artboard";
          customMatch.selectable = false;
          customMatch.evented = false;
          customMatch.hoverCursor = "default";
        }
      } else {
        const match = objects.find(
          (o) => o.type === "rect" || o.type === "Rect",
        );
        if (match && objects.indexOf(match) === 0) {
          const customMatch = match as CustomFabricObject;
          customMatch.id = "__artboard__";
          customMatch.name = "Artboard";
          customMatch.selectable = false;
          customMatch.evented = false;
          customMatch.hoverCursor = "default";
        }
      }
    }

    if (containerRef.current) {
      fabricCanvas.setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
    }

    fabricCanvas.renderAll();

    const artboard = findArtboard(fabricCanvas);
    if (artboard) {
      setCanvasDimensions(
        artboard.width! * (artboard.scaleX || 1),
        artboard.height! * (artboard.scaleY || 1),
      );
    }

    centerArtboard();

    setTimeout(
      () => window.dispatchEvent(new CustomEvent("canvas:loaded")),
      100,
    );

    setTimeout(() => {
      if (containerRef.current) {
        fabricCanvas.setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
      centerArtboard();
    }, 300);

    return true;
  } catch (e) {
    console.error("Failed to load canvas state", e);
    return false;
  }
}

async function loadSourceImage(
  fabricCanvas: fabric.Canvas,
  imageUrl: string,
  setCanvasDimensions: (w: number, h: number) => void,
  centerArtboard: () => void,
) {
  const fabricAny = fabric as Record<string, unknown>;
  const FabricImageClass = (fabricAny.FabricImage ||
    fabricAny.Image) as typeof fabric.FabricImage;
  try {
    const img = (await FabricImageClass.fromURL(imageUrl, {
      crossOrigin: "anonymous",
    })) as fabric.FabricImage;
    const width = img.width || 1024;
    const height = img.height || 1024;

    const artboard = new fabric.Rect({
      originX: "left",
      originY: "top",
      left: 0,
      top: 0,
      width,
      height,
      fill: "#ffffff",
      selectable: false,
      evented: false,
      hoverCursor: "default",
    });
    artboard.id = "__artboard__";
    artboard.name = "Artboard";

    const imgWidth = img.width || 1;
    const imgHeight = img.height || 1;
    const imgScaleX = width / imgWidth;
    const imgScaleY = height / imgHeight;
    const imgScale = Math.min(imgScaleX, imgScaleY, 1);

    img.set({
      originX: "left",
      originY: "top",
      left: artboard.left! + (width - imgWidth * imgScale) / 2,
      top: artboard.top! + (height - imgHeight * imgScale) / 2,
      scaleX: imgScale,
      scaleY: imgScale,
      selectable: false,
      evented: true,
      locked: true,
      hoverCursor: "default",
    });
    img.id = "obj_initial_image";
    img.name = "Source Image";

    fabricCanvas.add(artboard);
    fabricCanvas.add(img);

    setCanvasDimensions(width, height);
    centerArtboard();

    window.dispatchEvent(new CustomEvent("canvas:loaded"));
    return true;
  } catch (e) {
    console.error("Failed to load initial image", e);
    window.dispatchEvent(new CustomEvent("canvas:loaded"));
    return false;
  }
}

export function CanvasViewport({
  canvas,
  setCanvas,
  initialImageUrl,
  initialCanvasState,
  imageId,
}: CanvasViewportProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const setCanvasDimensions = useCanvasStore((s) => s.setCanvasDimensions);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      backgroundColor: "#09090b", // zinc-950/900
      preserveObjectStacking: true,
      selection: true,
    });

    setCanvas(fabricCanvas);

    // Flag to prevent ResizeObserver from overriding centering during initial async load
    let initialLoadDone = false;

    // Helper: center the artboard in the viewport
    const centerArtboard = () => {
      const artboard = findArtboard(fabricCanvas);

      let artWidth: number;
      let artHeight: number;

      if (artboard) {
        artWidth = artboard.width! * (artboard.scaleX || 1);
        artHeight = artboard.height! * (artboard.scaleY || 1);
      } else {
        // Fallback: use store dimensions (always set on initial load)
        const store = useCanvasStore.getState();
        artWidth = store.canvasWidth || 1024;
        artHeight = store.canvasHeight || 1024;
        console.warn(
          "[QuickLogo] Artboard not found, using store dimensions for centering:",
          artWidth,
          "x",
          artHeight,
        );
      }

      const paddingTop = 60;
      const paddingBottom = 160; // Extra space for the floating AI prompt box
      const paddingX = 60;
      const currentW = fabricCanvas.width!;
      const currentH = fabricCanvas.height!;

      if (currentW <= 0 || currentH <= 0) {
        console.warn(
          "[QuickLogo] Canvas has zero dimensions, skipping center:",
          currentW,
          "x",
          currentH,
        );
        return;
      }

      const scaleX = (currentW - paddingX * 2) / artWidth;
      const scaleY = (currentH - (paddingTop + paddingBottom)) / artHeight;
      const scale = Math.min(scaleX, scaleY, 1);

      const topOffset =
        paddingTop +
        (currentH - paddingTop - paddingBottom - artHeight * scale) / 2;

      fabricCanvas.setViewportTransform([
        scale,
        0,
        0,
        scale,
        currentW / 2 - (artWidth * scale) / 2,
        topOffset,
      ]);
      fabricCanvas.renderAll();
    };

    // Debounce resize to avoid flash during sidebar collapse/expand animation (200ms CSS transition)
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width <= 0 || height <= 0) return;

        // Immediately update canvas size so it doesn't show a gap
        fabricCanvas.setDimensions({ width, height });

        // CRITICAL: Skip recenter until the initial async load has completed.
        // Otherwise the ResizeObserver fires before objects exist (or right after
        // centering) and overrides the viewport transform with a stale calculation.
        if (!initialLoadDone) return;

        // Debounce the viewport transform recalculation to after the CSS transition ends
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          centerArtboard();
        }, 250);
      }
    });

    resizeObserver.observe(containerRef.current);

    let isDisposed = false;

    const initializeCanvas = async () => {
      const localStateStr = localStorage.getItem(`quicklogo_canvas_${imageId}`);
      const stateToLoad = localStateStr || initialCanvasState;

      if (stateToLoad) {
        const success = await loadCanvasState(
          fabricCanvas,
          stateToLoad,
          containerRef,
          setCanvasDimensions,
          centerArtboard,
        );
        if (isDisposed) return;
        if (success) {
          initialLoadDone = true;
          return;
        }
      }

      if (!initialImageUrl) {
        if (isDisposed) return;
        initialLoadDone = true;
        window.dispatchEvent(new CustomEvent("canvas:loaded"));
        return;
      }

      await loadSourceImage(
        fabricCanvas,
        initialImageUrl,
        setCanvasDimensions,
        centerArtboard,
      );
      if (isDisposed) return;
      initialLoadDone = true;
    };

    initializeCanvas();

    return () => {
      isDisposed = true;
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeObserver.disconnect();
      fabricCanvas.dispose();
      setCanvas(null);
    };
  }, [
    initialImageUrl,
    initialCanvasState,
    imageId,
    setCanvas,
    setCanvasDimensions,
  ]);

  // Connect hooks
  useCanvasTools(canvas);
  useCanvasHistory(canvas);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-zinc-950"
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
