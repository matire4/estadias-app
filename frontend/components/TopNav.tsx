'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMe } from '@/hooks/useMe';

export default function TopNav() {
  const { me, logout } = useMe();
  const pathname = usePathname();

  const LinkItem = ({ href, label, isActive }: { href: string; label: string; isActive?: boolean }) => {
    const active = typeof isActive === 'boolean' ? isActive : pathname === href || pathname.startsWith(href + '/');
    return (
      <Link
        href={href}
        className={`px-3 py-2 rounded-lg text-sm ${active ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
      >
        {label}
      </Link>
    );
  };

  const estadiaActive = pathname.startsWith('/estadia');

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-semibold">Gestión de Estadías</span>
          <nav className="hidden sm:flex items-center gap-2">
            <LinkItem href="/calendar" label="Calendario" />
            <LinkItem href="/estadia/new" label="Estadías" isActive={estadiaActive} />
            {me?.rol === 'programador' && <LinkItem href="/users" label="Usuarios" />}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {me ? (
            <>
              <span className="hidden sm:inline text-sm text-gray-600">
                {me.nombre} <span className="text-gray-400">({me.rol})</span>
              </span>
              <button
                onClick={logout}
                className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 hover:bg-gray-200"
              >
                Salir
              </button>
            </>
          ) : (
            <Link href="/login" className="px-3 py-1.5 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700">
              Ingresar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
