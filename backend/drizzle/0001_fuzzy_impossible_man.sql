CREATE TABLE `paste_permissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`paste_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`can_edit` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`paste_id`) REFERENCES `pastes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `users` ADD `role` text DEFAULT 'user' NOT NULL;