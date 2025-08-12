// /frontend/middleware.ts
import { NextResponse, NextRequest } from 'next/server';

const PUBLIC_FILE = /\.(.*)$/i;
const AUTH_COOKIE = 'auth_token';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://estadias-app.onrender.com';

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Permitir recursos estáticos y rutas públicas
  if (
    PUBLIC_FILE.test(pathname) ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname.startsWith('/login')
  ) {
    return NextResponse.next();
  }

  // Debe existir cookie con token
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
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    const resp = NextResponse.redirect(loginUrl);
    resp.cookies.delete(AUTH_COOKIE);
    return resp;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/public).*)'],
};
