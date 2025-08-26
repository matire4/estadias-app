// /frontend/middleware.ts
import { NextResponse, NextRequest } from 'next/server';

const PUBLIC_FILE = /\.(.*)$/i;
const AUTH_COOKIE = 'auth_token';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://estadias-app.onrender.com';

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Archivos públicos y rutas que debemos dejar pasar
  if (
    PUBLIC_FILE.test(pathname) ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/__routes' || // si dejaste el endpoint de diagnóstico
    pathname.startsWith('/login')
  ) {
    // Si es /login y YA hay token válido, redirigimos a callbackUrl o /calendar
    if (pathname.startsWith('/login')) {
      const token = req.cookies.get(AUTH_COOKIE)?.value;
      if (!token) return NextResponse.next();

      try {
        const verify = await fetch(`${API_URL}/auth/verify`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        if (verify.ok) {
          const url = req.nextUrl.clone();
          const cb = req.nextUrl.searchParams.get('callbackUrl');
          url.pathname = cb && !cb.startsWith('/login') ? cb : '/calendar';
          url.search = '';
          return NextResponse.redirect(url);
        }
      } catch {
        // token corrupto: lo borramos y mostramos el login
        const resp = NextResponse.next();
        resp.cookies.delete(AUTH_COOKIE);
        return resp;
      }
    }
    return NextResponse.next();
  }

  // Protegemos el resto: debe existir cookie con token
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (!token) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = `?callbackUrl=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(loginUrl);
  }

  // Verificar token con el backend
  try {
    const verify = await fetch(`${API_URL}/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!verify.ok) throw new Error('invalid');
  } catch {
    // IMPORTANTE: conservar callbackUrl también en token inválido
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = `?callbackUrl=${encodeURIComponent(pathname + search)}`;
    const resp = NextResponse.redirect(loginUrl);
    resp.cookies.delete(AUTH_COOKIE);
    return resp;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/public).*)'],
};
