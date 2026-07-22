import {
  and,
  brandKitRefinements,
  brandKits,
  eq,
  gt,
  isNull,
  lt,
  or,
} from "@quicklogo/db";
import type { Database } from "@quicklogo/db";
import { refundCreditsOnce } from "./credits";

// Queue attempts refresh the lease at start and before retrying. Twenty minutes
// exceeds one Worker queue invocation while still recovering abandoned work.
const REFINEMENT_INACTIVITY_TIMEOUT_MS = 20 * 60 * 1000;
const STALE_REFINEMENT_ERROR_MESSAGE =
  "This refinement stopped responding. Your credits have been refunded.";

export async function recoverStaleBrandKitRefinement(
  db: Database,
  params: {
    brandKitId: string;
    userId: string;
    refinementId?: string;
  },
): Promise<void> {
  const cutoff = new Date(Date.now() - REFINEMENT_INACTIVITY_TIMEOUT_MS);
  const activeStatus = or(
    eq(brandKitRefinements.status, "queued"),
    eq(brandKitRefinements.status, "processing"),
  );
  const [candidate] = await db
    .select({
      id: brandKitRefinements.id,
      status: brandKitRefinements.status,
      creditsUsed: brandKitRefinements.creditsUsed,
    })
    .from(brandKitRefinements)
    .innerJoin(brandKits, eq(brandKitRefinements.brandKitId, brandKits.id))
    .where(
      and(
        eq(brandKitRefinements.brandKitId, params.brandKitId),
        eq(brandKits.userId, params.userId),
        params.refinementId
          ? eq(brandKitRefinements.id, params.refinementId)
          : undefined,
        or(
          and(activeStatus, lt(brandKitRefinements.updatedAt, cutoff)),
          and(
            eq(brandKitRefinements.status, "failed"),
            eq(
              brandKitRefinements.errorMessage,
              STALE_REFINEMENT_ERROR_MESSAGE,
            ),
            gt(brandKitRefinements.creditsUsed, 0),
            isNull(brandKitRefinements.refundedAt),
          ),
        ),
      ),
    )
    .limit(1);

  if (!candidate) return;

  if (candidate.status !== "failed") {
    const now = new Date();
    const [claimed] = await db
      .update(brandKitRefinements)
      .set({
        status: "failed",
        errorMessage: STALE_REFINEMENT_ERROR_MESSAGE,
        completedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(brandKitRefinements.id, candidate.id),
          activeStatus,
          lt(brandKitRefinements.updatedAt, cutoff),
        ),
      )
      .returning({ id: brandKitRefinements.id });

    if (!claimed) return;
  }

  if (candidate.creditsUsed <= 0) return;

  await refundCreditsOnce(db, {
    refundId: `brand-kit-refine:${candidate.id}`,
    userId: params.userId,
    credits: candidate.creditsUsed,
    reason: "brand_kit_refinement_timed_out",
  });

  await db
    .update(brandKitRefinements)
    .set({ refundedAt: new Date() })
    .where(
      and(
        eq(brandKitRefinements.id, candidate.id),
        eq(brandKitRefinements.status, "failed"),
        eq(brandKitRefinements.errorMessage, STALE_REFINEMENT_ERROR_MESSAGE),
        isNull(brandKitRefinements.refundedAt),
      ),
    );
}
