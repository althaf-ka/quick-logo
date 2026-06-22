import * as fabric from "fabric";

/**
 * Converts mask overlay canvas strokes into a binary mask PNG.
 * White pixels = area to regenerate (standard polarity)
 * Black pixels = area to keep
 *
 * @param maskCanvas - The overlay fabric canvas with mask strokes
 * @param artboardBounds - Position/size of the artboard in canvas space (after viewport reset)
 * @returns PNG data URL of the binary mask
 */
export function exportMaskToPng(
  maskCanvas: fabric.Canvas,
  artboardBounds: { left: number; top: number; width: number; height: number },
): string {
  const originalVpt = maskCanvas.viewportTransform
    ? [...maskCanvas.viewportTransform]
    : null;

  // Save original stroke settings to revert after export
  const originalStrokes = maskCanvas.getObjects().map((obj) => ({
    obj,
    stroke: obj.stroke,
    opacity: obj.opacity,
  }));

  // Temporarily set all mask paths to pure white and fully opaque
  // This ensures a clean binary mask regardless of brush color/opacity
  originalStrokes.forEach(({ obj }) => {
    obj.set({
      stroke: "#ffffff",
      opacity: 1,
    });
  });

  // Reset viewport so canvas-space coordinates align with pixel positions
  maskCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);

  // Set background to black temporarily
  const originalBg = maskCanvas.backgroundColor;
  maskCanvas.backgroundColor = "#000000";
  maskCanvas.renderAll();

  // Export cropped to artboard bounds — produces a mask matching the canvas image dimensions
  const dataUrl = maskCanvas.toDataURL({
    format: "png",
    left: artboardBounds.left,
    top: artboardBounds.top,
    width: artboardBounds.width,
    height: artboardBounds.height,
    multiplier: 1,
  });

  // Restore original strokes and background before returning
  maskCanvas.backgroundColor = originalBg;
  if (originalVpt) {
    maskCanvas.setViewportTransform(originalVpt as fabric.TMat2D);
  }
  originalStrokes.forEach(({ obj, stroke, opacity }) => {
    obj.set({ stroke, opacity });
  });
  maskCanvas.renderAll();

  return dataUrl;
}

export function dataUrlToFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(",");
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/png";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

/**
 * Converts mask data URL to a File object for upload.
 */
export function maskDataUrlToFile(dataUrl: string): File {
  return dataUrlToFile(dataUrl, `mask-${Date.now()}.png`);
}

/**
 * Inverts a binary mask data URL (swaps black and white).
 * Required because some models (like Ideogram) expect inverted polarity
 * (Black = inpaint, White = keep) compared to standard masks.
 */
export async function invertMaskDataUrl(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Failed to get canvas 2d context"));

      // Fill with white
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Difference blend mode against white will exactly invert the original image
      ctx.globalCompositeOperation = "difference";
      ctx.drawImage(img, 0, 0);

      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}
