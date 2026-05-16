import type { Database } from "@quicklogo/db";
import { images, projects, eq, systemLogs } from "@quicklogo/db";

export interface FinalizeImageParams {
  imageId: string;
  projectId: string;
  prompt: string;
  enhancedPromptText?: string;
  uploadResult: {
    url: string;
    fileId: string;
    thumbnail: string;
  };
}

/**
 * Updates the status of an image in the database.
 */
export async function updateImageStatus(
  db: Database,
  imageId: string,
  status: "processing" | "failed",
  errorMessage?: string,
): Promise<void> {
  await db
    .update(images)
    .set({ status, ...(errorMessage && { errorMessage }) })
    .where(eq(images.id, imageId));
}

/**
 * Finalizes the image generation process by batch updating the image record
 * to "completed" and updating the project's latest thumbnail.
 */
export async function finalizeImageGeneration(
  db: Database,
  params: FinalizeImageParams,
): Promise<void> {
  await db.batch([
    db
      .update(images)
      .set({
        status: "completed",
        imageUrl: params.uploadResult.url,
        imageId: params.uploadResult.fileId,
        thumbnail: params.uploadResult.thumbnail,
        prompt: params.prompt,
        ...(params.enhancedPromptText && {
          enhancedPrompt: params.enhancedPromptText,
        }),
      })
      .where(eq(images.id, params.imageId)),
    db
      .update(projects)
      .set({ latestThumbnail: params.uploadResult.thumbnail })
      .where(eq(projects.id, params.projectId)),
  ]);
}

/**
 * Logs system errors to the systemLogs table for observability.
 */
export async function logSystemImageError(
  db: Database,
  imageId: string,
  message: string,
  stack?: string,
): Promise<void> {
  try {
    const img = await db.query.images.findFirst({
      where: eq(images.id, imageId),
    });
    let userId: string | null = null;
    if (img?.projectId) {
      const proj = await db.query.projects.findFirst({
        where: eq(projects.id, img.projectId),
      });
      userId = proj?.userId ?? null;
    }
    await db.insert(systemLogs).values({
      level: "error",
      source: "worker",
      message: `[image-generation-pipeline] ${message}`,
      stack: stack ?? null,
      pathname: `/images/${imageId}`,
      userId,
      context: JSON.stringify({ imageId, projectId: img?.projectId }),
      status: "unresolved",
    });
  } catch (e) {
    console.error("[image-repository] Failed to persist system log:", e);
  }
}
