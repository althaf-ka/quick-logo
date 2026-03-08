import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createId } from "@paralleldrive/cuid2";
import {
  generateApiRequestSchema,
  editApiRequestSchema,
} from "@quicklogo/shared";
import { projects, images, users, eq, sql } from "@quicklogo/db";
import { getModelCredits } from "@quicklogo/ai-providers/models";
import type { Bindings, Variables } from "../types";
import { requireAuth } from "../middleware/require-auth";
import { validationHook } from "../lib/validator";
import { InsufficientCreditsError, UserNotFoundError } from "../lib/errors";

const generate = new Hono<{ Bindings: Bindings; Variables: Variables }>()
  .post(
    "/",
    requireAuth,
    zValidator("json", generateApiRequestSchema, validationHook),
    async (c) => {
      const db = c.get("db");
      const user = c.get("user");
      const { prompt, config } = c.req.valid("json");

      const creditsPerImage = getModelCredits(config.model);
      const totalCredits = creditsPerImage * config.imageCount;

      try {
        const [updated] = await db
          .update(users)
          .set({ credits: sql`${users.credits} - ${totalCredits}` })
          .where(
            sql`${users.id} = ${user.id} AND ${users.credits} >= ${totalCredits}`,
          )
          .returning({ credits: users.credits });

        if (!updated) {
          const [existing] = await db
            .select({ credits: users.credits })
            .from(users)
            .where(eq(users.id, user.id))
            .limit(1);

          if (!existing) throw new UserNotFoundError();
          throw new InsufficientCreditsError(totalCredits, existing.credits);
        }

        const batchId = createId();

        const projectsData = Array.from({ length: config.imageCount }, () => ({
          id: createId(),
          userId: user.id,
          batchId,
          referenceImgUrl: config.referenceImageUrl ?? null,
        }));

        const imagesData = projectsData.map((project) => ({
          id: createId(),
          projectId: project.id,
          parentId: null,
          prompt,
          model: config.model,
          config,
          status: "pending" as const,
          creditsUsed: creditsPerImage,
        }));

        const [createdProjects, createdImages] = await db.batch([
          db.insert(projects).values(projectsData).returning(),
          db.insert(images).values(imagesData).returning(),
        ]);

        await c.env.GENERATION_QUEUE.sendBatch(
          createdImages.map((img) => ({
            body: {
              imageId: img.id,
              projectId: img.projectId,
              userId: user.id,
              prompt,
              config,
            },
          })),
        );

        return c.json(
          {
            batchId,
            projects: createdProjects.map((p, i) => ({
              id: p.id,
              imageId: createdImages[i].id,
              status: "pending" as const,
            })),
          },
          202,
        );
      } catch (error) {
        if (error instanceof InsufficientCreditsError) {
          return c.json(
            {
              error: error.message,
              code: error.code,
              required: error.required,
              available: error.available,
            },
            402,
          );
        }

        if (error instanceof UserNotFoundError) {
          return c.json({ error: error.message, code: error.code }, 404);
        }

        console.error("[generate] Internal error:", error);
        return c.json(
          {
            error: "Something went wrong. Please try again.",
            code: "INTERNAL_ERROR",
          },
          500,
        );
      }
    },
  )
  .post(
    "/edit",
    requireAuth,
    zValidator("json", editApiRequestSchema, validationHook),
    async (c) => {
      const db = c.get("db");
      const user = c.get("user");
      const { prompt, config, sourceImageId } = c.req.valid("json");

      const creditsPerImage = getModelCredits(config.model);
      const totalCredits = creditsPerImage * config.imageCount;

      try {
        // Ensure source image exists and extract projectId
        const [sourceImage] = await db
          .select({ projectId: images.projectId })
          .from(images)
          .where(eq(images.id, sourceImageId))
          .limit(1);

        if (!sourceImage) {
          return c.json(
            { error: "Source image not found", code: "NOT_FOUND" },
            404,
          );
        }

        const { projectId } = sourceImage;

        // Ensure project exists and belongs to user
        const [project] = await db
          .select({ id: projects.id })
          .from(projects)
          .where(eq(projects.id, projectId))
          .limit(1);

        if (!project) {
          return c.json(
            { error: "Unauthorized or missing project", code: "UNAUTHORIZED" },
            403,
          );
        }

        const [updated] = await db
          .update(users)
          .set({ credits: sql`${users.credits} - ${totalCredits}` })
          .where(
            sql`${users.id} = ${user.id} AND ${users.credits} >= ${totalCredits}`,
          )
          .returning({ credits: users.credits });

        if (!updated) {
          const [existing] = await db
            .select({ credits: users.credits })
            .from(users)
            .where(eq(users.id, user.id))
            .limit(1);

          if (!existing) throw new UserNotFoundError();
          throw new InsufficientCreditsError(totalCredits, existing.credits);
        }

        // No new batch or project created for edits, just link to same project and parent
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
            imageId: createdImages[0].id,
            status: "pending" as const,
          },
          202,
        );
      } catch (error) {
        if (error instanceof InsufficientCreditsError) {
          return c.json(
            {
              error: error.message,
              code: error.code,
              required: error.required,
              available: error.available,
            },
            402,
          );
        }

        if (error instanceof UserNotFoundError) {
          return c.json({ error: error.message, code: error.code }, 404);
        }

        console.error("[generate/edit] Internal error:", error);
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

export default generate;
export type GenerateType = typeof generate;
