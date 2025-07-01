CREATE TABLE `bookmarks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`url` text NOT NULL,
	`title` text NOT NULL,
	`created_at` text NOT NULL,
	`favicon` text,
	`folder` text DEFAULT 'default'
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bookmarks_url_unique` ON `bookmarks` (`url`);--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`chat_session_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`tool_invocations` text,
	`attachments` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `chat_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`page_url` text,
	`page_title` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	`is_active` integer DEFAULT true
);
--> statement-breakpoint
CREATE TABLE `downloads` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`filename` text NOT NULL,
	`file_size` integer DEFAULT 0,
	`downloaded_size` integer DEFAULT 0,
	`status` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text,
	`local_path` text,
	`mime_type` text,
	`error` text,
	`progress` real DEFAULT 0,
	`speed` integer DEFAULT 0,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`url` text NOT NULL,
	`title` text NOT NULL,
	`visited_at` text NOT NULL,
	`favicon` text
);
--> statement-breakpoint
CREATE TABLE `user_scripts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`author` text,
	`version` text,
	`enabled` integer DEFAULT true,
	`code` text NOT NULL,
	`includes` text NOT NULL,
	`excludes` text DEFAULT '[]',
	`grants` text DEFAULT '["none"]',
	`run_at` text DEFAULT 'document-ready',
	`update_url` text,
	`download_url` text,
	`homepage_url` text,
	`support_url` text,
	`install_time` text NOT NULL,
	`last_update` text,
	`run_count` integer DEFAULT 0,
	`is_built_in` integer DEFAULT false,
	`icon` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
