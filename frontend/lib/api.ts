// /frontend/lib/api.ts
import { getAuthToken, clearAuthToken } from '@/lib/auth';
import { toast, toastError } from '@/lib/toast';

export const API_URL = process.env.NEXT_PUBLIC_API_URL!;
if (!API_URL) throw new Error('Falta NEXT_PUBLIC_API_URL');

function currentPathWithQuery(): string {
  if (typeof window === 'undefined') return '/';
  return window.location.pathname + window.location.search;
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_URL}${path}`;
  const headers: HeadersInit = { 'Content-Type': 'application/json', ...(options.headers || {}) };

  const token = getAuthToken();
  if (token) (headers as any).Authorization = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers, cache: 'no-store' });

  // Manejo específico de 401/403
  if (res.status === 401) {
    // Sesión expirada o token inválido
    clearAuthToken();
    toastError('Sesión expirada. Volvé a iniciar sesión.');
    const cb = encodeURIComponent(currentPathWithQuery());
    // pequeña pausa para que el usuario vea el toast
    setTimeout(() => {
      if (typeof window !== 'undefined') window.location.href = `/login?callbackUrl=${cb}`;
    }, 150);
    throw new Error('Unauthorized');
  }
  if (res.status === 403) {
    toast('No tenés permisos para esta acción.', 'error');
    // No redirigimos; dejamos que la UI decida
    throw new Error('Forbidden');
  }

  if (!res.ok) {
    let detail = '';
    try { detail = await res.text(); } catch {}
    throw new Error(`HTTP ${res.status} ${res.statusText}${detail ? ` - ${detail}` : ''}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  get:  <T>(p: string)           => request<T>(p),
  post: <T>(p: string, b: any)   => request<T>(p, { method: 'POST', body: JSON.stringify(b) }),
  put:  <T>(p: string, b: any)   => request<T>(p, { method: 'PUT',  body: JSON.stringify(b) }),
  del:  <T>(p: string)           => request<T>(p, { method: 'DELETE' }),
};
