import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 bg-surface-container-high rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-primary text-6xl">
            error_outline
          </span>
        </div>
        <h1 className="font-h1 text-h1 text-primary mb-2">404</h1>
        <h2 className="text-h3 font-h3 text-on-surface mb-4">Halaman Tidak Ditemukan</h2>
        <p className="font-body-md text-on-surface-variant mb-8 leading-relaxed">
          Maaf, halaman yang Anda cari tidak tersedia atau telah dipindahkan.
          Silakan kembali ke dashboard utama.
        </p>
        <Link 
          to="/" 
          className="inline-flex items-center justify-center gap-2 bg-primary-container text-on-primary py-3 px-8 rounded-default text-sm font-semibold hover:bg-primary transition-all shadow-lg hover:shadow-xl active:scale-95"
        >
          <span className="material-symbols-outlined text-xl">home</span>
          Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
}
