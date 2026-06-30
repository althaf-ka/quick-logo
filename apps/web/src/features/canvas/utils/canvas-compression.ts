import * as fflate from "fflate";

/**
 * Compresses a JSON string representing the canvas state into a base64 string
 */
export function compressCanvasState(jsonStr: string): string {
  try {
    const uint8 = fflate.strToU8(jsonStr);
    const compressed = fflate.zlibSync(uint8, { level: 9 });

    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < compressed.length; i += chunkSize) {
      binary += String.fromCharCode.apply(
        null,
        compressed.subarray(i, i + chunkSize) as unknown as number[],
      );
    }
    return btoa(binary);
  } catch (error) {
    console.error("Failed to compress canvas state", error);
    return jsonStr;
  }
}

/**
 * Decompresses a base64 string back into a JSON string.
 * If the string starts with '{', it's assumed to be uncompressed (backward compatibility).
 */
export function decompressCanvasState(stateStr: string): string {
  if (!stateStr) return stateStr;

  if (stateStr.trim().startsWith("{")) {
    return stateStr;
  }

  try {
    const binary = atob(stateStr);
    const compressed = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      compressed[i] = binary.charCodeAt(i);
    }
    const decompressed = fflate.unzlibSync(compressed);
    return fflate.strFromU8(decompressed);
  } catch (error) {
    console.error("Failed to decompress canvas state", error);
    return stateStr;
  }
}
