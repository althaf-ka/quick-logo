import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";
import {
  generateBrandKitSchema,
  refineBrandKitSectionSchema,
  restoreSectionSchema,
  buildBrandContextSummary,
  listQuerySchema,
} from "@quicklogo/shared";
import {
  brandKits,
  brandKitRevisions,
  users,
  images,
  eq,
  lt,
  sql,
  and,
  desc,
} from "@quicklogo/db";
import { requireAuth } from "../middleware/require-auth";
import { validationHook } from "../lib/validator";
import {
  InsufficientCreditsError,
  NotFoundError,
  BadRequestError,
} from "../lib/errors";
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

      let cost = 5;
      if (data.deliverables.logoVariations) cost += 2;
      if (data.deliverables.socialMedia) cost += 3;
      if (data.deliverables.businessCard) cost += 2;
      if (data.deliverables.favicon) cost += 1;
      if (data.deliverables.brandPresentation) cost += 3;
      if (data.deliverables.brandGuidelines) cost += 0; // V1: no extra cost

      const [updated] = await db
        .update(users)
        .set({ credits: sql`${users.credits} - ${cost}` })
        .where(sql`${users.id} = ${user.id} AND ${users.credits} >= ${cost}`)
        .returning({ credits: users.credits });

      if (!updated) throw new InsufficientCreditsError(cost, user.credits);

      const promptSummary = buildBrandContextSummary(data, data.prompt);

      const brandKitId = createId();
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
      });

      await c.env.GENERATION_QUEUE.send({
        type: "brand-kit-generate",
        brandKitId,
        ...data,
        prompt: promptSummary,
        brandName: data.brandName || "",
      });

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

      const cost = 2; // Refinement cost
      const [updated] = await db
        .update(users)
        .set({ credits: sql`${users.credits} - ${cost}` })
        .where(sql`${users.id} = ${user.id} AND ${users.credits} >= ${cost}`)
        .returning({ credits: users.credits });

      if (!updated) throw new InsufficientCreditsError(cost, user.credits);

      await c.env.GENERATION_QUEUE.send({
        type: "brand-kit-refine",
        brandKitId: id,
        ...data,
      });

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

      let newMergedJSON = { ...currentResults };

      // depending on sectionId, map it to the JSON key
      const sectionKeyMap: Record<string, string> = {
        "color-palette": "colorPalette",
        typography: "typography",
        "logo-variations": "logoVariations",
        "social-media": "socialMedia",
        "business-card": "businessCard",
        favicon: "favicons",
      };

      const key = sectionKeyMap[sectionId];
      if (key && sourceResults[key]) {
        newMergedJSON[key] = sourceResults[key];
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
  );

export type BrandKitsType = typeof brandKitsRoute;
export default brandKitsRoute;
