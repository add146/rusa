# PRD Part 2 — Tech Stack, UI/UX, & Coding Guidelines
# Sistem ERP Rusamas

> Lanjutan dari PRD Part 1

---

## 6. Tech Stack

### 6.1 Arsitektur Cloudflare

| Layer | Teknologi | Fungsi |
|-------|-----------|--------|
| **Frontend** | Cloudflare Pages + React (Vite) | SPA dengan client-side routing |
| **API** | Cloudflare Workers + Hono | RESTful API, edge-native |
| **Database** | Cloudflare D1 (SQLite) | Data relasional (19 tabel) |
| **Object Storage** | Cloudflare R2 | Foto, bukti transfer, dokumen PDF |
| **ORM** | Drizzle ORM | Type-safe query + migrasi D1 |
| **Auth** | JWT + bcrypt | Token-based, RBAC enforcement |
| **WA Gateway** | Evolution API v2 (self-hosted) | Manajemen instance WA, kirim pesan, QR pairing |
| **PDF** | jsPDF / @react-pdf/renderer | Generate PO, Invoice, Surat Jalan |

### 6.2 Konfigurasi Wrangler

```jsonc
// wrangler.jsonc
{
  "name": "rusamas-erp",
  "compatibility_date": "2026-05-01",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": "./dist",
    "not_found_handling": "single-page-application"
  },
  "d1_databases": [
    { "binding": "DB", "database_name": "rusamas-erp-db", "database_id": "xxx" }
  ],
  "r2_buckets": [
    { "binding": "BUCKET", "bucket_name": "rusamas-erp-files" }
  ]
}
```

### 6.3 Strategi Database D1

- **Single database** (estimasi data < 10GB di Fase 1)
- **UUID** di-generate di application layer (`crypto.randomUUID()`)
- **Soft delete** dengan kolom `deleted_at`
- **`db.batch()`** untuk operasi atomik multi-statement
- **Indexing** pada semua FK dan kolom WHERE
- **Migrasi** via `wrangler d1 migrations`

### 6.4 R2 — Struktur Folder

```
rusamas-erp-files/
├── avatars/{user_id}/profile.webp
├── payments/{payment_id}/proof.webp
├── documents/{document_id}/file.pdf
├── products/{product_id}/image.webp
├── returns/{return_id}/photo.webp
└── visits/{visit_id}/photo.webp
```

### 6.5 API Design (Hono)

```
/api/v1/auth/login          POST
/api/v1/auth/me             GET

/api/v1/users               GET, POST
/api/v1/users/:id           GET, PUT, DELETE

/api/v1/clients             GET, POST
/api/v1/clients/:id         GET, PUT, DELETE

/api/v1/products            GET, POST
/api/v1/products/:id        GET, PUT, DELETE
/api/v1/products/:id/hpp    GET, PUT          ← Owner only

/api/v1/orders              GET, POST
/api/v1/orders/:id          GET, PUT
/api/v1/orders/:id/lock     POST              ← Admin trigger
/api/v1/orders/:id/items    GET, POST, PUT
/api/v1/orders/:id/revisions POST

/api/v1/payments            GET, POST
/api/v1/payments/:id/verify POST              ← Admin

/api/v1/documents           GET
/api/v1/documents/:id/download GET

/api/v1/production          GET
/api/v1/production/:id      PUT               ← Status update

/api/v1/attendance          GET, POST
/api/v1/attendance/checkout POST
/api/v1/visits              GET, POST

/api/v1/kpi                 GET
/api/v1/kpi/:userId         GET

/api/v1/returns             GET, POST
/api/v1/returns/:id         GET, PUT

/api/v1/reports/margin      GET               ← Owner only
/api/v1/reports/sales       GET
/api/v1/reports/production  GET
/api/v1/reports/attendance  GET

/api/v1/settings            GET, PUT          ← Owner/Admin
```

### 6.6 WhatsApp Gateway — Evolution API

> **Referensi lengkap:** Lihat `docs/BLUEPRINT_WA_GATEWAY_PART1.md` dan `PART2.md`

**Arsitektur:**
```
┌─────────────────┐     HTTPS/JWT      ┌──────────────────────┐
│  React Admin UI  │ ◄──────────────► │  Cloudflare Worker    │
│  (Vite/Pages)    │                   │  (Hono Router)        │
└─────────────────┘                   └──────────┬───────────┘
                                                  │
                            ┌─────────────────────┼─────────────────┐
                            ▼                     ▼                 ▼
                    ┌──────────────┐    ┌──────────────┐   ┌────────────┐
                    │ Evolution API │    │  D1 Database  │   │ R2 Storage │
                    │ (WA Engine)   │    │  (Settings)   │   │ (Media)    │
                    └──────────────┘    └──────────────┘   └────────────┘
```

**Security Model:**
- **Frontend → Worker**: JWT Bearer token (`Authorization: Bearer <token>`)
- **Worker → Evolution API**: API Key header (`apikey: <key>`) — BUKAN `Authorization`!
- **Role Guard**: Semua endpoint `/api/admin/wa/*` hanya untuk role `admin` & `owner`

**API Endpoints (Proxy ke Evolution API):**

| Endpoint Worker | Method | Fungsi | Evolution API yang di-proxy |
|----------------|--------|--------|----------------------------|
| `/api/admin/wa/status` | GET | Cek status koneksi WA | `GET /instance/connectionState/{instance}` |
| `/api/admin/wa/qr` | GET | Dapatkan QR code pairing | `GET /instance/connect/{instance}` |
| `/api/admin/wa/create` | POST | Inisialisasi instance baru | `POST /instance/create` |
| `/api/admin/wa/test` | POST | Kirim pesan tes | `POST /message/sendText/{instance}` |
| `/api/admin/wa/logout` | DELETE | Putuskan koneksi WA | `DELETE /instance/logout/{instance}` |
| `/api/v1/wa/logs` | GET | Lihat log pesan terkirim | Internal D1 query |

**Konfigurasi WA (tabel `settings`):**

| Key | Deskripsi | Default |
|-----|-----------|--------|
| `wa_api_url` | URL server Evolution API | `https://evolution.mitrabot.my.id` |
| `wa_api_key` | Global API Key auth | *(wajib diisi)* |
| `wa_instance` | Nama instance WhatsApp | *(wajib diisi)* |
| `wa_enabled` | Toggle aktif/nonaktif | `1` |
| `wa_template_dp_confirmed` | Template pesan DP dikonfirmasi | `Halo {pic}, DP pesanan #{po_number} telah dikonfirmasi...` |
| `wa_template_production_done` | Template pesan produksi selesai | `Pesanan #{po_number} telah selesai produksi...` |

**Template Placeholder untuk ERP:**

| Placeholder | Sumber Data | Contoh |
|-------------|-------------|--------|
| `{pic}` | `client.pic_name` | Pak Ahmad |
| `{company}` | `client.company_name` | PT Maju Travel |
| `{po_number}` | `order.order_number` | PO-2026-0001 |
| `{total}` | Computed total | Rp 15.000.000 |
| `{dp_amount}` | `payment.amount` | Rp 7.500.000 |
| `{sisa}` | Computed sisa | Rp 7.500.000 |
| `{deadline}` | `order.deadline` | 15 Juni 2026 |
| `{sales}` | `user.full_name` (sales) | Budi Santoso |

**Trigger Otomatis di ERP:**

| Event | Penerima | Template | Timing |
|-------|----------|----------|--------|
| DP Divalidasi Admin | Klien (PIC) | `wa_template_dp_confirmed` | `waitUntil` setelah validasi |
| Produksi Selesai | Sales terkait | `wa_template_production_done` | `waitUntil` setelah status "Selesai" |

**Format Body Evolution API (kirim pesan):**
```json
{
  "number": "6281234567890",
  "options": {
    "delay": 1500,
    "presence": "composing",
    "linkPreview": false
  },
  "textMessage": {
    "text": "Isi pesan di sini"
  }
}
```

### 6.7 Modul Absensi — Arsitektur & Spesifikasi

> **Referensi lengkap:** Lihat `docs/BLUEPRINT_ABSENSI_PART1.md` dan `PART2.md`

**Komponen Utama:**

| Layer | Teknologi | Fungsi |
|-------|-----------|--------|
| **GPS** | Browser Geolocation API (`watchPosition`) | Tracking posisi real-time |
| **Geofence** | Client-side + Server-side dual validation | Validasi radius lokasi kantor/klien |
| **Selfie** | Browser Camera API → R2 upload | Bukti visual check-in |
| **Face AI** | Cloudflare Workers AI | Verifikasi wajah (compare vs registered face) |
| **Anti-Fraud** | `FraudDetector` service (custom) | Mock GPS, impossible travel, unusual time |
| **Maps** | React Leaflet | Tampilkan lokasi kantor & radius di peta |
| **Points** | `PointsEngine` service | Gamifikasi: poin check-in, full-day, visit |

**Alur Check-in (Sequence):**
```
Employee (PWA)          Browser GPS         Worker API          D1 / R2 / AI
    │                      │                    │                    │
    │──watchPosition()────►│                    │                    │
    │◄──{lat, lng}─────────│                    │                    │
    │                      │                    │                    │
    │──Client geofence─────│                    │                    │
    │  check (±50m)        │                    │                    │
    │                      │                    │                    │
    │──Buka Kamera────────►│                    │                    │
    │──Upload selfie───────│────────────────────│──────►R2 Storage   │
    │◄──photo_url──────────│                    │                    │
    │                      │                    │                    │
    │──POST /attendance/check-in───────────────►│                    │
    │  {lat, lng, location_id, photo_url}       │                    │
    │                      │                    │──Query face ref───►│
    │                      │                    │──Compare faces────►│ AI
    │                      │                    │◄──{verified, 0.92} │
    │                      │                    │                    │
    │                      │                    │──LocationValidator  │
    │                      │                    │──FraudDetector      │
    │                      │                    │──INSERT attendance─►│ D1
    │                      │                    │──PointsEngine──────►│ D1
    │                      │                    │                    │
    │◄──200 {id, time, face_verified,──────────│                    │
    │       confidence, points_earned}          │                    │
```

**API Endpoints Absensi:**

| Endpoint | Method | Fungsi | Auth |
|----------|--------|--------|------|
| `/api/v1/attendance/check-in` | POST | Check-in dengan GPS + foto | JWT (all) |
| `/api/v1/attendance/check-out` | POST | Check-out + hitung durasi | JWT (all) |
| `/api/v1/attendance/today` | GET | Data kehadiran hari ini + lokasi | JWT (all) |
| `/api/v1/attendance/history` | GET | Riwayat kehadiran (date range) | JWT (all) |
| `/api/v1/attendance/calendar` | GET | Kalender bulanan (month/year) | JWT (all) |
| `/api/v1/locations` | GET, POST | CRUD lokasi kantor/geofence | JWT (admin/owner) |
| `/api/v1/locations/:id` | PUT, DELETE | Update/hapus lokasi | JWT (admin/owner) |
| `/api/v1/visits` | GET, POST | CRUD visit log sales | JWT (sales) |
| `/api/v1/admin/attendance-report` | GET | Laporan kehadiran semua staf | JWT (admin/owner) |
| `/api/v1/fraud/reports` | GET | Laporan fraud detection | JWT (admin/owner) |

**Geofence Validation (Dual Layer):**

```typescript
// Client-side: quick reject (UX responsiveness)
const distance = haversineDistance(userLat, userLng, officeLat, officeLng);
const isInRange = distance <= (radiusMeters + 50); // +50m toleransi

// Server-side: definitive validation (security)
class LocationValidator {
  static validate(userLat, userLng, location) {
    const distance = haversine(userLat, userLng, location.latitude, location.longitude);
    return distance <= location.radius_meters;
  }
}
```

**Fraud Detection:**

| Check | Deskripsi | Flag |
|-------|-----------|------|
| Mock GPS | Deteksi lokasi palsu (emulator, GPS spoof app) | `mock_gps` |
| Impossible Travel | Jarak terlalu jauh vs waktu sejak check-in terakhir | `impossible_travel` |
| Unusual Time | Check-in di luar jam kerja normal (misal jam 3 pagi) | `unusual_time` |
| Face Mismatch | Confidence < threshold | `face_mismatch` |

**Points & Reward System:**

| Aksi | Poin | Kondisi |
|------|------|---------|
| Check-in tepat waktu | +10 | `is_on_time = 1` |
| Check-in terlambat | +5 | `is_on_time = 0` |
| Check-out | +5 | Selalu |
| Full-day (≥8 jam) | +10 bonus | `duration_minutes >= 480` |
| Visit Log (Sales) | +10 per visit | `visit_points` configurable |

---

## 7. Konsep UI/UX

> **⚠️ REFERENSI UTAMA:** Folder `ui/` berisi **mockup final** untuk setiap halaman. Setiap subfolder memiliki `screen.png` (screenshot) dan `code.html` (kode HTML/Tailwind referensi). File `ui/rusamas_erp/DESIGN.md` adalah **sumber kebenaran** untuk design tokens. **Selalu gunakan file-file ini sebagai panduan utama saat implementasi.**

### 7.1 Daftar Halaman & Referensi UI

| No | Halaman | Target User | Folder Referensi UI |
|----|---------|-------------|---------------------|
| 1 | Login | Semua | `ui/login_rusamas_erp/` |
| 2 | Dashboard Owner | Owner | `ui/dashboard_owner_rusamas_erp/` |
| 3 | Dashboard KPI | Owner, Admin | `ui/dashboard_kpi_rusamas_erp/` |
| 4 | Master Klien (List) | Sales, Admin | `ui/master_klien_rusamas_erp/` |
| 5 | Detail Klien | Sales, Admin | `ui/detail_klien_rusamas_erp/` |
| 6 | Master Produk (List) | Admin, Owner | `ui/master_produk_rusamas_erp/` |
| 7 | Detail/Form Produk | Admin, Owner | `ui/detail_produk_rusamas_erp/` |
| 8 | HPP Manager | Owner ONLY | `ui/hpp_manager_rusamas_erp/` |
| 9 | Daftar Pesanan | Sales, Admin | `ui/daftar_pesanan_rusamas_erp/` |
| 10 | Form Pesanan Baru | Sales | `ui/form_pesanan_baru_rusamas_erp/` |
| 11 | Detail Pesanan | All (by role) | `ui/detail_pesanan_rusamas_erp/` |
| 12 | Verifikasi Pembayaran | Admin | `ui/verifikasi_pembayaran_rusamas_erp/` |
| 13 | Daftar Dokumen | Admin | `ui/daftar_dokumen_rusamas_erp/` |
| 14 | Monitor Produksi | Produksi | `ui/monitor_produksi_rusamas_erp/` |
| 15 | Pengaturan WA | Admin | `ui/pengaturan_whatsapp_rusamas_erp/` |
| 16 | Absensi & Geolocation | Sales, Staf | `ui/absensi_geolocation_rusamas_erp/` |
| 17 | Visit Log | Sales | `ui/visit_log_rusamas_erp/` |
| 18 | Laporan Margin | Owner ONLY | `ui/laporan_margin_owner_only_rusamas_erp/` |
| 19 | Laporan Performa Sales | Owner | `ui/laporan_performa_sales_rusamas_erp/` |
| 20 | Laporan Arus Produksi | Owner, Admin | `ui/laporan_arus_produksi_rusamas_erp/` |
| 21 | Daftar Retur/Klaim | Admin, Sales | `ui/daftar_retur_klaim_rusamas_erp/` |
| 22 | Pengaturan Sistem | Owner | `ui/pengaturan_sistem_rusamas_erp/` |
| 23 | Manajemen User | Owner | `ui/manajemen_user_rusamas_erp/` |
| 24 | Not Found (404) | Semua | *(tidak ada mockup, gunakan design tokens)* |

**Cara menggunakan referensi UI:**
- `screen.png` → Tampilan visual yang harus diikuti secara pixel-perfect
- `code.html` → Kode HTML + Tailwind CSS yang menjadi **boilerplate** untuk konversi ke React component
- Konversi: Ambil struktur HTML dari `code.html`, ubah ke JSX, ganti class statis ke Tailwind config dari `DESIGN.md`

### 7.2 Design System (Sumber: `ui/rusamas_erp/DESIGN.md`)

> **Filosofi:** Modern Corporate — menggabungkan keandalan ERP tradisional dengan keterbukaan SaaS kontemporer. Interface "tenang" melalui whitespace lega dan palet warna terbatas untuk mengurangi data fatigue. Target: user profesional usia 40-50+ yang membutuhkan legibility tinggi.

#### 🎨 Palet Warna (Material Design 3 — Tonal System)

**Brand Core:**

| Token | Hex | Fungsi |
|-------|-----|--------|
| `primary` | `#00236F` | Warna utama navigasi, tombol, active state |
| `on-primary` | `#FFFFFF` | Teks di atas primary |
| `primary-container` | `#1E3A8A` | Background sidebar, tombol submit, header |
| `on-primary-container` | `#90A8FF` | Teks/ikon di atas primary container |
| `secondary` | `#BB0112` | Warna aksen merah — CTA, "+ New Order" button |
| `on-secondary` | `#FFFFFF` | Teks di atas secondary |
| `secondary-container` | `#E02928` | Badge urgent, destructive action |
| `on-secondary-container` | `#FFFBFF` | Teks di atas secondary container |
| `error` | `#BA1A1A` | Validasi error, status gagal |

**Surface & Background:**

| Token | Hex | Fungsi |
|-------|-----|--------|
| `background` | `#F8F9FF` | Body background utama |
| `surface` | `#F8F9FF` | Surface default |
| `surface-container-lowest` | `#FFFFFF` | Card, tabel, modal (Level 1) |
| `surface-container-low` | `#EFF4FF` | Panel sekunder |
| `surface-container` | `#E5EEFF` | Container default |
| `surface-container-high` | `#DCE9FF` | Table header, icon container |
| `surface-container-highest` | `#D3E4FE` | Zebra-striping tabel |
| `on-surface` | `#0B1C30` | Teks utama heading & body |
| `on-surface-variant` | `#444651` | Teks sekunder, subtitle, placeholder |
| `outline` | `#757682` | Input border default, ikon inactive |
| `outline-variant` | `#C5C5D3` | Border halus, separator |

**Semantic:**

| Token | Hex | Fungsi |
|-------|-----|--------|
| `success` | `#16A34A` | Status: Completed, On Time, Lunas |
| `warning` | `#D97706` | Status: SLA hampir habis, pending |
| `error` | `#BA1A1A` | Status: gagal, rejected, overdue |

#### 📝 Typography

| Token | Font Family | Size | Weight | Line Height | Penggunaan |
|-------|-------------|------|--------|-------------|------------|
| `h1` | Plus Jakarta Sans | 40px | 700 | 1.2 | Page title utama |
| `h1-mobile` | Plus Jakarta Sans | 30px | 700 | 1.2 | Page title di mobile |
| `h2` | Plus Jakarta Sans | 32px | 600 | 1.3 | Section heading (card title besar) |
| `h3` | Plus Jakarta Sans | 24px | 600 | 1.4 | Card heading, modal title |
| `body-lg` | Inter | 18px | 400 | 1.6 | Deskripsi panjang |
| `body-md` | Inter | 16px | 400 | 1.5 | Body text default |
| `label-md` | Inter | 14px | 600 | 1.2 | Label form, table header, button text |

#### 📐 Spacing & Layout

| Token | Nilai | Penggunaan |
|-------|-------|------------|
| `page-padding` | 1.5rem | Padding konten utama |
| `section-gap` | 2rem | Jarak antar section |
| `grid-gutter` | 1.5rem | Gutter antar kolom grid |
| `container-max-width` | 1440px | Lebar maksimal konten |
| `sidebar-width` | 280px | Lebar sidebar tetap |

#### 🔲 Border Radius

| Token | Nilai | Penggunaan |
|-------|-------|------------|
| `sm` | 0.25rem | Chip, badge kecil |
| `DEFAULT` | 0.5rem | Button, input field |
| `md` | 0.75rem | Card kecil, dropdown |
| `lg` | 1rem | Card besar, modal |
| `xl` | 1.5rem | Container besar |
| `full` | 9999px | Avatar, pill badge |

#### 🏗️ Elevation (Tonal Layers — bukan drop shadow)

| Level | Deskripsi | Styling |
|-------|-----------|---------|
| Level 0 | Background | `bg-background` (#F8F9FF) |
| Level 1 | Card/Tabel | `bg-surface-container-lowest` (#FFF) + border 1px `outline-variant` |
| Level 2 | Dropdown/Modal | Shadow: `0px 4px 20px rgba(30, 58, 138, 0.08)` |
| Level 3 | Alert/Toast | High-contrast colored border (red/blue) |

#### 🧩 Komponen Standar (dari code.html)

**Sidebar Navigation:**
- Background: `primary-container` (#1E3A8A), lebar 280px tetap
- Menu item: teks putih `on-primary`, padding `px-4 py-3`
- Active state: vertical bar biru kiri + background `secondary` (#BB0112) merah
- Logo + "Rusamas ERP" + subtitle "Enterprise Management" di atas
- Bottom: Settings & Logout

**Top Bar:**
- Background: putih, height ~64px
- Search bar: placeholder "Search orders, clients..."
- Kanan: icon notifikasi (bell + dot merah), help icon, avatar + nama + role

**Button Primary:**
- `bg-primary-container text-on-primary rounded-DEFAULT py-3 px-6`
- Hover: `bg-primary`, transition-colors 200ms
- Min height: 48px

**Button CTA (New Order):**
- `bg-secondary text-on-secondary rounded-DEFAULT py-3 px-4`
- Merah mencolok untuk aksi utama "+" New Order

**Data Table:**
- Container: `bg-surface-container-lowest rounded-lg border border-outline-variant`
- Header: `text-label-md` uppercase, sticky
- Row: padding vertikal 1rem, alternating `surface-container-highest`
- Pagination: number buttons, active = `bg-primary-container text-on-primary`

**Input Field:**
- Border: `border-outline-variant`, focus: `ring-2 ring-primary border-primary`
- Leading icon slot (Material Symbols), padding `pl-10 pr-3 py-3`
- Label: `text-label-md` di atas field, selalu terlihat

**Status Badge/Chip:**
- Completed: `bg-green-100 text-green-700`
- Processing: `bg-blue-100 text-blue-700`
- Pending: `bg-gray-100 text-gray-700`
- Cancelled/Urgent: `bg-red-100 text-red-700`

**Stat Card (Dashboard):**
- `bg-surface-container-lowest rounded-lg border border-outline-variant p-6`
- Icon container: `bg-surface-container-high rounded-xl w-12 h-12`
- Value: `text-h2 font-h2`, label: `text-label-md`
- Optional trend badge: `+12%` hijau atau `-3%` merah

#### Spesifikasi Desain Umum

| Aspek | Rekomendasi |
|-------|-------------|
| **Layout** | Sidebar 280px tetap + top bar + konten fluid (max 1440px) |
| **Sidebar** | Background `primary-container` (#1E3A8A), active item merah `secondary` |
| **Dark mode** | Tidak di Fase 1 — fokus light mode |
| **Font** | Plus Jakarta Sans (heading) + Inter (body) — Google Fonts |
| **Font Size** | Base 16px body, minimum 14px label — readability untuk user 40+ |
| **Spacing** | 8px base unit, page padding 1.5rem, section gap 2rem |
| **Icons** | Material Symbols Outlined (sesuai mockup), atau Lucide React |
| **Charts** | Recharts — gunakan `primary-container` & `secondary` |
| **Tables** | TanStack Table — sorting, filter, pagination |
| **Forms** | React Hook Form + Zod validation |
| **Toast** | Sonner — notifikasi action feedback |
| **Mobile** | Responsive: sidebar → hamburger, Sales view mobile-first |
| **PDF** | Preview in-app, download button |

### 7.3 Navigasi Sidebar (Per Role)

**Owner:**
```
📊 Dashboard
👥 Klien
📦 Produk
  └── 🔒 HPP Manager
📋 Pesanan
💰 Keuangan
🏭 Produksi
📱 WhatsApp
👤 SDM & KPI
📈 Laporan
  ├── Margin (Rahasia)
  ├── Performa Sales
  └── Arus Produksi
🔄 Retur
⚙️ Pengaturan
```

**Admin:**
```
📊 Dashboard
👥 Klien
📦 Produk
📋 Pesanan
💰 Keuangan
  ├── Verifikasi Bayar
  └── Dokumen
🏭 Produksi (view only)
📱 WhatsApp
👤 SDM & KPI
🔄 Retur
```

**Sales:**
```
📊 Dashboard
👥 Klien Saya
📋 Pesanan Saya
🏭 Tracking Produksi
📍 Absensi
📝 Visit Log
📊 KPI Saya
🔄 Retur
```

**Produksi:**
```
📊 Dashboard
🏭 Antrean Produksi
📍 Absensi
```

---

## 8. Coding Guidelines

### 8.1 Framework & Tooling

| Tool | Versi | Fungsi |
|------|-------|--------|
| React | 19.x | UI Library |
| Vite | 6.x | Build tool + dev server |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Utility-first styling |
| react-router-dom | 7.x | Client-side routing |
| Hono | 4.x | API framework (Workers) |
| Drizzle ORM | latest | D1 database ORM |
| Zod | 3.x | Schema validation |
| React Hook Form | 7.x | Form management |
| TanStack Query | 5.x | Server state management |
| TanStack Table | 8.x | Data tables |
| Recharts | 2.x | Charts & dashboard |
| Lucide React | latest | Icon library |
| Sonner | latest | Toast notifications |
| jsPDF | latest | PDF generation |
| React Leaflet | 5.x | Map display (lokasi & geofence absensi) |

### 8.2 Struktur Project (Atomic Design)

```
rusamas-erp/
├── docs/                           # Dokumentasi (PRD, discovery, blueprints)
├── ui/                             # ⚠️ UI Mockup (REFERENSI UTAMA)
│   ├── rusamas_erp/DESIGN.md       # Design tokens & system (sumber kebenaran)
│   └── {nama_halaman}/             # Per-halaman mockup
│       ├── screen.png              # Screenshot referensi visual
│       └── code.html               # Boilerplate HTML+Tailwind → konversi ke React
├── public/                         # Static assets
├── src/
│   ├── api/                        # Cloudflare Worker (Hono)
│   │   ├── index.ts                # Entry point worker
│   │   ├── middleware/
│   │   │   ├── auth.ts             # JWT validation
│   │   │   ├── rbac.ts             # Role-based access
│   │   │   └── audit.ts            # Audit trail logger
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── clients.ts
│   │   │   ├── products.ts
│   │   │   ├── orders.ts
│   │   │   ├── payments.ts
│   │   │   ├── production.ts
│   │   │   ├── attendance.ts
│   │   │   ├── kpi.ts
│   │   │   ├── returns.ts
│   │   │   ├── reports.ts
│   │   │   ├── wa.ts
│   │   │   └── settings.ts
│   │   ├── services/               # Business logic
│   │   │   ├── order.service.ts
│   │   │   ├── payment.service.ts
│   │   │   ├── production.service.ts
│   │   │   ├── wa.service.ts
│   │   │   ├── kpi.service.ts
│   │   │   └── document.service.ts
│   │   ├── db/
│   │   │   ├── schema.ts           # Drizzle schema
│   │   │   └── migrations/
│   │   └── utils/
│   │       ├── numbering.ts        # PO-2026-XXXX generator
│   │       └── pdf.ts              # PDF generation
│   │
│   ├── app/                        # React Frontend
│   │   ├── components/
│   │   │   ├── atoms/              # Terkecil: Button, Input, Badge, Avatar
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Badge.tsx
│   │   │   │   ├── Avatar.tsx
│   │   │   │   ├── Spinner.tsx
│   │   │   │   └── Skeleton.tsx
│   │   │   ├── molecules/          # Gabungan atoms: FormField, StatCard, TableRow
│   │   │   │   ├── FormField.tsx
│   │   │   │   ├── StatCard.tsx
│   │   │   │   ├── SearchBar.tsx
│   │   │   │   ├── StatusBadge.tsx
│   │   │   │   └── EmptyState.tsx
│   │   │   ├── organisms/          # Gabungan molecules: Sidebar, DataTable, OrderForm
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── TopBar.tsx
│   │   │   │   ├── DataTable.tsx
│   │   │   │   ├── OrderForm.tsx
│   │   │   │   ├── PaymentVerifyCard.tsx
│   │   │   │   └── ProductionKanban.tsx
│   │   │   └── templates/          # Layout: DashboardLayout, AuthLayout
│   │   │       ├── DashboardLayout.tsx
│   │   │       └── AuthLayout.tsx
│   │   │
│   │   ├── pages/                  # 34 halaman (lihat 7.1)
│   │   │   ├── auth/
│   │   │   │   └── LoginPage.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── OwnerDashboard.tsx
│   │   │   │   ├── AdminDashboard.tsx
│   │   │   │   ├── SalesDashboard.tsx
│   │   │   │   └── ProductionDashboard.tsx
│   │   │   ├── clients/
│   │   │   ├── products/
│   │   │   ├── orders/
│   │   │   ├── finance/
│   │   │   ├── production/
│   │   │   ├── wa/
│   │   │   ├── hr/
│   │   │   ├── reports/
│   │   │   ├── returns/
│   │   │   ├── settings/
│   │   │   └── NotFoundPage.tsx    # ← Wajib
│   │   │
│   │   ├── hooks/                  # Custom hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useRole.ts
│   │   │   └── useGeolocation.ts
│   │   │
│   │   ├── lib/                    # Utilities
│   │   │   ├── api.ts              # Fetch wrapper
│   │   │   ├── auth.ts             # Token storage
│   │   │   ├── constants.ts
│   │   │   └── format.ts           # Rupiah, date, etc.
│   │   │
│   │   ├── stores/                 # Zustand / Context
│   │   │   └── authStore.ts
│   │   │
│   │   ├── types/                  # TypeScript interfaces
│   │   │   ├── user.ts
│   │   │   ├── order.ts
│   │   │   ├── product.ts
│   │   │   └── ...
│   │   │
│   │   ├── router.tsx              # react-router-dom config
│   │   ├── App.tsx
│   │   └── main.tsx
│   │
│   └── shared/                     # Shared types antara API & Frontend
│       ├── types.ts
│       └── constants.ts
│
├── wrangler.jsonc
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
├── package.json
└── drizzle.config.ts
```

### 8.3 Routing (react-router-dom)

```tsx
// src/app/router.tsx
import { createBrowserRouter } from 'react-router-dom';

export const router = createBrowserRouter([
  // Auth
  { path: '/login', element: <LoginPage /> },

  // Protected — DashboardLayout
  {
    path: '/',
    element: <ProtectedRoute><DashboardLayout /></ProtectedRoute>,
    children: [
      // Dashboard (redirect berdasarkan role)
      { index: true, element: <DashboardRedirect /> },

      // Klien
      { path: 'clients', element: <ClientListPage /> },
      { path: 'clients/:id', element: <ClientDetailPage /> },

      // Produk
      { path: 'products', element: <ProductListPage /> },
      { path: 'products/:id', element: <ProductDetailPage /> },
      { path: 'products/hpp', element: <OwnerOnly><HppManagerPage /></OwnerOnly> },

      // Pesanan
      { path: 'orders', element: <OrderListPage /> },
      { path: 'orders/new', element: <OrderFormPage /> },
      { path: 'orders/:id', element: <OrderDetailPage /> },

      // Keuangan
      { path: 'finance/verify', element: <AdminOnly><PaymentVerifyPage /></AdminOnly> },
      { path: 'finance/documents', element: <DocumentListPage /> },

      // Produksi
      { path: 'production', element: <ProductionMonitorPage /> },
      { path: 'production/:id', element: <ProductionDetailPage /> },

      // WhatsApp
      { path: 'wa/settings', element: <AdminOnly><WaSettingsPage /></AdminOnly> },
      { path: 'wa/logs', element: <WaLogPage /> },

      // SDM
      { path: 'attendance', element: <AttendancePage /> },
      { path: 'visits', element: <VisitLogPage /> },
      { path: 'kpi', element: <KpiDashboardPage /> },

      // Laporan
      { path: 'reports/margin', element: <OwnerOnly><MarginReportPage /></OwnerOnly> },
      { path: 'reports/sales', element: <SalesReportPage /> },
      { path: 'reports/production', element: <ProductionReportPage /> },

      // Retur
      { path: 'returns', element: <ReturnListPage /> },
      { path: 'returns/new', element: <ReturnFormPage /> },
      { path: 'returns/:id', element: <ReturnDetailPage /> },

      // Settings
      { path: 'settings', element: <OwnerOnly><SettingsPage /></OwnerOnly> },
      { path: 'settings/users', element: <OwnerOnly><UserManagementPage /></OwnerOnly> },
      { path: 'profile', element: <ProfilePage /> },
    ],
  },

  // 404
  { path: '*', element: <NotFoundPage /> },
]);
```

### 8.4 Konvensi Koding

| Aspek | Aturan |
|-------|--------|
| **Naming** | PascalCase komponen, camelCase fungsi/variabel, UPPER_SNAKE constants |
| **File** | Satu komponen per file, nama = nama komponen |
| **Komponen** | Functional component + TypeScript interface untuk props |
| **State** | TanStack Query untuk server state, Zustand untuk client state |
| **API Calls** | Semua via `src/app/lib/api.ts` wrapper, tidak langsung `fetch` |
| **Error** | Try-catch di service layer, user-friendly toast di UI |
| **Loading** | Skeleton component untuk initial load, Spinner untuk action |
| **Empty State** | Custom EmptyState component, bukan teks kosong |
| **Responsive** | Mobile-first (`sm:`, `md:`, `lg:` breakpoints) |
| **Tailwind** | Gunakan `@apply` untuk pattern berulang, hindari class > 8 utility |

### 8.5 Not Found & Loading State (Wajib)

**Not Found Page:**
```tsx
// src/app/pages/NotFoundPage.tsx
// ⚠️ Tidak ada mockup di ui/ — gunakan design tokens dari DESIGN.md
export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="font-h1 text-h1 text-primary">404</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant mt-4">
          Halaman tidak ditemukan
        </p>
        <Link to="/" className="mt-6 inline-block bg-primary-container text-on-primary
                                py-3 px-6 rounded font-label-md text-label-md
                                hover:bg-primary transition-colors duration-200">
          Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
}
```

**Loading / Skeleton:**
```tsx
// src/app/components/atoms/Skeleton.tsx
// Gunakan surface-container-high sebagai warna pulse agar konsisten dengan design system
export function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-surface-container-high rounded ${className}`} />;
}

// src/app/components/atoms/Spinner.tsx
export function Spinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="w-8 h-8 border-4 border-surface-container-high
                      border-t-primary-container rounded-full animate-spin" />
    </div>
  );
}

// Penggunaan di page:
// ⚠️ Selalu lihat screen.png halaman terkait di ui/ untuk layout yang benar
function OrderListPage() {
  const { data, isLoading } = useQuery({ queryKey: ['orders'], queryFn: getOrders });
  if (isLoading) return <TableSkeleton rows={5} cols={6} />;
  if (!data?.length) return <EmptyState title="Belum ada pesanan" />;
  return <DataTable data={data} columns={orderColumns} />;
}
```

### 8.6 RBAC Middleware (API & Frontend)

**API (Hono):**
```ts
// src/api/middleware/rbac.ts
export function requireRole(...roles: string[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user');
    if (!roles.includes(user.role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    await next();
  };
}
// Penggunaan:
app.get('/api/v1/products/:id/hpp', authMiddleware, requireRole('owner'), getHpp);
```

**Frontend:**
```tsx
// src/app/components/templates/OwnerOnly.tsx
export function OwnerOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== 'owner') return <Navigate to="/" replace />;
  return <>{children}</>;
}
```

---

## 9. Non-Functional Requirements

| Aspek | Target |
|-------|--------|
| **Performance** | TTFB < 100ms (edge), page load < 2s |
| **Availability** | 99.9% (Cloudflare SLA) |
| **Security** | HTTPS only, JWT expiry 24h, HPP encrypted |
| **Scalability** | D1 single DB (Fase 1), sharding ready (Fase 2) |
| **Backup** | D1 Time Travel (30 hari), R2 versioning |
| **Browser** | Chrome, Safari, Edge (2 versi terakhir) |
| **Mobile** | Responsive PWA-ready |
| **Bahasa** | Bahasa Indonesia (UI), English (kode) |

---

## 10. Milestones & Prioritas Pengembangan

| Sprint | Durasi | Deliverable |
|--------|--------|-------------|
| **Sprint 0** | 1 minggu | Setup project, DB schema, auth, RBAC, layout |
| **Sprint 1** | 2 minggu | Modul A (CRM) + Master Data (Klien, Produk) |
| **Sprint 2** | 2 minggu | Modul B (Keuangan) + Dokumen otomatis |
| **Sprint 3** | 2 minggu | Modul C (Produksi) + Lock System |
| **Sprint 4** | 1 minggu | Modul D (WA Gateway) |
| **Sprint 5** | 2 minggu | Modul E (SDM, KPI, Absensi GPS) |
| **Sprint 6** | 1 minggu | Modul F (Laporan Eksekutif) |
| **Sprint 7** | 1 minggu | Modul G (Retur) |
| **Sprint 8** | 1 minggu | Testing, polish, deploy production |

**Total estimasi: ~13 minggu (3 bulan)**

---

## 11. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|--------|--------|----------|
| D1 limit 10GB | Data overflow | Monitor usage, siapkan sharding plan |
| WA API rate limit | Pesan gagal kirim | Queue system, retry logic |
| GPS spoofing | Absensi palsu | Validasi tambahan (foto wajib) |
| HPP data leak | Kerugian bisnis | Encryption, audit trail, RBAC ketat |
| User adoption rendah | Sistem tidak terpakai | UI sederhana, training, onboarding |

---

*Dokumen ini adalah living document dan akan diperbarui seiring perkembangan proyek.*
