import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "../user/schema";

export const projects = sqliteTable("project", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),

  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  batchId: text("batch_id").notNull(),
  latestThumbnail: text("latest_thumbnail"),
  referenceImgUrl: text("reference_img_url"),
  referenceImgId: text("reference_img_id"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  expiresAt: integer("expires_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      return d;
    }),
});
