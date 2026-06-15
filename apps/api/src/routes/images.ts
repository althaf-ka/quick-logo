import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { images, projects, eq, desc } from "@quicklogo/db";
import type { Bindings, Variables } from "../types";
import { requireAuth } from "../middleware/require-auth";
import { ForbiddenError, NotFoundError } from "../lib/errors";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()
  .get("/:id", requireAuth, async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    const imageId = c.req.param("id");

    const [image] = await db
      .select()
      .from(images)
      .where(eq(images.id, imageId))
      .limit(1);

    if (!image) {
      throw new NotFoundError("Image");
    }

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, image.projectId))
      .limit(1);

    if (!project || project.userId !== user.id) {
      throw new ForbiddenError();
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
  })
  .post(
    "/:id/canvas-save",
    requireAuth,
    zValidator(
      "json",
      z.object({
        imageUrl: z.string().url(),
        prompt: z.string().optional(),
      }),
    ),
    async (c) => {
      const db = c.get("db");
      const user = c.get("user");
      const parentId = c.req.param("id");
      const { imageUrl, prompt } = c.req.valid("json");

      const [parentImage] = await db
        .select()
        .from(images)
        .where(eq(images.id, parentId))
        .limit(1);

      if (!parentImage) {
        throw new NotFoundError("Parent image");
      }

      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, parentImage.projectId))
        .limit(1);

      if (!project || project.userId !== user.id) {
        throw new ForbiddenError();
      }

      if (parentImage.model === "canvas") {
        // If it's already a canvas edit, update it in place to avoid duplicate history
        const [updatedImage] = await db
          .update(images)
          .set({
            imageUrl,
          })
          .where(eq(images.id, parentImage.id))
          .returning();

        await db
          .update(projects)
          .set({ latestThumbnail: imageUrl })
          .where(eq(projects.id, parentImage.projectId));

        return c.json({ imageId: updatedImage?.id }, 200);
      } else {
        // First time editing this image, branch out a new history record
        const [newImage] = await db
          .insert(images)
          .values({
            projectId: parentImage.projectId,
            parentId: parentImage.id,
            prompt: prompt || "Canvas Edit",
            model: "canvas",
            status: "completed",
            imageUrl,
            creditsUsed: 0,
          })
          .returning();

        await db
          .update(projects)
          .set({ latestThumbnail: imageUrl })
          .where(eq(projects.id, parentImage.projectId));

        return c.json({ imageId: newImage?.id }, 200);
      }
    },
  );

export default app;
export type ImagesType = typeof app;
