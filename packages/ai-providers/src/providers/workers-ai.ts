import { Buffer } from "node:buffer";
import { createLogger } from "@quicklogo/server-telemetry";
import type { AIProvider, GenerationParams, GenerationResult } from "../types";
import { secureFetchImage } from "../utils/secure-fetch";

const logger = createLogger("ai-providers");

export class WorkersAIProvider implements AIProvider {
  readonly name = "workers-ai";

  constructor(
    private ai: Ai,
    private inputType: "json" | "multipart",
  ) {}

  async generate(params: GenerationParams): Promise<GenerationResult> {
    const start = Date.now();

    try {
      const raw =
        this.inputType === "multipart"
          ? await this.runMultipart(params)
          : await this.runJson(params);

      const imageData = await this.toUint8Array(raw);
      const format = this.detectFormat(imageData);

      return {
        success: true,
        imageData,
        format,
        metadata: { model: params.backendModel, duration: Date.now() - start },
      };
    } catch (error) {
      logger.error("Generation failed", error, { model: params.backendModel });
      const status = (error as { status?: number }).status;
      const isRetryable = status ? status === 429 || status >= 500 : true;

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Workers AI generation failed",
        isRetryable,
        metadata: { model: params.backendModel, duration: Date.now() - start },
      };
    }
  }

  private async runJson(params: GenerationParams) {
    const input: Record<string, unknown> = {
      prompt: params.prompt,
      num_steps: params.steps ?? 20,
      width: params.width ?? 1024,
      height: params.height ?? 1024,
    };

    if (params.negativePrompt) input.negative_prompt = params.negativePrompt;
    if (params.guidance != null) input.guidance = params.guidance;

    if (params.referenceImage) {
      const buffer = await secureFetchImage(params.referenceImage);
      input.image = [...new Uint8Array(buffer)];
      input.strength = (params.referenceStrength ?? 50) / 100;
    }

    return this.ai.run(params.backendModel as Parameters<Ai["run"]>[0], input);
  }

  private async runMultipart(params: GenerationParams) {
    const form = new FormData();

    form.append("prompt", params.prompt);
    form.append("width", String(params.width ?? 1024));
    form.append("height", String(params.height ?? 1024));

    if (params.negativePrompt)
      form.append("negative_prompt", params.negativePrompt);
    if (params.steps != null) form.append("num_steps", String(params.steps));
    if (params.guidance != null)
      form.append("guidance", String(params.guidance));

    if (params.referenceImage) {
      const buffer = await secureFetchImage(params.referenceImage);
      const uint8Buffer = new Uint8Array(buffer);
      const format = this.detectFormat(uint8Buffer);
      let mimeType = "image/png";
      if (format === "jpeg") mimeType = "image/jpeg";
      if (format === "webp") mimeType = "image/webp";

      form.append(
        "input_image_0",
        new Blob([uint8Buffer], { type: mimeType }),
        `reference.${format}`,
      );
    }

    const envelope = new Response(form);

    return this.ai.run(params.backendModel as Parameters<Ai["run"]>[0], {
      multipart: {
        body: envelope.body!,
        contentType: envelope.headers.get("content-type")!,
      },
    });
  }

  private async toUint8Array(response: unknown): Promise<Uint8Array> {
    if (
      typeof response === "object" &&
      response !== null &&
      "image" in response &&
      typeof (response as { image: unknown }).image === "string"
    ) {
      return new Uint8Array(
        Buffer.from((response as { image: string }).image, "base64"),
      );
    }
    if (response instanceof ReadableStream) {
      return new Uint8Array(await new Response(response).arrayBuffer());
    }
    if (response instanceof ArrayBuffer) {
      return new Uint8Array(response);
    }
    if (response instanceof Uint8Array) {
      return response;
    }
    throw new Error(`Unexpected Workers AI response type: ${typeof response}`);
  }

  private detectFormat(bytes: Uint8Array): "png" | "jpeg" | "webp" {
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e) {
      return "png";
    }
    if (bytes[0] === 0xff && bytes[1] === 0xd8) {
      return "jpeg";
    }
    if (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    ) {
      return "webp";
    }
    return "png";
  }
}
