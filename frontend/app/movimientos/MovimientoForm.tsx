'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';
import { useMe } from '@/app/context/AuthContext';

type Tipo = { id: string; nombre: string };

type MovimientoPayload = {
  cod_tipo: string;
  importe_ars?: number | null;
  importe_usd?: number | null;
  cotizacion: number;          // > 0
  concepto?: string | null;
  fecha?: string | null;       // YYYY-MM-DD (opcional)
};

export default function MovimientoForm({ editingId }: { editingId?: number }) {
  const router = useRouter();
  const { me } = useMe();

  const [tipos, setTipos] = useState<Tipo[]>([]);

  const [codTipo, setCodTipo] = useState('');
  const [impArs, setImpArs] = useState('');
  const [impUsd, setImpUsd] = useState('');
  const [cotizacion, setCotizacion] = useState('1');
  const [concepto, setConcepto] = useState('');
  const [fecha, setFecha] = useState('');

  const [loading, setLoading] = useState(false);

  const toNum = (s: string): number | null => {
    const t = String(s ?? '').replace(',', '.').trim();
    if (t === '') return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  };

  useEffect(() => {
    (async () => {
      try {
        const ts = await api.get<Tipo[]>('/tipos'); // requiere token
        setTipos(ts);
      } catch {
        toastError('No se pudieron cargar los tipos');
      }
    })();
  }, []);

  useEffect(() => {
    if (!editingId) {
      // default fecha hoy (YYYY-MM-DD)
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      setFecha(`${y}-${m}-${d}`);
      return;
    }
    (async () => {
      try {
        const m = await api.get<any>(`/movimientos/${editingId}`);
        setCodTipo(m.cod_tipo || '');
        setImpArs(m.importe_ars != null ? String(m.importe_ars) : '');
        setImpUsd(m.importe_usd != null ? String(m.importe_usd) : '');
        setCotizacion(m.cotizacion != null ? String(m.cotizacion) : '1');
        setConcepto(m.concepto || '');
        setFecha(m.fecha || '');
      } catch {
        toastError('No se pudo cargar el movimiento');
      }
    })();
  }, [editingId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!codTipo) return toastError('Seleccioná un tipo');
    const nArs = toNum(impArs);
    const nUsd = toNum(impUsd);
    if (nArs == null && nUsd == null) {
      return toastError('Debés informar al menos un importe (ARS o USD)');
    }
    const nCot = Number(cotizacion);
    if (!Number.isFinite(nCot) || nCot <= 0) {
      return toastError('La cotización debe ser > 0');
    }

    const payload: MovimientoPayload = {
      cod_tipo: codTipo,
      importe_ars: nArs,
      importe_usd: nUsd,
      cotizacion: nCot,
      concepto: concepto || null,
      fecha: fecha || null,
    };

    try {
      setLoading(true);
      if (editingId) {
        await api.put(`/movimientos/${editingId}`, payload);
        toastSuccess('Movimiento actualizado');
      } else {
        await api.post('/movimientos', payload);
        toastSuccess('Movimiento creado');
      }
      // redirigimos al calendario por ahora; si querés /movimientos lo cambio
      router.replace('/calendar');
    } catch (err: any) {
      console.error(err);
      toastError('No se pudo guardar el movimiento');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow p-6 space-y-6">
      <h1 className="text-2xl font-semibold">{editingId ? 'Editar movimiento' : 'Nuevo movimiento'}</h1>

      <form className="space-y-6" onSubmit={onSubmit}>
        {/* Tipo */}
        <div>
          <label className="block text-sm font-medium mb-1">Tipo *</label>
          <select
            className="w-full border rounded-lg px-3 py-2"
            value={codTipo}
            onChange={(e) => setCodTipo(e.target.value)}
            required
          >
            <option value="">Seleccioná…</option>
            {tipos.map(t => (
              <option key={t.id} value={t.id}>{t.nombre} ({t.id})</option>
            ))}
          </select>
        </div>

        {/* Importes: dos columnas ARS / USD */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="font-medium mb-2">ARS ($)</div>
            <input
              type="number"
              step="0.01"
              className="w-full border rounded-lg px-3 py-2"
              value={impArs}
              onChange={(e) => setImpArs(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <div className="font-medium mb-2">USD (U$D)</div>
            <input
              type="number"
              step="0.01"
              className="w-full border rounded-lg px-3 py-2"
              value={impUsd}
              onChange={(e) => setImpUsd(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Cotización / Fecha */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-1">Cotización (USD→ARS) *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full border rounded-lg px-3 py-2"
              value={cotizacion}
              onChange={(e) => setCotizacion(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Fecha</label>
            <input
              type="date"
              className="w-full border rounded-lg px-3 py-2"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>
        </div>

        {/* Concepto */}
        <div>
          <label className="block text-sm font-medium mb-1">Concepto</label>
          <textarea
            className="w-full border rounded-lg px-3 py-2 min-h-[90px]"
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
          />
        </div>

        <div className="pt-2">
          <button disabled={loading} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Guardando…' : (editingId ? 'Actualizar movimiento' : 'Crear movimiento')}
          </button>
        </div>
      </form>
    </div>
  );
}
