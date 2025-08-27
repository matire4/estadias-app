'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { toastError } from '@/lib/toast';
import { Plus } from 'lucide-react';
import { downloadGet } from '@/lib/download';

type Movimiento = {
  id: number;
  cod_tipo: string;                // 'Inqu' | 'Prop' | 'Publ' | 'Limp' | 'Rece' | 'Comi'
  importe_ars: number | string | null;
  importe_usd: number | string | null;
  cotizacion: number | string;
  concepto: string | null;
  fecha: string;                   // YYYY-MM-DD
  usuario_id?: number | null;
  propietario_id?: number | null;
  propietario_nombre?: string | null;
};

type Tipo = { id: string; nombre: string };
type Propietario = { id: number; nombre: string };

// helpers numéricos
const toNum = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const fmt2 = (v: unknown) => toNum(v).toFixed(2);

export default function MovimientosPage() {
  const router = useRouter();

  const [tipos, setTipos] = useState<Tipo[]>([]);
  const [props, setProps] = useState<Propietario[]>([]);
  const [rows, setRows] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(false);

  // filtros
  const [fDesde, setFDesde] = useState('');
  const [fHasta, setFHasta] = useState('');
  const [fTipo, setFTipo] = useState('');
  const [fProp, setFProp] = useState('');

  // export
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const t = await api.get<Tipo[]>('/tipos');
        setTipos(t);
      } catch {}

      try {
        const p = await api.get<Propietario[]>('/propietarios');
        setProps(p);
      } catch {}

      await fetchMovs();
    })();
  }, []);

  async function fetchMovs() {
    try {
      setLoading(true);
      const qs = new URLSearchParams();
      if (fDesde) qs.append('desde', fDesde);
      if (fHasta) qs.append('hasta', fHasta);
      if (fTipo)  qs.append('cod_tipo', fTipo);
      if (fProp)  qs.append('propietario_id', fProp);
      const path = `/movimientos${qs.toString() ? `?${qs.toString()}` : ''}`;

      const data = await api.get<Movimiento[]>(path);
      setRows(data);
    } catch (e) {
      console.error(e);
      toastError('No se pudieron cargar los movimientos');
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (fDesde && r.fecha < fDesde) return false;
      if (fHasta && r.fecha > fHasta) return false;
      if (fTipo && r.cod_tipo !== fTipo) return false;
      if (fProp && String(r.propietario_id || '') !== fProp) return false;
      return true;
    });
  }, [rows, fDesde, fHasta, fTipo, fProp]);

  // Totales robustos (si vienen strings o null no se rompe)
  const totalArs = useMemo(
    () => filtered.reduce((acc, r) => acc + toNum(r.importe_ars), 0),
    [filtered]
  );
  const totalUsd = useMemo(
    () => filtered.reduce((acc, r) => acc + toNum(r.importe_usd), 0),
    [filtered]
  );

  async function exportMovs() {
    try {
      setDownloading(true);
      const qs = new URLSearchParams();
      if (fDesde) qs.append('desde', fDesde);
      if (fHasta) qs.append('hasta', fHasta);
      if (fTipo)  qs.append('cod_tipo', fTipo);
      if (fProp)  qs.append('propietario_id', fProp);
      const url = `/export/movimientos${qs.toString() ? `?${qs.toString()}` : ''}`;

      await downloadGet(url, 'movimientos.xlsx');
    } catch (e:any) {
      toastError(e?.message || 'No se pudo exportar');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Movimientos</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={exportMovs}
            disabled={downloading}
            className="px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
          >
            {downloading ? 'Generando…' : 'Exportar a Excel'}
          </button>
          <button
            onClick={() => router.push('/movimientos/new')}
            className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 shadow"
            title="Nuevo movimiento"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4">
        <form
          onSubmit={(e) => { e.preventDefault(); fetchMovs(); }}
          className="grid grid-cols-1 sm:grid-cols-5 gap-3"
        >
          <div>
            <label className="text-sm text-gray-600">Desde</label>
            <input type="date" className="w-full border rounded px-2 py-1" value={fDesde} onChange={(e)=>setFDesde(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-gray-600">Hasta</label>
            <input type="date" className="w-full border rounded px-2 py-1" value={fHasta} onChange={(e)=>setFHasta(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-gray-600">Tipo</label>
            <select className="w-full border rounded px-2 py-1" value={fTipo} onChange={(e)=>setFTipo(e.target.value)}>
              <option value="">(todos)</option>
              {tipos.map(t => <option key={t.id} value={t.id}>{t.nombre} ({t.id})</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600">Propietario</label>
            <select className="w-full border rounded px-2 py-1" value={fProp} onChange={(e)=>setFProp(e.target.value)}>
              <option value="">(todos)</option>
              {props.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button className="w-full px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Filtrar</button>
          </div>
        </form>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {loading ? (
          <div className="p-6 text-center text-gray-500">Cargando…</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-gray-500">Sin resultados</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2">Propietario</th>
                <th className="px-4 py-2 text-right">ARS</th>
                <th className="px-4 py-2 text-right">USD</th>
                <th className="px-4 py-2">Concepto</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id} className="border-t">
                  <td className="px-4 py-2">{m.fecha}</td>
                  <td className="px-4 py-2">{m.cod_tipo}</td>
                  <td className="px-4 py-2">{m.propietario_nombre || (m.propietario_id ? `#${m.propietario_id}` : '—')}</td>
                  <td className="px-4 py-2 text-right">{m.importe_ars == null ? '—' : fmt2(m.importe_ars)}</td>
                  <td className="px-4 py-2 text-right">{m.importe_usd == null ? '—' : fmt2(m.importe_usd)}</td>
                  <td className="px-4 py-2">{m.concepto || '—'}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => router.push(`/movimientos/edit/${m.id}`)}
                      className="text-blue-600 hover:underline"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
              {/* Totales */}
              <tr className="border-t bg-gray-50 font-medium">
                <td className="px-4 py-2" colSpan={3}>Totales</td>
                <td className="px-4 py-2 text-right">{fmt2(totalArs)}</td>
                <td className="px-4 py-2 text-right">{fmt2(totalUsd)}</td>
                <td className="px-4 py-2" colSpan={2}></td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
