import { createDb } from "@quicklogo/db";
import {
  failBrandKitGenerationAndRefundCredits,
  failImageAndRefundCredits,
  refundBrandKitRefinementCredits,
  touchBrandKitRefinement,
} from "./services/image/image-repository";
import type { GenerateImageMessage, QueueMessage } from "@quicklogo/shared";
import { ImageKitProvider } from "@quicklogo/storage";
import { ImageGenerationPipeline } from "./pipelines/image-generation";
import { BrandKitPipeline } from "./pipelines/brand-kit";
import { createLogger } from "@quicklogo/server-telemetry";
import { processDlqBatch } from "./dlq-consumer";
import { PipelineError } from "./core/errors";
import { extractImageId } from "./core/message-utils";
import type { Env } from "./types";

function getRuntimeMessageType(body: QueueMessage): string | undefined {
  const type = (body as { type?: unknown }).type;
  return typeof type === "string" ? type : undefined;
}

function isRuntimeImageMessage(
  body: QueueMessage,
): body is GenerateImageMessage {
  const type = getRuntimeMessageType(body);
  return (
    (type === undefined || type === "image") &&
    typeof (body as { imageId?: unknown }).imageId === "string"
  );
}

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
        } else if (isRuntimeImageMessage(body)) {
          await imageGenerationPipeline.process(body);
        } else {
          logger.error(`Unknown queue message type. Acknowledging message.`, {
            type: getRuntimeMessageType(body),
            messageId: message.id,
          });
          message.ack();
          continue;
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
          const errorMessage =
            error instanceof Error ? error.message : "Non-retryable error";

          try {
            if (message.body.type === "brand-kit-generate") {
              await failBrandKitGenerationAndRefundCredits(
                db,
                message.body.brandKitId,
                errorMessage,
              );
            } else if (message.body.type === "brand-kit-refine") {
              await refundBrandKitRefinementCredits(db, {
                refinementId: message.body.refinementId,
                userId: message.body.userId,
                creditsUsed: message.body.creditsUsed,
                errorMessage,
              });
            } else if (isRuntimeImageMessage(message.body)) {
              const imageId = extractImageId(message.body);
              if (imageId) {
                await failImageAndRefundCredits(db, imageId, errorMessage);
              }
            } else {
              logger.error(
                `Unknown non-retryable queue message type. Acknowledging message.`,
                {
                  type: getRuntimeMessageType(message.body),
                  messageId: message.id,
                },
              );
            }
          } catch (dbError) {
            logger.error(
              `Failed to handle non-retryable error updates`,
              dbError,
            );
            message.retry({ delaySeconds: 30 });
            continue;
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

        if (message.body.type === "brand-kit-refine") {
          try {
            await touchBrandKitRefinement(db, message.body.refinementId);
          } catch (heartbeatError) {
            logger.warn(
              "Failed to refresh refinement retry heartbeat.",
              { refinementId: message.body.refinementId },
              heartbeatError,
            );
          }
        }

        // Give rate-limited or temporarily unavailable image providers time to
        // recover: 30s, 60s, 120s, 240s, then 480s before the DLQ.
        // Cloudflare handles DLQ routing automatically when max_retries is reached
        const delaySeconds = Math.min(
          30 * Math.pow(2, Math.max(0, message.attempts - 1)),
          900,
        );
        message.retry({ delaySeconds });
      }
    }
  },
} satisfies ExportedHandler<Env, QueueMessage>;
