import { Link, useLocation } from 'react-router-dom';
import { useRole } from '../../hooks/useAuth';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ isOpen }: SidebarProps) {
  const location = useLocation();
  const { isOwner, isAdmin, isSales, isProduction, isStaff, isDesainer } = useRole();

  const menuGroups = [
    {
      title: 'Main',
      items: [
        { label: 'Dashboard', path: '/', icon: 'dashboard', roles: ['owner', 'admin', 'sales', 'produksi', 'desainer'] },
      ]
    },
    {
      title: 'Sales & CRM',
      items: [
        { label: 'Klien', path: '/clients', icon: 'groups', roles: ['owner', 'admin', 'sales'] },
        { label: 'Produk', path: '/products', icon: 'inventory_2', roles: ['owner', 'admin', 'sales'] },
        { label: 'Pesanan', path: '/orders', icon: 'shopping_cart', roles: ['owner', 'admin', 'sales'] },
      ]
    },
    {
      title: 'Operations',
      items: [
        { label: 'Keuangan', path: '/finance/verify', icon: 'payments', roles: ['owner', 'admin'] },
        { label: 'Dokumen', path: '/finance/documents', icon: 'description', roles: ['owner', 'admin', 'sales'] },
        { label: 'Produksi', path: '/production', icon: 'factory', roles: ['owner', 'admin', 'produksi', 'sales', 'desainer'] },
        { label: 'Retur', path: '/returns', icon: 'keyboard_return', roles: ['owner', 'admin', 'sales'] },
      ]
    },
    {
      title: 'Communication',
      items: [
        { label: 'WhatsApp', path: '/wa/settings', icon: 'chat', roles: ['owner', 'admin'] },
      ]
    },
    {
      title: 'HR & Management',
      items: [
        { label: 'Absensi', path: '/attendance', icon: 'fingerprint', roles: ['owner', 'admin', 'sales', 'produksi', 'staff'] },
        { label: 'Lokasi GPS', path: '/locations', icon: 'pin_drop', roles: ['owner', 'admin'] },
        { label: 'Visit Log', path: '/visits', icon: 'location_on', roles: ['sales'] },
        { label: 'KPI Dashboard', path: '/kpi', icon: 'analytics', roles: ['owner', 'admin', 'sales', 'produksi', 'staff'] },
        { label: 'Rewards', path: '/rewards', icon: 'redeem', roles: ['owner', 'admin', 'sales', 'produksi', 'staff'] },
        { label: 'Kelola Rewards', path: '/rewards/manage', icon: 'storefront', roles: ['owner', 'admin'] },
        { label: 'Aturan Poin', path: '/point-rules', icon: 'tune', roles: ['owner'] },
        { label: 'Manajemen User', path: '/settings/users', icon: 'person_add', roles: ['owner'] },
        { label: 'Tutorial', path: '/tutorial', icon: 'menu_book', roles: ['owner', 'admin', 'sales', 'produksi', 'staff'] },
      ]
    }
  ];

  const filteredGroups = menuGroups.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (isOwner) return true;
      if (isAdmin && item.roles.includes('admin')) return true;
      if (isSales && item.roles.includes('sales')) return true;
      if (isProduction && item.roles.includes('produksi')) return true;
      if (isStaff && item.roles.includes('staff')) return true;
      if (isDesainer && item.roles.includes('desainer')) return true;
      return false;
    })
  })).filter(group => group.items.length > 0);

  return (
    <aside className={`bg-primary-container text-on-primary transition-all duration-300 ${isOpen ? 'w-[280px]' : 'w-0 -ml-2'} flex flex-col h-full overflow-hidden`}>
      {/* Brand */}
      <div className="p-6 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center overflow-hidden p-1">
            <img src="/logo.png" alt="Rusamas Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold leading-none">Rusamas ERP</h1>
            <p className="text-[10px] text-on-primary/60 uppercase tracking-widest mt-1">Enterprise Management</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 scrollbar-hide">
        {filteredGroups.map((group, idx) => (
          <div key={idx} className="mb-6 px-3">
            <h2 className="px-3 mb-2 text-[10px] font-bold text-on-primary/40 uppercase tracking-widest">
              {group.title}
            </h2>
            <div className="space-y-1">
              {group.items.map((item, itemIdx) => {
                const isActive = item.path === '/' 
                  ? location.pathname === '/' || location.pathname.startsWith('/dashboard')
                  : item.path === '/rewards'
                    ? location.pathname === '/rewards'
                    : location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                return (
                  <Link
                    key={itemIdx}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group relative ${
                      isActive 
                        ? 'bg-secondary text-on-secondary shadow-lg' 
                        : 'hover:bg-white/5 text-on-primary/80 hover:text-on-primary'
                    }`}
                  >
                    <span className="material-symbols-outlined text-2xl leading-none">
                      {item.icon}
                    </span>
                    <span className="text-label-md text-sm">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10 shrink-0">
        <Link to="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-on-primary/80 hover:text-on-primary">
          <span className="material-symbols-outlined">settings</span>
          <span className="font-label-md text-sm">Settings</span>
        </Link>
      </div>
    </aside>
  );
}
