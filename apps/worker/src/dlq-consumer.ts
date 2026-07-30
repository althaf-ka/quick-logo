import { createLogger } from "@quicklogo/server-telemetry";
import type { Database } from "@quicklogo/db";
import type { QueueMessage } from "@quicklogo/shared";
import {
  failBrandKitGenerationAndRefundCredits,
  failImageAndRefundCredits,
  refundBrandKitRefinementCredits,
} from "./services/image/image-repository";
import { extractImageId } from "./core/message-utils";

function getRuntimeMessageType(
  body: QueueMessage | undefined,
): string | undefined {
  const type = (body as { type?: unknown } | undefined)?.type;
  return typeof type === "string" ? type : undefined;
}

export async function processDlqBatch(
  batch: MessageBatch<QueueMessage>,
  db: Database,
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
    let handled = false;
    try {
      if (body?.type === "brand-kit-generate") {
        await failBrandKitGenerationAndRefundCredits(
          db,
          body.brandKitId,
          "Max retries exhausted",
        );
      } else if (body?.type === "brand-kit-refine") {
        await refundBrandKitRefinementCredits(db, {
          refinementId: body.refinementId,
          userId: body.userId,
          creditsUsed: body.creditsUsed,
          errorMessage:
            "This refinement could not be completed after several attempts.",
        });
      } else {
        const imageId = extractImageId(body);
        if (imageId) {
          await failImageAndRefundCredits(db, imageId, "Max retries exhausted");
        } else {
          logger.error(`Unknown DLQ message type. Acknowledging message.`, {
            messageId: message.id,
            type: getRuntimeMessageType(body),
          });
        }
      }
      handled = true;
    } catch (dbError) {
      logger.error(`Failed to handle DLQ status update`, dbError, {
        messageId: message.id,
      });
    }

    // 2. Here you could send an alert (e.g., webhook, email)
    // 3. Or potentially replay the message back to the main queue in the future

    // Acknowledge the message so it doesn't stay in the DLQ forever
    if (handled) {
      message.ack();
    } else {
      message.retry({ delaySeconds: 60 });
    }
  }
}
