import { useRouteError } from 'react-router-dom';
import { Button } from '../atoms';

export function GlobalErrorBoundary() {
  const error = useRouteError() as any;
  
  // Check if it's a Vite chunk loading error (usually happens after a new deployment)
  const isChunkLoadError = error?.message?.includes('Failed to fetch dynamically imported module') || 
                           error?.message?.includes('Importing a module script failed');

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-container-lowest p-6">
      <div className="max-w-md w-full bg-surface-container-low border border-outline-variant rounded-2xl p-8 text-center space-y-6">
        <div className="w-20 h-20 bg-error/10 text-error rounded-full flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-4xl">
            {isChunkLoadError ? 'update' : 'error'}
          </span>
        </div>
        
        <div>
          <h1 className="text-xl font-bold text-on-surface mb-2">
            {isChunkLoadError ? 'Pembaruan Sistem Terdeteksi' : 'Terjadi Kesalahan'}
          </h1>
          <p className="text-on-surface-variant text-sm">
            {isChunkLoadError 
              ? 'Sistem baru saja diperbarui. Silakan muat ulang halaman untuk memuat versi terbaru aplikasi.' 
              : 'Maaf, terjadi kesalahan tak terduga pada aplikasi. Silakan coba muat ulang halaman.'}
          </p>
          
          {!isChunkLoadError && error?.message && (
            <div className="mt-4 p-3 bg-surface-container-highest rounded-lg text-left overflow-auto">
              <p className="text-xs font-mono text-on-surface-variant">{error.message}</p>
            </div>
          )}
        </div>

        <Button 
          className="w-full py-3" 
          onClick={handleReload}
          leftIcon="refresh"
        >
          Muat Ulang Halaman
        </Button>
      </div>
    </div>
  );
}
