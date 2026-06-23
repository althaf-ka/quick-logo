import { createDb } from "@quicklogo/db";
import { updateImageStatus } from "./services/image/image-repository";
import type { QueueMessage } from "@quicklogo/shared";
import { ImageKitProvider } from "@quicklogo/storage";
import { ImageGenerationPipeline } from "./pipelines/image-generation";
import { BrandKitPipeline } from "./pipelines/brand-kit";
import { createLogger } from "@quicklogo/server-telemetry";
import { processDlqBatch } from "./dlq-consumer";
import { PipelineError } from "./core/errors";
import { extractImageId } from "./core/message-utils";
import type { Env } from "./types";

export default {
  async queue(batch: MessageBatch<QueueMessage>, env: Env): Promise<void> {
    const db = createDb(env.DB);
    const logger = createLogger("worker", { db });

    if (batch.queue === "image-generation-dlq") {
      return processDlqBatch(batch, db, env);
    }

    const storage = new ImageKitProvider(env.IMAGEKIT_PRIVATE_KEY);
    const imageGenerationPipeline = new ImageGenerationPipeline(
      env.AI,
      db,
      storage,
      env,
    );
    const brandKitPipeline = new BrandKitPipeline(env.AI, db, storage, env);

    for (const message of batch.messages) {
      try {
        const body = message.body;
        if (body.type === "brand-kit-generate") {
          await brandKitPipeline.processGeneration(body);
        } else if (body.type === "brand-kit-refine") {
          await brandKitPipeline.processRefinement(body);
        } else {
          await imageGenerationPipeline.process(body);
        }
        message.ack();
      } catch (error) {
        // Assume non-retryable by default if it's explicitly set to false, otherwise retry
        const isRetryable =
          error instanceof PipelineError ? error.retryable : true;

        if (!isRetryable) {
          logger.error(`Non-retryable error. Acknowledging message.`, error, {
            type: message.body?.type,
          });
          const imageId = extractImageId(message.body);
          if (imageId) {
            const errorMessage =
              error instanceof Error ? error.message : "Non-retryable error";
            try {
              await updateImageStatus(db, imageId, "failed", errorMessage);
            } catch (dbError) {
              logger.error(`Failed to update image status`, dbError, {
                imageId,
              });
            }
          }
          message.ack();
          continue;
        }

        logger.warn(
          `Message failed (attempt ${message.attempts}). Retrying with backoff.`,
          {
            type: message.body?.type,
          },
          error,
        );

        // Exponential backoff: 2s, 4s, 8s...
        // Cloudflare handles DLQ routing automatically when max_retries is reached
        const delaySeconds = Math.pow(2, message.attempts);
        message.retry({ delaySeconds });
      }
    }
  },
};
