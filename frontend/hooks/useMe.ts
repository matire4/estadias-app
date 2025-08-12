'use client';

import { useEffect, useState } from 'react';
import { getAuthToken, clearAuthToken } from '@/lib/auth';

type Me = { uid: number; email: string; rol: 'normal' | 'admin' | 'programador'; nombre: string };

function decodeJwt(token: string): Me | null {
  try {
    const base64 = token.split('.')[1];
    const json = JSON.parse(typeof atob !== 'undefined' ? atob(base64) : Buffer.from(base64, 'base64').toString('utf-8'));
    return { uid: json.uid, email: json.email, rol: json.rol, nombre: json.nombre };
  } catch {
    return null;
  }
}

export function useMe() {
  const [me, setMe] = useState<Me | null>(null);

  const readToken = () => {
    const t = getAuthToken();
    setMe(t ? decodeJwt(t) : null);
  };

  useEffect(() => {
    readToken(); // primer render

    // escuchar cambios locales y entre pestañas
    const onAuth = () => readToken();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'auth:changed') readToken();
    };

    window.addEventListener('auth-changed', onAuth);
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onAuth); // por si volvió al tab

    return () => {
      window.removeEventListener('auth-changed', onAuth);
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onAuth);
    };
  }, []);

  function logout() {
    clearAuthToken();
    // el middleware igual te llevará a /login al navegar,
    // forzamos navegación inmediata
    window.location.href = '/login';
  }

  return { me, logout };
}
