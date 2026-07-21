function decodeImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not decode the image"));
    image.src = url;
  });
}

export async function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not download the image: ${response.status}`);
  }

  const objectUrl = URL.createObjectURL(await response.blob());
  try {
    return await decodeImage(objectUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error("Could not encode the image as PNG"));
    }, "image/png");
  });
}

export async function renderSquarePng(
  sourceUrl: string,
  size: number,
): Promise<Blob> {
  const image = await loadImageFromUrl(sourceUrl);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable");

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  const scale = Math.min(size / image.naturalWidth, size / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  context.drawImage(
    image,
    (size - width) / 2,
    (size - height) / 2,
    width,
    height,
  );

  return canvasToPng(canvas);
}
