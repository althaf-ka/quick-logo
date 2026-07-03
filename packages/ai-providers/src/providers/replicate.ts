import Replicate, { type Prediction } from "replicate";
import type { AIProvider, GenerationParams, GenerationResult } from "../types";
import { createLogger } from "@quicklogo/server-telemetry";
import { REPLICATE_ADAPTERS } from "../adapters";
import {
  REPLICATE_MODELS,
  MODEL_CAPABILITIES,
  type ModelCapability,
} from "./models";

export { REPLICATE_MODELS };

const logger = createLogger("ai-providers");

class ReplicateParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReplicateParseError";
  }
}

interface AspectRatioEntry {
  readonly ratio: number;
  readonly label: string;
}

const ASPECT_RATIOS: readonly AspectRatioEntry[] = [
  { ratio: 21 / 9, label: "21:9" },
  { ratio: 16 / 9, label: "16:9" },
  { ratio: 3 / 2, label: "3:2" },
  { ratio: 4 / 3, label: "4:3" },
  { ratio: 5 / 4, label: "5:4" },
  { ratio: 1, label: "1:1" },
  { ratio: 4 / 5, label: "4:5" },
  { ratio: 3 / 4, label: "3:4" },
  { ratio: 2 / 3, label: "2:3" },
  { ratio: 9 / 16, label: "9:16" },
  { ratio: 9 / 21, label: "9:21" },
] as const;

export class ReplicateProvider implements AIProvider {
  readonly name = "replicate";
  private readonly client: Replicate;

  constructor(apiToken: string) {
    this.client = new Replicate({
      auth: apiToken,
      useFileOutput: true,
    });
  }

  private getAspectRatio(width: number, height: number): string {
    const targetRatio = width / height;
    let closestLabel = "1:1";
    let minDiff = Infinity;

    for (const entry of ASPECT_RATIOS) {
      const diff = Math.abs(targetRatio - entry.ratio);
      if (diff < minDiff) {
        minDiff = diff;
        closestLabel = entry.label;
      }
    }
    return closestLabel;
  }

  private buildModelInput(params: GenerationParams): Record<string, unknown> {
    const model = params.backendModel;
    const caps = MODEL_CAPABILITIES[model];
    const input: Record<string, unknown> = {
      prompt: params.prompt,
    };

    if (!caps) {
      logger.warn(
        `[Replicate] No capability map for model "${model}" — sending prompt only`,
      );
      return input;
    }

    if (caps.aspectRatio && params.width && params.height) {
      input.aspect_ratio = this.getAspectRatio(params.width, params.height);
    }

    if (caps.defaultOutputFormat) {
      input.output_format = caps.defaultOutputFormat;
    }

    this.applyModelSpecificParams(model, input, params);
    this.applyReferenceImage(model, caps, input, params);

    if (params.providerOptions) {
      const options = { ...params.providerOptions };
      delete options.nativeStyle;
      Object.assign(input, options);
    }

    return input;
  }

  private applyModelSpecificParams(
    model: string,
    input: Record<string, unknown>,
    params: GenerationParams,
  ): void {
    const adapter = REPLICATE_ADAPTERS[model];
    if (adapter) {
      adapter.applyParams(input, params);
    }
  }

  private applyReferenceImage(
    model: string,
    caps: ModelCapability,
    input: Record<string, unknown>,
    params: GenerationParams,
  ): void {
    const mode = params.canvasMode;
    const strategy = caps.editingStrategy;

    if (!strategy) return;
    if (mode === "img2img" && !strategy.type.startsWith("remix")) return;
    if (mode === "inpaint" && strategy.type !== "inpaint-with-mask") return;
    if (mode !== "inpaint" && mode !== "img2img") return;

    switch (strategy.type) {
      case "inpaint-with-mask": {
        if (mode === "inpaint" && params.canvasImage && params.maskImage) {
          input[strategy.imageField] = params.canvasImage;
          input[strategy.maskField] = params.maskImage;
          delete input.aspect_ratio;
        }
        break;
      }
      case "remix-image":
      case "remix-image-array": {
        const refUrl = params.referenceImage || params.canvasImage;
        if (refUrl) {
          if (strategy.type === "remix-image-array") {
            input[strategy.imageField] = [refUrl];
          } else {
            input[strategy.imageField] = refUrl;
          }
        }

        if (
          model === REPLICATE_MODELS.SEEDREAM &&
          params.width &&
          params.height
        ) {
          input.size = "custom";
          input.width = params.width;
          input.height = params.height;
          delete input.aspect_ratio;
        }

        if (model === REPLICATE_MODELS.FLUX_KONTEXT && params.referenceImage) {
          input.aspect_ratio = "match_input_image";
        }
        break;
      }
    }
  }

  private async extractImage(
    output: unknown,
  ): Promise<{ imageData: Uint8Array; format: GenerationResult["format"] }> {
    let fileOutput: unknown;
    if (Array.isArray(output)) {
      fileOutput = output[0];
    } else {
      fileOutput = output;
    }

    if (!fileOutput) {
      throw new ReplicateParseError(
        `Replicate returned empty output: ${JSON.stringify(output)}`,
      );
    }

    if (this.isFileOutput(fileOutput)) {
      const blob = await fileOutput.blob();
      const format = this.formatFromMime(blob.type);
      const buffer = await blob.arrayBuffer();
      return { imageData: new Uint8Array(buffer), format };
    }

    if (typeof fileOutput === "string" && fileOutput.startsWith("http")) {
      return this.downloadImage(fileOutput);
    }

    throw new ReplicateParseError(
      `Unexpected output type from Replicate: typeof=${typeof fileOutput}, val=${JSON.stringify(
        fileOutput,
      )}`,
    );
  }

  private isFileOutput(
    value: unknown,
  ): value is { blob(): Promise<Blob>; url(): URL } {
    return (
      typeof value === "object" &&
      value !== null &&
      "blob" in value &&
      typeof (value as Record<string, unknown>).blob === "function"
    );
  }

  private async downloadImage(
    url: string,
  ): Promise<{ imageData: Uint8Array; format: GenerationResult["format"] }> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to download image from Replicate: ${response.status}`,
      );
    }

    const contentType = response.headers.get("content-type");
    const format = this.formatFromMime(contentType ?? "");
    const buffer = await response.arrayBuffer();
    return { imageData: new Uint8Array(buffer), format };
  }

  private formatFromMime(
    mime: string,
  ): NonNullable<GenerationResult["format"]> {
    if (mime.includes("png")) return "png";
    if (mime.includes("webp")) return "webp";
    if (mime.includes("jpeg") || mime.includes("jpg")) return "jpeg";
    return "png";
  }

  async generate(params: GenerationParams): Promise<GenerationResult> {
    const start = Date.now();

    try {
      const input = this.buildModelInput(params);

      const identifier = params.backendModel as `${string}/${string}`;
      if (!params.backendModel.includes("/")) {
        throw new Error(
          `Invalid model format "${params.backendModel}" — expected "owner/name"`,
        );
      }

      logger.info("[Replicate] Running model", {
        model: params.backendModel,
        inputKeys: Object.keys(input),
        hasImage: !!(params.referenceImage || params.canvasImage),
      });

      let predictTime: number | undefined;

      const output = await this.client.run(
        identifier,
        {
          input,
        },
        (prediction: Prediction) => {
          if (
            prediction.status === "succeeded" &&
            prediction.metrics?.predict_time
          ) {
            predictTime = prediction.metrics.predict_time * 1000;
          }
        },
      );

      const { imageData, format } = await this.extractImage(output);

      return {
        success: true,
        imageData,
        format,
        metadata: {
          model: params.backendModel,
          duration: predictTime ?? Date.now() - start,
        },
      };
    } catch (error) {
      logger.error("Replicate generation failed", error, {
        model: params.backendModel,
      });

      // Attempt to extract status code from Replicate ApiError
      const status = (error as { response?: { status?: number } })?.response
        ?.status;
      const isRetryable =
        error instanceof ReplicateParseError
          ? false
          : status
            ? status === 429 || status >= 500
            : true;

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Replicate generation failed",
        isRetryable,
        metadata: { model: params.backendModel, duration: Date.now() - start },
      };
    }
  }
}
