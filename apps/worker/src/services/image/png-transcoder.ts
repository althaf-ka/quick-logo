const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10] as const;

function isPng(data: Uint8Array): boolean {
  return PNG_SIGNATURE.every((byte, index) => data[index] === byte);
}

function toReadableStream(data: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(data);
      controller.close();
    },
  });
}

/**
 * Guarantees actual PNG bytes while preserving the model's canvas and
 * composition. This is format conversion only: no crop or resize is applied.
 */
export async function ensurePng(
  images: ImagesBinding,
  source: Uint8Array,
): Promise<Uint8Array> {
  if (isPng(source)) return source;

  const response = (
    await images.input(toReadableStream(source)).output({ format: "image/png" })
  ).response();
  if (!response.ok) {
    throw new Error(`PNG conversion failed with status ${response.status}`);
  }

  const png = new Uint8Array(await response.arrayBuffer());
  if (!isPng(png)) {
    throw new Error("PNG conversion returned bytes in an unexpected format");
  }
  return png;
}
