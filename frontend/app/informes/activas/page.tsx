'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { toastError } from '@/lib/toast';
import { downloadGet } from '@/lib/download';

type Estadia = {
  id: number;
  departamento?: string;
  departamento_codigo?: string;
  inquilino: string;
  fecha_desde: string;
  fecha_hasta: string;
  estado_id?: string;
};

export default function InformesActivas() {
  const [rows, setRows] = useState<Estadia[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await api.get<Estadia[]>('/estadias');
        setRows(data);
      } catch {
        toastError('No se pudieron cargar las estadías');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const hoy = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear(), mm = String(d.getMonth()+1).padStart(2,'0'), dd = String(d.getDate()).padStart(2,'0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const filtered = useMemo(
    () => rows.filter(r => r.fecha_hasta >= hoy),
    [rows, hoy]
  );

  const [downloading, setDownloading] = useState(false);
  async function exportThis() {
    try {
      setDownloading(true);
      await downloadGet('/export/estadias?scope=activas', 'estadias_activas.xlsx');
    } catch (e:any) {
      toastError(e?.message || 'No se pudo exportar');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Estadías activas</h1>
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {loading ? <div className="p-6 text-center text-gray-500">Cargando…</div> :
        filtered.length === 0 ? <div className="p-6 text-center text-gray-500">Sin resultados</div> :
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="px-4 py-2">ID</th>
              <th className="px-4 py-2">Depto</th>
              <th className="px-4 py-2">Inquilino</th>
              <th className="px-4 py-2">Desde</th>
              <th className="px-4 py-2">Hasta</th>
              <th className="px-4 py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2">{r.id}</td>
                <td className="px-4 py-2">{r.departamento_codigo || r.departamento}</td>
                <td className="px-4 py-2">{r.inquilino}</td>
                <td className="px-4 py-2">{r.fecha_desde}</td>
                <td className="px-4 py-2">{r.fecha_hasta}</td>
                <td className="px-4 py-2">{r.estado_id || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>}
      </div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Estadías activas</h1>
        <button
            onClick={exportThis}
            disabled={downloading}
            className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-60"
        >
            {downloading ? 'Generando…' : 'Exportar a Excel'}
        </button>
        </div>
    </div>
  );
}
