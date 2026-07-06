import { zValidator } from "@hono/zod-validator";
import { projects, images, eq, lt, desc, and, sql } from "@quicklogo/db";
import { createLogger } from "@quicklogo/server-telemetry";
import { listQuerySchema } from "@quicklogo/shared";
import { ImageKitProvider } from "@quicklogo/storage";
import { Hono } from "hono";
import { NotFoundError } from "../lib/errors";
import { validationHook } from "../lib/validator";
import { requireAuth } from "../middleware/require-auth";
import type { Bindings, Variables } from "../types";

const logger = createLogger("api");

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
          errorMessage: images.errorMessage,
        })
        .from(images)
        .innerJoin(
          latestImageAgg,
          and(
            eq(images.projectId, latestImageAgg.projectId),
            eq(images.createdAt, latestImageAgg.maxCreatedAt),
          ),
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
          latestImageId: latestImage.imageId,
          imageStatus: latestImage.status,
          errorMessage: latestImage.errorMessage,
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
        errorMessage: row.errorMessage,
        status:
          row.imageStatus === "pending" || row.imageStatus === "processing"
            ? ("generating" as const)
            : row.imageStatus === "failed"
              ? ("failed" as const)
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
  });

export default app;
export type ProjectsType = typeof app;
