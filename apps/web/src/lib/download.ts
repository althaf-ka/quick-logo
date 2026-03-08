export interface DownloadImageOptions {
  filename?: string;
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
    const blobUrl = window.URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(blobUrl);
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
