import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createId } from "@paralleldrive/cuid2";
import {
  generateApiRequestSchema,
  editApiRequestSchema,
} from "@quicklogo/shared";
import { projects, images, users, eq, sql, and } from "@quicklogo/db";
import { getModelCredits } from "@quicklogo/ai-providers/models";
import type { Bindings, Variables } from "../types";
import { requireAuth } from "../middleware/require-auth";
import { validationHook } from "../lib/validator";
import {
  InsufficientCreditsError,
  UserNotFoundError,
  NotFoundError,
  ForbiddenError,
} from "../lib/errors";

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
            imageId: createdImages[i]?.id,
            status: "pending" as const,
          })),
        },
        202,
      );
    },
  );

export default generate;
export type GenerateType = typeof generate;
