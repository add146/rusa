### **1\. Rangkuman Fitur Utama Sistem ERP (Fase 1\)**

**A. Modul CRM & Penjualan (Sales)**

* **Input Pesanan:** Sales menginput detail pesanan klien B2B (Nama PIC, Agen Travel, jenis perlengkapan, jumlah, *deadline*).  
* **Harga Fleksibel & HPP (Hak Akses Owner):** Harga jual bersifat negosiasi. Sistem menyimpan Harga Pokok Penjualan (HPP) dasar yang **hanya bisa diinput dan dilihat oleh Owner**.  
* **Lock System (Sistem Kunci):** Pesanan otomatis terkunci setelah DP dibayarkan. Revisi tidak bisa dilakukan secara sepihak oleh klien tanpa *log* alasan dan persetujuan Admin.

**B. Modul Keuangan & Administrasi**

* **Penerbitan Dokumen Otomatis:** Pembuatan Draft PO, Invoice (DP & Pelunasan), dan Surat Jalan dengan penomoran sistematis.  
* **Pencatatan Termin Pembayaran:** Mengelola persentase DP, pelunasan, dan penyesuaian nominal akhir jika ada perubahan kuantitas produksi.  
* **Syarat & Ketentuan (T\&C):** Klausul baku otomatis tercetak di dokumen (misal: "Kerusakan barang tidak ditanggung kecuali cacat produksi", "Estimasi pengerjaan dihitung dari DP masuk").

**C. Modul Produksi (Tracking System)**

* **Tracking Sederhana (3 Tahap):** Pemantauan progres produksi disederhanakan menjadi tiga status utama: **Masuk** \- **Produksi** \- **Selesai**.  
* **SLA Waktu (Countdown):** Sistem menampilkan batas waktu pengerjaan agar pesanan agen travel selesai tepat waktu.  
* **Penyesuaian Kuantitas Aktual:** Mengakomodasi klausul bahwa jumlah akhir bisa sedikit berbeda dari PO. Tim produksi dapat menginput kuantitas barang jadi riil pada tahap "Selesai".

**D. Modul WhatsApp Gateway & Notifikasi**

* **Integrasi API WhatsApp:** Sistem terhubung langsung dengan nomor WhatsApp ofisial perusahaan.  
* **Trigger 1 (Ke Klien):** Saat DP divalidasi Admin, sistem otomatis mengirimkan WA tanda terima dan informasi bahwa pesanan mulai diproduksi.  
* **Trigger 2 (Ke Sales):** Saat pesanan berstatus "Selesai", sistem **hanya** mengirimkan notifikasi kepada Sales yang bersangkutan untuk melakukan *follow-up*.

**E. Modul SDM (KPI & Absensi)**

* **Absensi Radius GPS Terpadu:**  
  * **Sales Lapangan:** Absensi dilakukan dengan melacak titik GPS saat berkunjung ke lokasi biro travel. Tambahkan kewajiban mengisi "Visit Log" (catatan ringkas hasil kunjungan) saat *check-in* di biro travel untuk mengukur efektivitas kunjungan (KPI), bukan sekadar durasi jam kerja.   
  * **Staf Kantor:** Absensi dikunci pada radius GPS area kantor yang sudah disetel (*pre-set*) di dalam sistem.  
* **KPI & Reward Kedisiplinan:** Penilaian performa mencakup target omzet, jumlah kunjungan, serta kedisiplinan berupa **masuk tepat waktu** dan pemenuhan **durasi kerja 8 jam sehari**. Pencapaian ini dapat ditukar dengan *reward* (misalnya pulsa/bonus).

**F. Modul Pelaporan Eksekutif (Khusus Owner)**

* **Laporan Margin Keuntungan:** Sistem secara otomatis menghitung selisih antara harga jual akhir dengan HPP. Laporan margin ini bersifat sangat rahasia dan aksesnya dibatasi secara eksklusif hanya untuk Owner.  
* **Laporan Kinerja Keseluruhan:** Owner dapat memantau performa penjualan per Sales, kelancaran arus produksi, dan kedisiplinan karyawan melalui satu *dashboard* utama.

**G. Modul Retur**

* **Pengembalian Barang:** Mengelola pengembalian barang cacat dari agen travel secara sistematis, lengkap dengan pelacakan biaya perbaikan. 

### ---

**2\. Modul Ekspansi Masa Depan (Fase 2\)**

* **Modul Gudang (Inventory):** Manajemen keluar-masuk bahan baku, pemantauan stok, titik *restock*.  
* **Modul Kecerdasan Buatan (AI):** Implementasi AI untuk *forecasting* tren pemesanan musim Umrah/Haji atau asisten pembuat draf penawaran.  
* **Modul B2C / Maklon (Afiliasi):** Sistem *white-label* untuk pihak luar yang ingin membuat merek perlengkapan travel sendiri.

### ---

**3\. Detail Alur Kerja Terpadu (SOP Integrasi)**

1. **Fase Persiapan Dasar (Owner)**  
   * Owner menginput daftar barang berserta Harga Pokok Penjualan (HPP) modal ke dalam sistem database (tersembunyi dari Sales dan Admin).  
2. **Fase Penawaran (Sales \- Klien)**  
   * Sales membuat *Draft* PO di sistem dan mengajukan harga jual.  
   * *Draft* dikirim ke klien (Agen Travel) untuk disetujui.  
3. **Fase Pembayaran DP (Klien \- Admin)**  
   * Klien mentransfer DP.  
   * Admin memvalidasi dana masuk di sistem.  
   * *Otomatisasi:* Pesanan di-*Lock*, SLA waktu berjalan, dan WA Gateway mengirim pesan ke Klien.  
4. **Fase Produksi (Produksi \- Sales)**  
   * Pesanan masuk *dashboard* Produksi dengan status **"Masuk"**, lalu diubah menjadi **"Proses"** saat dikerjakan. Sales memantau via aplikasi.  
5. **Fase Penyelesaian & Penyesuaian (Produksi \- Admin \- Sales)**  
   * Tim Produksi mengubah status menjadi **"Selesai"** dan menginput jumlah aktual barang jadi.  
   * Sistem menghitung ulang total tagihan jika ada selisih.  
   * *Otomatisasi:* Sistem menotifikasi Sales bahwa pesanan siap.  
6. **Fase Follow-up & Pelunasan (Sales \- Klien \- Admin)**  
   * Sales menagih pelunasan berbekal Nota Pelunasan.  
   * Klien melunasi, Admin mencetak Surat Jalan, dan barang dikirim. Transaksi ditutup.  
   * Sistem menghitung margin keuntungan dari transaksi ini untuk dilaporkan ke *dashboard* Owner.

### ---

**4\. Diagram Alur Sistem (Flowchart)**

**Entitas**  
    Owner{Owner}  
    Klien(\[Agen Travel / Klien B2B\])  
    Sales((Sales))  
    Admin{Admin / Keuangan}  
    Produksi\[\[Tim Produksi\]\]

**Set-up Data Master**  
    Owner \-- "Input HPP Dasar (Hidden)" \--\> Sistem\_ERP\[(Sistem ERP)\]

 **Fase 1: Order**  
    Klien \-- "Pesan Barang & Nego" \--\> Sales  
    Sales \-- "Input Data & Generate PO" \--\> Sistem\_ERP  
    Sistem\_ERP \-. "Kirim Draft PO" .-\> Klien  
      
**Fase 2: DP & Lock**  
    Klien \-- "Bayar DP" \--\> Admin  
    Admin \-- "Validasi DP Masuk" \--\> Sistem\_ERP  
    Sistem\_ERP \-- "TRIGGER: Lock Order" \--\> Sistem\_ERP  
    Sistem\_ERP \-- "WA Gateway: Resi DP & Start Produksi" \--\> Klien

**Fase 3: Produksi**  
    Sistem\_ERP \-- "Masuk Antrean" \--\> Produksi  
    Produksi \-- "Update Status: Masuk \-\> Proses" \--\> Sistem\_ERP  
    Sistem\_ERP \-. "Sales Pantau Real-time" .- Sales  
      
**Fase 4: Finish & Notify Sales**  
    Produksi \-- "Update Status: Selesai & Input QTY Aktual" \--\> Sistem\_ERP  
    Sistem\_ERP \-- "Kalkulasi Sisa Tagihan" \--\> Admin  
    Admin \-- "Terbitkan Nota Pelunasan" \--\> Sistem\_ERP  
    Sistem\_ERP \-- "Notifikasi: Barang Siap" \--\> Sales

**Fase 5: Follow Up & Pengiriman**  
    Sales \-- "Follow Up & Tagih Pelunasan" \--\> Klien  
    Klien \-- "Bayar Lunas" \--\> Admin  
    Admin \-- "Verifikasi Lunas" \--\> Sistem\_ERP  
    Sistem\_ERP \-- "Cetak Surat Jalan" \--\> Admin  
    Admin \-- "Kirim Barang" \--\> Klien  
      
**Fase 6: Reporting Terpusat**  
    Sistem\_ERP \-- "Laporan Margin & Kinerja SDM" \--\> Owner  
    Sales \-- "Absensi GPS, Log Jam Kerja" \--\> Sistem\_ERP  
    Admin \-- "Absensi GPS Kantor, Log Jam Kerja" \--\> Sistem\_ERP  
