import * as fabric from "fabric";
import { useCanvasStore } from "../store/canvas-store";
import { findArtboard } from "../utils/artboard";

export function useCanvasExport(canvas: fabric.Canvas | null) {


  const prepareForExport = () => {
    if (!canvas) return null;
    const active = canvas.getActiveObjects();
    canvas.discardActiveObject();
    
    // Save current viewport transform and reset it so absolute coordinates align perfectly
    const vpt = canvas.viewportTransform ? [...canvas.viewportTransform] : null;
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    
    // CRITICAL: Must be a synchronous render! requestRenderAll is async and toDataURL will run before it paints!
    canvas.renderAll();
    return { active, vpt };
  };

  const restoreAfterExport = (state: { active: fabric.Object[], vpt: number[] | null } | null) => {
    if (!canvas || !state) return;
    if (state.vpt) {
      canvas.setViewportTransform(state.vpt as fabric.TMat2D);
    }

    if (state.active && state.active.length) {
      if (state.active.length > 1) {
        const sel = new fabric.ActiveSelection(state.active, { canvas });
        canvas.setActiveObject(sel);
      } else if (state.active.length === 1) {
        canvas.setActiveObject(state.active[0]);
      }
    }
    
    // CRITICAL: Synchronously restore so the user doesn't see a flicker
    canvas.renderAll();
  };

  const exportToDataUrl = (
    format: "png" | "jpeg" | "webp",
    quality?: number,
  ) => {
    if (!canvas) return "";
    const state = prepareForExport();
    
    const artboard = findArtboard(canvas);
         
    let left = 0;
    let top = 0;
    let width = canvas.width || 1024;
    let height = canvas.height || 1024;

    if (artboard) {
      left = artboard.left || 0;
      top = artboard.top || 0;
      width = artboard.width! * (artboard.scaleX || 1);
      height = artboard.height! * (artboard.scaleY || 1);
    } else {
      const store = useCanvasStore.getState();
      width = store.canvasWidth || 1024;
      height = store.canvasHeight || 1024;
    }

    const opts = {
      format,
      quality: quality || 1,
      left,
      top,
      width,
      height,
      multiplier: 1, // Generates an off-screen canvas at perfect 1:1 quality
    };

    // Use Fabric's native exporter instead of the DOM element
    // This fixes the "downgraded quality" bug because the DOM element is restricted 
    // by CSS screen size, whereas toDataURL renders vectors at maximum flawless resolution!
    const dataUrl = canvas.toDataURL(opts);

    restoreAfterExport(state);
    return dataUrl;
  };

  const exportToPng = async () =>
    await fetch(exportToDataUrl("png")).then((res) => res.blob());
  const exportToJpeg = async (quality = 0.92) =>
    await fetch(exportToDataUrl("jpeg", quality)).then((res) => res.blob());
  const exportToWebp = async (quality = 0.92) =>
    await fetch(exportToDataUrl("webp", quality)).then((res) => res.blob());

  const exportToSvg = () => {
    if (!canvas) return "";
    const state = prepareForExport();

    const artboard = findArtboard(canvas);
    const viewBox = artboard
      ? {
          x: artboard.left || 0,
          y: artboard.top || 0,
          width: artboard.width! * (artboard.scaleX || 1),
          height: artboard.height! * (artboard.scaleY || 1),
        }
      : undefined;

    const svg = canvas.toSVG({ viewBox } as fabric.TSVGExportOptions);
    restoreAfterExport(state);
    return svg;
  };

  return {
    exportToPng,
    exportToJpeg,
    exportToWebp,
    exportToSvg,
    exportToDataUrl,
  };
}
