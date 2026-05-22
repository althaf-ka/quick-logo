import { createDb } from "@quicklogo/db";
import type { QueueMessage } from "@quicklogo/shared";
import { ImageKitProvider } from "@quicklogo/storage";
import { ImageGenerationPipeline } from "./pipelines/image-generation";
import { BrandKitPipeline } from "./pipelines/brand-kit";
import { createLogger } from "@quicklogo/server-telemetry";
import type { Env } from "./types";

export default {
  async queue(batch: MessageBatch<QueueMessage>, env: Env): Promise<void> {
    const db = createDb(env.DB);
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
        const logger = createLogger("worker", { db });
        logger.error(`Message failed attempt=${message.attempts}`, error, {
          type: message.body?.type,
        });
        message.retry();
      }
    }
  },
};
