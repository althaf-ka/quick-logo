import type { Database } from "@quicklogo/db";
import {
  brandKits,
  brandKitRefinements,
  brandKitRevisions,
  images,
  eq,
  and,
  or,
  sql,
} from "@quicklogo/db";
import { getSectionLabel } from "@quicklogo/shared";

interface SocialMasterCheckpoint {
  url: string;
  approvedCopy: {
    headline: string;
    callToAction: string;
    additionalInstructions: string;
  };
  pipelineVersion: number;
}

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

  async updateProgress(
    id: string,
    generationProgress: number,
    generationStage: string,
  ): Promise<void> {
    await this.db
      .update(brandKits)
      .set({
        generationProgress: Math.max(0, Math.min(100, generationProgress)),
        generationStage,
        updatedAt: new Date(),
      })
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

  async getRevision(brandKitId: string, revisionId: string) {
    return this.db.query.brandKitRevisions.findFirst({
      where: and(
        eq(brandKitRevisions.id, revisionId),
        eq(brandKitRevisions.brandKitId, brandKitId),
      ),
    });
  }

  async getRefinement(brandKitId: string, refinementId: string) {
    return this.db.query.brandKitRefinements.findFirst({
      where: and(
        eq(brandKitRefinements.id, refinementId),
        eq(brandKitRefinements.brandKitId, brandKitId),
      ),
    });
  }

  async markRefinementProcessing(
    brandKitId: string,
    refinementId: string,
  ): Promise<boolean> {
    const updated = await this.db
      .update(brandKitRefinements)
      .set({ status: "processing", updatedAt: new Date() })
      .where(
        and(
          eq(brandKitRefinements.id, refinementId),
          eq(brandKitRefinements.brandKitId, brandKitId),
          or(
            eq(brandKitRefinements.status, "queued"),
            eq(brandKitRefinements.status, "processing"),
          ),
        ),
      )
      .returning({ id: brandKitRefinements.id });

    return updated.length > 0;
  }

  async getSocialMasterCheckpoint(
    brandKitId: string,
  ): Promise<SocialMasterCheckpoint | undefined> {
    const revision = await this.db.query.brandKitRevisions.findFirst({
      where: and(
        eq(brandKitRevisions.brandKitId, brandKitId),
        eq(brandKitRevisions.triggerType, "initial_generation"),
      ),
    });
    const socialMediaKit = (
      revision?.results as
        | {
            socialMediaKit?: {
              masterBackgroundUrl?: unknown;
              approvedCopy?: {
                headline?: unknown;
                callToAction?: unknown;
                additionalInstructions?: unknown;
              };
              version?: unknown;
            };
          }
        | undefined
    )?.socialMediaKit;
    const copy = socialMediaKit?.approvedCopy;
    if (
      typeof socialMediaKit?.masterBackgroundUrl !== "string" ||
      typeof socialMediaKit.version !== "number" ||
      typeof copy?.headline !== "string" ||
      typeof copy.callToAction !== "string"
    ) {
      return undefined;
    }
    return {
      url: socialMediaKit.masterBackgroundUrl,
      approvedCopy: {
        headline: copy.headline,
        callToAction: copy.callToAction,
        additionalInstructions:
          typeof copy.additionalInstructions === "string"
            ? copy.additionalInstructions
            : "",
      },
      pipelineVersion: socialMediaKit.version,
    };
  }

  async saveSocialMasterCheckpoint(
    brandKitId: string,
    checkpoint: SocialMasterCheckpoint,
  ): Promise<void> {
    const existing = await this.db.query.brandKitRevisions.findFirst({
      where: and(
        eq(brandKitRevisions.brandKitId, brandKitId),
        eq(brandKitRevisions.triggerType, "initial_generation"),
      ),
    });
    const results = {
      socialMediaKit: {
        version: checkpoint.pipelineVersion,
        masterBackgroundUrl: checkpoint.url,
        approvedCopy: checkpoint.approvedCopy,
      },
    };

    // This inactive partial revision is the retry checkpoint; finalization
    // overwrites and activates the same initial_generation revision.
    if (existing) {
      await this.db
        .update(brandKitRevisions)
        .set({
          isActive: false,
          label: "Initial generation",
          revisionType: "initial",
          results,
        })
        .where(eq(brandKitRevisions.id, existing.id));
      return;
    }
    await this.db.insert(brandKitRevisions).values({
      brandKitId,
      isActive: false,
      revisionNumber: 1,
      label: "Initial generation",
      revisionType: "initial",
      triggerType: "initial_generation",
      results,
    });
  }

  async getRevisionByTrigger(brandKitId: string, triggerType: string) {
    return this.db.query.brandKitRevisions.findFirst({
      where: and(
        eq(brandKitRevisions.brandKitId, brandKitId),
        eq(brandKitRevisions.triggerType, triggerType),
      ),
    });
  }

  async completeRefinement(
    refinementId: string,
    resultRevisionId: string,
  ): Promise<void> {
    const now = new Date();
    await this.db
      .update(brandKitRefinements)
      .set({
        status: "completed",
        resultRevisionId,
        errorMessage: null,
        completedAt: now,
        updatedAt: now,
      })
      .where(eq(brandKitRefinements.id, refinementId));
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
          .set({
            isActive: true,
            label: "Initial generation",
            revisionType: "initial",
            results,
          })
          .where(eq(brandKitRevisions.id, existing.id))
      : this.db.insert(brandKitRevisions).values({
          brandKitId,
          isActive: true,
          revisionNumber: 1,
          label: "Initial generation",
          revisionType: "initial",
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
          generationProgress: 100,
          generationStage: "Complete",
          errorMessage: opts?.errorMessage ?? null,
          ...(opts?.refundedAt && { refundedAt: opts.refundedAt }),
        })
        .where(eq(brandKits.id, brandKitId)),
    ]);
  }

  async saveRefinement(
    brandKitId: string,
    sectionId: string,
    targetItemId: string | null | undefined,
    refinementId: string,
    sourceRevisionId: string,
    results: Record<string, any>,
  ) {
    const triggerType = `refine_${sectionId}:${refinementId}`;
    const existing = await this.getRevisionByTrigger(brandKitId, triggerType);
    const now = new Date();
    if (existing) {
      await this.completeRefinement(refinementId, existing.id);
      return;
    }

    const [maxRev] = await this.db
      .select({ max: sql<number>`MAX(revision_number)` })
      .from(brandKitRevisions)
      .where(eq(brandKitRevisions.brandKitId, brandKitId));
    const revisionId = crypto.randomUUID();

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
        id: revisionId,
        brandKitId,
        isActive: true,
        revisionNumber: (maxRev.max || 0) + 1,
        label: `Refined ${getSectionLabel(sectionId, targetItemId)}`,
        revisionType: "refinement",
        sectionId,
        targetItemId: targetItemId ?? null,
        sourceRevisionId,
        triggerType,
        results,
      }),
      this.db
        .update(brandKitRefinements)
        .set({
          status: "completed",
          resultRevisionId: revisionId,
          errorMessage: null,
          completedAt: now,
          updatedAt: now,
        })
        .where(eq(brandKitRefinements.id, refinementId)),
    ]);
  }
}
