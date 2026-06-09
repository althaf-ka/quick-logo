import * as fabric from "fabric";

/**
 * Converts mask overlay canvas strokes into a binary mask PNG.
 * White pixels = area to regenerate
 * Black pixels = area to keep
 *
 * @param maskCanvas - The overlay fabric canvas with mask strokes
 * @param artboardBounds - Position/size of the artboard in viewport space (or canvas space)
 * @param artboardSize - The actual artboard dimensions (width x height)
 * @returns PNG data URL of the binary mask
 */
export function exportMaskToPng(
  maskCanvas: fabric.Canvas,
  artboardBounds: { left: number; top: number; width: number; height: number },
  artboardSize: { width: number; height: number },
): string {
  // Save original stroke settings to revert after export
  const originalStrokes = maskCanvas.getObjects().map((obj) => ({
    obj,
    stroke: obj.stroke,
    opacity: obj.opacity,
  }));

  // Temporarily set all mask paths to pure white and fully opaque
  originalStrokes.forEach(({ obj }) => {
    obj.set({
      stroke: "#ffffff",
      opacity: 1,
    });
  });
  maskCanvas.requestRenderAll();

  // Set background to black temporarily
  const originalBg = maskCanvas.backgroundColor;
  maskCanvas.backgroundColor = "#000000";
  maskCanvas.requestRenderAll();

  // Export cropped to artboard bounds
  const dataUrl = maskCanvas.toDataURL({
    format: "png",
    left: artboardBounds.left,
    top: artboardBounds.top,
    width: artboardSize.width,
    height: artboardSize.height,
    multiplier: 1,
  });

  // Restore original strokes and background before returning
  maskCanvas.backgroundColor = originalBg;
  originalStrokes.forEach(({ obj, stroke, opacity }) => {
    obj.set({ stroke, opacity });
  });
  maskCanvas.requestRenderAll();

  return dataUrl;
}

/**
 * Converts mask data URL to a File object for upload.
 */
export function maskDataUrlToFile(dataUrl: string): File {
  const arr = dataUrl.split(",");
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/png";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], `mask-${Date.now()}.png`, { type: mime });
}
