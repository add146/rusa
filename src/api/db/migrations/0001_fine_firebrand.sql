CREATE TABLE `shipment_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`batch_number` integer NOT NULL,
	`shipping_address` text,
	`notes` text,
	`status` text DEFAULT 'pending',
	`created_by` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_shipment_batches_order` ON `shipment_batches` (`order_id`);
--> statement-breakpoint
CREATE TABLE `shipment_batch_items` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`order_item_id` text NOT NULL,
	`quantity_shipped` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`batch_id`) REFERENCES `shipment_batches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`order_item_id`) REFERENCES `order_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_shipment_items_batch` ON `shipment_batch_items` (`batch_id`);
--> statement-breakpoint
CREATE INDEX `idx_shipment_items_item` ON `shipment_batch_items` (`order_item_id`);
--> statement-breakpoint
ALTER TABLE `order_items` ADD `is_production_done` integer DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `order_items` ADD `production_done_at` text;