# Handover Document: Rusamas ERP System

Dokumen ini ditujukan sebagai **panduan serah terima (handover)** untuk AI Agent atau Developer selanjutnya yang akan melanjutkan pengembangan proyek **Rusamas ERP**.

---

## 1. Ikhtisar Proyek
**Rusamas ERP** adalah sistem *Enterprise Resource Planning* berbasis web yang dirancang untuk mengelola operasi bisnis CV. Rusa Mas (pabrik tekstil/perlengkapan haji & umrah). Sistem ini mencakup manajemen pesanan, klien, produksi, keuangan (invoice/PO), hingga HR (absensi, KPI, dan gamifikasi).

## 2. Arsitektur & Tech Stack
Sistem ini dibangun dengan arsitektur *Fullstack Serverless* di ekosistem Cloudflare.
*   **Frontend**: React 19, Vite, Tailwind CSS v4, React Router v7.
*   **State Management**: Zustand (Global), TanStack React Query (Server State).
*   **Backend API**: Hono (berjalan di atas Cloudflare Workers).
*   **Database**: Cloudflare D1 (SQLite) dengan Drizzle ORM.
*   **Storage**: Cloudflare R2 (untuk media/file).
*   **PDF Generator**: `jsPDF` (berjalan di sisi *client*).

## 3. Environment & Deployment
*   **Domain Produksi**: [office.rusamas.my.id](https://office.rusamas.my.id)
*   **Domain Worker**: `https://rusamas-erp.info-indoexport.workers.dev`
*   **Perintah Build**: `npm run build`
*   **Perintah Deploy**: `npx wrangler deploy`
*   Konfigurasi routing *custom domain* diatur sepenuhnya di dalam file `wrangler.jsonc`.

## 4. Fitur & Modul Utama (Telah Diimplementasikan)
*   **Role-Based Access Control (RBAC)**: Tersedia peran `Owner`, `Admin`, `Sales`, `Produksi`, dan `Staff`. Tampilan menu di *sidebar* menyesuaikan hak akses masing-masing peran.
*   **Absensi & GPS**: Modul absensi berbasis lokasi (opsional via GPS) untuk memantau kehadiran tim produksi dan sales.
*   **Gamifikasi & KPI**: Terdapat sistem poin dan pencapaian (*Rewards*), lengkap dengan fitur **Multiplier Streak** untuk mendorong konsistensi kerja.
*   **Manajemen Dokumen (PDF)**: Pembuatan dokumen komersial otomatis untuk **Purchase Order (PO)**, **Invoice/Nota**, dan **Surat Jalan (SJ)**.
*   **Halaman Tutorial Publik**: Dapat diakses tanpa *login* melalui rute `/tutorial`, berisi panduan alur kerja dan akun demo per masing-masing divisi.

## 5. Pembaruan Kritis Terakhir (Log Sesi Ini)
Berikut adalah penyesuaian khusus yang dilakukan pada interaksi terakhir, yang harus dipertahankan:
1.  **Pembaruan Logo & Warna Brand**:
    *   Sistem menggunakan warna utama biru `#1E3C88` dan aksen merah `#E21E26` sesuai dengan logo asli Rusamas.
    *   Logo baru telah diimplementasikan di Halaman Login dan Sidebar (`public/logo.png`).
2.  **Perbaikan Cetak PDF**:
    *   Modul pembuat PDF (`src/app/lib/pdf.ts`) **tidak lagi** menggambar logo secara manual menggunakan bentuk (shapes).
    *   Logo kini di-*embed* langsung ke dalam PDF secara sinkron menggunakan string Base64 yang diimpor dari `src/app/lib/logoBase64.ts`. **Jangan merusak file base64 ini**, karena `jsPDF` membutuhkannya untuk menempelkan gambar ke dokumen secara luring.
    *   Perbaikan format Teks "Ketentuan" menggunakan list bernomor (1, 2, 3...) untuk menghindari *error font rendering* (karakter `&` yang acak).
3.  **UI/UX**: 
    *   Garis putih vertikal (*active indicator*) pada *sidebar* telah dihilangkan, hanya menyisakan sorotan kotak berwarna (merah).

## 6. Catatan Tambahan untuk AI Agent Selanjutnya
*   Saat melakukan perubahan yang berkaitan dengan *UI komponen*, selalu pastikan fungsionalitas tetap *mobile-responsive* (terutama *burger menu* dan *bottom bar* jika sedang digunakan).
*   Apabila perlu memperbarui *logo* untuk dokumen cetak di masa mendatang, pastikan Anda juga meregenerasi file `logoBase64.ts` karena library `jsPDF` kesulitan membaca file gambar asinkron langsung dari folder `public`.
*   Aplikasi ini sangat mengedepankan estetika **Premium, Profesional, dan Modern**. Hindari desain yang terlihat seperti MVP (Minimum Viable Product) yang terlalu dasar.
