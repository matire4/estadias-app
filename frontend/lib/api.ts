// /frontend/lib/api.ts
const BASE = process.env.NEXT_PUBLIC_API_URL || 'https://estadias-app.onrender.com';
const AUTH_COOKIE = 'auth_token';

function readAuthCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp('(?:^|; )' + AUTH_COOKIE + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

async function http<T>(method: string, path: string, body?: any): Promise<T> {
  const token = readAuthCookie();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  // Timeout de 15s
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);

  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
      signal: ctrl.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `${res.status} ${res.statusText}`);
    }
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(t);
  }
}

export const api = {
  get: <T>(path: string) => http<T>('GET', path),
  post: <T>(path: string, body: any) => http<T>('POST', path, body),
  put:  <T>(path: string, body: any) => http<T>('PUT', path, body),
  del:  <T>(path: string)          => http<T>('DELETE', path),
};

// utilidades opcionales para setear/limpiar cookie desde login/logout
export function setAuthToken(token: string) {
  if (typeof document === 'undefined') return;
  // cookie simple; si querés marcar max-age 2h podés ajustar este valor
  document.cookie = `${AUTH_COOKIE}=${encodeURIComponent(token)}; Path=/; SameSite=Lax`;
}
export function clearAuthCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = `${AUTH_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
