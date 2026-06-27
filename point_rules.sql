-- Create point_rules table
CREATE TABLE IF NOT EXISTS `point_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`rule_key` text NOT NULL,
	`label` text NOT NULL,
	`description` text,
	`point_value` integer DEFAULT 0 NOT NULL,
	`target_value` integer,
	`applicable_roles` text,
	`is_active` integer DEFAULT 1,
	`updated_by` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE UNIQUE INDEX IF NOT EXISTS `point_rules_rule_key_unique` ON `point_rules` (`rule_key`);

-- Seed default rules
INSERT OR IGNORE INTO `point_rules` (id, rule_key, label, description, point_value, target_value, applicable_roles) VALUES 
('rule_1', 'ontime_checkin', 'Poin Masuk Tepat Waktu', 'Poin yang didapat jika melakukan absensi masuk sebelum batas toleransi.', 5, NULL, '["sales","produksi","admin","staff"]'),
('rule_2', 'full_8h_work', 'Poin Jam Kerja 8 Jam Penuh', 'Bonus poin jika total jam kerja dalam satu hari minimal 8 jam.', 3, NULL, '["sales","produksi","admin","staff"]'),
('rule_3', 'role_bonus_sales', 'Bonus Harian Sales', 'Tambahan poin harian khusus untuk role sales.', 2, NULL, '["sales"]'),
('rule_4', 'role_bonus_produksi', 'Bonus Harian Produksi', 'Tambahan poin harian khusus untuk role produksi.', 2, NULL, '["produksi"]'),
('rule_5', 'role_bonus_admin', 'Bonus Harian Admin', 'Tambahan poin harian khusus untuk role admin.', 1, NULL, '["admin"]'),
('rule_6', 'role_bonus_staff', 'Bonus Harian Staff', 'Tambahan poin harian khusus untuk role staff.', 1, NULL, '["staff"]'),
('rule_7', 'sales_closing_target', 'Poin Capai Target Closing', 'Bonus poin besar jika mencapai target jumlah closing dalam periode tertentu.', 20, 4, '["sales"]'),
('rule_8', 'sales_target_count', 'Jumlah Closing/Bulan', 'Konfigurasi jumlah minimal closing per bulan untuk mendapatkan bonus.', 0, 4, '["sales"]');
