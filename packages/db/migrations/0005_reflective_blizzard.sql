CREATE TABLE `brand_kit_revision` (
	`id` text PRIMARY KEY NOT NULL,
	`brand_kit_id` text NOT NULL,
	`is_active` integer DEFAULT false NOT NULL,
	`revision_number` integer NOT NULL,
	`label` text,
	`trigger_type` text NOT NULL,
	`results` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`brand_kit_id`) REFERENCES `brand_kit`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `brand_kit` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`source_image_id` text,
	`custom_logo_url` text,
	`brand_name` text NOT NULL,
	`prompt` text NOT NULL,
	`product_image_urls` text,
	`extracted_colors` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`error_message` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_image_id`) REFERENCES `image`(`id`) ON UPDATE no action ON DELETE set null
);
