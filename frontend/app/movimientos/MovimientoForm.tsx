'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';

type Tipo = { id: string; nombre: string };
type Propietario = { id: number; nombre: string };

type MovimientoPayload = {
  cod_tipo: string;
  importe_ars?: number | null;
  importe_usd?: number | null;
  cotizacion: number;   // > 0
  concepto?: string | null;
  fecha: string;        // YYYY-MM-DD
  propietario_id?: number | null;
};

const TIPO_REQUIERE_PROPIETARIO = new Set(['Prop', 'Limp', 'Rece', 'Publ', 'Comi']); // + Comi (comisiones)

export default function MovimientoForm({ editingId }: { editingId?: number }) {
  const router = useRouter();

  // catálogos
  const [tipos, setTipos] = useState<Tipo[]>([]);
  const [propietarios, setPropietarios] = useState<Propietario[]>([]);

  // form
  const [codTipo, setCodTipo] = useState<string>('');
  const [importeArs, setImporteArs] = useState<string>('');
  const [importeUsd, setImporteUsd] = useState<string>('');
  const [cotizacion, setCotizacion] = useState<string>('1');
  const [concepto, setConcepto] = useState<string>('');
  const [fecha, setFecha] = useState<string>('');
  const [propietarioId, setPropietarioId] = useState<string>(''); // mantengo como string para el <select>

  const [loading, setLoading] = useState(false);

  // helpers
  const toNum = (s: string): number | null => {
    if (s === undefined || s === null) return null;
    const t = String(s).replace(',', '.').trim();
    if (t === '') return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  };

  const requierePropietario = useMemo(
    () => TIPO_REQUIERE_PROPIETARIO.has(codTipo),
    [codTipo]
  );

  // cargar catálogos + default fecha hoy
  useEffect(() => {
    (async () => {
      try {
        const t = await api.get<Tipo[]>('/tipos');
        setTipos(t);
      } catch {
        toastError('No se pudieron cargar los tipos');
      }
      try {
        const p = await api.get<Propietario[]>('/propietarios');
        setPropietarios(p);
      } catch {
        // no bloqueo
      }
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      setFecha(`${yyyy}-${mm}-${dd}`);
    })();
  }, []);

  // si edita, traer movimiento (opcional – sólo si ya tenés GET /movimientos/:id)
  useEffect(() => {
    if (!editingId) return;
    (async () => {
      try {
        const m = await api.get<any>(`/movimientos/${editingId}`);
        setCodTipo(m.cod_tipo || '');
        setImporteArs(m.importe_ars != null ? String(m.importe_ars) : '');
        setImporteUsd(m.importe_usd != null ? String(m.importe_usd) : '');
        setCotizacion(m.cotizacion != null ? String(m.cotizacion) : '1');
        setConcepto(m.concepto || '');
        setFecha(m.fecha || '');
        setPropietarioId(m.propietario_id ? String(m.propietario_id) : '');
      } catch {
        toastError('No se pudo cargar el movimiento');
      }
    })();
  }, [editingId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!codTipo) return toastError('Seleccioná el tipo');
    if (!fecha) return toastError('La fecha es obligatoria');

    const cot = Number(cotizacion);
    if (!Number.isFinite(cot) || cot <= 0) {
      return toastError('La cotización debe ser mayor a 0');
    }

    const numArs = toNum(importeArs);
    const numUsd = toNum(importeUsd);
    if (numArs == null && numUsd == null) {
      return toastError('Ingresá al menos un importe (ARS o USD)');
    }

    if (requierePropietario && !propietarioId) {
      return toastError('Este tipo requiere seleccionar un propietario');
    }

    const payload: MovimientoPayload = {
      cod_tipo: codTipo,
      importe_ars: numArs,
      importe_usd: numUsd,
      cotizacion: cot,
      concepto: concepto?.trim() || null,
      fecha,
      propietario_id: propietarioId ? Number(propietarioId) : undefined,
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
      router.replace('/calendar');
    } catch (err: any) {
      console.error(err);
      toastError(err?.message || 'No se pudo guardar el movimiento');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow p-6 space-y-6">
      <h1 className="text-2xl font-semibold">{editingId ? 'Editar movimiento' : 'Nuevo movimiento'}</h1>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Tipo + (Propietario condicional) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            {requierePropietario && (
              <p className="mt-1 text-xs text-gray-500">Este tipo requiere un propietario.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Propietario {requierePropietario ? '*' : <span className="text-gray-400">(opcional)</span>}
            </label>
            <select
              className="w-full border rounded-lg px-3 py-2"
              value={propietarioId}
              onChange={(e) => setPropietarioId(e.target.value)}
              required={requierePropietario}
            >
              <option value="">Seleccioná…</option>
              {propietarios.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Importes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Importe ARS</label>
            <input
              type="number"
              step="0.01"
              className="w-full border rounded-lg px-3 py-2"
              value={importeArs}
              onChange={(e) => setImporteArs(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Importe USD</label>
            <input
              type="number"
              step="0.01"
              className="w-full border rounded-lg px-3 py-2"
              value={importeUsd}
              onChange={(e) => setImporteUsd(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Cotización (USD→ARS) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-full border rounded-lg px-3 py-2"
              value={cotizacion}
              onChange={(e) => setCotizacion(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Fecha + Concepto */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Fecha *</label>
            <input
              type="date"
              className="w-full border rounded-lg px-3 py-2"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Concepto</label>
            <input
              type="text"
              className="w-full border rounded-lg px-3 py-2"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Detalle / nota (opcional)"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Guardando…' : (editingId ? 'Actualizar movimiento' : 'Crear movimiento')}
          </button>
        </div>
      </form>
    </div>
  );
}
