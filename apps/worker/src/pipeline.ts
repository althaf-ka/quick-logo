import type { Database } from "@quicklogo/db";
import type { GenerateImageMessage } from "@quicklogo/shared";
import { images, projects, eq } from "@quicklogo/db";
import type { StorageProvider } from "@quicklogo/storage";
import {
  getModelMapping,
  createProvider,
} from "@quicklogo/ai-providers/providers";
import type { GenerationParams } from "@quicklogo/ai-providers/types";
import { PromptEnhancer } from "@quicklogo/ai-providers/prompt";

export class GenerationPipeline {
  private promptEnhancer: PromptEnhancer;

  constructor(
    private ai: Ai,
    private db: Database,
    private storage: StorageProvider,
  ) {
    this.promptEnhancer = new PromptEnhancer(ai);
  }

  async process(message: GenerateImageMessage): Promise<void> {
    const { imageId, projectId, userId } = message;

    await this.updateImageStatus(imageId, "processing");

    try {
      const mapping = getModelMapping(message.config.model);
      const provider = createProvider(mapping, { ai: this.ai });
      const { finalPrompt, enhancedPrompt, negativePrompt } =
        await this.promptEnhancer.enhance(message);

      const params: GenerationParams = {
        prompt: finalPrompt,
        negativePrompt,
        backendModel: mapping.backendModel,
        ...mapping.defaultParams,
      };

      if (mapping.supportsImg2Img && message.config.referenceImageUrl) {
        params.referenceImage = message.config.referenceImageUrl;
        params.referenceStrength = message.config.referenceStrength ?? 50;
      }

      const result = await provider.generate(params);

      if (!result.success || !result.imageData) {
        throw new Error(result.error ?? "Generation returned no image data");
      }

      const storagePath = `quick-logo/${userId}/${projectId}/${imageId}.${result.format}`;
      const uploaded = await this.storage.upload(storagePath, result.imageData);

      await this.db.batch([
        this.db
          .update(images)
          .set({
            status: "completed",
            imageUrl: uploaded.url,
            imageId: uploaded.fileId,
            thumbnail: uploaded.thumbnail,
            prompt: message.prompt,
            ...(enhancedPrompt && { enhancedPrompt }),
          })
          .where(eq(images.id, imageId)),
        this.db
          .update(projects)
          .set({ latestThumbnail: uploaded.thumbnail })
          .where(eq(projects.id, projectId)),
      ]);

      console.log(
        `[pipeline] Completed imageId=${imageId} in ${result.metadata?.duration}ms`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`[pipeline] Failed imageId=${imageId}:`, error);

      await this.updateImageStatus(imageId, "failed", errorMessage);
      throw error;
    }
  }

  private async updateImageStatus(
    imageId: string,
    status: "processing" | "failed",
    errorMessage?: string,
  ): Promise<void> {
    await this.db
      .update(images)
      .set({ status, ...(errorMessage && { errorMessage }) })
      .where(eq(images.id, imageId));
  }
}
