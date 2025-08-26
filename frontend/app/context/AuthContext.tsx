'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { api, setAuthToken, clearAuthCookie } from '@/lib/api';

type Me = { id: number; nombre: string; email: string; rol: 'programador' | 'admin' | 'normal' } | null;

type Ctx = {
  me: Me;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<Ctx | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me>(null);

  async function refresh() {
    try {
      const data = await api.get<{ user: Me }>('/auth/verify');
      setMe(data.user);
    } catch {
      setMe(null);
    }
  }

  async function login(email: string, password: string) {
    try {
      const data = await api.post<{ token: string; user: Me }>('/auth/login', { email, password });
      setAuthToken(data.token);     // guarda cookie auth_token ~2h
      setMe(data.user);
      return true;
    } catch {
      setMe(null);
      return false;
    }
  }

  function logout() {
    clearAuthCookie();
    setMe(null);
  }

  useEffect(() => { refresh(); }, []);

  return (
    <AuthContext.Provider value={{ me, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useMe() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useMe must be used within AuthProvider');
  return ctx;
}
