import { create } from 'zustand';
import { getToken, setToken, removeToken, decodeToken } from '../lib/auth';

interface User {
  id: string;
  email: string;
  role: string;
  full_name: string;
  avatar_url?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true, // true by default until checkAuth() runs
  login: (token: string) => {
    const user = decodeToken(token);
    setToken(token);
    set({ user, token, isAuthenticated: !!user, isLoading: false });
  },
  logout: () => {
    removeToken();
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },
  checkAuth: () => {
    const token = getToken();
    if (token) {
      const user = decodeToken(token);
      if (user) {
        // Also check if token has expired
        const now = Math.floor(Date.now() / 1000);
        if (user.exp && user.exp < now) {
          removeToken();
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        } else {
          set({ user, token, isAuthenticated: true, isLoading: false });
        }
      } else {
        removeToken();
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  },
}));

