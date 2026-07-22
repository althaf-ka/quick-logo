CREATE TABLE `brand_kit_refinement` (
	`id` text PRIMARY KEY NOT NULL,
	`brand_kit_id` text NOT NULL,
	`base_revision_id` text NOT NULL,
	`result_revision_id` text,
	`section_id` text NOT NULL,
	`target_item_id` text,
	`prompt` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`credits_used` integer NOT NULL,
	`error_message` text,
	`refunded_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`brand_kit_id`) REFERENCES `brand_kit`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`base_revision_id`) REFERENCES `brand_kit_revision`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`result_revision_id`) REFERENCES `brand_kit_revision`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `brand_kit_refinement_one_active_per_kit` ON `brand_kit_refinement` (`brand_kit_id`) WHERE "brand_kit_refinement"."status" IN ('queued', 'processing');