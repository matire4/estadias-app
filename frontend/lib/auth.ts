// /frontend/lib/auth.ts
const COOKIE_NAME = 'auth_token';
const MAX_AGE_SECONDS = 2 * 60 * 60; // 2 horas
const SIGNAL_KEY = 'auth:changed';

function notifyAuthChanged() {
  if (typeof window === 'undefined') return;
  try {
    // útil para otras pestañas
    localStorage.setItem(SIGNAL_KEY, String(Date.now()));
  } catch {}
  // útil en la misma pestaña
  window.dispatchEvent(new Event('auth-changed'));
}

export function setAuthToken(token: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax`;
  notifyAuthChanged();
}

export function getAuthToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split('; ').find(c => c.startsWith(`${COOKIE_NAME}=`));
  return match ? decodeURIComponent(match.split('=')[1]) : null;
}

export function clearAuthToken() {
  if (typeof document === 'undefined') return;
  document.cookie = `${COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
  notifyAuthChanged();
}
