import { useState, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar, TopBar, BottomNav } from '../organisms';
import { Spinner } from '../atoms';

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className="absolute md:relative z-50 h-full flex">
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          <div className="max-w-7xl mx-auto">
            <Suspense fallback={<div className="flex items-center justify-center py-16"><Spinner /></div>}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>

      {/* Bottom Nav - visible on mobile only */}
      <BottomNav />
    </div>
  );
}
