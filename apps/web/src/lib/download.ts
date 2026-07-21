import { renderSquarePng } from "@/lib/image-processing";

export interface DownloadImageOptions {
  filename?: string;
}

function downloadBlob(blob: Blob, filename: string): void {
  const blobUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(blobUrl);
}

function resolveFilename(
  url: string,
  filenameOrOptions?: string | DownloadImageOptions,
): string {
  if (typeof filenameOrOptions === "string" && filenameOrOptions.trim()) {
    return filenameOrOptions;
  }

  if (
    typeof filenameOrOptions === "object" &&
    filenameOrOptions?.filename?.trim()
  ) {
    return filenameOrOptions.filename;
  }

  try {
    const pathname = new URL(url).pathname;
    const last = pathname.split("/").pop();
    if (last) {
      return decodeURIComponent(last);
    }
  } catch {
    // Fall back below when URL parsing fails.
  }

  return "download.png";
}

export async function downloadImage(
  url: string,
  filenameOrOptions?: string | DownloadImageOptions,
): Promise<void> {
  const filename = resolveFilename(url, filenameOrOptions);

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Network response was not ok");

    const blob = await response.blob();
    downloadBlob(blob, filename);
  } catch (error) {
    console.error("Download failed:", error);

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.target = "_blank";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }
}

export async function downloadSquarePng(
  url: string,
  size: number,
  filename: string,
): Promise<void> {
  const blob = await renderSquarePng(url, size);
  downloadBlob(blob, filename);
}
