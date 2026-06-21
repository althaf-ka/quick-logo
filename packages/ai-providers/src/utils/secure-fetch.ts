export async function secureFetchImage(url: string): Promise<ArrayBuffer> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("Invalid reference image URL format");
  }

  if (parsedUrl.protocol !== "https:") {
    throw new Error("Reference image URL must use HTTPS");
  }

  const hostname = parsedUrl.hostname;
  if (
    hostname === "localhost" ||
    hostname.startsWith("127.") ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./) ||
    hostname.endsWith(".local")
  ) {
    throw new Error("Local or private network IPs are not allowed");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  let res;
  try {
    res = await fetch(parsedUrl.toString(), {
      method: "GET",
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timeoutId);
    throw new Error("Failed to fetch reference image");
  }
  clearTimeout(timeoutId);

  if (!res.ok) {
    throw new Error(`Reference image fetch failed (${res.status})`);
  }

  const contentType = res.headers.get("content-type");
  if (!contentType?.startsWith("image/")) {
    throw new Error("URL does not point to a valid image");
  }

  const contentLength = res.headers.get("content-length");
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (contentLength && parseInt(contentLength, 10) > MAX_SIZE) {
    throw new Error("Reference image exceeds maximum allowed size (10MB)");
  }

  const buffer = await res.arrayBuffer();
  if (buffer.byteLength > MAX_SIZE) {
    throw new Error("Downloaded image exceeds maximum allowed size (10MB)");
  }

  return buffer;
}
