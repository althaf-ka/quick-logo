import { createLogger } from "@quicklogo/server-telemetry";
import type { Database } from "@quicklogo/db";
import type { QueueMessage } from "@quicklogo/shared";
import type { Env } from "./types";
import { updateImageStatus } from "./services/image/image-repository";
import { extractImageId } from "./core/message-utils";

export async function processDlqBatch(
  batch: MessageBatch<QueueMessage>,
  db: Database,
  _env: Env,
) {
  const logger = createLogger("worker", { db });

  for (const message of batch.messages) {
    const body = message.body;

    // 1. Log the final failure details (metadata only, no full body to prevent data leakage)
    logger.fatal(`Message permanently failed and routed to DLQ`, undefined, {
      messageId: message.id,
      type: body?.type,
      attempts: message.attempts,
      imageId: extractImageId(body),
    });

    // 2. Update the DB status to 'failed' so the frontend stops polling
    const imageId = extractImageId(body);
    if (imageId) {
      try {
        await updateImageStatus(db, imageId, "failed", "Max retries exhausted");
      } catch (dbError) {
        logger.error(`Failed to update image status for DLQ`, dbError, {
          imageId,
        });
      }
    }

    // 2. Here you could send an alert (e.g., webhook, email)
    // 3. Or potentially replay the message back to the main queue in the future

    // Acknowledge the message so it doesn't stay in the DLQ forever
    message.ack();
  }
}
