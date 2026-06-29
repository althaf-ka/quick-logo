import { zValidator } from "@hono/zod-validator";
import { createId } from "@paralleldrive/cuid2";
import { getModelCredits } from "@quicklogo/ai-providers/models";
import { projects, images, eq, and } from "@quicklogo/db";
import { editApiRequestSchema } from "@quicklogo/shared";
import { Hono } from "hono";
import { z } from "zod";
import { deductCredits } from "../lib/credits";
import { NotFoundError, ForbiddenError } from "../lib/errors";
import { validationHook } from "../lib/validator";
import { requireAuth } from "../middleware/require-auth";
import type { Bindings, Variables } from "../types";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()
  .post(
    "/ai-edit",
    requireAuth,
    zValidator("json", editApiRequestSchema, validationHook),
    async (c) => {
      const db = c.get("db");
      const user = c.get("user");
      const { prompt, config, sourceImageId } = c.req.valid("json");

      const creditsPerImage = getModelCredits(config.model);
      const totalCredits = creditsPerImage * config.imageCount;

      const [sourceImage] = await db
        .select({ projectId: images.projectId })
        .from(images)
        .where(eq(images.id, sourceImageId))
        .limit(1);

      if (!sourceImage) {
        throw new NotFoundError("Source image");
      }

      const { projectId } = sourceImage;

      const [project] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)))
        .limit(1);

      if (!project) {
        throw new ForbiddenError();
      }

      await deductCredits(db, user.id, totalCredits);

      const imagesData = Array.from({ length: config.imageCount }, () => ({
        id: createId(),
        projectId: projectId,
        parentId: sourceImageId,
        prompt,
        model: config.model,
        config,
        status: "pending" as const,
        creditsUsed: creditsPerImage,
      }));

      const [createdImages] = await db.batch([
        db.insert(images).values(imagesData).returning(),
      ]);

      await c.env.GENERATION_QUEUE.sendBatch(
        createdImages.map((img) => ({
          body: {
            imageId: img.id,
            projectId: img.projectId,
            userId: user.id,
            prompt,
            isEdit: true,
            config,
          },
        })),
      );

      return c.json(
        {
          imageId: createdImages[0]?.id,
          status: "pending" as const,
        },
        202,
      );
    },
  )
  .put(
    "/:id/state",
    requireAuth,
    zValidator(
      "json",
      z.object({
        canvasState: z.string(),
      }),
    ),
    async (c) => {
      const db = c.get("db");
      const user = c.get("user");
      const imageId = c.req.param("id");
      const { canvasState } = c.req.valid("json");

      const [image] = await db
        .select()
        .from(images)
        .where(eq(images.id, imageId))
        .limit(1);

      if (!image) throw new NotFoundError("Image");

      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, image.projectId))
        .limit(1);

      if (!project || project.userId !== user.id) throw new ForbiddenError();

      await db
        .update(images)
        .set({ canvasState })
        .where(eq(images.id, imageId));

      return c.json({ success: true });
    },
  );

export default app;
export type CanvasType = typeof app;
