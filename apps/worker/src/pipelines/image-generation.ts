import type { Database } from "@quicklogo/db";
import type { StorageProvider } from "@quicklogo/storage";
import type { GenerateImageMessage } from "@quicklogo/shared";
import {
  getModelMapping,
  createProvider,
} from "@quicklogo/ai-providers/providers";
import { PromptEnhancer } from "@quicklogo/ai-providers/prompt";

import type { Env } from "../types";
import { validateImageGenerationInput } from "../services/image/validation";
import { routePromptAndBuildParams } from "../services/image/prompt-routing";
import { uploadAndSyncThumbnail } from "../services/image/thumbnail-sync";
import {
  updateImageStatus,
  finalizeImageGeneration,
} from "../services/image/image-repository";
import { createLogger } from "@quicklogo/server-telemetry";
import { withRetry, withTimeout } from "../core/pipeline-helpers";
import { parseAndValidateAiResponse } from "../core/ai-response-parser";

// Orchestrator for the Image Generation pipeline.
export class ImageGenerationPipeline {
  private promptEnhancer: PromptEnhancer;
  private logger: ReturnType<typeof createLogger>;

  constructor(
    private ai: Ai,
    private db: Database,
    private storage: StorageProvider,
    private env: Env,
  ) {
    this.promptEnhancer = new PromptEnhancer(ai);
    this.logger = createLogger("worker", { db: this.db });
  }

  // Processes a single image generation message from the worker queue.
  async process(message: GenerateImageMessage): Promise<void> {
    const { imageId, projectId, userId } = message;

    await updateImageStatus(this.db, imageId, "processing");

    try {
      // 1. Setup & Validate
      const mapping = getModelMapping(message.config.model);
      validateImageGenerationInput(message, mapping);

      // 2. Build Generation Params & Route Prompts
      const routeResult = await routePromptAndBuildParams(
        message,
        mapping,
        this.promptEnhancer,
      );

      // 3. Provider Generation (3min timeout to allow for model cold-starts, polling, and downloads)
      const provider = createProvider(mapping, { ai: this.ai, env: this.env });
      const rawResult = await withRetry(
        () => withTimeout(() => provider.generate(routeResult.params), 180000),
        3,
        2000,
      );

      // 4. Parse & Validate Provider Response
      const parsedAiResponse = parseAndValidateAiResponse(rawResult);

      // 5. Upload to Storage
      const uploadResult = await withRetry(
        () =>
          uploadAndSyncThumbnail(
            this.storage,
            userId,
            projectId,
            imageId,
            parsedAiResponse.format,
            parsedAiResponse.imageData,
          ),
        3,
        1000,
      );

      // 6. DB Updates
      await finalizeImageGeneration(this.db, {
        imageId,
        projectId,
        prompt: message.prompt,
        enhancedPromptText: routeResult.enhancedPromptText,
        uploadResult,
      });

      this.logger.info(`Completed image generation`, {
        imageId,
        duration: parsedAiResponse.duration,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Image Pipeline execution failed", error, { imageId });

      await updateImageStatus(this.db, imageId, "failed", errorMessage);
      throw error;
    }
  }
}
