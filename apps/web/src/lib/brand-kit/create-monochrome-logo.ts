import { canvasToPng, loadImageFromUrl } from "@/lib/image-processing";

/** Creates a standalone grayscale PNG while preserving the source alpha. */
export async function createMonochromeLogoPng(
  sourceUrl: string,
): Promise<Blob> {
  const image = await loadImageFromUrl(sourceUrl);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas is unavailable");

  context.drawImage(image, 0, 0);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;

  for (let index = 0; index < pixels.length; index += 4) {
    const luminance = Math.round(
      pixels[index] * 0.2126 +
        pixels[index + 1] * 0.7152 +
        pixels[index + 2] * 0.0722,
    );
    pixels[index] = luminance;
    pixels[index + 1] = luminance;
    pixels[index + 2] = luminance;
  }

  context.putImageData(imageData, 0, 0);
  return canvasToPng(canvas);
}
