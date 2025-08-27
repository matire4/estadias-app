'use client';

import Link from 'next/link';
import { useState } from 'react';
import { downloadGet } from '@/lib/download';
import { toastError } from '@/lib/toast';

export default function InformesHome() {
  const [downloading, setDownloading] = useState(false);

  async function exportAll() {
    try {
      setDownloading(true);
      await downloadGet('/export/excel-all', 'bd_completa.xlsx');
    } catch (e:any) {
      toastError(e?.message || 'No se pudo exportar');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-4">Informes</h1>
      <div className="bg-white rounded-lg shadow divide-y">
        <Link href="/informes/activas" className="block px-4 py-3 hover:bg-gray-50">
          Estadías activas (fecha fin ≥ hoy)
        </Link>
        <Link href="/informes/cerradas" className="block px-4 py-3 hover:bg-gray-50">
          Estadías cerradas
        </Link>
        <Link href="/informes/no-cerradas" className="block px-4 py-3 hover:bg-gray-50">
          Estadías no cerradas
        </Link>
      </div>

      <div className="mt-6">
        <button
          onClick={exportAll}
          disabled={downloading}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-60"
        >
          {downloading ? 'Generando…' : 'Exportar a Excel (BD completa)'}
        </button>
      </div>
    </div>
  );
}
