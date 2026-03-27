import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  username: string | null;
  role: string | null;
  isAuthenticated: boolean;
  setAuth: (token: string, refreshToken: string, username: string, role: string) => void;
  updateToken: (token: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      username: null,
      role: null,
      isAuthenticated: false,
      setAuth: (token, refreshToken, username, role) => set({ 
        token, 
        refreshToken,
        username, 
        role, 
        isAuthenticated: true 
      }),
      updateToken: (token, refreshToken) => set({ 
        token, 
        refreshToken 
      }),
      logout: () => set({ 
        token: null, 
        refreshToken: null,
        username: null, 
        role: null, 
        isAuthenticated: false 
      }),
    }),
    {
      name: 'apm-auth-storage',
    }
  )
);
