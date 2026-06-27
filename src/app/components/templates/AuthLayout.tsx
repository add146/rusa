import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-[440px]">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-level2 overflow-hidden">
          <div className="p-8">
            <div className="flex flex-col items-center mb-8">
              <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mb-4 overflow-hidden p-2 shadow-sm border border-outline-variant/30">
                <img src="/logo.png" alt="Rusamas Logo" className="w-full h-full object-contain" />
              </div>
              <h1 className="text-h2 font-h2 text-primary">Rusamas ERP</h1>
              <p className="text-on-surface-variant text-body-md">Enterprise Management System</p>
            </div>
            {children}
          </div>
          <div className="bg-surface-container-low p-4 text-center border-t border-outline-variant">
            <p className="text-sm font-semibold text-on-surface-variant">
              &copy; 2026 Rusamas. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
