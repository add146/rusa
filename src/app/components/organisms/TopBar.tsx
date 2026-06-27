import { useAuth } from '../../hooks/useAuth';

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-surface-container-lowest border-b border-outline-variant flex items-center justify-between px-6 shrink-0 z-10">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-surface-container-low rounded-lg text-on-surface-variant"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>


      </div>

      <div className="flex items-center gap-2">
        {/* Actions - hidden on mobile */}
        <button className="hidden sm:block p-2 hover:bg-surface-container-low rounded-lg text-on-surface-variant relative">
          <span className="material-symbols-outlined">notifications</span>
          <div className="absolute top-2 right-2 w-2 h-2 bg-secondary rounded-full border-2 border-surface-container-lowest" />
        </button>
        <button className="hidden sm:block p-2 hover:bg-surface-container-low rounded-lg text-on-surface-variant">
          <span className="material-symbols-outlined">help</span>
        </button>

        <div className="w-px h-8 bg-outline-variant mx-2" />

        {/* User Info */}
        <div className="flex items-center gap-3 pl-2 group cursor-pointer relative">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-on-surface leading-tight">{user?.full_name}</p>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{user?.role}</p>
          </div>
          <div className="w-10 h-10 bg-primary-container rounded-lg flex items-center justify-center text-on-primary font-bold">
            {user?.full_name?.charAt(0)}
          </div>
          
          {/* Simple Dropdown placeholder */}
          <button 
            onClick={logout}
            className="p-2 hover:bg-error-container hover:text-error rounded-lg text-on-surface-variant transition-colors"
            title="Keluar"
          >
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
