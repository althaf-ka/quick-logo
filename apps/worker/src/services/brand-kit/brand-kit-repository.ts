import type { Database } from "@quicklogo/db";
import {
  brandKits,
  brandKitRevisions,
  images,
  eq,
  and,
  sql,
  systemLogs,
} from "@quicklogo/db";

export class BrandKitRepository {
  constructor(private db: Database) {}

  async updateStatus(
    id: string,
    status: "processing" | "failed" | "completed",
    errorMessage?: string,
  ): Promise<void> {
    await this.db
      .update(brandKits)
      .set({ status, errorMessage: errorMessage || null })
      .where(eq(brandKits.id, id));
  }

  async getSourceImageUrl(imageId: string): Promise<string | null> {
    const sourceImage = await this.db.query.images.findFirst({
      where: eq(images.id, imageId),
    });
    return sourceImage?.imageUrl || null;
  }

  async getBrandKit(brandKitId: string) {
    return this.db.query.brandKits.findFirst({
      where: eq(brandKits.id, brandKitId),
    });
  }

  async getActiveRevision(brandKitId: string) {
    return this.db.query.brandKitRevisions.findFirst({
      where: and(
        eq(brandKitRevisions.brandKitId, brandKitId),
        eq(brandKitRevisions.isActive, true),
      ),
    });
  }

  async saveInitialGeneration(
    brandKitId: string,
    results: Record<string, any>,
    opts?: { errorMessage?: string | null; refundedAt?: Date },
  ) {
    // Idempotent: on a queue retry we must not create a second active revision.
    // Reuse the existing initial_generation revision if present, and ensure only
    // one active revision remains.
    const existing = await this.db.query.brandKitRevisions.findFirst({
      where: and(
        eq(brandKitRevisions.brandKitId, brandKitId),
        eq(brandKitRevisions.triggerType, "initial_generation"),
      ),
    });

    const revisionStatement = existing
      ? this.db
          .update(brandKitRevisions)
          .set({ isActive: true, results })
          .where(eq(brandKitRevisions.id, existing.id))
      : this.db.insert(brandKitRevisions).values({
          brandKitId,
          isActive: true,
          revisionNumber: 1,
          triggerType: "initial_generation",
          results,
        });

    await this.db.batch([
      this.db
        .update(brandKitRevisions)
        .set({ isActive: false })
        .where(
          and(
            eq(brandKitRevisions.brandKitId, brandKitId),
            eq(brandKitRevisions.isActive, true),
            eq(brandKitRevisions.triggerType, "initial_generation"),
          ),
        ),
      revisionStatement,
      this.db
        .update(brandKits)
        .set({
          status: "completed",
          errorMessage: opts?.errorMessage ?? null,
          ...(opts?.refundedAt && { refundedAt: opts.refundedAt }),
        })
        .where(eq(brandKits.id, brandKitId)),
    ]);
  }

  async saveRefinement(
    brandKitId: string,
    sectionId: string,
    results: Record<string, any>,
  ) {
    const [maxRev] = await this.db
      .select({ max: sql<number>`MAX(revision_number)` })
      .from(brandKitRevisions)
      .where(eq(brandKitRevisions.brandKitId, brandKitId));

    await this.db.batch([
      this.db
        .update(brandKitRevisions)
        .set({ isActive: false })
        .where(
          and(
            eq(brandKitRevisions.brandKitId, brandKitId),
            eq(brandKitRevisions.isActive, true),
          ),
        ),

      this.db.insert(brandKitRevisions).values({
        brandKitId,
        isActive: true,
        revisionNumber: (maxRev.max || 0) + 1,
        triggerType: `refine_${sectionId}`,
        results,
      }),
    ]);
  }
}
