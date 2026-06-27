# Product Requirements Document (PRD)
# Sistem ERP Rusamas — Perlengkapan Umroh & Haji

> **Versi:** 1.0 | **Tanggal:** 2026-05-08 | **Klien:** Pak Novel (Rusamas) | **Status:** Draft

---

## 1. Executive Summary

Rusamas adalah perusahaan produksi perlengkapan umroh dan haji yang melayani klien B2B (agen travel). Sistem ERP ini dirancang untuk mendigitalisasi seluruh proses bisnis dari penawaran, pembayaran, produksi, pengiriman, hingga pelaporan eksekutif.

### Tujuan Utama
1. **Transparansi Proses** — Real-time tracking dari order hingga pengiriman
2. **Proteksi Data Finansial** — HPP hanya terlihat oleh Owner
3. **Otomasi Dokumen** — PO, Invoice, Surat Jalan otomatis
4. **Notifikasi Otomatis** — WhatsApp Gateway untuk klien & sales
5. **KPI Terukur** — Absensi GPS + performa sales terukur
6. **Pondasi Fase 2** — Schema siap untuk Gudang, AI, dan B2C

### Cakupan Fase 1 (7 Modul)
| Kode | Modul | Prioritas |
|------|-------|-----------|
| A | CRM & Penjualan | P0 - Critical |
| B | Keuangan & Administrasi | P0 - Critical |
| C | Produksi (Tracking) | P0 - Critical |
| D | WhatsApp Gateway | P1 - High |
| E | SDM (KPI & Absensi) | P1 - High |
| F | Pelaporan Eksekutif | P1 - High |
| G | Retur (RMA) | P2 - Medium |

### Pondasi Fase 2 (Disiapkan di Fase 1)
| Modul Fase 2 | Persiapan di Fase 1 |
|---------------|---------------------|
| Gudang (Inventory) | Tabel BOM & relasi bahan baku sudah ada |
| AI Forecasting | Logging data histori terstruktur sejak hari 1 |
| B2C / Maklon | Multi-tenant RBAC foundation |

---

## 2. Business Context

- **Industri:** Manufaktur perlengkapan umroh & haji
- **Model Bisnis:** B2B — menjual ke agen travel
- **Proses Inti:** Negosiasi → PO → DP → Produksi → Pelunasan → Kirim
- **Peak Season:** Menjelang musim umroh & haji (kalender Hijriah)
- **Pain Points:** Harga tanpa kontrol, revisi sepihak, no tracking, HPP bocor, performa sales tak terukur

---

## 3. User Roles & Personas

| Role | Akses Modul | Device Utama | Frekuensi |
|------|-------------|--------------|-----------|
| **Owner** (Pak Novel) | Semua + HPP & Margin (rahasia) | Desktop & Mobile | Harian |
| **Admin / Keuangan** | B (Keuangan), sebagian A & C | Desktop | Harian |
| **Sales** (Lapangan) | A (CRM), E (Absensi/KPI) | Mobile | Harian |
| **Tim Produksi** | C (Produksi) | Tablet / Desktop | Harian |

---

## 4. User Flows

### 4.1 Login & Autentikasi
```
[Buka Aplikasi] → [Login Email & Password] → [Validasi + cek RBAC]
  ├── Owner     → Dashboard Eksekutif (Modul F)
  ├── Admin     → Dashboard Keuangan (Modul B)
  ├── Sales     → Dashboard Sales (Modul A)
  └── Produksi  → Dashboard Produksi (Modul C)
```

### 4.2 Modul A — CRM & Penjualan

**A1. Input Pesanan Baru:**
```
[Dashboard Sales] → [Buat Pesanan Baru] → [Form Input:]
  ├── Pilih/Tambah Klien (Agen Travel)
  ├── Input Nama PIC, Pilih Produk, Jumlah, Harga Jual (negosiasi), Deadline
  └── Catatan Tambahan
→ [Generate Draft PO otomatis] → [Preview] → [Kirim ke Klien PDF/WA]
→ Status: "Menunggu Persetujuan"
```

**A2. Lock System (Setelah DP):**
```
[Klien setuju & transfer DP] → [Admin validasi DP]
→ [LOCK otomatis:] Pesanan terkunci, SLA countdown mulai, WA ke klien, masuk antrean produksi
→ Status: "Locked — Dalam Produksi"
```

**A3. Revisi Pesanan (Setelah Lock):**
```
[Sales buat Permintaan Revisi + alasan] → [Notif ke Admin]
→ [Admin approve/reject] → [Jika approved: unlock → revisi → lock ulang]
→ Semua tercatat di Log Revisi
```

### 4.3 Modul B — Keuangan & Administrasi

**B1. Validasi DP:**
```
[Admin buka Verifikasi Pembayaran] → [Pilih transaksi] → [Input bukti transfer]
→ [Validasi] → Trigger: Status→Locked, Invoice DP, SLA aktif, WA ke klien
```

**B2. Pelunasan & Surat Jalan:**
```
[Produksi selesai → Nota Pelunasan auto] → [Sales follow-up] → [Klien transfer]
→ [Admin validasi] → [Generate Surat Jalan] → [Cetak & kirim barang]
→ Status: "Selesai — Terkirim"
```

### 4.4 Modul C — Produksi
```
[Order locked → masuk Dashboard Produksi] → Status: "MASUK"
→ [Tim klik "Mulai"] → Status: "PROSES" + SLA countdown
→ [Tim klik "Selesai" + input Qty Aktual + catatan]
→ [Sistem hitung ulang tagihan jika qty berbeda]
→ Status: "SELESAI" → Trigger: WA ke Sales "Barang Siap"
```

### 4.5 Modul D — WhatsApp Gateway
```
[Event terjadi] →
  ├── Trigger 1 (DP Valid): WA ke Klien "DP dikonfirmasi, pesanan diproduksi"
  └── Trigger 2 (Produksi Selesai): WA ke Sales "Barang siap, follow-up pelunasan"
→ Semua pesan tercatat di Log (status: Terkirim/Gagal/Pending)
```

### 4.6 Modul E — SDM (KPI & Absensi)

> **Referensi lengkap:** Lihat `docs/BLUEPRINT_ABSENSI_PART1.md` dan `PART2.md`

**E1. Absensi Staf Kantor (Check-in):**
```
[Staf buka aplikasi] → [Sistem request GPS (watchPosition)]
→ [Client-side geofence check: posisi vs lokasi kantor + toleransi 50m]
  ├── Dalam radius:
  │   → [Buka kamera selfie (jika require_camera=true)]
  │   → [Upload foto ke R2]
  │   → [POST /attendance/check-in {lat, lng, location_id, photo_url}]
  │   → [Server-side validation:]
  │       ├── Re-validasi geofence (LocationValidator)
  │       ├── Face verification via Workers AI (jika face terdaftar)
  │       ├── Fraud detection (mock GPS, impossible travel, unusual time)
  │       └── INSERT attendance + award points
  │   → [Response: {id, time, face_verified, confidence, points_earned}]
  │   → [Toast: "Check-in berhasil! +10 poin"]
  └── Di luar radius:
      → [Ditolak: "Anda di luar area kantor"]
```

**E2. Absensi Sales Lapangan (Field Visit):**
```
[Sales di lokasi klien/biro travel] → [GPS validated terhadap lokasi klien?]
  ├── Dalam radius:
  │   → [Check-in + selfie] → [Server validasi geofence + fraud]
  │   → [Form Visit Log wajib:]
  │       ├── Pilih klien / nama biro travel
  │       ├── Ringkasan hasil kunjungan (wajib)
  │       └── Upload foto bukti kunjungan (opsional)
  │   → [Visit Log tersimpan + poin visit_points]
  └── Di luar radius:
      → [Ditolak: "Di luar radius lokasi klien"]
→ [Check-out saat selesai → durasi tercatat + poin full-day jika ≥8 jam]
```

**E3. Check-out:**
```
[Karyawan klik Check-out] → [GPS captured]
→ [POST /attendance/check-out {attendance_id, lat, lng}]
→ [Sistem hitung durasi kerja, evaluasi full-day (8 jam)]
→ [Award poin check-out + bonus poin jika full-day]
→ [Response: {time, points_earned, is_full_day}]
```

**E4. Dashboard KPI:**
```
[Owner/Admin lihat per Sales:]
  ├── Target vs Realisasi Omzet
  ├── Jumlah Kunjungan Bulan Ini
  ├── Kedisiplinan (tepat waktu + 8 jam/hari)
  ├── Fraud Score (0 = clean, tinggi = suspicious)
  ├── Skor KPI Komposit
  └── Points Balance → Eligible Reward
```

**E5. Anti-Fraud System:**
```
[Setiap check-in → FraudDetector.analyzeCheckIn()]
  ├── Mock location detection (GPS spoofing)
  ├── Impossible travel (jarak vs waktu dari check-in sebelumnya)
  ├── Unusual time detection (di luar jam kerja normal)
  └── Face mismatch (confidence < threshold)
→ [fraud_score dihitung, fraud_flags disimpan sebagai JSON]
→ [Admin bisa review di halaman Fraud Reports]
```

### 4.7 Modul F — Pelaporan Eksekutif (Owner Only)
```
[Dashboard:] Total Omzet, Total Margin (HPP vs Jual), Pesanan Aktif/Selesai,
Alert SLA hampir habis
[Drill-down:] Margin per Transaksi (RAHASIA), Performa Sales, Arus Produksi,
Kedisiplinan Karyawan
```

### 4.8 Modul G — Retur (RMA)
```
[Input klaim:] Pilih pesanan & item, jumlah retur, alasan, foto bukti
→ Status: "Menunggu Verifikasi"
→ [QC verifikasi:] Terima→Perbaikan/Ganti | Tolak→Notif alasan
→ [Input biaya perbaikan] → Status: "Selesai" → Biaya masuk laporan margin
```

---

## 5. Data Structure (Schema D1 / SQLite)

> **Prinsip:** UUID PK (generate di app layer), soft delete (`deleted_at`), timestamps semua tabel, HPP encrypted (owner-only API), tabel BOM untuk Fase 2, logging histori untuk AI.

### 5.1 `users`
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL, role TEXT NOT NULL, -- 'owner','admin','sales','produksi'
  phone TEXT, avatar_url TEXT, is_active INTEGER DEFAULT 1, last_login_at TEXT,
  created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT
);
```

### 5.2 `clients`
```sql
CREATE TABLE clients (
  id TEXT PRIMARY KEY, company_name TEXT NOT NULL, pic_name TEXT NOT NULL,
  pic_phone TEXT, pic_email TEXT, address TEXT, city TEXT, notes TEXT,
  created_by TEXT REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT
);
```

### 5.3 `products`
```sql
CREATE TABLE products (
  id TEXT PRIMARY KEY, sku TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
  description TEXT, category TEXT, unit TEXT DEFAULT 'pcs',
  hpp_base REAL, -- ENCRYPTED, owner only
  image_url TEXT, is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT
);
```

### 5.4 `product_bom` (Pondasi Fase 2 — Gudang)
```sql
CREATE TABLE product_bom (
  id TEXT PRIMARY KEY, product_id TEXT REFERENCES products(id),
  material_name TEXT NOT NULL, material_sku TEXT,
  quantity REAL NOT NULL, unit TEXT DEFAULT 'pcs', cost_per_unit REAL,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
);
```

### 5.5 `orders`
```sql
CREATE TABLE orders (
  id TEXT PRIMARY KEY, order_number TEXT UNIQUE NOT NULL, -- PO-2026-0001
  client_id TEXT REFERENCES clients(id), sales_id TEXT REFERENCES users(id),
  status TEXT DEFAULT 'draft', -- draft/pending/locked/production/done/shipped/cancelled
  deadline TEXT, total_price REAL DEFAULT 0,
  dp_amount REAL DEFAULT 0, dp_percentage REAL DEFAULT 0, final_amount REAL DEFAULT 0,
  notes TEXT, locked_at TEXT, locked_by TEXT REFERENCES users(id),
  sla_deadline TEXT, terms_conditions TEXT,
  created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT
);
```

### 5.6 `order_items`
```sql
CREATE TABLE order_items (
  id TEXT PRIMARY KEY, order_id TEXT REFERENCES orders(id),
  product_id TEXT REFERENCES products(id),
  quantity_ordered INTEGER NOT NULL, quantity_actual INTEGER,
  unit_price REAL NOT NULL, subtotal REAL NOT NULL, notes TEXT,
  created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
);
```

### 5.7 `payments`
```sql
CREATE TABLE payments (
  id TEXT PRIMARY KEY, order_id TEXT REFERENCES orders(id),
  type TEXT NOT NULL, -- 'dp'/'pelunasan'
  amount REAL NOT NULL, payment_date TEXT, proof_url TEXT,
  verified_by TEXT REFERENCES users(id), verified_at TEXT,
  status TEXT DEFAULT 'pending', -- pending/verified/rejected
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
);
```

### 5.8 `documents`
```sql
CREATE TABLE documents (
  id TEXT PRIMARY KEY, order_id TEXT REFERENCES orders(id),
  type TEXT NOT NULL, -- 'draft_po','invoice_dp','invoice_lunas','surat_jalan'
  document_number TEXT UNIQUE NOT NULL, file_url TEXT,
  generated_by TEXT REFERENCES users(id),
  generated_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now'))
);
```

### 5.9 `production_tracking`
```sql
CREATE TABLE production_tracking (
  id TEXT PRIMARY KEY, order_id TEXT REFERENCES orders(id),
  status TEXT DEFAULT 'masuk', -- masuk/proses/selesai
  started_at TEXT, completed_at TEXT, notes TEXT,
  updated_by TEXT REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
);
```

### 5.10 `production_logs` (Pondasi Fase 2 — AI)
```sql
CREATE TABLE production_logs (
  id TEXT PRIMARY KEY, order_id TEXT REFERENCES orders(id),
  product_id TEXT REFERENCES products(id),
  action TEXT NOT NULL, old_value TEXT, new_value TEXT,
  performed_by TEXT REFERENCES users(id),
  performed_at TEXT DEFAULT (datetime('now'))
);
```

### 5.11 `wa_messages`
```sql
CREATE TABLE wa_messages (
  id TEXT PRIMARY KEY, trigger_type TEXT NOT NULL,
  recipient_phone TEXT NOT NULL, recipient_type TEXT NOT NULL,
  message_body TEXT NOT NULL, reference_id TEXT,
  status TEXT DEFAULT 'pending', sent_at TEXT, error_message TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### 5.12 `locations` (Lokasi Kantor / Titik Geofence)
```sql
CREATE TABLE locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,                     -- 'Kantor Pusat', 'Gudang', dll
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  radius_meters INTEGER DEFAULT 100,      -- Radius geofence
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

### 5.13 `attendance`
```sql
CREATE TABLE attendance (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  location_id TEXT REFERENCES locations(id),
  type TEXT NOT NULL,                     -- 'office'/'field'
  check_in_at TEXT NOT NULL,
  check_in_lat REAL,
  check_in_lng REAL,
  check_out_at TEXT,
  check_out_lat REAL,
  check_out_lng REAL,
  checkout_location_id TEXT,
  checkout_location_name TEXT,
  duration_minutes INTEGER,
  is_on_time INTEGER,
  face_verified INTEGER DEFAULT 0,        -- 1 = wajah cocok
  face_confidence REAL DEFAULT 0,         -- 0.0 - 1.0
  face_photo_url TEXT,                    -- R2 path selfie
  ip_address TEXT,
  device_info TEXT,
  is_valid INTEGER DEFAULT 1,
  fraud_flags TEXT,                       -- JSON: ['mock_gps','impossible_travel']
  fraud_score INTEGER DEFAULT 0,          -- 0 = clean, higher = suspicious
  points_earned INTEGER DEFAULT 0,
  date TEXT NOT NULL,                     -- YYYY-MM-DD
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_attendance_user ON attendance(user_id);
CREATE INDEX idx_attendance_date ON attendance(user_id, date);
```

### 5.14 `visit_logs`
```sql
CREATE TABLE visit_logs (
  id TEXT PRIMARY KEY,
  attendance_id TEXT REFERENCES attendance(id),
  user_id TEXT REFERENCES users(id),
  client_id TEXT REFERENCES clients(id),
  location_name TEXT NOT NULL,            -- Nama biro travel
  latitude REAL,
  longitude REAL,
  summary TEXT NOT NULL,                  -- Ringkasan hasil kunjungan
  photo_url TEXT,                         -- R2 path foto bukti
  visited_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now'))
);
```

### 5.14 `kpi_scores`
```sql
CREATE TABLE kpi_scores (
  id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id),
  period TEXT NOT NULL, -- '2026-05'
  target_omzet REAL DEFAULT 0, actual_omzet REAL DEFAULT 0,
  target_visits INTEGER DEFAULT 0, actual_visits INTEGER DEFAULT 0,
  discipline_score REAL DEFAULT 0, composite_score REAL DEFAULT 0,
  reward_eligible INTEGER DEFAULT 0, reward_claimed INTEGER DEFAULT 0,
  notes TEXT,
  calculated_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
);
```

### 5.15 `returns`
```sql
CREATE TABLE returns (
  id TEXT PRIMARY KEY, return_number TEXT UNIQUE NOT NULL,
  order_id TEXT REFERENCES orders(id), reported_by TEXT REFERENCES users(id),
  status TEXT DEFAULT 'pending', -- pending/verified/in_repair/done/rejected
  reason TEXT NOT NULL, total_repair_cost REAL DEFAULT 0,
  photo_url TEXT, verified_by TEXT REFERENCES users(id),
  verified_at TEXT, completed_at TEXT, notes TEXT,
  created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
);
```

### 5.16 `return_items`
```sql
CREATE TABLE return_items (
  id TEXT PRIMARY KEY, return_id TEXT REFERENCES returns(id),
  order_item_id TEXT REFERENCES order_items(id),
  product_id TEXT REFERENCES products(id),
  quantity INTEGER NOT NULL, reason TEXT, repair_cost REAL DEFAULT 0,
  action_taken TEXT, -- 'repair','replace','refund'
  created_at TEXT DEFAULT (datetime('now'))
);
```

### 5.17 `order_revision_logs`
```sql
CREATE TABLE order_revision_logs (
  id TEXT PRIMARY KEY, order_id TEXT REFERENCES orders(id),
  requested_by TEXT REFERENCES users(id), approved_by TEXT REFERENCES users(id),
  status TEXT DEFAULT 'pending', reason TEXT NOT NULL,
  changes_detail TEXT, -- JSON
  approved_at TEXT, created_at TEXT DEFAULT (datetime('now'))
);
```

### 5.18 `audit_trail`
```sql
CREATE TABLE audit_trail (
  id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT,
  old_data TEXT, new_data TEXT, ip_address TEXT, user_agent TEXT,
  performed_at TEXT DEFAULT (datetime('now'))
);
```

### 5.19 `settings`
```sql
CREATE TABLE settings (
  id TEXT PRIMARY KEY, key TEXT UNIQUE NOT NULL, value TEXT NOT NULL,
  description TEXT, updated_by TEXT REFERENCES users(id),
  updated_at TEXT DEFAULT (datetime('now'))
);
-- Keys: office_lat, office_lng, office_radius_meters, wa_api_endpoint,
--        default_dp_percentage, default_sla_days, company_name
```
