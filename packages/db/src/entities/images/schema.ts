import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";
import { projects } from "../projects/schema";

export const images = sqliteTable("image", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  parentId: text("parent_id"),
  prompt: text("prompt").notNull(),
  enhancedPrompt: text("enhanced_prompt"),
  model: text("model").notNull(),
  config: text("config", { mode: "json" }),
  imageUrl: text("image_url"),
  canvasState: text("canvas_state"),
  status: text("status", {
    enum: ["pending", "processing", "completed", "failed"],
  })
    .notNull()
    .default("pending"),
  errorMessage: text("error_message"),
  creditsUsed: integer("credits_used").notNull(),
  refundedAt: integer("refunded_at", { mode: "timestamp" }),
  thumbnail: text("thumbnail"),
  imageId: text("imageId"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type Image = typeof images.$inferSelect;
