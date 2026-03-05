CREATE TABLE `project` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`batch_id` text NOT NULL,
	`thumbnail_url` text,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `image` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`parent_id` text,
	`prompt` text NOT NULL,
	`enhanced_prompt` text,
	`model` text NOT NULL,
	`image_url` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`error_message` text,
	`credits_used` integer NOT NULL,
	`thumbnail` text,
	`imageId` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `user` ADD `credits` integer DEFAULT 0 NOT NULL;