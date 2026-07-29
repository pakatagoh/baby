CREATE TABLE `device_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notification_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`outbox_id` text NOT NULL,
	`subscription_id` text NOT NULL,
	`status` text NOT NULL,
	`provider_status_code` integer,
	`provider_response_category` text,
	`attempted_at` text NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`outbox_id`) REFERENCES `notification_outbox`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subscription_id`) REFERENCES `push_subscriptions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notification_deliveries_outbox_subscription_unique` ON `notification_deliveries` (`outbox_id`,`subscription_id`);--> statement-breakpoint
CREATE TABLE `notification_outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`event_type` text NOT NULL,
	`source_entry_ids_json` text NOT NULL,
	`actor_user` text NOT NULL,
	`recipient_user` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`status` text NOT NULL,
	`payload_json` text NOT NULL,
	`payload_version` integer NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`sent_at` text,
	`last_error` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notification_outbox_idempotency_key_unique` ON `notification_outbox` (`idempotency_key`);--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`device_profile_id` text NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`last_success_at` text,
	`invalidated_at` text,
	`invalid_reason` text,
	FOREIGN KEY (`device_profile_id`) REFERENCES `device_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_subscriptions_device_profile_id_unique` ON `push_subscriptions` (`device_profile_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `push_subscriptions_endpoint_unique` ON `push_subscriptions` (`endpoint`);