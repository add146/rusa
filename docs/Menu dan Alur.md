Tentu, ini adalah rincian detail per modul (A-G) berdasarkan kesepakatan Fase 1 untuk mempermudah Anda menyusun *Product Requirements Document* (PRD). Struktur ini dirancang agar sistem memiliki pondasi kuat untuk ekspansi ke Fase 2\.

### **Struktur Detail Modul Fase 1 (Cetak Biru PRD)**

| Modul | Menu Utama | Fungsi Utama | Alur Kerja Detail |
| :---- | :---- | :---- | :---- |
| **A. CRM & Penjualan** | Dashboard Sales, Input Order, Master Klien, Log Revisi | Manajemen prospek B2B dan penguncian pesanan (*Lock System*) setelah DP.  | Sales input data $\\rightarrow$ Sistem cek HPP (tersembunyi) $\\rightarrow$ Generate Draft PO $\\rightarrow$ Klien setuju. |
| **B. Keuangan** | Invoice (DP/Pelunasan), Verifikasi Bayar, Surat Jalan, T\&C Manager | Otomasi dokumen legal dan pelacakan termin pembayaran. | Admin validasi DP $\\rightarrow$ Status pesanan "Locked" $\\rightarrow$ SLA produksi aktif $\\rightarrow$ Generate Nota Pelunasan otomatis saat produksi selesai.  |
| **C. Produksi** | Monitor Antrean, Lantai Produksi, Input Qty Aktual, Dashboard SLA | Pelacakan status *real-time* dan manajemen variansi kuantitas.  | Pesanan masuk antrean $\\rightarrow$ Status: Masuk $\\rightarrow$ Proses (SLA Countdown) $\\rightarrow$ Selesai (Input jumlah riil).  |
| **D. WA Gateway** | Pengaturan Trigger, Log Pesan Terkirim, Status API | Notifikasi otomatis berbasis peristiwa (*Event-driven*) ke klien dan sales.  | Trigger Finansial: Kirim bukti DP ke klien $\\rightarrow$ Trigger Produksi: Notifikasi barang siap ke Sales (untuk penagihan).  |
| **E. SDM (KPI)** | Absensi GPS, Visit Log Sales, Dashboard Kinerja, Reward Claim | Manajemen disiplin dan produktivitas sales lapangan serta staf kantor.  | Sales *check-in* lokasi klien $\\rightarrow$ Wajib isi *Visit Log* $\\rightarrow$ Perhitungan skor KPI otomatis (Target vs Realisasi).  |
| **F. Eksekutif** | Laporan Margin (Secret), Profit & Loss, Pivot Performance | Visualisasi data rahasia untuk pengambilan keputusan pemilik. | Sistem tarik data Penjualan \- HPP modal $\\rightarrow$ Kalkulasi margin bersih per transaksi $\\rightarrow$ Tampilkan di dashboard khusus Owner.  |
| **G. Retur (RMA)** | Form Komplain, Status Perbaikan, Log Biaya Retur | Penanganan barang cacat dari agen travel secara profesional.  | Input klaim retur $\\rightarrow$ Verifikasi tim QC $\\rightarrow$ Proses perbaikan/ganti baru $\\rightarrow$ Update biaya ke laporan margin.  |

### **Dasar Pengembangan untuk Persiapan Fase 2**

Agar PRD Fase 1 ini "ramah" terhadap pengembangan Fase 2 (Gudang, AI, dan B2C), pastikan elemen teknis berikut tercantum dalam dokumen Anda:

1. **Struktur Data Bill of Materials (BOM):** Walaupun Modul Gudang belum ada, pastikan tabel database untuk produk sudah memiliki relasi ke komponen bahan baku. Hal ini penting agar saat Fase 2 dimulai, Anda tidak perlu merombak struktur database utama untuk perhitungan HPP dinamis.

2. **Arsitektur API Modular:** Gunakan pendekatan *microservices* atau modul independen yang berkomunikasi via API. Gunakan teknologi seperti **Context7** (npx ctx7 setup) untuk memastikan dokumentasi API antar modul (misal: integrasi stok ke keuangan) selalu menggunakan standar terbaru dan bebas dari kesalahan logika.

3. **Audit Trail & Keamanan Data:** Karena HPP adalah rahasia perusahaan, PRD harus mewajibkan fitur *Audit Trail* (rekam jejak digital) pada setiap akses ke Modul F. Gunakan standar enkripsi database untuk kolom nilai finansial yang sensitif.

4. **Logging Data untuk AI:** Mulai simpan data histori pemesanan, durasi produksi per jenis barang, dan perilaku sales secara terstruktur sejak hari pertama. Data ini akan menjadi aset utama untuk melatih model AI *forecasting* di Fase 2 nanti.

5. **Role-Based Access Control (RBAC):** Definisikan peran pengguna (Owner, Admin, Sales, Produksi) secara ketat dalam PRD untuk mencegah tumpang tindih akses yang membahayakan margin perusahaan.

Dengan detail alur di atas, pengembang akan memiliki panduan teknis yang jelas mengenai apa yang harus dibangun, sekaligus memastikan sistem siap untuk ditingkatkan ke skala yang lebih besar tanpa banyak perubahan fundamental.