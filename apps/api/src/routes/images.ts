import { Hono } from "hono";
import { images, projects, eq, desc } from "@quicklogo/db";
import type { Bindings, Variables } from "../types";
import { requireAuth } from "../middleware/require-auth";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>().get(
  "/:id",
  requireAuth,
  async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    const imageId = c.req.param("id");

    try {
      const [image] = await db
        .select()
        .from(images)
        .where(eq(images.id, imageId))
        .limit(1);

      if (!image) {
        return c.json({ error: "Image not found", code: "NOT_FOUND" }, 404);
      }

      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, image.projectId))
        .limit(1);

      if (!project || project.userId !== user.id) {
        return c.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, 403);
      }

      const history = await db
        .select()
        .from(images)
        .where(eq(images.projectId, image.projectId))
        .orderBy(desc(images.createdAt));

      return c.json(
        {
          image,
          history,
        },
        200,
      );
    } catch (error) {
      console.error("[generate:id] Internal error:", error);
      return c.json(
        {
          error: "Something went wrong. Please try again.",
          code: "INTERNAL_ERROR",
        },
        500,
      );
    }
  },
);

export default app;
export type ImagesType = typeof app;
