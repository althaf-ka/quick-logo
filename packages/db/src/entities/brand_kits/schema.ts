import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "../user/schema";
import { images } from "../images/schema";

export const brandKits = sqliteTable("brand_kit", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sourceImageId: text("source_image_id").references(() => images.id, {
    onDelete: "set null",
  }),
  customLogoUrl: text("custom_logo_url"),
  brandName: text("brand_name").notNull(),
  prompt: text("prompt").notNull(),
  productImageUrls: text("product_image_urls", { mode: "json" }), // Optional uploaded mockups
  extractedColors: text("extracted_colors", { mode: "json" }).notNull(),
  typographyStyle: text("typography_style").notNull().default("modern-sans"),

  // Structured Questionnaire Context
  industry: text("industry"),
  tagline: text("tagline"),
  targetAudience: text("target_audience"),
  brandPersonality: text("brand_personality"),
  additionalContext: text("additional_context"),
  selectedVibes: text("selected_vibes", { mode: "json" }),
  socials: text("socials", { mode: "json" }),
  contact: text("contact", { mode: "json" }),
  guidelines: text("guidelines", { mode: "json" }),
  socialMediaBrief: text("social_media_brief", { mode: "json" }),
  businessCardBrief: text("business_card_brief", { mode: "json" }),

  status: text("status", {
    enum: ["pending", "processing", "completed", "failed"],
  })
    .notNull()
    .default("pending"),
  errorMessage: text("error_message"),
  creditsUsed: integer("credits_used").notNull().default(0),
  requestedDeliverables: text("requested_deliverables", { mode: "json" }),
  generationProgress: integer("generation_progress").notNull().default(0),
  generationStage: text("generation_stage").notNull().default("Queued"),
  refundedAt: integer("refunded_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const brandKitRevisions = sqliteTable(
  "brand_kit_revision",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    brandKitId: text("brand_kit_id")
      .notNull()
      .references(() => brandKits.id, { onDelete: "cascade" }),
    isActive: integer("is_active", { mode: "boolean" })
      .notNull()
      .default(false),
    revisionNumber: integer("revision_number").notNull(),
    label: text("label"),
    revisionType: text("revision_type", {
      enum: [
        "initial",
        "refinement",
        "section_restore",
        "full_restore",
        "manual_edit",
      ],
    })
      .notNull()
      .default("initial"),
    sectionId: text("section_id"),
    targetItemId: text("target_item_id"),
    sourceRevisionId: text("source_revision_id"),
    // Provenance (e.g., "initial_generation", "refine_colors", "restore_typography")
    triggerType: text("trigger_type").notNull(),
    results: text("results", { mode: "json" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("brand_kit_revision_active_unique")
      .on(table.brandKitId)
      .where(sql`${table.isActive} = 1`),
    uniqueIndex("brand_kit_revision_number_unique").on(
      table.brandKitId,
      table.revisionNumber,
    ),
  ],
);

export const brandKitRefinements = sqliteTable(
  "brand_kit_refinement",
  {
    id: text("id").primaryKey(),
    brandKitId: text("brand_kit_id")
      .notNull()
      .references(() => brandKits.id, { onDelete: "cascade" }),
    baseRevisionId: text("base_revision_id")
      .notNull()
      .references(() => brandKitRevisions.id, { onDelete: "restrict" }),
    resultRevisionId: text("result_revision_id").references(
      () => brandKitRevisions.id,
      { onDelete: "set null" },
    ),
    sectionId: text("section_id").notNull(),
    targetItemId: text("target_item_id"),
    prompt: text("prompt").notNull(),
    status: text("status", {
      enum: ["queued", "processing", "completed", "failed"],
    })
      .notNull()
      .default("queued"),
    creditsUsed: integer("credits_used").notNull(),
    errorMessage: text("error_message"),
    refundedAt: integer("refunded_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    completedAt: integer("completed_at", { mode: "timestamp" }),
  },
  (table) => [
    uniqueIndex("brand_kit_refinement_one_active_per_kit")
      .on(table.brandKitId)
      .where(sql`${table.status} IN ('queued', 'processing')`),
    uniqueIndex("brand_kit_refinement_result_revision_unique").on(
      table.resultRevisionId,
    ),
  ],
);

export type BrandKit = typeof brandKits.$inferSelect;
export type BrandKitRevision = typeof brandKitRevisions.$inferSelect;
export type BrandKitRefinement = typeof brandKitRefinements.$inferSelect;
