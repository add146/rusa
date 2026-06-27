-- 1. Kolom baru di tabel clients
ALTER TABLE clients ADD COLUMN owner_name TEXT;

-- 2. Tabel baru: multi alamat pengiriman
CREATE TABLE client_addresses (
  id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES clients(id),
  label TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  is_default INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 3. Kolom baru di tabel orders
ALTER TABLE orders ADD COLUMN shipping_address_id TEXT;
ALTER TABLE orders ADD COLUMN shipping_address_custom TEXT;
ALTER TABLE orders ADD COLUMN dp_reminder_sent_at TEXT;
ALTER TABLE orders ADD COLUMN dp_reminder_count INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN shipped_at TEXT;
ALTER TABLE orders ADD COLUMN pelunasan_reminder_sent_at TEXT;
ALTER TABLE orders ADD COLUMN pelunasan_reminder_count INTEGER DEFAULT 0;
