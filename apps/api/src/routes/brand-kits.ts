import { zValidator } from "@hono/zod-validator";
import { createId } from "@paralleldrive/cuid2";
import {
  brandKits,
  brandKitRevisions,
  images,
  eq,
  lt,
  sql,
  and,
  desc,
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
} from "@quicklogo/shared";
import deepEqual from "fast-deep-equal";
import { Hono } from "hono";
import { deductCredits, refundCreditsOnce } from "../lib/credits";
import { NotFoundError, BadRequestError } from "../lib/errors";
import { validationHook } from "../lib/validator";
import { requireAuth } from "../middleware/require-auth";
import type { Bindings, Variables } from "../types";

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

      if (data.targetItemId) {
        const activeRevision = await db.query.brandKitRevisions.findFirst({
          where: and(
            eq(brandKitRevisions.brandKitId, id),
            eq(brandKitRevisions.isActive, true),
          ),
        });
        if (!activeRevision || !activeRevision.results) {
          throw new BadRequestError("No active revision to refine");
        }

        const results = activeRevision.results as Record<string, unknown>;

        if (data.sectionId === "business-card") {
          const bc = results.businessCard as Record<string, string> | undefined;
          if (!bc)
            throw new BadRequestError(
              "Business card does not exist in active revision",
            );
          if (data.targetItemId === "front" && !bc.frontUrl)
            throw new BadRequestError(
              "Business card front does not exist in active revision",
            );
          if (data.targetItemId === "back" && !bc.backUrl)
            throw new BadRequestError(
              "Business card back does not exist in active revision",
            );
        } else if (data.sectionId === "brand-graphics") {
          const bg = results.brandGraphics as
            | Record<string, string>
            | undefined;
          if (!bg)
            throw new BadRequestError(
              "Brand graphics do not exist in active revision",
            );
          const validItems = ["backdrop-post", "backdrop-story"];
          if (data.targetItemId && validItems.includes(data.targetItemId)) {
            const urlKey =
              data.targetItemId.replace(/-([a-z])/g, (_: string, c: string) =>
                c.toUpperCase(),
              ) + "Url";
            if (!bg[urlKey])
              throw new BadRequestError(
                `Brand graphic ${data.targetItemId} does not exist in active revision`,
              );
          }
        } else if (data.sectionId === "social-media") {
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
      await deductCredits(db, user.id, cost);
      const refinementId = createId();

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
        await refundCreditsOnce(db, {
          refundId: `brand-kit-refine-enqueue:${refinementId}`,
          userId: user.id,
          credits: cost,
          reason: "brand_kit_refinement_enqueue_failed",
        });
        throw error;
      }

      return c.json({ status: "processing" }, 202);
    },
  )
  .get("/:id", requireAuth, async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    const id = c.req.param("id");

    const [brandKit] = await db
      .select()
      .from(brandKits)
      .where(and(eq(brandKits.id, id), eq(brandKits.userId, user.id)));
    if (!brandKit) throw new NotFoundError("Brand kit");

    const revisions = await db
      .select()
      .from(brandKitRevisions)
      .where(eq(brandKitRevisions.brandKitId, id))
      .orderBy(brandKitRevisions.revisionNumber);

    return c.json({ brandKit, revisions });
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
      if (key && sourceResults[key]) {
        newMergedJSON[key] = sourceResults[key];
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

        db
          .update(brandKitRevisions)
          .set({ isActive: true })
          .where(eq(brandKitRevisions.id, sourceRevisionId)),
      ]);

      return c.json({ status: "success" });
    },
  );

export type BrandKitsType = typeof brandKitsRoute;
export default brandKitsRoute;
