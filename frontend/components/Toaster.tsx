'use client';

import { useEffect, useState } from 'react';
import type { ToastType } from '@/lib/toast';

type Item = { id: number; message: string; type: ToastType };

export default function Toaster() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    const onToast = (e: Event) => {
      const ce = e as CustomEvent<{ message: string; type: ToastType }>;
      const id = Date.now() + Math.random();
      const item: Item = { id, message: ce.detail.message, type: ce.detail.type };
      setItems((prev) => [...prev, item]);
      setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== id));
      }, 2500);
    };
    window.addEventListener('app:toast', onToast as EventListener);
    return () => window.removeEventListener('app:toast', onToast as EventListener);
  }, []);

  if (!items.length) return null;

  return (
    <div className="fixed right-4 top-4 z-[100] space-y-2">
      {items.map((t) => (
        <div
          key={t.id}
          className={`rounded-xl px-4 py-2 shadow-lg border text-sm animate-[fade_.25s_ease-out] ${
            t.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : t.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-gray-50 border-gray-200 text-gray-800'
          }`}
        >
          {t.message}
        </div>
      ))}
      {/* Animación simple */}
      <style>{`@keyframes fade{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}
