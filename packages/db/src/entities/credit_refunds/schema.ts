import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { users } from "../user/schema";

export const creditRefunds = sqliteTable("credit_refund", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  credits: integer("credits").notNull(),
  reason: text("reason").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type CreditRefund = typeof creditRefunds.$inferSelect;
