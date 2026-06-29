import { zValidator } from "@hono/zod-validator";
import { createId } from "@paralleldrive/cuid2";
import { getModelCredits } from "@quicklogo/ai-providers/models";
import { projects, images } from "@quicklogo/db";
import { generateApiRequestSchema } from "@quicklogo/shared";
import { Hono } from "hono";
import { deductCredits } from "../lib/credits";
import { validationHook } from "../lib/validator";
import { requireAuth } from "../middleware/require-auth";
import type { Bindings, Variables } from "../types";

const generate = new Hono<{ Bindings: Bindings; Variables: Variables }>().post(
  "/",
  requireAuth,
  zValidator("json", generateApiRequestSchema, validationHook),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    const { prompt, config } = c.req.valid("json");

    const creditsPerImage = getModelCredits(config.model);
    const totalCredits = creditsPerImage * config.imageCount;

    await deductCredits(db, user.id, totalCredits);

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
