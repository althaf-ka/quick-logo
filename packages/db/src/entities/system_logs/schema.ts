import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";
import type { InferSelectModel } from "drizzle-orm";
import { users } from "../user/schema";

export const systemLogs = sqliteTable("system_log", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  level: text("level", { enum: ["info", "warn", "error", "fatal"] })
    .notNull()
    .default("info"),
  source: text("source", { enum: ["web", "admin", "api"] }).notNull(),
  message: text("message").notNull(),
  stack: text("stack"),
  pathname: text("pathname"),
  context: text("context"), // JSON stringified context (browser info, request etc)
  userId: text("user_id").references(() => users.id),
  status: text("status", { enum: ["unresolved", "resolved", "ignored"] })
    .notNull()
    .default("unresolved"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type SystemLog = InferSelectModel<typeof systemLogs>;
