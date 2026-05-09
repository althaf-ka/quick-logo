import { createDb } from "@quicklogo/db";
import type { QueueMessage } from "@quicklogo/shared";
import { ImageKitProvider } from "@quicklogo/storage";
import { ImageGenerationPipeline } from "./image-generation-pipeline";
import { BrandKitPipeline } from "./brand-kit-pipeline";
import type { Env } from "./types";

export default {
  async queue(
    batch: MessageBatch<QueueMessage>,
    env: Env,
  ): Promise<void> {
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
        console.error(
          `[worker] Message failed attempt=${message.attempts}:`,
          error instanceof Error ? error.message : error,
        );
        message.retry();
      }
    }
  },
};
