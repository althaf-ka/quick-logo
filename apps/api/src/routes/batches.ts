import { Hono } from "hono";
import { projects, images, eq, and } from "@quicklogo/db";
import type { Bindings, Variables } from "../types";
import { requireAuth } from "../middleware/require-auth";

type ImageStatus = "pending" | "processing" | "completed" | "failed";

function deriveBatchStatus(statuses: ImageStatus[]) {
  if (statuses.every((s) => s === "completed")) return "completed" as const;
  if (statuses.some((s) => s === "pending" || s === "processing"))
    return "processing" as const;
  return "completed_with_errors" as const;
}

const batches = new Hono<{ Bindings: Bindings; Variables: Variables }>().get(
  "/:batchId",
  requireAuth,
  async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    const { batchId } = c.req.param();

    const batchProjects = await db
      .select()
      .from(projects)
      .where(and(eq(projects.batchId, batchId), eq(projects.userId, user.id)));

    if (!batchProjects.length) {
      return c.json({ error: "Batch not found" }, 404);
    }

    const projectIds = batchProjects.map((p) => p.id);

    const allImages = await db.select().from(images).where(
      // D1 doesn't support inArray well, so we use a loop approach
      eq(images.projectId, projectIds[0]!),
    );

    
    if (projectIds.length > 1) {
      for (const pid of projectIds.slice(1)) {
        const moreImages = await db
          .select()
          .from(images)
          .where(eq(images.projectId, pid));
        allImages.push(...moreImages);
      }
    }

    const imagesByProject = new Map<string, typeof allImages>();
    for (const img of allImages) {
      const existing = imagesByProject.get(img.projectId) ?? [];
      existing.push(img);
      imagesByProject.set(img.projectId, existing);
    }

    const projectsWithImages = batchProjects.map((project) => {
      const projectImages = imagesByProject.get(project.id) ?? [];
      const latestImage = projectImages[0];

      return {
        id: project.id,
        latestThumbnail: project.latestThumbnail,
        latestImage: latestImage
          ? {
              id: latestImage.id,
              status: latestImage.status as ImageStatus,
              imageUrl: latestImage.imageUrl,
              thumbnail: latestImage.thumbnail,
              errorMessage: latestImage.errorMessage,
            }
          : null,
      };
    });

    const statuses = projectsWithImages
      .map((p) => p.latestImage?.status)
      .filter((s): s is ImageStatus => !!s);

    return c.json({
      batchId,
      status: statuses.length
        ? deriveBatchStatus(statuses)
        : ("processing" as const),
      projects: projectsWithImages,
    });
  },
);

export default batches;
export type BatchesType = typeof batches;
