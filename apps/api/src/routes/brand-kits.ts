import { zValidator } from "@hono/zod-validator";
import { createId } from "@paralleldrive/cuid2";
import {
  brandKits,
  brandKitRefinements,
  brandKitRevisions,
  images,
  eq,
  lt,
  sql,
  and,
  desc,
  or,
  getTableColumns,
} from "@quicklogo/db";
import {
  generateBrandKitSchema,
  refineBrandKitSectionSchema,
  restoreSectionSchema,
  restoreFullBrandKitSchema,
  buildBrandContextSummary,
  listQuerySchema,
  getSocialAssetTargetId,
  computeBrandKitCost,
  computeBrandKitRefinementCost,
  getSectionLabel,
  brandKitDeterministicEditSchema,
} from "@quicklogo/shared";
import deepEqual from "fast-deep-equal";
import { Hono } from "hono";
import { recoverStaleBrandKitRefinement } from "../lib/brand-kit-refinements";
import { deductCredits, refundCreditsOnce } from "../lib/credits";
import {
  NotFoundError,
  BadRequestError,
  RefinementInProgressError,
  RevisionConflictError,
} from "../lib/errors";
import { validationHook } from "../lib/validator";
import { requireAuth } from "../middleware/require-auth";
import type { Bindings, Variables } from "../types";

async function findActiveRefinement(
  db: Variables["db"],
  brandKitId: string,
  userId: string,
) {
  await recoverStaleBrandKitRefinement(db, { brandKitId, userId });
  return db.query.brandKitRefinements.findFirst({
    where: and(
      eq(brandKitRefinements.brandKitId, brandKitId),
      or(
        eq(brandKitRefinements.status, "queued"),
        eq(brandKitRefinements.status, "processing"),
      ),
    ),
  });
}

function hexToRgb(hex: string) {
  const value = hex.slice(1);
  return [0, 2, 4]
    .map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16))
    .join(",");
}

const brandKitsRoute = new Hono<{ Bindings: Bindings; Variables: Variables }>()
  .post(
    "/",
    requireAuth,
    zValidator("json", generateBrandKitSchema, validationHook),
    async (c) => {
      const db = c.get("db");
      const user = c.get("user");
      const data = c.req.valid("json");

      const cost = computeBrandKitCost(data.deliverables);
      const brandKitId = createId();

      await deductCredits(db, user.id, cost);

      const promptSummary = buildBrandContextSummary(data, data.prompt);

      try {
        await db.insert(brandKits).values({
          id: brandKitId,
          userId: user.id,
          brandName: data.brandName || "",
          prompt: promptSummary,
          sourceImageId: data.sourceImageId,
          customLogoUrl: data.customLogoUrl,
          productImageUrls: data.productImageUrls,
          extractedColors: data.extractedColors,
          typographyStyle: data.typographyStyle,
          industry: data.industry,
          tagline: data.tagline,
          targetAudience: data.targetAudience,
          brandPersonality: data.brandPersonality,
          additionalContext: data.additionalContext,
          selectedVibes: data.selectedVibes,
          socials: data.socials,
          contact: data.contact,
          guidelines: data.guidelines,
          socialMediaBrief: data.socialMediaBrief,
          businessCardBrief: data.businessCardBrief,
          requestedDeliverables: data.deliverables,
          creditsUsed: cost,
        });
      } catch (error) {
        await refundCreditsOnce(db, {
          refundId: `brand-kit-create:${brandKitId}`,
          userId: user.id,
          credits: cost,
          reason: "brand_kit_create_failed",
        });
        throw error;
      }

      try {
        await c.env.GENERATION_QUEUE.send(
          {
            type: "brand-kit-generate",
            brandKitId,
            userId: user.id,
            creditsUsed: cost,
            ...data,
            prompt: promptSummary,
            brandName: data.brandName || "",
          },
          { contentType: "json" },
        );
      } catch (error) {
        const refunded = await refundCreditsOnce(db, {
          refundId: `brand-kit-enqueue:${brandKitId}`,
          userId: user.id,
          credits: cost,
          reason: "brand_kit_enqueue_failed",
        });
        await db
          .update(brandKits)
          .set({
            status: "failed",
            generationStage: "Unable to start generation",
            errorMessage: "Unable to queue brand kit generation",
            ...(refunded && { refundedAt: new Date() }),
          })
          .where(eq(brandKits.id, brandKitId));
        throw error;
      }

      return c.json({ brandKitId }, 202);
    },
  )
  .get(
    "/",
    requireAuth,
    zValidator("query", listQuerySchema, validationHook),
    async (c) => {
      const db = c.get("db");
      const user = c.get("user");
      const { cursor, limit } = c.req.valid("query");

      const rows = await db
        .select({
          id: brandKits.id,
          brandName: brandKits.brandName,
          extractedColors: brandKits.extractedColors,
          typographyStyle: brandKits.typographyStyle,
          customLogoUrl: sql<
            string | null
          >`COALESCE(${brandKits.customLogoUrl}, ${images.imageUrl})`.as(
            "customLogoUrl",
          ),
          industry: brandKits.industry,
          status: brandKits.status,
          generationProgress: brandKits.generationProgress,
          generationStage: brandKits.generationStage,
          creditsUsed: brandKits.creditsUsed,
          createdAt: brandKits.createdAt,
          updatedAt: brandKits.updatedAt,
        })
        .from(brandKits)
        .leftJoin(images, eq(brandKits.sourceImageId, images.id))
        .where(
          and(
            eq(brandKits.userId, user.id),
            cursor ? lt(brandKits.createdAt, new Date(cursor)) : undefined,
          ),
        )
        .orderBy(desc(brandKits.createdAt))
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      const items = rows.slice(0, limit);

      return c.json({
        items,
        nextCursor: hasMore
          ? (items[items.length - 1]?.createdAt.toISOString() ?? null)
          : null,
      });
    },
  )
  .post(
    "/:id/edit",
    requireAuth,
    zValidator("json", brandKitDeterministicEditSchema, validationHook),
    async (c) => {
      const db = c.get("db");
      const user = c.get("user");
      const brandKitId = c.req.param("id");
      const edit = c.req.valid("json");

      const [activeRevision] = await db
        .select({
          id: brandKitRevisions.id,
          revisionNumber: brandKitRevisions.revisionNumber,
          results: brandKitRevisions.results,
        })
        .from(brandKitRevisions)
        .innerJoin(brandKits, eq(brandKitRevisions.brandKitId, brandKits.id))
        .where(
          and(
            eq(brandKitRevisions.brandKitId, brandKitId),
            eq(brandKitRevisions.isActive, true),
            eq(brandKits.userId, user.id),
          ),
        )
        .limit(1);

      if (!activeRevision) throw new NotFoundError("Active brand kit revision");
      if (activeRevision.id !== edit.baseRevisionId) {
        throw new RevisionConflictError();
      }
      if (await findActiveRefinement(db, brandKitId, user.id)) {
        throw new RefinementInProgressError();
      }

      const currentResults = activeRevision.results as Record<string, unknown>;
      const nextResults = { ...currentResults };
      let sectionId: "typography" | "color-palette";
      let targetItemId: string | null = null;
      let label: string;

      if (edit.action === "set-font") {
        const typography = currentResults.typography as
          | Record<"heading" | "body", Record<string, unknown>>
          | undefined;
        if (!typography?.[edit.role]) {
          throw new BadRequestError(
            "Typography is missing from this brand kit",
          );
        }
        nextResults.typography = {
          ...typography,
          [edit.role]: {
            ...typography[edit.role],
            family: edit.family,
            name: edit.family,
          },
        };
        sectionId = "typography";
        targetItemId = edit.role;
        label = `Set ${edit.role} font to ${edit.family}`;
      } else {
        nextResults.colorPalette = edit.colors.map((color) => ({
          hex: color.hex,
          role: color.role,
          rgb: hexToRgb(color.hex),
        }));
        sectionId = "color-palette";
        label = "Updated Color Palette";
      }

      if (deepEqual(currentResults, nextResults)) {
        return c.json({
          status: "unchanged" as const,
          revisionId: activeRevision.id,
          revisionNumber: activeRevision.revisionNumber,
        });
      }

      const revisionId = createId();
      try {
        await db.batch([
          db
            .update(brandKitRevisions)
            .set({ isActive: false })
            .where(
              and(
                eq(brandKitRevisions.id, activeRevision.id),
                eq(brandKitRevisions.isActive, true),
              ),
            ),
          db.insert(brandKitRevisions).values({
            id: revisionId,
            brandKitId,
            isActive: true,
            revisionNumber: sql<number>`(
              SELECT COALESCE(MAX(${brandKitRevisions.revisionNumber}), 0) + 1
              FROM ${brandKitRevisions}
              WHERE ${brandKitRevisions.brandKitId} = ${brandKitId}
            )`,
            label,
            revisionType: "manual_edit",
            sectionId,
            targetItemId,
            sourceRevisionId: activeRevision.id,
            triggerType: `manual_${edit.action}:${revisionId}`,
            results: nextResults,
          }),
        ]);
      } catch (error) {
        const latestRevision = await db.query.brandKitRevisions.findFirst({
          where: and(
            eq(brandKitRevisions.brandKitId, brandKitId),
            eq(brandKitRevisions.isActive, true),
          ),
        });
        if (latestRevision?.id !== activeRevision.id) {
          throw new RevisionConflictError();
        }
        throw error;
      }

      return c.json(
        {
          status: "updated" as const,
          revisionId,
          revisionNumber: activeRevision.revisionNumber + 1,
        },
        201,
      );
    },
  )
  .post(
    "/:id/refine",
    requireAuth,
    zValidator("json", refineBrandKitSectionSchema, validationHook),
    async (c) => {
      const db = c.get("db");
      const user = c.get("user");
      const id = c.req.param("id");
      const data = c.req.valid("json");

      const [brandKit] = await db
        .select()
        .from(brandKits)
        .where(and(eq(brandKits.id, id), eq(brandKits.userId, user.id)));
      if (!brandKit) throw new NotFoundError("Brand kit");

      const activeRevision = await db.query.brandKitRevisions.findFirst({
        where: and(
          eq(brandKitRevisions.brandKitId, id),
          eq(brandKitRevisions.isActive, true),
        ),
      });
      if (!activeRevision || !activeRevision.results) {
        throw new BadRequestError("No active revision to refine");
      }

      if (await findActiveRefinement(db, id, user.id)) {
        throw new RefinementInProgressError();
      }

      const results = activeRevision.results as Record<string, unknown>;
      if (data.sectionId === "business-card") {
        const businessCard = results.businessCard as
          | Record<string, string>
          | undefined;
        if (!businessCard) {
          throw new BadRequestError(
            "Business card does not exist in active revision",
          );
        }
        const requiredSides = data.targetItemId
          ? [data.targetItemId]
          : ["front", "back"];
        for (const side of requiredSides) {
          if (!businessCard[`${side}Url`]) {
            throw new BadRequestError(
              `Business card ${side} does not exist in active revision`,
            );
          }
        }
      } else if (data.sectionId === "brand-presentation") {
        const presentation = results.brandPresentation as
          | { presentationUrl?: string }
          | undefined;
        if (
          !presentation?.presentationUrl ||
          presentation.presentationUrl.includes("placehold.co")
        ) {
          throw new BadRequestError(
            "Brand Presentation does not exist in the active revision",
          );
        }
      } else if (data.sectionId === "brand-guidelines") {
        if (!results.brandGuidelines) {
          throw new BadRequestError(
            "Brand Guidelines do not exist in the active revision",
          );
        }
      } else if (data.sectionId === "brand-graphics") {
        const graphics = (results.brandGraphics ?? results.brandedBackdrops) as
          | Record<string, string>
          | undefined;
        if (!graphics) {
          throw new BadRequestError(
            "Brand graphics do not exist in the active revision",
          );
        }
        const requiredGraphics = data.targetItemId
          ? [data.targetItemId]
          : ["backdrop-post", "backdrop-story"];
        for (const targetId of requiredGraphics) {
          const url =
            targetId === "backdrop-post"
              ? (graphics.backdropPostUrl ?? graphics.feedUrl)
              : (graphics.backdropStoryUrl ?? graphics.storyUrl);
          if (!url || url.includes("placehold.co")) {
            throw new BadRequestError(
              `Brand graphic ${targetId} does not exist in the active revision`,
            );
          }
        }
      } else if (data.targetItemId) {
        if (data.sectionId === "social-media") {
          const socialAssets = results.socialMedia;
          if (!Array.isArray(socialAssets))
            throw new BadRequestError(
              "Social media assets do not exist in active revision",
            );

          const found = socialAssets.some(
            (asset: { platform: string; type: string }) =>
              getSocialAssetTargetId(asset) === data.targetItemId,
          );
          if (!found)
            throw new BadRequestError(
              `Social asset '${data.targetItemId}' does not exist in active revision`,
            );
        }
      }

      const cost = computeBrandKitRefinementCost(
        data.sectionId,
        data.targetItemId,
      );
      const refinementId = createId();

      const createdRefinement = await db
        .insert(brandKitRefinements)
        .values({
          id: refinementId,
          brandKitId: id,
          baseRevisionId: activeRevision.id,
          sectionId: data.sectionId,
          targetItemId: data.targetItemId,
          prompt: data.refinementPrompt,
          creditsUsed: cost,
        })
        .onConflictDoNothing()
        .returning({ id: brandKitRefinements.id });
      if (createdRefinement.length === 0) {
        throw new RefinementInProgressError();
      }

      try {
        await deductCredits(db, user.id, cost);
      } catch (error) {
        await db
          .delete(brandKitRefinements)
          .where(eq(brandKitRefinements.id, refinementId));
        throw error;
      }

      try {
        await c.env.GENERATION_QUEUE.send(
          {
            type: "brand-kit-refine",
            refinementId,
            brandKitId: id,
            userId: user.id,
            creditsUsed: cost,
            ...data,
          },
          { contentType: "json" },
        );
      } catch (error) {
        const refunded = await refundCreditsOnce(db, {
          refundId: `brand-kit-refine-enqueue:${refinementId}`,
          userId: user.id,
          credits: cost,
          reason: "brand_kit_refinement_enqueue_failed",
        });
        const now = new Date();
        await db
          .update(brandKitRefinements)
          .set({
            status: "failed",
            errorMessage: "Unable to queue refinement",
            ...(refunded && { refundedAt: now }),
            completedAt: now,
            updatedAt: now,
          })
          .where(eq(brandKitRefinements.id, refinementId));
        throw error;
      }

      return c.json({ refinementId, status: "queued" as const }, 202);
    },
  )
  .get("/:id/refinements/:refinementId", requireAuth, async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    const brandKitId = c.req.param("id");
    const refinementId = c.req.param("refinementId");

    await recoverStaleBrandKitRefinement(db, {
      brandKitId,
      userId: user.id,
      refinementId,
    });

    const refinement = await db
      .select({
        id: brandKitRefinements.id,
        sectionId: brandKitRefinements.sectionId,
        targetItemId: brandKitRefinements.targetItemId,
        status: brandKitRefinements.status,
        creditsUsed: brandKitRefinements.creditsUsed,
        errorMessage: brandKitRefinements.errorMessage,
        refundedAt: brandKitRefinements.refundedAt,
        baseRevisionId: brandKitRefinements.baseRevisionId,
        resultRevisionId: brandKitRefinements.resultRevisionId,
        createdAt: brandKitRefinements.createdAt,
        completedAt: brandKitRefinements.completedAt,
      })
      .from(brandKitRefinements)
      .innerJoin(brandKits, eq(brandKitRefinements.brandKitId, brandKits.id))
      .where(
        and(
          eq(brandKitRefinements.id, refinementId),
          eq(brandKitRefinements.brandKitId, brandKitId),
          eq(brandKits.userId, user.id),
        ),
      )
      .limit(1);

    if (!refinement[0]) throw new NotFoundError("Refinement");
    return c.json({ refinement: refinement[0] });
  })
  .get("/:id", requireAuth, async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    const id = c.req.param("id");

    const [brandKit] = await db
      .select()
      .from(brandKits)
      .where(and(eq(brandKits.id, id), eq(brandKits.userId, user.id)));
    if (!brandKit) throw new NotFoundError("Brand kit");

    const [revisions, activeRefinement] = await Promise.all([
      db
        .select({
          ...getTableColumns(brandKitRevisions),
          refinementPrompt: brandKitRefinements.prompt,
        })
        .from(brandKitRevisions)
        .leftJoin(
          brandKitRefinements,
          eq(brandKitRefinements.resultRevisionId, brandKitRevisions.id),
        )
        .where(eq(brandKitRevisions.brandKitId, id))
        .orderBy(brandKitRevisions.revisionNumber),
      findActiveRefinement(db, id, user.id),
    ]);

    return c.json({ brandKit, revisions, activeRefinement });
  })
  .post(
    "/:id/restore-section",
    requireAuth,
    zValidator("json", restoreSectionSchema, validationHook),
    async (c) => {
      const db = c.get("db");
      const user = c.get("user");
      const id = c.req.param("id");
      const { sourceRevisionId, sectionId } = c.req.valid("json");

      const [brandKit] = await db
        .select()
        .from(brandKits)
        .where(and(eq(brandKits.id, id), eq(brandKits.userId, user.id)));
      if (!brandKit) throw new NotFoundError("Brand kit");
      if (await findActiveRefinement(db, id, user.id)) {
        throw new RefinementInProgressError();
      }

      const activeRevision = await db.query.brandKitRevisions.findFirst({
        where: and(
          eq(brandKitRevisions.brandKitId, id),
          eq(brandKitRevisions.isActive, true),
        ),
      });

      const sourceRevision = await db.query.brandKitRevisions.findFirst({
        where: and(
          eq(brandKitRevisions.id, sourceRevisionId),
          eq(brandKitRevisions.brandKitId, id),
        ),
      });

      if (!activeRevision || !sourceRevision) {
        throw new BadRequestError("Revisions not found");
      }

      const currentResults = activeRevision.results as Record<string, unknown>;
      const sourceResults = sourceRevision.results as Record<string, unknown>;

      if (deepEqual(currentResults, sourceResults)) {
        return c.json({ status: "success" });
      }

      const newMergedJSON = { ...currentResults };

      // depending on sectionId, map it to the JSON key
      const sectionKeyMap: Record<string, string> = {
        "color-palette": "colorPalette",
        typography: "typography",
        "logo-variations": "logoVariations",
        "social-media": "socialMedia",
        "business-card": "businessCard",
        favicon: "favicons",
        "brand-graphics": "brandGraphics",
        "brand-presentation": "brandPresentation",
        "brand-guidelines": "brandGuidelines",
      };

      const key = sectionKeyMap[sectionId];
      if (key) {
        if (Object.prototype.hasOwnProperty.call(sourceResults, key)) {
          newMergedJSON[key] = sourceResults[key];
        } else {
          delete newMergedJSON[key];
        }
      }

      if (deepEqual(currentResults, newMergedJSON)) {
        return c.json({ status: "success" });
      }

      const [maxRev] = await db
        .select({ max: sql<number>`MAX(revision_number)` })
        .from(brandKitRevisions)
        .where(eq(brandKitRevisions.brandKitId, id));

      await db.batch([
        db
          .update(brandKitRevisions)
          .set({ isActive: false })
          .where(
            and(
              eq(brandKitRevisions.brandKitId, id),
              eq(brandKitRevisions.isActive, true),
            ),
          ),

        db.insert(brandKitRevisions).values({
          brandKitId: id,
          isActive: true,
          revisionNumber: (maxRev?.max || 0) + 1,
          label: `Restored ${getSectionLabel(sectionId)} from V${sourceRevision.revisionNumber}`,
          revisionType: "section_restore",
          sectionId,
          sourceRevisionId,
          triggerType: `restore_${sectionId}`,
          results: newMergedJSON,
        }),
      ]);

      return c.json({ status: "success" });
    },
  )
  .post(
    "/:id/restore-full",
    requireAuth,
    zValidator("json", restoreFullBrandKitSchema, validationHook),
    async (c) => {
      const db = c.get("db");
      const user = c.get("user");
      const id = c.req.param("id");
      const { sourceRevisionId } = c.req.valid("json");

      const [brandKit] = await db
        .select()
        .from(brandKits)
        .where(and(eq(brandKits.id, id), eq(brandKits.userId, user.id)));
      if (!brandKit) throw new NotFoundError("Brand kit");
      if (await findActiveRefinement(db, id, user.id)) {
        throw new RefinementInProgressError();
      }

      const activeRevision = await db.query.brandKitRevisions.findFirst({
        where: and(
          eq(brandKitRevisions.brandKitId, id),
          eq(brandKitRevisions.isActive, true),
        ),
      });

      const sourceRevision = await db.query.brandKitRevisions.findFirst({
        where: and(
          eq(brandKitRevisions.id, sourceRevisionId),
          eq(brandKitRevisions.brandKitId, id),
        ),
      });

      if (!activeRevision || !sourceRevision) {
        throw new BadRequestError("Revisions not found");
      }

      if (activeRevision.id === sourceRevision.id) {
        throw new BadRequestError(
          "Cannot restore to the currently active revision",
        );
      }

      const sourceResults = sourceRevision.results as Record<string, unknown>;

      if (deepEqual(activeRevision.results, sourceResults)) {
        return c.json({ status: "success" });
      }

      const [maxRev] = await db
        .select({ max: sql<number>`MAX(revision_number)` })
        .from(brandKitRevisions)
        .where(eq(brandKitRevisions.brandKitId, id));
      const revisionId = createId();

      await db.batch([
        db
          .update(brandKitRevisions)
          .set({ isActive: false })
          .where(
            and(
              eq(brandKitRevisions.brandKitId, id),
              eq(brandKitRevisions.isActive, true),
            ),
          ),
        db.insert(brandKitRevisions).values({
          id: revisionId,
          brandKitId: id,
          isActive: true,
          revisionNumber: (maxRev?.max || 0) + 1,
          label: `Restored full kit from V${sourceRevision.revisionNumber}`,
          revisionType: "full_restore",
          sourceRevisionId,
          triggerType: `restore_full:${sourceRevisionId}`,
          results: sourceResults,
        }),
      ]);

      return c.json({ status: "success", revisionId });
    },
  );

export type BrandKitsType = typeof brandKitsRoute;
export default brandKitsRoute;
