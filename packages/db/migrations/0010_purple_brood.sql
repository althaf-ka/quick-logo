CREATE TABLE `credit_refund` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`credits` integer NOT NULL,
	`reason` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `image` ADD `refunded_at` integer;--> statement-breakpoint
ALTER TABLE `brand_kit` ADD `credits_used` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `brand_kit` ADD `refunded_at` integer;--> statement-breakpoint
ALTER TABLE `project` DROP COLUMN `expires_at`;