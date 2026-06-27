# 📘 Component Blueprint: WhatsApp Gateway — Evolution API (Part 2)
### Boilerplate Code & Checklist Integrasi

---

## 4. BOILERPLATE CODE (KODE TEMPLATE STANDAR)

### 4.1 Backend — WhatsApp Service (`worker/src/lib/whatsapp-service.ts`)

```typescript
import type { Participant, Campaign, Setting, TicketType } from '../types';

// ──────────────────────────────────────────────────
// CONFIG INTERFACE
// ──────────────────────────────────────────────────
export interface WaConfig {
    apiUrl: string;
    apiKey: string;
    instance: string;
    enabled: boolean;
    templateRegistration: string;
    templatePayment: string;
}

// ──────────────────────────────────────────────────
// LOAD CONFIG DARI DATABASE
// ──────────────────────────────────────────────────
export async function getWaConfig(db: D1Database): Promise<WaConfig> {
    const settings = await db.prepare('SELECT * FROM settings').all<Setting>();

    const config: WaConfig = {
        apiUrl: 'https://evolution.mitrabot.my.id',
        apiKey: '',           // ← WAJIB diisi di DB
        instance: '',         // ← WAJIB diisi di DB
        enabled: true,
        templateRegistration: 'Halo {nama}, pendaftaran event {event} berhasil. ID: {regid}',
        templatePayment: 'Halo {nama}, pembayaran tiket {tiket} event {event} telah dikonfirmasi.'
    };

    for (const s of settings.results) {
        if (!s.value) continue;
        if (s.key === 'wa_api_url') config.apiUrl = s.value.replace(/\/$/, "");
        if (s.key === 'wa_api_key') config.apiKey = s.value;
        if (s.key === 'wa_instance') config.instance = s.value;
        if (s.key === 'wa_enabled') config.enabled = s.value === '1' || s.value === 'true';
        if (s.key === 'wa_template_registration') config.templateRegistration = s.value;
        if (s.key === 'wa_template_payment') config.templatePayment = s.value;
    }
    return config;
}

// ──────────────────────────────────────────────────
// FORMAT NOMOR TELEPON → FORMAT INTERNASIONAL
// ──────────────────────────────────────────────────
export function formatPhoneNumber(phone: string): string {
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('0')) clean = '62' + clean.slice(1);
    return clean;
}

// ──────────────────────────────────────────────────
// KIRIM PESAN VIA EVOLUTION API
// ──────────────────────────────────────────────────
export async function sendWhatsAppMessage(
    config: WaConfig, to: string, message: string
): Promise<boolean> {
    if (!config.enabled) return false;
    const formattedNumber = formatPhoneNumber(to);

    try {
        const payload = {
            number: formattedNumber,
            options: { delay: 1500, presence: "composing", linkPreview: false },
            textMessage: { text: message }
        };

        const response = await fetch(
            `${config.apiUrl}/message/sendText/${config.instance}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': config.apiKey       // ← BUKAN 'Authorization'!
                },
                body: JSON.stringify(payload)
            }
        );
        return response.ok;
    } catch (e) {
        console.error('Failed to send WhatsApp message:', e);
        return false;
    }
}

// ──────────────────────────────────────────────────
// TEMPLATE PLACEHOLDER REPLACEMENT
// ──────────────────────────────────────────────────
export function replaceTemplatePlaceholders(
    template: string, data: Record<string, string>
): string {
    let result = template;
    for (const [key, value] of Object.entries(data)) {
        result = result.replace(new RegExp(`{${key}}`, 'g'), value);
    }
    return result;
}

// ──────────────────────────────────────────────────
// NOTIFIKASI REGISTRASI OTOMATIS
// ──────────────────────────────────────────────────
export async function sendRegistrationNotification(
    db: D1Database, participant: Participant,
    campaign: Campaign, ticket?: TicketType, originBaseUrl?: string
): Promise<boolean> {
    const config = await getWaConfig(db);
    if (!config.enabled || !participant.phone) return false;

    const data: Record<string, string> = {
        nama: participant.full_name,
        regid: participant.registration_id,
        event: campaign.name,
        tiket: ticket ? ticket.name : 'Gratis',
        total: `Rp ${((ticket?.price || 0) + participant.donation_amount).toLocaleString('id-ID')}`,
        link: originBaseUrl ? `${originBaseUrl}/ticket/${participant.registration_id}` : '',
        cs: campaign.whatsapp_cs || '',
        tanggal: campaign.event_date || '',
        waktu: campaign.event_time || '',
        lokasi: campaign.location || '',
    };

    const message = replaceTemplatePlaceholders(
        campaign.wa_template_registration || config.templateRegistration, data
    );
    const success = await sendWhatsAppMessage(config, participant.phone, message);

    // Update status di database
    if (success) {
        await db.prepare(
            "UPDATE participants SET whatsapp_status = 'sent', whatsapp_sent_at = ? WHERE id = ?"
        ).bind(new Date().toISOString(), participant.id).run();
    } else {
        await db.prepare(
            "UPDATE participants SET whatsapp_status = 'failed' WHERE id = ?"
        ).bind(participant.id).run();
    }
    return success;
}
```

### 4.2 Backend — WhatsApp Routes (`worker/src/routes/whatsapp.ts`)

```typescript
import { Hono } from 'hono';
import type { Env, ApiResponse, Setting } from '../types';

const waRoutes = new Hono<{ Bindings: Env }>();

// ── MIDDLEWARE: Admin Only ──────────────────────
waRoutes.use('*', async (c, next) => {
    const user = c.get('user' as never) as { role?: string };
    if (user.role !== 'admin') {
        return c.json<ApiResponse>({
            success: false, error: 'Akses ditolak. Hanya Admin.'
        }, 403);
    }
    await next();
});

// ── HELPER: Load WA config dari DB ─────────────
async function getWaBase(db: D1Database) {
    const settings = await db.prepare(
        'SELECT * FROM settings WHERE key IN ("wa_api_url","wa_api_key","wa_instance")'
    ).all<Setting>();

    let apiUrl = 'https://evolution.mitrabot.my.id';
    let apiKey = '';
    let instance = '';

    for (const s of settings.results) {
        if (s.key === 'wa_api_url' && s.value) apiUrl = s.value;
        if (s.key === 'wa_api_key' && s.value) apiKey = s.value;
        if (s.key === 'wa_instance' && s.value) instance = s.value;
    }
    apiUrl = apiUrl.replace(/\/$/, "");
    return { apiUrl, apiKey, instance };
}

// ── GET /status ────────────────────────────────
waRoutes.get('/status', async (c) => {
    try {
        const { apiUrl, apiKey, instance } = await getWaBase(c.env.DB);
        const response = await fetch(
            `${apiUrl}/instance/connectionState/${instance}`,
            { headers: { 'apikey': apiKey } }
        );

        if (response.status === 404) {
            return c.json<ApiResponse>({
                success: true, data: { status: 'not_found', state: 'not_found' }
            });
        }
        if (!response.ok) {
            const errorText = await response.text();
            return c.json<ApiResponse>({
                success: false, error: `Evolution API Error: ${response.statusText}`
            }, response.status);
        }

        const data = await response.json() as any;
        const state = data?.instance?.state || data?.state || 'unknown';
        return c.json<ApiResponse>({ success: true, data: { ...data, state } });
    } catch (err: any) {
        return c.json<ApiResponse>({
            success: false, error: 'Kesalahan sistem: ' + (err.message || 'Unknown')
        }, 500);
    }
});

// ── GET /qr ────────────────────────────────────
waRoutes.get('/qr', async (c) => {
    try {
        const { apiUrl, apiKey, instance } = await getWaBase(c.env.DB);
        const response = await fetch(
            `${apiUrl}/instance/connect/${instance}`,
            { headers: { 'apikey': apiKey } }
        );
        if (!response.ok) {
            return c.json<ApiResponse>({
                success: false, error: `Gagal mendapatkan QR: ${response.statusText}`
            }, response.status);
        }
        const data = await response.json() as any;
        return c.json<ApiResponse>({ success: true, data });
    } catch (err: any) {
        return c.json<ApiResponse>({
            success: false, error: 'Kesalahan sistem fetch QR'
        }, 500);
    }
});

// ── POST /create ───────────────────────────────
waRoutes.post('/create', async (c) => {
    try {
        const { apiUrl, apiKey, instance } = await getWaBase(c.env.DB);
        const payload = { instanceName: instance, token: apiKey, qrcode: true };
        const response = await fetch(`${apiUrl}/instance/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
            body: JSON.stringify(payload)
        });
        const data = await response.json() as any;
        if (!response.ok) {
            return c.json<ApiResponse>({
                success: false, error: data?.message || 'Gagal inisialisasi'
            }, response.status);
        }
        return c.json<ApiResponse>({ success: true, data });
    } catch (err: any) {
        return c.json<ApiResponse>({
            success: false, error: 'Kesalahan sistem saat inisialisasi'
        }, 500);
    }
});

// ── POST /test ─────────────────────────────────
waRoutes.post('/test', async (c) => {
    try {
        const { number, message } = await c.req.json<{
            number: string, message: string
        }>();
        if (!number || !message) {
            return c.json<ApiResponse>({
                success: false, error: 'Nomor dan pesan wajib diisi'
            }, 400);
        }
        const { apiUrl, apiKey, instance } = await getWaBase(c.env.DB);
        const payload = {
            number: number.replace(/[^0-9]/g, ''),
            options: { delay: 1200, presence: "composing", linkPreview: false },
            textMessage: { text: message }
        };
        const response = await fetch(
            `${apiUrl}/message/sendText/${instance}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
                body: JSON.stringify(payload)
            }
        );
        const data = await response.json() as any;
        if (!response.ok) {
            return c.json<ApiResponse>({
                success: false, error: data?.message || 'Gagal kirim test'
            }, response.status);
        }
        return c.json<ApiResponse>({ success: true, data });
    } catch (err) {
        return c.json<ApiResponse>({
            success: false, error: 'Terjadi kesalahan sistem'
        }, 500);
    }
});

// ── DELETE /logout ─────────────────────────────
waRoutes.delete('/logout', async (c) => {
    try {
        const { apiUrl, apiKey, instance } = await getWaBase(c.env.DB);
        const response = await fetch(
            `${apiUrl}/instance/logout/${instance}`,
            { method: 'DELETE', headers: { 'apikey': apiKey } }
        );
        const data = await response.json() as any;
        return c.json<ApiResponse>({ success: true, data });
    } catch (err) {
        return c.json<ApiResponse>({
            success: false, error: 'Gagal logout akun WA'
        }, 500);
    }
});

export default waRoutes;
```

### 4.3 Backend — Registrasi Route (Worker Entry)

```typescript
// Di file worker/src/index.ts — tambahkan routing:
import waRoutes from './routes/whatsapp';

// Mount setelah auth middleware:
app.route('/api/admin/wa', waRoutes);
```

### 4.4 Frontend — API Client (`admin/src/lib/api.js`)

```javascript
export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8787/api';

function getToken() { return localStorage.getItem('token'); }

async function request(path, options = {}) {
    const token = getToken();
    const headers = { ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const data = await res.json();

    if (res.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        return;
    }
    if (!data.success) throw new Error(data.error || 'Request failed');
    return data.data;
}

export const api = {
    // ... existing endpoints ...

    // ── WhatsApp Gateway ─────────────────────────
    getWaStatus:    () => request('/admin/wa/status'),
    getWaQr:        () => request('/admin/wa/qr'),
    initWaInstance:  () => request('/admin/wa/create', { method: 'POST' }),
    testWaLink:     (number, message) => request('/admin/wa/test', {
        method: 'POST',
        body: JSON.stringify({ number, message })
    }),
    logoutWa:       () => request('/admin/wa/logout', { method: 'DELETE' }),

    // ── Resend WA per Participant ─────────────────
    resendParticipantWa: (id) => request(`/admin/participants/${id}/resend-wa`, {
        method: 'POST'
    }),
};
```

### 4.5 Frontend — React State Management (WhatsApp Section)

```jsx
// ── State declarations ──────────────────────────
const [waStatus, setWaStatus] = useState('loading');     // 'loading'|'open'|'close'|'not_found'|'error'
const [waQr, setWaQr] = useState(null);                  // base64 string or null
const [waError, setWaError] = useState(null);             // error message string
const [initializing, setInitializing] = useState(false);  // instance creation loading
const [showQr, setShowQr] = useState(false);              // toggle QR visibility
const [waTestNumber, setWaTestNumber] = useState('');
const [waTestMsg, setWaTestMsg] = useState('Halo! Ini pesan pengujian...');
const [sendingTest, setSendingTest] = useState(false);

// ── Check WA Status ─────────────────────────────
async function checkWaStatus(forceQr = false) {
    if (forceQr) setShowQr(true);
    setWaStatus('loading');
    setWaError(null);
    try {
        const res = await api.getWaStatus();
        setWaStatus(res.state);

        if (res.state === 'not_found') {
            setWaError('Instance belum terdaftar. Klik Inisialisasi.');
            setWaQr(null);
            return;
        }
        // Auto-fetch QR jika belum connected & QR diminta
        if (res.state !== 'open' && (showQr || forceQr)) {
            const qrRes = await api.getWaQr();
            if (qrRes?.qrcode?.base64) setWaQr(qrRes.qrcode.base64);
            else if (qrRes?.base64) setWaQr(qrRes.base64);
        } else {
            setWaQr(null);
        }
    } catch (err) {
        setWaStatus('error');
        setWaError(err.message || 'Gagal memuat status WhatsApp');
    }
}

// ── Initialize Instance ─────────────────────────
async function handleInitWa() {
    setInitializing(true);
    try {
        await api.initWaInstance();
        toast.success('Instance berhasil diinisialisasi!');
        setTimeout(checkWaStatus, 2000);
    } catch (err) {
        setWaError(err.message);
    } finally { setInitializing(false); }
}

// ── Send Test Message ───────────────────────────
async function handleTestWa(e) {
    e.preventDefault();
    if (!waTestNumber) return toast.error('Masukkan nomor tujuan');
    setSendingTest(true);
    try {
        await api.testWaLink(waTestNumber, waTestMsg);
        toast.success('Pesan test berhasil dikirim!');
    } catch (err) {
        toast.error('Gagal mengirim: ' + err.message);
    } finally { setSendingTest(false); }
}
```

### 4.6 Template Pesan — Placeholder yang Tersedia

| Placeholder | Sumber Data | Contoh |
|-------------|-------------|--------|
| `{nama}` | `participant.full_name` | Ahmad Rizki |
| `{regid}` | `participant.registration_id` | REG-2026-A3X5K |
| `{event}` | `campaign.name` | Workshop Digital Marketing |
| `{tiket}` | `ticket_type.name` | VIP Pass |
| `{total}` | Computed price + donation | Rp 150.000 |
| `{link}` | Auto-generated ticket URL | `https://domain/ticket/REG-...` |
| `{cs}` | `campaign.whatsapp_cs` | 08123456789 |
| `{tanggal}` | `campaign.event_date` | 2026-06-15 |
| `{waktu}` | `campaign.event_time` | 09:00 WIB |
| `{lokasi}` | `campaign.location` | Gedung A Lt.3 |
| `{donasi}` | `participant.donation_amount` | Rp 50.000 |
| `{waktu_bayar}` | Payment timestamp | 10 Mei 2026, 14:30 WIB |

---

## 5. CHECKLIST INTEGRASI (SOP)

### Phase 1: Prasyarat Infrastruktur

- [ ] **1.1** Pastikan Evolution API server sudah running dan accessible
  - URL: `https://evolution.mitrabot.my.id` (atau self-hosted)
  - Dapatkan **Global API Key** dari admin Evolution API
- [ ] **1.2** Pastikan Cloudflare D1 database sudah tersedia
- [ ] **1.3** Pastikan Cloudflare Worker sudah ter-deploy dengan binding D1

### Phase 2: Setup Database

- [ ] **2.1** Jalankan SQL untuk membuat tabel `settings` (jika belum ada):
```sql
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
);
```
- [ ] **2.2** Pastikan tabel `participants` memiliki kolom WA:
```sql
ALTER TABLE participants ADD COLUMN whatsapp_status TEXT DEFAULT 'pending';
ALTER TABLE participants ADD COLUMN whatsapp_sent_at TEXT;
ALTER TABLE participants ADD COLUMN phone TEXT;
```
- [ ] **2.3** Insert default settings:
```sql
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('wa_api_url', 'https://evolution.mitrabot.my.id'),
  ('wa_api_key', 'YOUR_API_KEY_HERE'),
  ('wa_instance', 'YOUR_INSTANCE_NAME'),
  ('wa_enabled', '1'),
  ('wa_template_registration', 'Halo {nama}, pendaftaran {event} berhasil! ID: {regid}'),
  ('wa_template_payment', 'Halo {nama}, pembayaran {tiket} event {event} telah dikonfirmasi.');
```

### Phase 3: Backend Integration

- [ ] **3.1** Copy file `worker/src/lib/whatsapp-service.ts` ke project baru
- [ ] **3.2** Copy file `worker/src/routes/whatsapp.ts` ke project baru
- [ ] **3.3** Pastikan `types.ts` memiliki interface `Setting`, `Participant`, `Campaign`, `TicketType`, `ApiResponse`
- [ ] **3.4** Register route di `index.ts`:
```typescript
import waRoutes from './routes/whatsapp';
app.route('/api/admin/wa', waRoutes);
```
- [ ] **3.5** Tambahkan middleware auth JWT sebelum route admin
- [ ] **3.6** Deploy Worker:
```bash
cd worker && npx wrangler deploy
```

### Phase 4: Frontend Integration

- [ ] **4.1** Tambahkan method WA ke API client (`api.js`):
  - `getWaStatus`, `getWaQr`, `initWaInstance`, `testWaLink`, `logoutWa`
- [ ] **4.2** Copy blok JSX WhatsApp card ke halaman Settings
- [ ] **4.3** Pastikan CSS classes tersedia: `.settings-card`, `.settings-grid`, `.status-badge`, `.btn-primary`, `.btn-outline`, `.form-group`, `.form-control`
- [ ] **4.4** Import icon font Google Material Symbols
- [ ] **4.5** Build frontend:
```bash
cd admin && npm run build
```

### Phase 5: Koneksi & Verifikasi

- [ ] **5.1** Buka halaman Settings di admin dashboard
- [ ] **5.2** Isi konfigurasi:
  - API URL: `https://evolution.mitrabot.my.id`
  - API Key: *(dari admin Evolution)*
  - Instance Name: *(nama unik untuk app ini)*
- [ ] **5.3** Klik **Simpan Config**
- [ ] **5.4** Jika status `not_found` → klik **Inisialisasi Instance**
- [ ] **5.5** Klik **Scan QR Code** → scan dengan WhatsApp di HP
- [ ] **5.6** Status berubah jadi **Connected** ✅
- [ ] **5.7** Uji coba kirim pesan tes → cek apakah diterima di HP

### Phase 6: Integrasi Notifikasi Otomatis

- [ ] **6.1** Di route registrasi, tambahkan `waitUntil` untuk kirim WA:
```typescript
c.executionCtx.waitUntil(async function() {
    const p = await db.prepare('SELECT * FROM participants WHERE id = ?')
        .bind(participantId).first<Participant>();
    if (p) await sendRegistrationNotification(db, p, campaign, ticket, baseUrl);
}());
```
- [ ] **6.2** Di webhook pembayaran, tambahkan `sendPaymentConfirmation`:
```typescript
if (newStatus === 'paid') {
    c.executionCtx.waitUntil(async function() {
        // ... fetch participant, campaign, ticket ...
        await sendPaymentConfirmation(db, p, campaign, ticket, baseUrl);
    }());
}
```
- [ ] **6.3** Test full flow: registrasi → bayar → cek WA diterima

### Phase 7: Monitoring & Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Status selalu `not_found` | Klik "Inisialisasi Instance" atau cek nama instance |
| QR tidak muncul | Cek API URL & API Key, pastikan server Evolution hidup |
| QR expired | Klik "Refresh QR" — QR hanya valid ~60 detik |
| Pesan tidak terkirim | Pastikan status `open`, nomor format benar (62xxx) |
| `whatsapp_status = 'failed'` | Cek log Worker, pastikan koneksi WA masih aktif |
| Error 401 dari Evolution | API Key salah atau expired, update di Settings |

---

## Appendix: File Structure Summary

```
project/
├── worker/                          # Cloudflare Worker (Backend)
│   ├── src/
│   │   ├── index.ts                 # Entry + route mounting
│   │   ├── types.ts                 # TypeScript interfaces
│   │   ├── lib/
│   │   │   └── whatsapp-service.ts  # ★ Core WA logic
│   │   ├── routes/
│   │   │   ├── whatsapp.ts          # ★ WA admin API routes
│   │   │   ├── participants.ts      # Includes resend-wa endpoint
│   │   │   └── gateway-webhook.ts   # Payment → auto WA
│   │   └── db/
│   │       └── schema.sql           # DB schema with WA columns
│   └── wrangler.toml                # D1 + R2 bindings
│
├── admin/                           # React Frontend (Vite)
│   ├── src/
│   │   ├── lib/
│   │   │   └── api.js               # ★ API client with WA methods
│   │   ├── pages/
│   │   │   └── Settings.jsx         # ★ WA config UI component
│   │   └── index.css                # ★ Design system CSS
│   └── package.json                 # React 19, Vite 8
│
└── docs/
    └── BLUEPRINT_WA_GATEWAY.md      # This document
```

> **Legenda**: File bertanda ★ adalah file inti yang WAJIB ada untuk modul WA Gateway berfungsi.

---

*Blueprint ini dibuat berdasarkan analisis kode produksi aplikasi LandingSM.*  
*Terakhir diperbarui: 9 Mei 2026*
