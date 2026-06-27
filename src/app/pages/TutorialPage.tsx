import { Button } from '../components/atoms/Button';
import { Badge } from '../components/atoms/Badge';
import { 
  User, 
  ShieldCheck, 
  ShoppingCart, 
  Factory, 
  Wallet, 
  ChevronRight,
  Monitor,
  LogIn,
  Key,
  Mail
} from 'lucide-react';
import { Link } from 'react-router-dom';

const roles = [
  {
    id: 'sales',
    title: 'Sales Lapangan',
    icon: <ShoppingCart className="text-blue-500" />,
    color: 'bg-blue-50',
    description: 'Bertanggung jawab dalam mencari klien, membuat pesanan, dan mencatat kunjungan.',
    credentials: { email: 'sales@rusamas.com', password: 'password123' },
    steps: [
      {
        title: 'Login & Dashboard Sales',
        text: 'Masuk dengan akun Sales untuk melihat ringkasan target dan performa Anda.',
        image: '/images/tutorial/sales-1.png'
      },
      {
        title: 'Manajemen Klien',
        text: 'Gunakan menu Klien untuk mendaftarkan data perusahaan atau toko baru.',
        image: '/images/tutorial/sales-2.png'
      },
      {
        title: 'Katalog Produk',
        text: 'Cek stok dan harga terbaru di menu Produk sebelum menawarkan ke klien.',
        image: '/images/tutorial/sales-3.png'
      },
      {
        title: 'Membuat Pesanan (Sales Order)',
        text: 'Klik tombol "Buat Pesanan" untuk mengisi data item, jumlah, dan diskon. Pesanan akan masuk status "Draft" sebelum diverifikasi.',
        image: '/images/tutorial/sales-5.png'
      },
      {
        title: 'Monitoring Pesanan',
        text: 'Pantau status pesanan Anda (Draft -> Verified -> Production -> Ready) di menu Pesanan.',
        image: '/images/tutorial/sales-4.png'
      }
    ]
  },
  {
    id: 'admin',
    title: 'Admin & Finance',
    icon: <Wallet className="text-emerald-500" />,
    color: 'bg-emerald-50',
    description: 'Bertanggung jawab atas verifikasi pembayaran, dokumen legal, dan manajemen sistem.',
    credentials: { email: 'admin@rusamas.com', password: 'password123' },
    steps: [
      {
        title: 'Verifikasi Pembayaran',
        text: 'Periksa bukti transfer dari klien dan berikan verifikasi agar pesanan bisa diproses ke bagian Produksi.',
        image: '/images/tutorial/admin-1.png'
      },
      {
        title: 'WhatsApp Automation',
        text: 'Kelola template notifikasi WhatsApp yang akan dikirim ke klien dan tim.',
        image: '/images/tutorial/admin-2.png'
      }
    ]
  },
  {
    id: 'produksi',
    title: 'Tim Produksi',
    icon: <Factory className="text-orange-500" />,
    color: 'bg-orange-50',
    description: 'Mengelola alur kerja manufaktur dari bahan mentah hingga barang siap kirim.',
    credentials: { email: 'produksi@rusamas.com', password: 'password123' },
    steps: [
      {
        title: 'Monitor Produksi (Kanban)',
        text: 'Pindahkan kartu pesanan dari kolom "Antrean" ke "Dalam Proses" saat mulai dikerjakan, dan ke "Selesai" jika sudah packing.',
        image: '/images/tutorial/produksi-1.png'
      }
    ]
  },
  {
    id: 'owner',
    title: 'Owner (Pak Novel)',
    icon: <ShieldCheck className="text-purple-500" />,
    color: 'bg-purple-50',
    description: 'Pemegang kendali penuh atas sistem, KPI, HPP, dan kebijakan poin.',
    credentials: { email: 'owner@rusamas.com', password: 'password123' },
    steps: [
      {
        title: 'Manajemen User',
        text: 'Hanya Owner yang dapat menambah, mengedit role, atau menonaktifkan akun karyawan.',
        image: '/images/tutorial/owner-1.png'
      },
      {
        title: 'KPI & Leaderboard',
        text: 'Pantau performa seluruh tim secara real-time berdasarkan data closing dan kehadiran.',
        image: '/images/tutorial/owner-2.png'
      },
      {
        title: 'Kelola Rewards',
        text: 'Atur katalog hadiah yang bisa ditukar oleh karyawan menggunakan poin mereka.',
        image: '/images/tutorial/owner-3.png'
      }
    ]
  },
  {
    id: 'staff',
    title: 'Seluruh Karyawan (Staff)',
    icon: <User className="text-slate-500" />,
    color: 'bg-slate-50',
    description: 'Setiap karyawan memiliki akses ke fitur HR dasar.',
    credentials: { email: 'staff@rusamas.com', password: 'password123' },
    steps: [
      {
        title: 'Absensi (Check-in/Out)',
        text: 'Lakukan absensi setiap hari dengan foto dan lokasi GPS untuk mendapatkan poin kehadiran.',
        image: '/images/tutorial/staff-1.png'
      }
    ]
  }
];

export default function TutorialPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-12 py-12 px-4 md:px-0 pb-20">
      <div className="flex justify-between items-center bg-surface-container-low p-4 rounded-2xl mb-8">
        <Link to="/" className="flex items-center gap-2 text-primary font-bold">
          <Monitor size={20} />
          <span>Rusamas ERP</span>
        </Link>
        <Link to="/login">
          <Button size="sm" leftIcon={<LogIn size={18} />}>Masuk Aplikasi</Button>
        </Link>
      </div>

      <div className="text-center space-y-4">
        <Badge variant="info" className="px-4 py-1">Panduan Pengguna</Badge>
        <h1 className="text-4xl md:text-5xl font-black text-primary tracking-tight">Tutorial Rusamas ERP</h1>
        <p className="text-on-surface-variant text-lg max-w-2xl mx-auto">
          Pelajari alur kerja sistem sesuai dengan peran (role) Anda masing-masing untuk efisiensi kerja yang maksimal.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role) => (
          <a 
            key={role.id} 
            href={`#${role.id}`}
            className={`${role.color} p-6 rounded-3xl border border-outline-variant/30 hover:shadow-xl transition-all group`}
          >
            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
              {role.icon}
            </div>
            <h3 className="text-xl font-bold text-on-surface mb-2">{role.title}</h3>
            <p className="text-sm text-on-surface-variant line-clamp-2">{role.description}</p>
            <div className="mt-4 flex items-center text-xs font-bold text-primary group-hover:gap-2 transition-all">
              Lihat Tutorial <ChevronRight size={14} />
            </div>
          </a>
        ))}
      </div>

      <div className="space-y-24 pt-10">
        {roles.map((role) => (
          <section key={role.id} id={role.id} className="scroll-mt-24 space-y-8">
            <div className="bg-surface-container-low rounded-[32px] p-6 md:p-10 space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-outline-variant pb-8">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary text-on-primary flex items-center justify-center shadow-lg">
                    {role.icon}
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-on-surface">{role.title}</h2>
                    <p className="text-on-surface-variant">{role.description}</p>
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-2xl border border-outline-variant shadow-sm space-y-2 min-w-[280px]">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-1">
                    <Key size={12} /> Akun Demo
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail size={14} className="text-on-surface-variant" />
                    <span className="font-mono text-on-surface">{role.credentials.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <ShieldCheck size={14} className="text-on-surface-variant" />
                    <span className="font-mono text-on-surface">{role.credentials.password}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-20">
              {role.steps.map((step, idx) => (
                <div key={idx} className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                  <div className={`space-y-4 ${idx % 2 === 1 ? 'lg:order-2' : ''}`}>
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                        {idx + 1}
                      </span>
                      <h4 className="text-xl font-bold text-on-surface">{step.title}</h4>
                    </div>
                    <p className="text-on-surface-variant leading-relaxed">
                      {step.text}
                    </p>
                  </div>
                  <div className="bg-surface-container-low p-2 rounded-3xl border border-outline-variant shadow-lg group">
                    <div className="overflow-hidden rounded-2xl border border-outline-variant/50">
                      <img 
                        src={step.image} 
                        alt={step.title} 
                        className="w-full h-auto hover:scale-105 transition-transform duration-500" 
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        ))}
      </div>

      <div className="bg-primary text-on-primary p-10 rounded-[40px] text-center space-y-6">
        <Monitor size={48} className="mx-auto opacity-50" />
        <h3 className="text-2xl font-bold">Butuh Bantuan Lebih Lanjut?</h3>
        <p className="opacity-80 max-w-md mx-auto">
          Jika Anda mengalami kendala teknis atau pertanyaan di luar panduan ini, silakan hubungi Admin IT melalui WhatsApp.
        </p>
        <Button variant="outline" className="bg-white text-primary border-none hover:bg-on-primary/10">
          Hubungi IT Support
        </Button>
      </div>
    </div>
  );
}
