'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useMe } from '@/app/context/AuthContext';
import { toastError } from '@/lib/toast';

function LoginInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const { login } = useMe();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const ok = await login(formData.email, formData.password);
      if (ok) {
        const rawCb = sp.get('callbackUrl');
        const dest =
          !rawCb || rawCb === '/' || rawCb.startsWith('/login') ? '/calendar' : rawCb;

        // 🔴 IMPORTANTE (Vercel): hard redirect para que el middleware vea la cookie sí o sí
        window.location.href = dest;

        // Si querés que local siga usando navegación del router, podrías hacer:
        // if (location.hostname === 'localhost') router.replace(dest)
      } else {
        toastError('Email o contraseña incorrectos');
      }
    } catch (err: any) {
      toastError(err?.message || 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Iniciar Sesión</h2>
            <p className="text-gray-600">Accede a tu cuenta</p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="email" name="email" type="email" required
                  value={formData.email} onChange={handleInputChange}
                  className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="tu@email.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="password" name="password" type={showPassword ? 'text' : 'password'} required
                  value={formData.password} onChange={handleInputChange}
                  className="pl-10 pr-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Tu contraseña"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full flex justify-center py-3 px-4 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Iniciar Sesión'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="max-w-sm mx-auto p-6">Cargando…</div>}>
      <LoginInner />
    </Suspense>
  );
}
