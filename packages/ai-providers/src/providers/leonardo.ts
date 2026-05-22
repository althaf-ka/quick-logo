import type { AIProvider, GenerationParams, GenerationResult } from "../types";
import { createLogger } from "@quicklogo/server-telemetry";

const logger = createLogger("ai-providers");

export interface LeonardoOptions {
  apiSchema?: "v1" | "v2";
  alchemy?: boolean;
  highResolution?: boolean;
  ultra?: boolean;
  contrast?: number;
  styleUUID?: string;
  mode?: string;
}

async function poll<T>(
  fn: () => Promise<T>,
  condition: (result: T) => boolean,
  interval = 5000,
  maxAttempts = 60,
): Promise<T> {
  let attempts = 0;
  while (attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, interval));
    const result = await fn();
    if (condition(result)) {
      return result;
    }
    attempts++;
  }
  throw new Error(
    `Polling timed out after ${maxAttempts * (interval / 1000)}s.`,
  );
}

interface LeonardoV2Payload {
  model: string;
  parameters: {
    width: number;
    height: number;
    prompt: string;
    quantity: number;
    mode?: string;
    prompt_enhance?: "ON" | "OFF";
    style_ids?: string[];
    guidances?: {
      image_reference: Array<{
        image: { id: string; type: "UPLOADED" };
        strength: "LOW" | "MID" | "HIGH";
      }>;
    };
  };
  public: boolean;
}

interface LeonardoV1Payload {
  alchemy: boolean;
  highResolution: boolean;
  modelId: string;
  prompt: string;
  negative_prompt: string;
  num_images: number;
  width: number;
  height: number;
  guidance_scale: number;
  contrast?: number;
  ultra?: boolean;
  styleUUID?: string;
  init_image_id?: string;
  init_strength?: number;
}

interface LeonardoJobStatus {
  status:
    | "PENDING"
    | "COMPLETE"
    | "FAILED"
    | "IN_PROGRESS"
    | "CANCELED"
    | "TIMEOUT";
  generated_images?: Array<{
    url: string;
    generated_prompt?: string;
  }>;
}

export class LeonardoProvider implements AIProvider {
  readonly name = "leonardo";
  private apiKey: string;
  private baseUrl = "https://cloud.leonardo.ai/api/rest";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private get headers() {
    return {
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Bearer ${this.apiKey}`,
    };
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeoutMs = 60000,
  ): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Request timed out after ${timeoutMs}ms`);
      }
      throw error;
    }
  }

  private async post(path: string, body: unknown, timeoutMs = 60000) {
    return this.fetchWithTimeout(
      `${this.baseUrl}${path}`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(body),
      },
      timeoutMs,
    );
  }

  private async get(path: string, timeoutMs = 15000) {
    return this.fetchWithTimeout(
      `${this.baseUrl}${path}`,
      {
        headers: this.headers,
      },
      timeoutMs,
    );
  }

  async generate(params: GenerationParams): Promise<GenerationResult> {
    const start = Date.now();

    try {
      const opts = (params.providerOptions || {}) as LeonardoOptions;
      const isV2 = opts.apiSchema === "v2";
      let initImageId: string | undefined = undefined;

      if (params.referenceImage) {
        initImageId = await this.uploadReferenceImage(params.referenceImage);
      }

      const generationId = isV2
        ? await this.generateV2(params, initImageId, opts)
        : await this.generateV1(params, initImageId, opts);
      const result = await this.pollGeneration(generationId);
      const imageResponse = await this.fetchWithTimeout(result.url, {}, 120000);
      if (!imageResponse.ok) {
        throw new Error(
          `Failed to download image from Leonardo: ${imageResponse.status}`,
        );
      }

      // Detect format securely from headers
      const contentType = imageResponse.headers.get("content-type");
      const format = contentType?.startsWith("image/")
        ? contentType.split("/")[1]
        : "jpeg";

      const buffer = await imageResponse.arrayBuffer();
      const imageData = new Uint8Array(buffer);

      return {
        success: true,
        imageData,
        format: (format as GenerationResult["format"]) || "jpeg",
        metadata: {
          model: params.backendModel,
          duration: Date.now() - start,
          ...(result.enhancedPrompt && {
            enhancedPrompt: result.enhancedPrompt,
          }),
        },
      };
    } catch (error) {
      logger.error("Generation failed", error, { model: "leonardo" });
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Leonardo generation failed",
        metadata: { model: params.backendModel, duration: Date.now() - start },
      };
    }
  }

  private async uploadReferenceImage(referenceUrl: string): Promise<string> {
    const refRes = await this.fetchWithTimeout(referenceUrl);
    if (!refRes.ok)
      throw new Error(`Failed to download reference image: ${refRes.status}`);
    const refBuffer = await refRes.arrayBuffer();

    // Get Pre-Signed URL
    const initRes = await this.post("/v1/init-image", { extension: "jpg" });

    if (!initRes.ok)
      throw new Error(`Leonardo init-image failed: ${initRes.status}`);
    const initData = (await initRes.json()) as {
      uploadInitImage?: { url: string; id: string; fields: string };
    };

    const uploadUrl = initData.uploadInitImage?.url;
    const initImageId = initData.uploadInitImage?.id;
    const fieldsString = initData.uploadInitImage?.fields;

    if (!uploadUrl || !initImageId || !fieldsString) {
      throw new Error("Leonardo API failed to return pre-signed S3 fields.");
    }

    let fields: Record<string, string>;
    try {
      fields = JSON.parse(fieldsString) as Record<string, string>;
    } catch (err) {
      throw new Error(
        "Critial failure parsing Leonardo S3 pre-signed fields JSON structure.",
      );
    }

    const formData = new FormData();

    // AWS requires all signature fields to be appended BEFORE the file blob
    Object.entries(fields).forEach(([key, value]) =>
      formData.append(key, value),
    );

    const blob = new Blob([refBuffer], { type: "image/jpeg" });
    formData.append("file", blob, "reference.jpg");

    // S3 uploads can be slower, allow robust 60s timeout
    const postRes = await this.fetchWithTimeout(
      uploadUrl,
      { method: "POST", body: formData },
      60000,
    );
    if (!postRes.ok)
      throw new Error(
        `Failed to upload reference binary into Leonardo S3: ${postRes.status}`,
      );

    return initImageId;
  }

  private async generateV2(
    params: GenerationParams,
    initImageId: string | undefined,
    opts: LeonardoOptions,
  ): Promise<string> {
    let strengthLabel: "LOW" | "MID" | "HIGH" = "MID";
    const refStr = params.referenceStrength ?? 50;
    if (refStr >= 75) strengthLabel = "HIGH";
    else if (refStr <= 25) strengthLabel = "LOW";

    const isIdeogram = params.backendModel.includes("ideogram");

    const v2Payload: LeonardoV2Payload = {
      model: params.backendModel,
      parameters: {
        width: params.width ?? 1024,
        height: params.height ?? 1024,
        prompt: params.prompt,
        quantity: 1,
      },
      public: false,
    };

    if (isIdeogram && opts.mode) {
      v2Payload.parameters.mode = opts.mode;
    }

    // Disable prompt_enhance during Image-to-Image edits
    const usePromptEnhance = initImageId ? false : !!opts.alchemy;
    v2Payload.parameters.prompt_enhance = usePromptEnhance ? "ON" : "OFF";

    if (opts.styleUUID) {
      v2Payload.parameters.style_ids = [opts.styleUUID];
    }

    if (initImageId) {
      v2Payload.parameters.guidances = {
        image_reference: [
          {
            image: { id: initImageId, type: "UPLOADED" },
            strength: strengthLabel,
          },
        ],
      };
    }

    const genRes = await this.post("/v2/generations", v2Payload);

    if (!genRes.ok) {
      const errText = await genRes.text();
      throw new Error(
        `Leonardo V2 Generation failed: ${genRes.status} - ${errText}`,
      );
    }

    const genData = (await genRes.json()) as {
      generate?: { generationId: string };
      sdGenerationJob?: { generationId: string };
      generation?: { id: string };
    };

    const genId =
      genData.generate?.generationId ||
      genData.sdGenerationJob?.generationId ||
      genData.generation?.id;

    if (!genId)
      throw new Error(
        `Leonardo V2 API did not return generation ID. Payload: ${JSON.stringify(genData)}`,
      );

    return genId;
  }

  private async generateV1(
    params: GenerationParams,
    initImageId: string | undefined,
    opts: LeonardoOptions,
  ): Promise<string> {
    const v1Payload: LeonardoV1Payload = {
      alchemy: opts.alchemy ?? true,
      highResolution: opts.highResolution ?? true,
      modelId: params.backendModel,
      prompt: params.prompt,
      negative_prompt: params.negativePrompt || "",
      num_images: 1,
      width: params.width ?? 1024,
      height: params.height ?? 1024,
      guidance_scale: params.guidance ?? 7,
    };

    if (opts.contrast !== undefined) v1Payload.contrast = opts.contrast;
    if (opts.ultra !== undefined) v1Payload.ultra = opts.ultra;
    if (opts.styleUUID !== undefined) v1Payload.styleUUID = opts.styleUUID;

    // Image-to-Image parameters
    if (initImageId) {
      v1Payload.init_image_id = initImageId;
      v1Payload.init_strength = (params.referenceStrength ?? 50) / 100;
    }

    const genRes = await this.post("/v1/generations", v1Payload);

    if (!genRes.ok) {
      const errText = await genRes.text();
      throw new Error(
        `Leonardo V1 Generation failed: ${genRes.status} - ${errText}`,
      );
    }

    const genData = (await genRes.json()) as {
      sdGenerationJob?: { generationId: string };
    };

    const genId = genData.sdGenerationJob?.generationId;
    if (!genId)
      throw new Error(
        `Leonardo V1 API did not return generation ID. Payload: ${JSON.stringify(genData)}`,
      );

    return genId;
  }

  private async pollGeneration(
    generationId: string,
  ): Promise<{ url: string; enhancedPrompt: string | null }> {
    const fetchStatus = async () => {
      const fetchRes = await this.get(`/v1/generations/${generationId}`);

      if (!fetchRes.ok) {
        throw new Error(
          `Leonardo status HTTP check failed: ${fetchRes.status}`,
        );
      }

      const statusData = (await fetchRes.json()) as {
        generations_by_pk?: LeonardoJobStatus;
      };

      const job = statusData.generations_by_pk;

      if (!job) {
        throw new Error(
          "Failed to retrieve job status from Leonardo native query.",
        );
      }

      if (job.status === "FAILED") {
        throw new Error("Leonardo generation failed internally.");
      } else if (job.status === "CANCELED") {
        throw new Error(
          "Leonardo generation was canceled by the upstream provider.",
        );
      } else if (job.status === "TIMEOUT") {
        throw new Error(
          "Leonardo generation timed out internally on provider side.",
        );
      }

      return job;
    };

    const isComplete = (job: LeonardoJobStatus) => job.status === "COMPLETE";

    const job = await poll(fetchStatus, isComplete, 5000, 60);

    const generatedImages = job.generated_images;
    if (generatedImages && generatedImages.length > 0) {
      const firstImage = generatedImages[0];
      if (firstImage) {
        return {
          url: firstImage.url,
          enhancedPrompt: firstImage.generated_prompt || null,
        };
      }
    }

    throw new Error(
      "Leonardo API returned COMPLETE but no images were generated.",
    );
  }
}
