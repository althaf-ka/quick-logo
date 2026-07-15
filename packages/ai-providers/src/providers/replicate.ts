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
  { ratio: 3, label: "3:1" },
  { ratio: 21 / 9, label: "21:9" },
  { ratio: 2, label: "2:1" },
  { ratio: 16 / 9, label: "16:9" },
  { ratio: 16 / 10, label: "16:10" },
  { ratio: 3 / 2, label: "3:2" },
  { ratio: 4 / 3, label: "4:3" },
  { ratio: 5 / 4, label: "5:4" },
  { ratio: 1, label: "1:1" },
  { ratio: 4 / 5, label: "4:5" },
  { ratio: 3 / 4, label: "3:4" },
  { ratio: 2 / 3, label: "2:3" },
  { ratio: 10 / 16, label: "10:16" },
  { ratio: 9 / 16, label: "9:16" },
  { ratio: 1 / 2, label: "1:2" },
  { ratio: 9 / 21, label: "9:21" },
  { ratio: 1 / 3, label: "1:3" },
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

  private getAspectRatio(
    width: number,
    height: number,
    supported?: readonly string[],
  ): string {
    const targetRatio = width / height;
    // Restrict to the model's supported ratios when declared, so we never emit
    // a label the API would reject (e.g. gpt-image-2 only allows 1:1/3:2/2:3).
    const candidates =
      supported && supported.length > 0
        ? ASPECT_RATIOS.filter((entry) => supported.includes(entry.label))
        : ASPECT_RATIOS;
    const pool = candidates.length > 0 ? candidates : ASPECT_RATIOS;

    let closestLabel = pool[0]?.label ?? "1:1";
    let minDiff = Infinity;

    for (const entry of pool) {
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
      prompt: caps?.maxPromptLength
        ? this.truncatePrompt(params.prompt, caps.maxPromptLength)
        : params.prompt,
    };

    if (!caps) {
      logger.warn(
        `[Replicate] No capability map for model "${model}" — sending prompt only`,
      );
      return input;
    }

    if (caps.aspectRatio && params.width && params.height) {
      const dimString = `${params.width}x${params.height}`;
      if (caps.supportedAspectRatios?.includes(dimString)) {
        input.aspect_ratio = dimString;
      } else {
        input.aspect_ratio = this.getAspectRatio(
          params.width,
          params.height,
          caps.supportedAspectRatios,
        );
      }
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

  private truncatePrompt(prompt: string, maxLength: number): string {
    if (prompt.length <= maxLength) return prompt;

    const suffix =
      "\n\nFinal requirements: preserve approved display copy and supplied logos exactly; do not invent extra text, marks, UI, frames, watermarks, or crop guides.";
    const available = Math.max(0, maxLength - suffix.length);
    logger.warn("[Replicate] Prompt exceeded model limit; truncating", {
      originalLength: prompt.length,
      maxLength,
    });
    return `${prompt.slice(0, available).trimEnd()}${suffix}`;
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

    // Safety net: If no canvasMode is explicitly set but we have a reference image
    // and the model supports remixing, implicitly attach the image to avoid dropping it.
    const isImplicitRemix =
      !mode &&
      strategy.type.startsWith("remix") &&
      (params.referenceImage ||
        params.referenceImages?.length ||
        params.canvasImage);

    if (mode !== "inpaint" && mode !== "img2img" && !isImplicitRemix) return;

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
        const referenceImages = [
          ...(params.referenceImages || []),
          ...(!params.referenceImages?.length && params.referenceImage
            ? [params.referenceImage]
            : []),
          ...(!params.referenceImages?.length &&
          !params.referenceImage &&
          params.canvasImage
            ? [params.canvasImage]
            : []),
        ].filter(Boolean);
        if (referenceImages.length > 0) {
          if (strategy.type === "remix-image-array") {
            input[strategy.imageField] = referenceImages;
          } else {
            input[strategy.imageField] = referenceImages[0];
          }
        }

        if (
          (model === REPLICATE_MODELS.SEEDREAM_4 ||
            model === REPLICATE_MODELS.SEEDREAM_4_5) &&
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
    signal?: AbortSignal,
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
      return this.downloadImage(fileOutput, signal);
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
    signal?: AbortSignal,
  ): Promise<{ imageData: Uint8Array; format: GenerationResult["format"] }> {
    const response = await fetch(url, { signal });
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
        aspectRatio: input.aspect_ratio,
        magicPromptOption: input.magic_prompt_option,
        resolution: input.resolution,
        size: input.size,
        styleType: input.style_type,
        hasImage: !!(
          params.referenceImage ||
          params.referenceImages?.length ||
          params.canvasImage
        ),
      });

      let predictTime: number | undefined;

      const output = await this.client.run(
        identifier,
        {
          input,
          signal: params.signal,
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

      const { imageData, format } = await this.extractImage(
        output,
        params.signal,
      );

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
      const response = (
        error as { response?: { status?: number; retry_after?: number } }
      )?.response;
      const message = error instanceof Error ? error.message : "";
      const statusFromMessage = message.match(/status (\d{3})/i)?.[1];
      const status =
        response?.status ??
        (statusFromMessage
          ? Number.parseInt(statusFromMessage, 10)
          : undefined);
      const isRetryable =
        error instanceof ReplicateParseError
          ? false
          : status
            ? status === 429 || status >= 500
            : !/input (?:was invalid|validation failed)|ModelError.*E006/i.test(
                message,
              );

      // Extract retry_after. Replicate might send it in response.retry_after,
      // or we might need to parse it from the message if it's not structured.
      let retryAfter = response?.retry_after;
      if (!retryAfter && error instanceof Error) {
        const match = error.message.match(/retry_after"?:\s*(\d+)/);
        if (match && match[1]) {
          retryAfter = parseInt(match[1], 10);
        }
      }

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Replicate generation failed",
        isRetryable,
        retryAfter,
        metadata: { model: params.backendModel, duration: Date.now() - start },
      };
    }
  }
}
