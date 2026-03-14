CREATE TABLE `system_log` (
	`id` text PRIMARY KEY NOT NULL,
	`level` text DEFAULT 'info' NOT NULL,
	`source` text NOT NULL,
	`message` text NOT NULL,
	`stack` text,
	`pathname` text,
	`context` text,
	`user_id` text,
	`status` text DEFAULT 'unresolved' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
