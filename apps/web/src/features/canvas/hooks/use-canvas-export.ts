import * as fabric from "fabric";

export function useCanvasExport(canvas: fabric.Canvas | null) {
  const getExportOptions = (
    format: "png" | "jpeg" | "webp",
    quality?: number,
  ) => {
    if (!canvas) return null;

    const artboard = canvas
      .getObjects()
      .find((o) => (o as any).id === "__artboard__");
    let left, top, width, height;

    if (artboard) {
      left = artboard.left;
      top = artboard.top;
      width = artboard.width! * (artboard.scaleX || 1);
      height = artboard.height! * (artboard.scaleY || 1);
    } else {
      left = 0;
      top = 0;
      width = canvas.width;
      height = canvas.height;
    }

    return {
      format,
      quality: quality || 1,
      left,
      top,
      width,
      height,
      multiplier: 1,
    };
  };

  const prepareForExport = () => {
    if (!canvas) return null;
    const active = canvas.getActiveObjects();
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    return { active };
  };

  const restoreAfterExport = (state: any) => {
    if (!canvas || !state) return;
    if (state.active && state.active.length) {
      if (state.active.length > 1) {
        const sel = new fabric.ActiveSelection(state.active, { canvas });
        canvas.setActiveObject(sel);
      } else if (state.active.length === 1) {
        canvas.setActiveObject(state.active[0]);
      }
      canvas.requestRenderAll();
    }
  };

  const exportToDataUrl = (
    format: "png" | "jpeg" | "webp",
    quality?: number,
  ) => {
    if (!canvas) return "";
    const state = prepareForExport();
    const opts = getExportOptions(format, quality);
    const dataUrl = canvas.toDataURL(opts as any);
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

    const artboard = canvas
      .getObjects()
      .find((o) => (o as any).id === "__artboard__");
    const viewBox = artboard
      ? {
          x: artboard.left || 0,
          y: artboard.top || 0,
          width: artboard.width! * (artboard.scaleX || 1),
          height: artboard.height! * (artboard.scaleY || 1),
        }
      : undefined;

    const svg = canvas.toSVG({ viewBox } as any);
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
