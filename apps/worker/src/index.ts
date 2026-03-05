import { createDb } from "@quicklogo/db";
import type { GenerateImageMessage } from "@quicklogo/shared";
import { ImageKitProvider } from "@quicklogo/storage";
import { GenerationPipeline } from "./pipeline";
import type { Env } from "./types";

export default {
  async queue(
    batch: MessageBatch<GenerateImageMessage>,
    env: Env,
  ): Promise<void> {
    const db = createDb(env.DB);
    const storage = new ImageKitProvider(env.IMAGEKIT_PRIVATE_KEY);
    const pipeline = new GenerationPipeline(env.AI, db, storage);

    for (const message of batch.messages) {
      try {
        await pipeline.process(message.body);
        message.ack();
      } catch (error) {
        console.error(
          `[worker] Message failed imageId=${message.body.imageId}, attempt=${message.attempts}:`,
          error instanceof Error ? error.message : error,
        );
        message.retry();
      }
    }
  },
};
