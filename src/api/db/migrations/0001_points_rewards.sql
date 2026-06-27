-- 1. Tambah kolom points_balance ke tabel users
ALTER TABLE users ADD COLUMN points_balance INTEGER DEFAULT 0;

-- 2. Tabel user_streaks - Tracking streak harian
CREATE TABLE IF NOT EXISTS user_streaks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_streak_date TEXT,          -- Format: 'YYYY-MM-DD'
  streak_multiplier REAL DEFAULT 1.0,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 3. Tabel points_ledger - Riwayat semua transaksi poin
CREATE TABLE IF NOT EXISTS points_ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  transaction_type TEXT NOT NULL,  -- 'earn' atau 'redeem'
  amount INTEGER NOT NULL,         -- positif = earn, negatif = redeem
  reference_type TEXT,             -- 'attendance', 'streak_bonus', 'reward_redeem'
  reference_id TEXT,
  description TEXT,
  balance_after INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 4. Tabel reward_products - Katalog hadiah yang bisa ditukar poin
CREATE TABLE IF NOT EXISTS reward_products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_points INTEGER NOT NULL,   -- Harga dalam poin
  image_url TEXT,
  stock INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_by TEXT REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 5. Tabel reward_orders - Riwayat penukaran hadiah
CREATE TABLE IF NOT EXISTS reward_orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  product_id TEXT NOT NULL REFERENCES reward_products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  total_points INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',   -- 'pending', 'completed', 'cancelled'
  created_at TEXT DEFAULT (datetime('now'))
);
