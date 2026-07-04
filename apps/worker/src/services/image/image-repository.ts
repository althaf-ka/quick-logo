import type { Database } from "@quicklogo/db";
import {
  brandKits,
  creditRefunds,
  images,
  projects,
  users,
  eq,
  sql,
} from "@quicklogo/db";

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
 * Updates the status of a brand kit in the database.
 */
export async function updateBrandKitStatus(
  db: Database,
  brandKitId: string,
  status: "failed",
  errorMessage?: string,
): Promise<void> {
  await db
    .update(brandKits)
    .set({ status, ...(errorMessage && { errorMessage }) })
    .where(eq(brandKits.id, brandKitId));
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

export async function refundCreditsOnce(
  db: Database,
  params: {
    refundId: string;
    userId: string;
    credits: number;
    reason: string;
  },
): Promise<boolean> {
  if (params.credits <= 0) return false;

  try {
    await db.batch([
      db.insert(creditRefunds).values({
        id: params.refundId,
        userId: params.userId,
        credits: params.credits,
        reason: params.reason,
      }),
      db
        .update(users)
        .set({ credits: sql`${users.credits} + ${params.credits}` })
        .where(eq(users.id, params.userId)),
    ]);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.toLowerCase().includes("unique")
    ) {
      return false;
    }
    throw error;
  }

  return true;
}

export async function failImageAndRefundCredits(
  db: Database,
  imageId: string,
  errorMessage: string,
): Promise<boolean> {
  const [row] = await db
    .select({
      status: images.status,
      creditsUsed: images.creditsUsed,
      userId: projects.userId,
    })
    .from(images)
    .innerJoin(projects, eq(images.projectId, projects.id))
    .where(eq(images.id, imageId))
    .limit(1);

  if (!row || row.status === "completed") return false;

  const refunded = await refundCreditsOnce(db, {
    refundId: `image:${imageId}`,
    userId: row.userId,
    credits: row.creditsUsed,
    reason: "image_generation_failed",
  });

  await db
    .update(images)
    .set({
      status: "failed",
      errorMessage,
      ...(refunded && { refundedAt: new Date() }),
    })
    .where(eq(images.id, imageId));

  return refunded;
}

export async function failBrandKitGenerationAndRefundCredits(
  db: Database,
  brandKitId: string,
  errorMessage: string,
): Promise<boolean> {
  const [brandKit] = await db
    .select({
      status: brandKits.status,
      userId: brandKits.userId,
      creditsUsed: brandKits.creditsUsed,
    })
    .from(brandKits)
    .where(eq(brandKits.id, brandKitId))
    .limit(1);

  if (!brandKit || brandKit.status === "completed") return false;

  const refunded = await refundCreditsOnce(db, {
    refundId: `brand-kit-generate:${brandKitId}`,
    userId: brandKit.userId,
    credits: brandKit.creditsUsed,
    reason: "brand_kit_generation_failed",
  });

  await db
    .update(brandKits)
    .set({
      status: "failed",
      errorMessage,
      ...(refunded && { refundedAt: new Date() }),
    })
    .where(eq(brandKits.id, brandKitId));

  return refunded;
}

export async function refundBrandKitRefinementCredits(
  db: Database,
  params: {
    refinementId: string;
    userId: string;
    creditsUsed: number;
  },
): Promise<boolean> {
  return refundCreditsOnce(db, {
    refundId: `brand-kit-refine:${params.refinementId}`,
    userId: params.userId,
    credits: params.creditsUsed,
    reason: "brand_kit_refinement_failed",
  });
}
