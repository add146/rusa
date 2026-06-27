CREATE TABLE `attendance` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`location_id` text,
	`type` text NOT NULL,
	`check_in_at` text NOT NULL,
	`check_in_lat` real,
	`check_in_lng` real,
	`check_out_at` text,
	`check_out_lat` real,
	`check_out_lng` real,
	`checkout_location_id` text,
	`checkout_location_name` text,
	`duration_minutes` integer,
	`is_on_time` integer,
	`face_verified` integer DEFAULT 0,
	`face_confidence` real DEFAULT 0,
	`face_photo_url` text,
	`ip_address` text,
	`device_info` text,
	`is_valid` integer DEFAULT 1,
	`fraud_flags` text,
	`fraud_score` integer DEFAULT 0,
	`points_earned` integer DEFAULT 0,
	`date` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_attendance_user` ON `attendance` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_attendance_date` ON `attendance` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `audit_trail` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`old_data` text,
	`new_data` text,
	`ip_address` text,
	`user_agent` text,
	`performed_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`company_name` text NOT NULL,
	`pic_name` text NOT NULL,
	`pic_phone` text,
	`pic_email` text,
	`address` text,
	`city` text,
	`notes` text,
	`created_by` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	`deleted_at` text,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text,
	`type` text NOT NULL,
	`document_number` text NOT NULL,
	`file_url` text,
	`generated_by` text,
	`generated_at` text DEFAULT (datetime('now')),
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`generated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `documents_document_number_unique` ON `documents` (`document_number`);--> statement-breakpoint
CREATE TABLE `kpi_scores` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`period` text NOT NULL,
	`target_omzet` real DEFAULT 0,
	`actual_omzet` real DEFAULT 0,
	`target_visits` integer DEFAULT 0,
	`actual_visits` integer DEFAULT 0,
	`discipline_score` real DEFAULT 0,
	`composite_score` real DEFAULT 0,
	`reward_eligible` integer DEFAULT 0,
	`reward_claimed` integer DEFAULT 0,
	`notes` text,
	`calculated_at` text DEFAULT (datetime('now')),
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `locations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`radius_meters` integer DEFAULT 100,
	`is_active` integer DEFAULT 1,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text,
	`product_id` text,
	`quantity_ordered` integer NOT NULL,
	`quantity_actual` integer,
	`unit_price` real NOT NULL,
	`subtotal` real NOT NULL,
	`notes` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `order_revision_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text,
	`requested_by` text,
	`approved_by` text,
	`status` text DEFAULT 'pending',
	`reason` text NOT NULL,
	`changes_detail` text,
	`approved_at` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`requested_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`order_number` text NOT NULL,
	`client_id` text,
	`sales_id` text,
	`status` text DEFAULT 'draft',
	`deadline` text,
	`total_price` real DEFAULT 0,
	`dp_amount` real DEFAULT 0,
	`dp_percentage` real DEFAULT 0,
	`final_amount` real DEFAULT 0,
	`notes` text,
	`locked_at` text,
	`locked_by` text,
	`sla_deadline` text,
	`terms_conditions` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	`deleted_at` text,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sales_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`locked_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_order_number_unique` ON `orders` (`order_number`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text,
	`type` text NOT NULL,
	`amount` real NOT NULL,
	`payment_date` text,
	`proof_url` text,
	`verified_by` text,
	`verified_at` text,
	`status` text DEFAULT 'pending',
	`notes` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`verified_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `product_bom` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text,
	`material_name` text NOT NULL,
	`material_sku` text,
	`quantity` real NOT NULL,
	`unit` text DEFAULT 'pcs',
	`cost_per_unit` real,
	`notes` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `production_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text,
	`product_id` text,
	`action` text NOT NULL,
	`old_value` text,
	`new_value` text,
	`performed_by` text,
	`performed_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`performed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `production_tracking` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text,
	`status` text DEFAULT 'masuk',
	`started_at` text,
	`completed_at` text,
	`notes` text,
	`updated_by` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`sku` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`category` text,
	`unit` text DEFAULT 'pcs',
	`hpp_base` real,
	`publish_price` real,
	`image_url` text,
	`is_active` integer DEFAULT 1,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	`deleted_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_sku_unique` ON `products` (`sku`);--> statement-breakpoint
CREATE TABLE `return_items` (
	`id` text PRIMARY KEY NOT NULL,
	`return_id` text,
	`order_item_id` text,
	`product_id` text,
	`quantity` integer NOT NULL,
	`reason` text,
	`repair_cost` real DEFAULT 0,
	`action_taken` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`return_id`) REFERENCES `returns`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`order_item_id`) REFERENCES `order_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `returns` (
	`id` text PRIMARY KEY NOT NULL,
	`return_number` text NOT NULL,
	`order_id` text,
	`reported_by` text,
	`status` text DEFAULT 'pending',
	`reason` text NOT NULL,
	`total_repair_cost` real DEFAULT 0,
	`photo_url` text,
	`verified_by` text,
	`verified_at` text,
	`completed_at` text,
	`notes` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reported_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`verified_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `returns_return_number_unique` ON `returns` (`return_number`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`description` text,
	`updated_by` text,
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `settings_key_unique` ON `settings` (`key`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`full_name` text NOT NULL,
	`role` text NOT NULL,
	`phone` text,
	`avatar_url` text,
	`is_active` integer DEFAULT 1,
	`last_login_at` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	`deleted_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `visit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`attendance_id` text,
	`user_id` text,
	`client_id` text,
	`location_name` text NOT NULL,
	`latitude` real,
	`longitude` real,
	`summary` text NOT NULL,
	`photo_url` text,
	`visited_at` text DEFAULT (datetime('now')),
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`attendance_id`) REFERENCES `attendance`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `wa_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`trigger_type` text NOT NULL,
	`recipient_phone` text NOT NULL,
	`recipient_type` text NOT NULL,
	`message_body` text NOT NULL,
	`reference_id` text,
	`status` text DEFAULT 'pending',
	`sent_at` text,
	`error_message` text,
	`created_at` text DEFAULT (datetime('now'))
);
