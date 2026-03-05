ALTER TABLE `project` ADD `latest_thumbnail` text;--> statement-breakpoint
ALTER TABLE `project` ADD `reference_img_url` text;--> statement-breakpoint
ALTER TABLE `project` ADD `reference_img_id` text;--> statement-breakpoint
ALTER TABLE `project` DROP COLUMN `thumbnail_url`;--> statement-breakpoint
ALTER TABLE `image` ADD `config` text;