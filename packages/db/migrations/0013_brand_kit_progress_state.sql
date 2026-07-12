PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_brand_kit` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`source_image_id` text,
	`custom_logo_url` text,
	`brand_name` text NOT NULL,
	`prompt` text NOT NULL,
	`product_image_urls` text,
	`extracted_colors` text NOT NULL,
	`typography_style` text DEFAULT 'modern-sans' NOT NULL,
	`industry` text,
	`tagline` text,
	`target_audience` text,
	`brand_personality` text,
	`additional_context` text,
	`selected_vibes` text,
	`socials` text,
	`contact` text,
	`guidelines` text,
	`social_media_brief` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`error_message` text,
	`credits_used` integer DEFAULT 0 NOT NULL,
	`requested_deliverables` text,
	`generation_progress` integer DEFAULT 0 NOT NULL,
	`generation_stage` text DEFAULT 'Queued' NOT NULL,
	`refunded_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_image_id`) REFERENCES `image`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_brand_kit`("id", "user_id", "source_image_id", "custom_logo_url", "brand_name", "prompt", "product_image_urls", "extracted_colors", "typography_style", "industry", "tagline", "target_audience", "brand_personality", "additional_context", "selected_vibes", "socials", "contact", "guidelines", "social_media_brief", "status", "error_message", "credits_used", "requested_deliverables", "generation_progress", "generation_stage", "refunded_at", "created_at", "updated_at") SELECT "id", "user_id", "source_image_id", "custom_logo_url", "brand_name", "prompt", "product_image_urls", "extracted_colors", "typography_style", "industry", "tagline", "target_audience", "brand_personality", "additional_context", "selected_vibes", "socials", "contact", "guidelines", "social_media_brief", "status", "error_message", "credits_used", "requested_deliverables", COALESCE(CAST("generation_progress" AS INTEGER), 0), 'Queued', "refunded_at", "created_at", "updated_at" FROM `brand_kit`;--> statement-breakpoint
DROP TABLE `brand_kit`;--> statement-breakpoint
ALTER TABLE `__new_brand_kit` RENAME TO `brand_kit`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
