import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";
import { InferSelectModel } from "drizzle-orm";
import { users } from "../user/schema";

export const transactions = sqliteTable("transaction", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("INR"),
  creditsAdded: integer("credits_added").notNull(),
  status: text("status", {
    enum: ["pending", "completed", "failed", "cancelled", "processing"],
  })
    .notNull()
    .default("pending"),
  dodoPaymentId: text("dodo_payment_id"),
  tierName: text("tier_name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type Transaction = InferSelectModel<typeof transactions>;
