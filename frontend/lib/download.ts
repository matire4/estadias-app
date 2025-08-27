// frontend/lib/download.ts
import { getAuthToken } from './auth';

/**
 * Resuelve la base del backend sin depender de API_URL exportado.
 * Usa NEXT_PUBLIC_API_URL, o sea:
 *   - en local:  http://localhost:3001
 *   - en prod:   tu URL de Render
 */
const BASE =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) ||
  '';

export async function downloadGet(path: string, filename: string) {
  // añadimos el token en querystring (los navegadores no mandan headers en descargas)
  const token = getAuthToken();
  const sep = path.includes('?') ? '&' : '?';
  const url = `${BASE}${path}${sep}token=${encodeURIComponent(token || '')}`;

  const resp = await fetch(url, { method: 'GET' });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(txt || `HTTP ${resp.status}`);
  }

  const blob = await resp.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}
