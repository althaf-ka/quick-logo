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
import { withRetry, withTimeout } from "../core/pipeline-helpers";
import { parseAndValidateAiResponse } from "../core/ai-response-parser";

/**
 * Orchestrator class for the Image Generation pipeline.
 *
 * Responsibilities:
 * - Coordinates pure services (validation, prompt routing, uploading).
 * - Manages infrastructure side-effects (AI provider calls, DB updates, storage).
 * - Provides robust error handling, retries, and timeouts for resilient processing.
 */
export class ImageGenerationPipeline {
  private promptEnhancer: PromptEnhancer;

  constructor(
    private ai: Ai,
    private db: Database,
    private storage: StorageProvider,
    private env: Env,
  ) {
    this.promptEnhancer = new PromptEnhancer(ai);
  }

  /**
   * Processes a single image generation message from the worker queue.
   *
   * @param message - The validated message payload containing configuration and prompt details.
   * @throws {PipelineError} If a non-retryable validation or processing error occurs.
   * @throws {AiProviderError} If the AI provider fails to generate an image after retries.
   * @throws {StorageError} If uploading the final image to storage fails after retries.
   */
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

      // 3. Provider Generation (with Retry & Timeout)
      const provider = createProvider(mapping, { ai: this.ai, env: this.env });
      const rawResult = await withRetry(
        () => withTimeout(() => provider.generate(routeResult.params), 60000), // 60s timeout for image generation
        3, // 3 retries
        2000, // 2s base delay
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

      console.log(
        `[image-generation-pipeline] Completed imageId=${imageId} in ${parsedAiResponse.duration}ms`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(
        `[image-generation-pipeline] Failed imageId=${imageId}:`,
        error,
      );

      await updateImageStatus(this.db, imageId, "failed", errorMessage);
      throw error;
    }
  }
}
