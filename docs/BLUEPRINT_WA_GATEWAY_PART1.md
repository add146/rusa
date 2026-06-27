# 📘 Component Blueprint: WhatsApp Gateway — Evolution API
### Buku Panduan Standar Implementasi (Plug-and-Play Module)

> **Versi**: 1.0 · **Tanggal**: 9 Mei 2026  
> **Tech Stack**: Cloudflare Workers (Hono) · D1 SQLite · React (Vite) · Vanilla CSS  
> **Evolution API Server**: `https://evolution.mitrabot.my.id`

---

## 1. ARSITEKTUR & ALUR SISTEM (SYSTEM FLOW)

### 1.1 Komponen Utama

| Layer | Teknologi | Fungsi |
|-------|-----------|--------|
| **Frontend** | React 19 + Vite 8 | Admin dashboard, konfigurasi WA, QR scan, test kirim |
| **Backend Proxy** | Cloudflare Workers (Hono) | Proxy aman ke Evolution API, auth JWT, business logic |
| **WA Engine** | Evolution API v2 (self-hosted) | Manajemen instance WA, kirim pesan, QR pairing |
| **Database** | Cloudflare D1 (SQLite) | Simpan config, template pesan, status pengiriman |

### 1.2 Diagram Arsitektur

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

### 1.3 Alur Kerja Detail

#### Flow A: Koneksi WhatsApp (QR Pairing)

```
Admin UI                    Worker Proxy               Evolution API
  │                            │                           │
  │──GET /api/admin/wa/status─►│                           │
  │                            │──GET /instance/           │
  │                            │  connectionState/{name}──►│
  │                            │◄──{state:"close"}─────────│
  │◄──{state:"close"}─────────│                           │
  │                            │                           │
  │──GET /api/admin/wa/qr─────►│                           │
  │                            │──GET /instance/           │
  │                            │  connect/{name}──────────►│
  │                            │◄──{qrcode:{base64:...}}──│
  │◄──{qrcode base64}─────────│                           │
  │                            │                           │
  │  [User scans QR]           │                           │
  │──GET /api/admin/wa/status─►│                           │
  │◄──{state:"open"} ─────────│  (now connected)          │
```

#### Flow B: Kirim Pesan Otomatis (Registration/Payment)

```
Public Form                 Worker                   Evolution API
  │                            │                          │
  │──POST /api/public/register►│                          │
  │                            │──INSERT participants─────│
  │                            │  (whatsapp_status=       │
  │                            │   'pending')             │
  │◄──{registration_id}───────│                          │
  │                            │                          │
  │  [Background: waitUntil]   │                          │
  │                            │──POST /message/          │
  │                            │  sendText/{instance}────►│
  │                            │◄──200 OK─────────────────│
  │                            │──UPDATE participants     │
  │                            │  whatsapp_status='sent'  │
```

#### Flow C: Webhook Payment → Auto WA

```
Payment Gateway             Worker Webhook           Evolution API
  │                            │                          │
  │──POST /gateway-webhook────►│                          │
  │  {external_id, status:     │                          │
  │   "PAID"}                  │                          │
  │                            │──UPDATE payments─────────│
  │                            │──UPDATE participants     │
  │                            │  payment_status='paid'   │
  │                            │                          │
  │                            │  [Background: waitUntil] │
  │                            │──POST /message/          │
  │                            │  sendText/{instance}────►│
  │◄──{success: true}─────────│                          │
```

### 1.4 Security Model

- **Frontend → Worker**: JWT Bearer token (`Authorization: Bearer <token>`)
- **Worker → Evolution API**: API Key header (`apikey: <key>`)
- **Webhook → Worker**: Service Key header (`X-Service-Key: <key>`)
- **Role Guard**: Semua endpoint `/api/admin/wa/*` hanya untuk role `admin`

---

## 2. STANDAR UI/UX & LAYOUT (DESIGN SYSTEM)

### 2.1 Design Tokens (CSS Variables)

```css
:root {
  --primary: #bb0017;
  --primary-container: #e61826;
  --primary-fixed: #ffdad6;
  --on-primary: #fff;
  --surface: #f8f9ff;
  --surface-low: #eff4ff;
  --surface-lowest: #fff;
  --surface-high: #e2e8f6;
  --on-surface: #151c26;
  --secondary: #585f6a;
  --radius: 1rem;
  --radius-full: 9999px;
  --shadow-sm: 0 2px 8px #151c260a;
  --shadow-md: 0 4px 16px #151c260f;
  --transition: 0.2s ease;
}
```

**Typography**: `Plus Jakarta Sans` (body), `Inter` (headings)  
**Icons**: Google Material Symbols Outlined (filled variant, weight 400)

### 2.2 Layout Utama — Halaman Settings

```
┌──────────────────────────────────────────────────────────┐
│ admin-layout (flex, min-height: 100vh)                   │
│ ┌─────────┐ ┌──────────────────────────────────────────┐ │
│ │ Sidebar  │ │ admin-main                               │ │
│ │ 240px    │ │ ┌──────────────────────────────────────┐ │ │
│ │          │ │ │ admin-header: "Settings"              │ │ │
│ │ - Home   │ │ └──────────────────────────────────────┘ │ │
│ │ - Camps  │ │                                          │ │
│ │ - Parts  │ │ ┌─────────────────┐ ┌────────────────┐  │ │
│ │ - Sett ← │ │ │ Informasi Akun  │ │ Ubah Password  │  │ │
│ │          │ │ └─────────────────┘ └────────────────┘  │ │
│ │          │ │                                          │ │
│ │          │ │ ═══ Pengaturan Sistem ═══════════════    │ │
│ │          │ │                                          │ │
│ │          │ │ ┌────────────────────────────────────┐   │ │
│ │          │ │ │ Payment Gateway (span 2 cols)      │   │ │
│ │          │ │ └────────────────────────────────────┘   │ │
│ │          │ │                                          │ │
│ │          │ │ ┌─────────────────┐ ┌────────────────┐  │ │
│ │          │ │ │ █ WA API Server │ │ Relawan/Panitia│  │ │
│ │          │ │ │ ┌─Status Badge─┐│ │ (span 2)       │  │ │
│ │          │ │ │ │Config Fields ││ └────────────────┘  │ │
│ │          │ │ │ │QR Code Area  ││                      │ │
│ │          │ │ │ │Test Send Form││                      │ │
│ │          │ │ │ └──────────────┘│                      │ │
│ │          │ │ └─────────────────┘                      │ │
│ └─────────┘ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### 2.3 Kartu WhatsApp API Server — Struktur Komponen

```
settings-card
├── Header Row (flex, space-between)
│   ├── h3: icon[forum] + "WhatsApp API Server"
│   └── Status Badge (conditional)
│       ├── state=open    → badge.active "Connected" + icon[wifi_tethering]
│       ├── state=loading → badge + spinner-small "Checking..."
│       └── state=other   → badge.draft "Disconnected" + icon[portable_wifi_off]
│
├── Subtitle: "Powered by Evolution API"
│
├── Config Fields
│   ├── form-group: "API URL Endpoint" (input[url])
│   ├── form-group: "Global API Key" (input[password])
│   └── form-group: "Nama Instance" (input[text])
│
├── Action Buttons
│   ├── btn-primary: "Simpan Config"
│   └── btn-outline[red]: "Putuskan Koneksi" (only when connected)
│
├── QR Code Area (only when NOT connected)
│   ├── State: showQr=false
│   │   ├── btn-primary: icon[qr_code_scanner] "Scan QR Code"
│   │   ├── btn-outline: "Refresh Status"
│   │   └── btn-outline: "Inisialisasi Instance" (only state=not_found)
│   └── State: showQr=true
│       ├── Error Alert (if waError)
│       ├── QR Image (img, max-width:200px) OR Loading Spinner
│       ├── btn-outline: "Refresh QR"
│       └── btn-outline[red]: "Reset / Logout"
│
└── Test Send Section (footer area)
    ├── h4: icon[send] + "Uji Coba Pengiriman"
    ├── Disabled overlay when NOT connected (opacity:0.5, pointer-events:none)
    ├── form-group: "Nomor WA Tujuan" (input[text])
    ├── form-group: "Isi Pesan Tes" (textarea)
    └── btn-primary[full-width]: "Kirim Pesan Tes"
```

### 2.4 State Management UI

| State | Tampilan | Komponen CSS |
|-------|----------|-------------|
| **Loading** | Spinner kecil (16x16px, border animation) + teks "Checking..." | `.spinner-small` + text |
| **Connected** | Badge hijau "Connected" + icon wifi | `.status-badge.active` |
| **Disconnected** | Badge abu "Disconnected" + icon wifi_off | `.status-badge.draft` |
| **Not Found** | Error message + tombol "Inisialisasi Instance" | Alert div merah + `.btn-outline` |
| **QR Loading** | Spinner center + "Memuat QR Code..." | `.spinner-small` centered |
| **QR Ready** | QR image 200x200px centered | `img` with border radius |
| **Error** | Red alert box (#fef2f2 bg, #dc2626 text) | Inline div |
| **Test Disabled** | Form opacity 0.5 + pointer-events none | Inline style |
| **Sending** | Button text "Mengirim..." + disabled | `:disabled` state |

### 2.5 Spesifikasi Komponen CSS

```css
/* Card container */
.settings-card { background: var(--surface-lowest); border-radius: var(--radius); box-shadow: var(--shadow-sm); padding: 2rem; }
.settings-card h3 { display: flex; align-items: center; gap: 0.5rem; font-size: 1.125rem; margin-bottom: 1.5rem; }
.settings-card h3 .material-symbols-outlined { color: var(--primary); }

/* Status badges */
.status-badge { display: inline-block; border-radius: var(--radius-full); padding: 0.2rem 0.6rem; font-size: 0.7rem; font-weight: 700; }
.status-badge.active { color: #166534; background: #dcfce7; }
.status-badge.draft { background: var(--surface-high); color: var(--secondary); }

/* Buttons */
.btn-primary { border-radius: var(--radius-full); background: linear-gradient(135deg, var(--primary), var(--primary-container)); color: #fff; padding: 0.75rem 1.5rem; font-weight: 700; border: none; display: inline-flex; align-items: center; gap: 0.5rem; }
.btn-outline { border-radius: var(--radius-full); background: var(--surface-lowest); border: 1px solid var(--surface-high); padding: 0.75rem 1.5rem; font-weight: 600; }

/* Form */
.form-group { margin-bottom: 1rem; }
.form-group label { display: block; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.05em; color: var(--secondary); margin-bottom: 0.5rem; }
.settings-card input { width: 100%; border: 1px solid var(--surface-high); background: var(--surface-low); border-radius: 0.625rem; padding: 0.75rem 1rem; font-size: 0.9rem; }
.settings-card input:focus { border-color: var(--primary); box-shadow: 0 0 0 4px var(--primary-fixed); background: var(--surface-lowest); outline: none; }
```

---

## 3. SPESIFIKASI API & DATABASE

### 3.1 Skema Database (D1/SQLite)

#### Tabel `settings` — Konfigurasi WA

```sql
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
);
```

**Key-value yang digunakan modul WA:**

| Key | Deskripsi | Default Value |
|-----|-----------|---------------|
| `wa_api_url` | URL server Evolution API | `https://evolution.mitrabot.my.id` |
| `wa_api_key` | Global API Key untuk auth | *(wajib diisi)* |
| `wa_instance` | Nama instance WhatsApp | *(wajib diisi, contoh: `pendidikansm`)* |
| `wa_enabled` | Toggle aktif/nonaktif (`1`/`0`) | `1` |
| `wa_template_registration` | Template pesan registrasi | `Halo {nama}, pendaftaran...` |
| `wa_template_payment` | Template pesan konfirmasi bayar | `Halo {nama}, pembayaran...` |

#### Kolom WA di Tabel `participants`

```sql
-- Kolom terkait WhatsApp pada tabel participants
whatsapp_status TEXT DEFAULT 'pending',  -- 'pending' | 'sent' | 'failed'
whatsapp_sent_at TEXT,                    -- ISO 8601 timestamp
phone TEXT,                               -- Nomor WA penerima
```

### 3.2 Definisi API Endpoints

#### A. Status Koneksi

| | Detail |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/admin/wa/status` |
| **Auth** | `Authorization: Bearer <jwt>` (role: admin) |
| **Response** | `{ "success": true, "data": { "state": "open" \| "close" \| "not_found" } }` |

#### B. Get QR Code

| | Detail |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/admin/wa/qr` |
| **Auth** | `Authorization: Bearer <jwt>` (role: admin) |
| **Response** | `{ "success": true, "data": { "qrcode": { "base64": "data:image/png;base64,..." } } }` |

#### C. Inisialisasi Instance

| | Detail |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/admin/wa/create` |
| **Auth** | `Authorization: Bearer <jwt>` (role: admin) |
| **Body** | *(tidak ada — config diambil dari DB)* |
| **Response** | `{ "success": true, "data": { "instanceName": "...", "status": "created" } }` |

#### D. Kirim Pesan Test

| | Detail |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/admin/wa/test` |
| **Auth** | `Authorization: Bearer <jwt>` (role: admin) |
| **Body** | `{ "number": "08123456789", "message": "Halo test!" }` |
| **Response** | `{ "success": true, "data": { "key": { "id": "..." } } }` |

#### E. Logout / Disconnect

| | Detail |
|---|---|
| **Method** | `DELETE` |
| **URL** | `/api/admin/wa/logout` |
| **Auth** | `Authorization: Bearer <jwt>` (role: admin) |
| **Response** | `{ "success": true, "data": { "status": "SUCCESS" } }` |

#### F. Resend WA ke Peserta

| | Detail |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/admin/participants/:id/resend-wa` |
| **Auth** | `Authorization: Bearer <jwt>` |
| **Response** | `{ "success": true, "data": { "message": "WhatsApp berhasil dikirim ulang" } }` |

### 3.3 Evolution API Endpoints (yang di-proxy)

> **PENTING:** Evolution API menggunakan header `apikey`, BUKAN `Authorization`.

| Fungsi | Method | Evolution URL | Header |
|--------|--------|--------------|--------|
| Cek Status | `GET` | `/instance/connectionState/{instance}` | `apikey: <key>` |
| Connect/QR | `GET` | `/instance/connect/{instance}` | `apikey: <key>` |
| Create Instance | `POST` | `/instance/create` | `apikey: <key>`, `Content-Type: application/json` |
| Kirim Pesan | `POST` | `/message/sendText/{instance}` | `apikey: <key>`, `Content-Type: application/json` |
| Logout | `DELETE` | `/instance/logout/{instance}` | `apikey: <key>` |

**Format body kirim pesan (Evolution API):**

```json
{
  "number": "6281234567890",
  "options": {
    "delay": 1200,
    "presence": "composing",
    "linkPreview": false
  },
  "textMessage": {
    "text": "Isi pesan di sini"
  }
}
```

> Lanjutan di **Part 2**: Boilerplate Code & Checklist Integrasi
