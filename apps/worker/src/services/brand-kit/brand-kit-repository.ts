import type { Database } from "@quicklogo/db";
import {
  brandKits,
  brandKitRevisions,
  images,
  eq,
  and,
  sql,
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
  ) {
    await this.db.batch([
      this.db.insert(brandKitRevisions).values({
        brandKitId,
        isActive: true,
        revisionNumber: 1,
        triggerType: "initial_generation",
        results,
      }),
      this.db
        .update(brandKits)
        .set({ status: "completed" })
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
