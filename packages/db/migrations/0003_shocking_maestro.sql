CREATE TABLE `transaction` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text DEFAULT 'INR' NOT NULL,
	`credits_added` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`dodo_payment_id` text,
	`tier_name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
