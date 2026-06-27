import { Link, useLocation } from 'react-router-dom';
import { useRole } from '../../hooks/useAuth';

export function BottomNav() {
  const location = useLocation();
  const { isOwner, isAdmin } = useRole();

  const navItems = [
    { label: 'Beranda', path: '/', icon: 'dashboard' },
    { label: 'Absensi', path: '/attendance', icon: 'fingerprint' },
    { label: 'Profil', path: '/profile', icon: 'person' },
  ];

  // Tambahkan menu tambahan jika owner/admin (untuk kemudahan akses mobile)
  if (isOwner || isAdmin) {
    navItems.splice(1, 0, { label: 'Pesanan', path: '/orders', icon: 'shopping_cart' });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-surface-container border-t border-outline-variant flex items-center justify-around px-4 md:hidden z-50 backdrop-blur-md bg-opacity-90">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center justify-center gap-1 min-w-[64px] transition-colors ${
              isActive ? 'text-primary' : 'text-on-surface-variant'
            }`}
          >
            <span className={`material-symbols-outlined text-[24px] ${isActive ? 'fill-1' : ''}`}>
              {item.icon}
            </span>
            <span className="text-[10px] font-bold tracking-tight">
              {item.label}
            </span>
            {isActive && (
              <div className="w-1 h-1 bg-primary rounded-full" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
