export interface ExactPngSpec {
  width: number;
  height: number;
  maxBytes?: number;
}

export interface ProcessedPngImage {
  data: Uint8Array;
  extension: "png";
  contentType: "image/png";
  width: number;
  height: number;
}

export interface ExactImageProcessor {
  cropToExactPng(
    source: Uint8Array,
    spec: ExactPngSpec,
  ): Promise<ProcessedPngImage>;
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
 * Crops the model-generated PNG before it reaches object storage. Storage
 * remains responsible only for persistence, so ImageKit, R2, or another
 * provider can all serve identical exact-size PNG bytes without URL params.
 */
export class CloudflareExactImageProcessor implements ExactImageProcessor {
  constructor(private readonly images: ImagesBinding) {}

  private async renderPng(
    source: Uint8Array,
    spec: ExactPngSpec,
    quality?: number,
  ): Promise<Uint8Array> {
    const transformed = await this.images
      .input(toReadableStream(source))
      .transform({
        width: spec.width,
        height: spec.height,
        fit: "cover",
        gravity: "center",
      })
      .output({
        format: "image/png",
        ...(quality !== undefined && { quality }),
      });
    const response = transformed.response();
    if (!response.ok) {
      throw new Error(
        `PNG transformation failed with status ${response.status}`,
      );
    }
    return new Uint8Array(await response.arrayBuffer());
  }

  async cropToExactPng(
    source: Uint8Array,
    spec: ExactPngSpec,
  ): Promise<ProcessedPngImage> {
    if (!Number.isInteger(spec.width) || spec.width < 1) {
      throw new Error(`Invalid image width: ${spec.width}`);
    }
    if (!Number.isInteger(spec.height) || spec.height < 1) {
      throw new Error(`Invalid image height: ${spec.height}`);
    }

    let data = await this.renderPng(source, spec);
    // Preserve lossless PNG whenever possible, then progressively quantize
    // only when a destination declares a strict upload limit.
    if (spec.maxBytes !== undefined) {
      for (const quality of [90, 80, 70, 60]) {
        if (data.byteLength <= spec.maxBytes) break;
        data = await this.renderPng(source, spec, quality);
      }
    }
    if (spec.maxBytes !== undefined && data.byteLength > spec.maxBytes) {
      throw new Error(
        `PNG output is ${data.byteLength} bytes and exceeds the ${spec.maxBytes}-byte limit`,
      );
    }

    const info = await this.images.info(toReadableStream(data));
    if (
      !("width" in info) ||
      info.width !== spec.width ||
      info.height !== spec.height
    ) {
      throw new Error(
        `PNG transformation returned ${"width" in info ? `${info.width}x${info.height}` : info.format}; expected ${spec.width}x${spec.height}`,
      );
    }

    return {
      data,
      extension: "png",
      contentType: "image/png",
      width: info.width,
      height: info.height,
    };
  }
}
