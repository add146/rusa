import { useAuthStore } from '../stores/authStore';

export function useAuth() {
  const { user, isAuthenticated, isLoading, login, logout, checkAuth } = useAuthStore();
  return { user, isAuthenticated, isLoading, login, logout, checkAuth };
}

export function useRole() {
  const { user } = useAuthStore();
  
  return {
    role: user?.role,
    isOwner: user?.role === 'owner',
    isAdmin: user?.role === 'admin',
    isSales: user?.role === 'sales',
    isProduction: user?.role === 'produksi',
    isStaff: user?.role === 'staff',
    isDesainer: user?.role === 'desainer',
  };
}
