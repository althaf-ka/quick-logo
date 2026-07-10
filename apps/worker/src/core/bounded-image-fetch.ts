const DEFAULT_MAX_IMAGE_BYTES = 12 * 1024 * 1024;

export interface FetchedImage {
  bytes: Uint8Array;
  mimeType: string;
}

export async function fetchImageWithLimit(
  url: string,
  maxBytes = DEFAULT_MAX_IMAGE_BYTES,
): Promise<FetchedImage> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to fetch image (${response.status})`);
  }

  const mimeType = response.headers.get("content-type") || "image/png";
  if (!mimeType.startsWith("image/")) {
    throw new Error(`Expected an image response, received ${mimeType}`);
  }
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > maxBytes) {
    throw new Error("Remote image exceeds the maximum supported size");
  }
  if (!response.body) {
    throw new Error("Remote image response has no body");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel("Image size limit exceeded");
        throw new Error("Remote image exceeds the maximum supported size");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { bytes, mimeType };
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 8192;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

export async function fetchImageAsDataUrl(
  url: string,
  maxBytes = DEFAULT_MAX_IMAGE_BYTES,
): Promise<string> {
  const { bytes, mimeType } = await fetchImageWithLimit(url, maxBytes);
  return `data:${mimeType};base64,${bytesToBase64(bytes)}`;
}
