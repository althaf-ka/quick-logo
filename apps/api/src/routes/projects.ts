import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { projects, images, users, eq, lt, desc, and, sql } from "@quicklogo/db";
import { ImageKitProvider } from "@quicklogo/storage";
import { listQuerySchema } from "@quicklogo/shared";
import type { Bindings, Variables } from "../types";
import { requireAuth } from "../middleware/require-auth";
import { validationHook } from "../lib/validator";
import { InsufficientCreditsError, NotFoundError } from "../lib/errors";
import { createLogger } from "@quicklogo/server-telemetry";

const logger = createLogger("api");

const EXTEND_COST = 10;
const EXTEND_DAYS = 30;

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

  .get(
    "/",
    requireAuth,
    zValidator("query", listQuerySchema, validationHook),
    async (c) => {
      const db = c.get("db");
      const user = c.get("user");
      const { cursor, limit } = c.req.valid("query");

      const latestImageAgg = db
        .select({
          projectId: images.projectId,
          maxCreatedAt: sql<number>`MAX(${images.createdAt})`.as(
            "max_created_at",
          ),
        })
        .from(images)
        .groupBy(images.projectId)
        .as("latest_image_agg");

      const latestImage = db
        .select({
          projectId: images.projectId,
          imageId: images.id,
          status: images.status,
        })
        .from(images)
        .innerJoin(
          latestImageAgg,
          and(
            eq(images.projectId, latestImageAgg.projectId),
            eq(images.createdAt, latestImageAgg.maxCreatedAt)
          )
        )
        .as("latest_image");

      const rows = await db
        .select({
          id: projects.id,
          batchId: projects.batchId,
          latestThumbnail: projects.latestThumbnail,
          referenceImgUrl: projects.referenceImgUrl,
          referenceImgId: projects.referenceImgId,
          createdAt: projects.createdAt,
          expiresAt: projects.expiresAt,
          latestImageId: latestImage.imageId,
          imageStatus: latestImage.status,
        })
        .from(projects)
        .leftJoin(latestImage, eq(latestImage.projectId, projects.id))
        .where(
          and(
            eq(projects.userId, user.id),
            cursor ? lt(projects.createdAt, new Date(cursor)) : undefined,
          ),
        )
        .orderBy(desc(projects.createdAt))
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      const items = rows.slice(0, limit).map((row) => ({
        id: row.id,
        batchId: row.batchId,
        latestThumbnail: row.latestThumbnail,
        referenceImgUrl: row.referenceImgUrl,
        latestImageId: row.latestImageId,
        createdAt: row.createdAt,
        expiresAt: row.expiresAt,
        status:
          row.imageStatus === "pending" || row.imageStatus === "processing"
            ? ("generating" as const)
            : ("completed" as const),
      }));

      return c.json({
        items,
        nextCursor: hasMore
          ? (items[items.length - 1]?.createdAt.toISOString() ?? null)
          : null,
      });
    },
  )

  .delete("/:id", requireAuth, async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    const { id } = c.req.param();

    const [project] = await db
      .select({
        id: projects.id,
        referenceImgId: projects.referenceImgId,
        userId: projects.userId,
      })
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, user.id)))
      .limit(1);

    if (!project) {
      throw new NotFoundError("Project");
    }

    const storage = new ImageKitProvider(c.env.IMAGEKIT_PRIVATE_KEY);

    await storage.deleteFolder(`quick-logo/${user.id}/${id}`).catch((err) => {
      logger.warn(`ImageKit folder delete failed for project`, {
        projectId: id,
        error: err,
      });
    });

    if (project.referenceImgId) {
      await storage.delete(project.referenceImgId).catch(() => {});
    }

    await db.delete(projects).where(eq(projects.id, id));

    return c.json({ success: true });
  })

  .post("/:id/extend", requireAuth, async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    const { id } = c.req.param();

    const [project] = await db
      .select({ id: projects.id, expiresAt: projects.expiresAt })
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, user.id)))
      .limit(1);

    if (!project) {
      throw new NotFoundError("Project");
    }

    const [updated] = await db
      .update(users)
      .set({ credits: sql`${users.credits} - ${EXTEND_COST}` })
      .where(
        and(eq(users.id, user.id), sql`${users.credits} >= ${EXTEND_COST}`),
      )
      .returning({ credits: users.credits });

    if (!updated) {
      throw new InsufficientCreditsError(EXTEND_COST, 0);
    }

    const newExpiry = new Date(project.expiresAt);
    newExpiry.setDate(newExpiry.getDate() + EXTEND_DAYS);

    await db
      .update(projects)
      .set({ expiresAt: newExpiry })
      .where(eq(projects.id, id));

    return c.json({
      expiresAt: newExpiry.toISOString(),
      credits: updated.credits,
    });
  });

export default app;
export type ProjectsType = typeof app;
