# 📘 Buku Panduan Standar Implementasi — Aplikasi Absensi (WorkPulse)
## Component Blueprint v2.1 — Part 2/2

> **Lanjutan dari Part 1** — Bagian ini berisi Boilerplate Code dan Checklist Integrasi.

---

## 📋 Daftar Isi — Part 2

5. [Boilerplate Code (Kode Template Standar)](#5-boilerplate-code)
6. [Checklist Integrasi (SOP)](#6-checklist-integrasi-sop)

---

## 5. Boilerplate Code

### 5.1 Frontend — API Service Layer

> File: `frontend/src/services/api.ts`

```typescript
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://absen-api.khibroh.workers.dev';

const api = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
});

// Auto-inject JWT token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => Promise.reject(error));

// Handle 401 globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('user_data');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
```

### 5.2 Frontend — Domain-Specific Service

> Pattern: Satu file service per domain bisnis

```typescript
// frontend/src/services/attendanceService.ts
import api from './api';

export interface CheckInPayload {
    latitude: number;
    longitude: number;
    location_id?: string;
    photo_url?: string | null;
}

export interface AttendanceRecord {
    id: string;
    user_id: string;
    check_in_time: string;
    check_out_time: string | null;
    location_id: string;
    points_earned: number;
    face_verified: number;
    fraud_score: number;
}

export const attendanceService = {
    checkIn: (data: CheckInPayload) =>
        api.post<{ message: string; id: string; time: string; points_earned: number }>(
            '/attendance/check-in', data
        ),

    checkOut: (data: { attendance_id?: string; latitude: number; longitude: number; location_id?: string }) =>
        api.post('/attendance/check-out', data),

    getToday: () =>
        api.get<{
            data: AttendanceRecord[];
            meta: {
                has_locations: boolean;
                locations: any[];
                settings: Record<string, any>;
            };
        }>('/attendance/today'),

    getHistory: (startDate?: string, endDate?: string) => {
        const params = new URLSearchParams();
        if (startDate) params.set('start_date', startDate);
        if (endDate) params.set('end_date', endDate);
        return api.get(`/attendance/history?${params.toString()}`);
    },

    getCalendar: (month: number, year: number) =>
        api.get(`/attendance/calendar?month=${month}&year=${year}`),
};
```

### 5.3 Frontend — Protected Route Component

```tsx
// frontend/src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    requiredRole
}) => {
    const token = localStorage.getItem('access_token');
    if (!token) return <Navigate to="/login" replace />;

    if (requiredRole) {
        const user = JSON.parse(localStorage.getItem('user_data') || '{}');
        if (!requiredRole.includes(user.role)) {
            return <Navigate to="/dashboard" replace />;
        }
    }

    return <>{children}</>;
};
```

### 5.4 Frontend — Theme Context (Dark Mode)

```tsx
// frontend/src/context/ThemeContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';

interface ThemeContextType {
    darkMode: boolean;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [darkMode, setDarkMode] = useState<boolean>(() => {
        const saved = localStorage.getItem('theme');
        return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    useEffect(() => {
        const root = document.documentElement;
        darkMode ? root.classList.add('dark') : root.classList.remove('dark');
        localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    }, [darkMode]);

    return (
        <ThemeContext.Provider value={{ darkMode, toggleTheme: () => setDarkMode(p => !p) }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
};
```

### 5.5 Frontend — Feature Flag Hook

```typescript
// frontend/src/hooks/useEnabledModules.ts
import { useState, useEffect } from 'react';

export interface EnabledModules {
    activity_board: boolean;
    task_system: boolean;
    kpi_dashboard: boolean;
    daily_streak: boolean;
    kudos_karma: boolean;
    bounty_board: boolean;
}

export function useEnabledModules() {
    const [modules, setModules] = useState<EnabledModules>({
        activity_board: false,
        task_system: false,
        kpi_dashboard: false,
        daily_streak: false,
        kudos_karma: false,
        bounty_board: false,
    });

    useEffect(() => {
        try {
            const settingsStr = localStorage.getItem('tenant_settings');
            if (settingsStr) {
                const settings = JSON.parse(settingsStr);
                if (settings.enabled_modules) {
                    setModules(prev => ({ ...prev, ...settings.enabled_modules }));
                }
            } else {
                // Default: all enabled (dev mode)
                setModules({
                    activity_board: true, task_system: true,
                    kpi_dashboard: true, daily_streak: true,
                    kudos_karma: true, bounty_board: true,
                });
            }
        } catch (e) { console.error('Module settings parse error:', e); }
    }, []);

    return { modules };
}
```

### 5.6 Frontend — Standar Page Component

```tsx
// Pattern standar untuk halaman baru
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import EmployeeLayout from '../components/EmployeeLayout';

const ExamplePage: React.FC = () => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                const res = await api.get('/endpoint');
                setData(res.data.data || []);
            } catch (err: any) {
                setError(err.response?.data?.error || 'Gagal memuat data');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    return (
        <EmployeeLayout>
            <div className="px-6">
                <h1 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                    Judul Halaman
                </h1>

                {/* Loading State */}
                {loading && (
                    <div className="animate-pulse space-y-3">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                        <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200
                         text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
                        {error}
                    </div>
                )}

                {/* Empty State */}
                {!loading && !error && data.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-500 text-sm">Belum ada data.</p>
                    </div>
                )}

                {/* Data Render */}
                {!loading && data.map(item => (
                    <div key={item.id}
                         className="bg-white dark:bg-gray-800 rounded-xl
                                    shadow-sm border border-gray-100
                                    dark:border-gray-700 p-4 mb-3">
                        <p className="font-medium text-gray-800 dark:text-white">
                            {item.name}
                        </p>
                    </div>
                ))}
            </div>
        </EmployeeLayout>
    );
};

export default ExamplePage;
```

---

### 5.7 Backend — Standar Route Handler (Controller)

```typescript
// worker/src/routes/example.ts
import { Hono } from 'hono';
import { authMiddleware, adminAuthMiddleware } from '../middleware/auth';

type Bindings = {
    DB: D1Database;
    JWT_SECRET: string;
};

type Variables = {
    user: any;
    tenantId: string;
};

const example = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Apply auth middleware to all routes in this module
example.use('*', authMiddleware);

// GET /example — List items (tenant-scoped)
example.get('/', async (c) => {
    const tenantId = c.get('tenantId');

    try {
        const { results } = await c.env.DB
            .prepare('SELECT * FROM examples WHERE tenant_id = ? ORDER BY created_at DESC')
            .bind(tenantId)
            .all();

        return c.json({ success: true, data: results });
    } catch (e: any) {
        console.error('List error:', e);
        return c.json({ success: false, error: 'Failed to fetch data' }, 500);
    }
});

// POST /example — Create item (admin only)
example.post('/', adminAuthMiddleware, async (c) => {
    const tenantId = c.get('tenantId');
    const userId = c.get('user').sub;
    const body = await c.req.json();

    // Validation
    if (!body.name) {
        return c.json({ error: 'Name is required' }, 400);
    }

    const id = crypto.randomUUID();

    try {
        await c.env.DB.prepare(
            `INSERT INTO examples (id, tenant_id, name, created_by, created_at)
             VALUES (?, ?, ?, ?, datetime('now'))`
        ).bind(id, tenantId, body.name, userId).run();

        return c.json({ success: true, data: { id, name: body.name } }, 201);
    } catch (e: any) {
        console.error('Create error:', e);
        return c.json({ error: 'Failed to create', details: e.message }, 500);
    }
});

// PUT /example/:id — Update item
example.put('/:id', adminAuthMiddleware, async (c) => {
    const tenantId = c.get('tenantId');
    const { id } = c.req.param();
    const body = await c.req.json();

    try {
        const result = await c.env.DB.prepare(
            `UPDATE examples SET name = ?, updated_at = datetime('now')
             WHERE id = ? AND tenant_id = ?`
        ).bind(body.name, id, tenantId).run();

        if (result.meta.changes === 0) {
            return c.json({ error: 'Item not found' }, 404);
        }

        return c.json({ success: true, message: 'Updated' });
    } catch (e: any) {
        return c.json({ error: 'Update failed', details: e.message }, 500);
    }
});

// DELETE /example/:id
example.delete('/:id', adminAuthMiddleware, async (c) => {
    const tenantId = c.get('tenantId');
    const { id } = c.req.param();

    try {
        await c.env.DB.prepare(
            'DELETE FROM examples WHERE id = ? AND tenant_id = ?'
        ).bind(id, tenantId).run();

        return c.json({ success: true, message: 'Deleted' });
    } catch (e: any) {
        return c.json({ error: 'Delete failed' }, 500);
    }
});

export default example;
```

### 5.8 Backend — Service Layer Pattern

```typescript
// worker/src/services/example-service.ts

export class ExampleService {
    private db: D1Database;

    constructor(db: D1Database) {
        this.db = db;
    }

    async getByTenant(tenantId: string): Promise<any[]> {
        const { results } = await this.db
            .prepare('SELECT * FROM examples WHERE tenant_id = ? AND is_active = 1 ORDER BY created_at DESC')
            .bind(tenantId)
            .all();
        return results || [];
    }

    async getById(id: string, tenantId: string): Promise<any | null> {
        return await this.db
            .prepare('SELECT * FROM examples WHERE id = ? AND tenant_id = ?')
            .bind(id, tenantId)
            .first();
    }

    async create(data: { tenantId: string; name: string; createdBy: string }): Promise<string> {
        const id = crypto.randomUUID();
        await this.db.prepare(
            `INSERT INTO examples (id, tenant_id, name, created_by, is_active, created_at)
             VALUES (?, ?, ?, ?, 1, datetime('now'))`
        ).bind(id, data.tenantId, data.name, data.createdBy).run();
        return id;
    }

    async update(id: string, tenantId: string, updates: Partial<{ name: string }>): Promise<boolean> {
        const fields: string[] = [];
        const values: any[] = [];

        if (updates.name) { fields.push('name = ?'); values.push(updates.name); }

        if (fields.length === 0) return false;

        fields.push("updated_at = datetime('now')");
        values.push(id, tenantId);

        const result = await this.db.prepare(
            `UPDATE examples SET ${fields.join(', ')} WHERE id = ? AND tenant_id = ?`
        ).bind(...values).run();

        return (result.meta.changes || 0) > 0;
    }

    async softDelete(id: string, tenantId: string): Promise<void> {
        await this.db.prepare(
            "UPDATE examples SET is_active = 0, updated_at = datetime('now') WHERE id = ? AND tenant_id = ?"
        ).bind(id, tenantId).run();
    }
}
```

### 5.9 Backend — Middleware Registration Pattern

```typescript
// worker/src/index.ts — pattern untuk register route baru

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { securityHeaders } from './middleware/security';
import { tenantContext, customDomainRouter } from './middleware/tenant';
import auth from './routes/auth';
import example from './routes/example'; // ← Route baru

const app = new Hono<{ Bindings: Bindings }>();

// Global middleware
app.use('/*', cors());
app.use('/*', securityHeaders);
app.use('/*', customDomainRouter);

// Public routes (sebelum tenantContext)
app.route('/auth', auth);

// Protected routes (setelah tenantContext)
app.use('/*', tenantContext);
app.route('/example', example);  // ← Register di sini

export default { fetch: app.fetch };
```

### 5.10 Backend — Database Migration Pattern

```sql
-- schema/migrations/00XX_new_feature.sql

-- Selalu gunakan IF NOT EXISTS untuk idempotency
CREATE TABLE IF NOT EXISTS examples (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_by TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Selalu tambahkan index untuk tenant_id (multi-tenant performance)
CREATE INDEX IF NOT EXISTS idx_examples_tenant ON examples(tenant_id);
CREATE INDEX IF NOT EXISTS idx_examples_active ON examples(tenant_id, is_active);
```

---

## 6. Checklist Integrasi (SOP)

### Fase 1: Persiapan Environment

- [ ] **1.1** Install prerequisites:
  ```bash
  node --version  # ≥ 20
  npm install -g wrangler
  wrangler login
  ```

- [ ] **1.2** Clone dan install dependencies:
  ```bash
  git clone https://github.com/add146/absen.git
  cd absen/frontend && npm install
  cd ../worker && npm install
  ```

- [ ] **1.3** Setup environment variables:
  ```bash
  # frontend/.env
  VITE_API_URL=http://localhost:8787

  # worker/.dev.vars
  JWT_SECRET=your-local-dev-secret
  ```

### Fase 2: Setup Cloudflare Resources

- [ ] **2.1** Buat D1 Database:
  ```bash
  wrangler d1 create absen-db
  # Catat database_id → masukkan ke wrangler.toml
  ```

- [ ] **2.2** Jalankan semua migrasi secara berurutan:
  ```bash
  cd worker
  wrangler d1 execute absen-db --file=../schema/migrations/0001_initial.sql
  wrangler d1 execute absen-db --file=../schema/migrations/0002_shop_tables.sql
  # ... lanjutkan hingga 0030
  ```

- [ ] **2.3** Buat R2 Bucket:
  ```bash
  wrangler r2 bucket create absen-storage
  ```

- [ ] **2.4** Set secrets:
  ```bash
  wrangler secret put JWT_SECRET
  # Masukkan secret key yang aman (min 32 karakter)
  ```

- [ ] **2.5** Update `wrangler.toml` dengan ID yang benar:
  ```toml
  [[d1_databases]]
  binding = "DB"
  database_name = "absen-db"
  database_id = "<YOUR_DB_ID>"

  [[r2_buckets]]
  binding = "STORAGE"
  bucket_name = "absen-storage"
  ```

### Fase 3: Development Lokal

- [ ] **3.1** Jalankan backend dev server:
  ```bash
  cd worker
  wrangler dev --local --persist-to=.wrangler/state
  # API berjalan di http://localhost:8787
  ```

- [ ] **3.2** Jalankan frontend dev server:
  ```bash
  cd frontend
  npm run dev
  # App berjalan di http://localhost:5173
  ```

- [ ] **3.3** Test registrasi pertama:
  ```bash
  curl -X POST http://localhost:8787/auth/register \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@test.com","password":"password123","name":"Admin","tenant_name":"Test Company"}'
  ```

### Fase 4: Verifikasi Fungsional

- [ ] **4.1** ✅ Login berhasil dan mendapat JWT token
- [ ] **4.2** ✅ Dashboard menampilkan greeting dan waktu real-time
- [ ] **4.3** ✅ GPS location terdeteksi dan geofence bekerja
- [ ] **4.4** ✅ Check-in berhasil (dengan/tanpa foto)
- [ ] **4.5** ✅ Check-out berhasil dan durasi kerja terhitung
- [ ] **4.6** ✅ Poin bertambah setelah check-in
- [ ] **4.7** ✅ Riwayat kehadiran tampil di halaman Attendance
- [ ] **4.8** ✅ Admin panel accessible untuk role admin/owner
- [ ] **4.9** ✅ Employee management (CRUD) berfungsi
- [ ] **4.10** ✅ Dark mode toggle berfungsi dan persist

### Fase 5: Menambahkan Modul Baru (Template)

Untuk menambahkan modul baru ke aplikasi:

- [ ] **5.1** Buat migration SQL di `schema/migrations/00XX_nama_fitur.sql`
- [ ] **5.2** Buat service di `worker/src/services/nama-service.ts`
- [ ] **5.3** Buat route handler di `worker/src/routes/nama.ts`
- [ ] **5.4** Register route di `worker/src/index.ts`:
  ```typescript
  import nama from './routes/nama';
  app.route('/nama', nama);
  ```
- [ ] **5.5** Buat frontend service di `frontend/src/services/namaService.ts`
- [ ] **5.6** Buat page component di `frontend/src/pages/NamaPage.tsx`
- [ ] **5.7** Tambahkan route di `frontend/src/App.tsx`:
  ```tsx
  <Route path="/nama" element={<ProtectedRoute><NamaPage /></ProtectedRoute>} />
  ```
- [ ] **5.8** Tambahkan menu item di layout yang sesuai
- [ ] **5.9** Jalankan migration di D1
- [ ] **5.10** Test end-to-end

### Fase 6: Deployment Produksi

- [ ] **6.1** Deploy Worker:
  ```bash
  cd worker
  wrangler deploy
  ```

- [ ] **6.2** Update frontend env untuk production:
  ```bash
  # frontend/.env.production
  VITE_API_URL=https://absen-api.khibroh.workers.dev
  ```

- [ ] **6.3** Build dan deploy frontend:
  ```bash
  cd frontend
  npm run build
  # Deploy via Cloudflare Pages (GitHub integration)
  ```

- [ ] **6.4** Jalankan migrasi di production D1:
  ```bash
  wrangler d1 execute absen-db --remote --file=../schema/migrations/00XX_new.sql
  ```

- [ ] **6.5** Verifikasi production:
  ```bash
  curl https://absen-api.khibroh.workers.dev/
  # Expected: {"message":"Absen SAAS API is running","version":"2.1.0"}
  ```

### Fase 7: Monitoring & Maintenance

- [ ] **7.1** Monitor via Cloudflare Dashboard → Workers → Logs
- [ ] **7.2** Cron job berjalan setiap 15 menit untuk:
  - Daily metrics processing
  - Storage cleanup (old files, rate limits)
  - Work hour alerts (push notification)
  - WorkQuest gamification triggers
- [ ] **7.3** Backup D1 secara periodik:
  ```bash
  wrangler d1 export absen-db --remote --output=backup_YYYYMMDD.sql
  ```

---

## Lampiran: Konvensi Penamaan

| Kategori | Konvensi | Contoh |
|----------|----------|--------|
| File komponen React | PascalCase.tsx | `Dashboard.tsx`, `LeaveRequest.tsx` |
| File service frontend | camelCase.ts | `attendanceService.ts`, `api.ts` |
| File route backend | kebab-case.ts | `point-rules.ts`, `custom-domains.ts` |
| File service backend | kebab-case.ts | `fraud-detection.ts`, `tenant-service.ts` |
| File migration SQL | `00XX_deskripsi.sql` | `0029_gamification_streak_kudos.sql` |
| Tabel database | snake_case (plural) | `attendances`, `point_rules`, `user_devices` |
| Kolom database | snake_case | `check_in_time`, `tenant_id`, `is_active` |
| API endpoint | kebab-case | `/attendance/check-in`, `/point-rules` |
| CSS class | Tailwind utility classes | `bg-primary`, `text-gray-800` |
| Context/Hook | camelCase dengan prefix | `useTheme`, `useEnabledModules` |
| Environment var | SCREAMING_SNAKE | `VITE_API_URL`, `JWT_SECRET` |

---

> **Dokumen ini adalah living document.** Update setiap kali ada perubahan arsitektur, penambahan modul, atau perubahan konvensi yang signifikan.
>
> **Last Updated**: 2026-05-09 | **Version**: 2.1.0 | **Author**: Senior Software Architect
