'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';
import { useMe } from '@/app/context/AuthContext';

type Estado = { id: string; nombre: string };
type Depto = { id?: number; codigo?: string; nro?: string; id_propietario?: number | null };
type Cochera = { id?: number; codigo?: string; id_propietario?: number | null };
type Propietario = { id: number; nombre: string; dni_cuit?: string | null; telefono?: string | null };

type EstadiaPayload = {
  departamento: string;           // código (p.ej. "B216")
  cochera?: string | null;        // código (p.ej. "A2") opcional
  inquilino: string;
  fecha_desde: string;            // YYYY-MM-DD
  fecha_hasta: string;            // YYYY-MM-DD
  estado_id?: string;             // por defecto "Act" si no es admin
  cotizacion: number;             // > 0
  // importes opcionales
  importe_total_ars?: number | null;
  importe_total_usd?: number | null;
  importe_inquilino_ars?: number | null;
  importe_inquilino_usd?: number | null;
  importe_propietario_ars?: number | null;
  importe_propietario_usd?: number | null;
  importe_limpieza_ars?: number | null;
  importe_limpieza_usd?: number | null;
  importe_recepcion_ars?: number | null;
  importe_recepcion_usd?: number | null;
  importe_comision_ars?: number | null;
  importe_comision_usd?: number | null;
  importe_publicidad_ars?: number | null;
  importe_publicidad_usd?: number | null;
  concepto?: string | null;
};

export default function EstadiaForm({ editingId }: { editingId?: number }) {
  const router = useRouter();
  const { me } = useMe(); // { id, nombre, email, rol }
  const isAdmin = me?.rol === 'admin';

  // catálogos
  const [departamentos, setDepartamentos] = useState<Depto[]>([]);
  const [cocheras, setCocheras] = useState<Cochera[]>([]);
  const [estados, setEstados] = useState<Estado[]>([]);
  const [propietarios, setPropietarios] = useState<Propietario[]>([]);

  // form
  const [departamentoCodigo, setDepartamentoCodigo] = useState('');
  const [cocheraCodigo, setCocheraCodigo] = useState('');
  const [inquilino, setInquilino] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [estadoId, setEstadoId] = useState<string>('Act'); // default
  const [cotizacion, setCotizacion] = useState<string>('');

  const [concepto, setConcepto] = useState('');

  // importes (string para inputs; convierto a número/null al enviar)
  const [impInqArs, setImpInqArs] = useState('');
  const [impInqUsd, setImpInqUsd] = useState('');
  const [impPropArs, setImpPropArs] = useState('');
  const [impPropUsd, setImpPropUsd] = useState('');
  const [impLimpArs, setImpLimpArs] = useState('');
  const [impLimpUsd, setImpLimpUsd] = useState('');
  const [impRecArs, setImpRecArs] = useState('');
  const [impRecUsd, setImpRecUsd] = useState('');
  const [impComArs, setImpComArs] = useState('');
  const [impComUsd, setImpComUsd] = useState('');
  const [impPubArs, setImpPubArs] = useState('');
  const [impPubUsd, setImpPubUsd] = useState('');

  // totales (derivados – NO editables)
  const [impTotalArs, setImpTotalArs] = useState('');
  const [impTotalUsd, setImpTotalUsd] = useState('');

  const [loading, setLoading] = useState(false);

  // ---- helpers ----
  const toNum = (s: string): number | null => {
    if (s === undefined || s === null) return null;
    const t = String(s).replace(',', '.').trim();
    if (t === '') return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  };

  const fmt = (n: string | number | null | undefined) => {
    const v = typeof n === 'string' ? Number(n) : (n ?? 0);
    if (!Number.isFinite(v)) return '0';
    return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v as number);
  };

  const depOptions = useMemo(
    () =>
      departamentos.map((d) => {
        const codigo = d.codigo ?? d.nro ?? '';
        return { value: codigo, label: codigo || '(sin código)' };
      }),
    [departamentos]
  );

  const cocheraOptions = useMemo(
    () => cocheras.map((c) => ({ value: c.codigo ?? '', label: c.codigo ?? '' })),
    [cocheras]
  );

  // ---- cargar catálogos ----
  useEffect(() => {
    (async () => {
      try {
        const deps = await api.get<Depto[]>('/departamentos'); // público
        setDepartamentos(deps);
      } catch {
        toastError('No se pudieron cargar los departamentos');
      }
      try {
        const cochs = await api.get<Cochera[]>('/cocheras'); // con token
        setCocheras(cochs);
      } catch { /* noop */ }
      try {
        const ests = await api.get<Estado[]>('/estados');
        setEstados(ests);
        if (ests.find((e) => e.id === 'Act')) setEstadoId('Act');
      } catch { /* noop */ }
      try {
        const props = await api.get<Propietario[]>('/propietarios');
        setPropietarios(props);
      } catch { /* noop */ }
    })();
  }, []);

  // ---- si estamos editando, cargo la estadía ----
  useEffect(() => {
    if (!editingId) return;
    (async () => {
      try {
        const data = await api.get<any>(`/estadias/${editingId}`);
        setDepartamentoCodigo(data.departamento || data.departamento_codigo || '');
        setCocheraCodigo(data.cochera || data.cochera_codigo || '');
        setInquilino(data.inquilino || '');
        setFechaDesde(data.fecha_desde || '');
        setFechaHasta(data.fecha_hasta || '');
        if (data.estado_id) setEstadoId(data.estado_id);
        if (data.cotizacion != null) setCotizacion(String(data.cotizacion));

        setConcepto(data.concepto || '');

        // cargas existentes
        setImpInqArs(data.importe_inquilino_ars != null ? String(data.importe_inquilino_ars) : '');
        setImpInqUsd(data.importe_inquilino_usd != null ? String(data.importe_inquilino_usd) : '');
        setImpPropArs(data.importe_propietario_ars != null ? String(data.importe_propietario_ars) : '');
        setImpPropUsd(data.importe_propietario_usd != null ? String(data.importe_propietario_usd) : '');
        setImpLimpArs(data.importe_limpieza_ars != null ? String(data.importe_limpieza_ars) : '');
        setImpLimpUsd(data.importe_limpieza_usd != null ? String(data.importe_limpieza_usd) : '');
        setImpRecArs(data.importe_recepcion_ars != null ? String(data.importe_recepcion_ars) : '');
        setImpRecUsd(data.importe_recepcion_usd != null ? String(data.importe_recepcion_usd) : '');
        setImpComArs(data.importe_comision_ars != null ? String(data.importe_comision_ars) : '');
        setImpComUsd(data.importe_comision_usd != null ? String(data.importe_comision_usd) : '');
        setImpPubArs(data.importe_publicidad_ars != null ? String(data.importe_publicidad_ars) : '');
        setImpPubUsd(data.importe_publicidad_usd != null ? String(data.importe_publicidad_usd) : '');

        // totales derivados iniciales (por si hay valores guardados)
        setImpTotalArs(
          String(
            (Number(data.importe_inquilino_ars || 0)) -
            ((Number(data.importe_propietario_ars || 0)) +
             (Number(data.importe_limpieza_ars || 0)) +
             (Number(data.importe_recepcion_ars || 0)) +
             (Number(data.importe_comision_ars || 0)) +
             (Number(data.importe_publicidad_ars || 0)))
          )
        );
        setImpTotalUsd(
          String(
            (Number(data.importe_inquilino_usd || 0)) -
            ((Number(data.importe_propietario_usd || 0)) +
             (Number(data.importe_limpieza_usd || 0)) +
             (Number(data.importe_recepcion_usd || 0)) +
             (Number(data.importe_comision_usd || 0)) +
             (Number(data.importe_publicidad_usd || 0)))
          )
        );
      } catch {
        toastError('No se pudo cargar la estadía');
      }
    })();
  }, [editingId]);

  // ---- totales dinámicos (derivados) ----
  useEffect(() => {
    const ars =
      (toNum(impInqArs) || 0) -
      ((toNum(impPropArs) || 0) + (toNum(impLimpArs) || 0) + (toNum(impRecArs) || 0) + (toNum(impComArs) || 0) + (toNum(impPubArs) || 0));
    const usd =
      (toNum(impInqUsd) || 0) -
      ((toNum(impPropUsd) || 0) + (toNum(impLimpUsd) || 0) + (toNum(impRecUsd) || 0) + (toNum(impComUsd) || 0) + (toNum(impPubUsd) || 0));
    setImpTotalArs(Number.isFinite(ars) ? String(ars) : '');
    setImpTotalUsd(Number.isFinite(usd) ? String(usd) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [impInqArs, impPropArs, impLimpArs, impRecArs, impComArs, impPubArs, impInqUsd, impPropUsd, impLimpUsd, impRecUsd, impComUsd, impPubUsd]);

  // ---- submit ----
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!departamentoCodigo || !inquilino || !fechaDesde || !fechaHasta) {
      return toastError('Completá los campos obligatorios');
    }
    if (!cotizacion || Number(cotizacion) <= 0) {
      return toastError('La cotización debe ser > 0');
    }
    if (new Date(fechaDesde) > new Date(fechaHasta)) {
      return toastError('La fecha desde no puede ser mayor que la fecha hasta');
    }

    const payload: EstadiaPayload = {
      departamento: departamentoCodigo,
      cochera: cocheraCodigo ? cocheraCodigo : null,
      inquilino,
      fecha_desde: fechaDesde,
      fecha_hasta: fechaHasta,
      cotizacion: Number(cotizacion),
      concepto: concepto || null,
      // importes (totales derivados)
      importe_total_ars: toNum(impTotalArs),
      importe_total_usd: toNum(impTotalUsd),
      // desgloses
      importe_inquilino_ars: toNum(impInqArs),
      importe_inquilino_usd: toNum(impInqUsd),
      importe_propietario_ars: toNum(impPropArs),
      importe_propietario_usd: toNum(impPropUsd),
      importe_limpieza_ars: toNum(impLimpArs),
      importe_limpieza_usd: toNum(impLimpUsd),
      importe_recepcion_ars: toNum(impRecArs),
      importe_recepcion_usd: toNum(impRecUsd),
      importe_comision_ars: toNum(impComArs),
      importe_comision_usd: toNum(impComUsd),
      importe_publicidad_ars: toNum(impPubArs),
      importe_publicidad_usd: toNum(impPubUsd),
    };

    if (isAdmin) payload.estado_id = estadoId || 'Act';

    try {
      setLoading(true);
      if (editingId) {
        await api.put(`/estadias/${editingId}`, payload);
        toastSuccess('Estadía actualizada');
      } else {
        await api.post('/estadias', payload);
        toastSuccess('Estadía creada');
      }
      router.replace('/calendar');
    } catch (err: any) {
      console.error(err);
      toastError('No se pudo guardar la estadía');
    } finally {
      setLoading(false);
    }
  }

  // ---- modales de “Agregar” rápido ----
  // Depto
  const [showAddDepto, setShowAddDepto] = useState(false);
  const [nuevoDepto, setNuevoDepto] = useState('');
  const [nuevoDeptoPropId, setNuevoDeptoPropId] = useState<number | ''>('');

  async function saveDepto(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoDepto.trim()) return;
    try {
      await api.post('/departamentos', {
        codigo: nuevoDepto.trim(),
        id_propietario: nuevoDeptoPropId || null,
      });
      const deps = await api.get<Depto[]>('/departamentos');
      setDepartamentos(deps);
      setDepartamentoCodigo(nuevoDepto.trim());
      setShowAddDepto(false);
      setNuevoDepto('');
      setNuevoDeptoPropId('');
    } catch {
      toastError('No se pudo crear el departamento');
    }
  }

  // Cochera
  const [showAddCoch, setShowAddCoch] = useState(false);
  const [nuevaCoch, setNuevaCoch] = useState('');
  const [nuevaCochPropId, setNuevaCochPropId] = useState<number | ''>('');

  async function saveCoch(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevaCoch.trim()) return;
    try {
      await api.post('/cocheras', {
        codigo: nuevaCoch.trim(),
        id_propietario: nuevaCochPropId || null,
      });
      const cochs = await api.get<Cochera[]>('/cocheras');
      setCocheras(cochs);
      setCocheraCodigo(nuevaCoch.trim());
      setShowAddCoch(false);
      setNuevaCoch('');
      setNuevaCochPropId('');
    } catch {
      toastError('No se pudo crear la cochera');
    }
  }

  // Estado
  const [showAddEstado, setShowAddEstado] = useState(false);
  const [nuevoEstadoId, setNuevoEstadoId] = useState('');
  const [nuevoEstadoNombre, setNuevoEstadoNombre] = useState('');
  async function saveEstado(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoEstadoId.trim() || !nuevoEstadoNombre.trim()) return;
    try {
      await api.post('/estados', { id: nuevoEstadoId.trim(), nombre: nuevoEstadoNombre.trim() });
      const ests = await api.get<Estado[]>('/estados');
      setEstados(ests);
      setEstadoId(nuevoEstadoId.trim());
      setShowAddEstado(false);
      setNuevoEstadoId(''); setNuevoEstadoNombre('');
    } catch {
      toastError('No se pudo crear el estado');
    }
  }

  // Propietario
  const [showAddProp, setShowAddProp] = useState(false);
  const [nuevoPropNombre, setNuevoPropNombre] = useState('');
  const [nuevoPropDniCuit, setNuevoPropDniCuit] = useState('');
  const [nuevoPropTelefono, setNuevoPropTelefono] = useState('');

  async function savePropietario(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoPropNombre.trim()) return;
    try {
      await api.post('/propietarios', {
        nombre: nuevoPropNombre.trim(),
        dni_cuit: nuevoPropDniCuit.trim() || null,
        telefono: nuevoPropTelefono.trim() || null,
      });
      const ps = await api.get<Propietario[]>('/propietarios');
      setPropietarios(ps);
      setShowAddProp(false);
      setNuevoPropNombre('');
      setNuevoPropDniCuit('');
      setNuevoPropTelefono('');
    } catch {
      toastError('No se pudo crear el propietario');
    }
  }

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow p-6 space-y-6">
      <h1 className="text-2xl font-semibold">{editingId ? 'Editar estadía' : 'Nueva estadía'}</h1>

      <form className="space-y-6" onSubmit={onSubmit}>
        {/* Línea 1: Departamento / Cochera / Inquilino */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Departamento (código) *</label>
            <div className="flex gap-2">
              <select
                className="flex-1 border rounded-lg px-3 py-2"
                value={departamentoCodigo}
                onChange={(e) => setDepartamentoCodigo(e.target.value)}
                required
              >
                <option value="">Seleccioná…</option>
                {depOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <button type="button" onClick={() => setShowAddDepto(true)} className="px-3 py-2 rounded-lg bg-gray-100">
                Agregar
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Cochera (código)</label>
            <div className="flex gap-2">
              <select
                className="flex-1 border rounded-lg px-3 py-2"
                value={cocheraCodigo}
                onChange={(e) => setCocheraCodigo(e.target.value)}
              >
                <option value="">(sin cochera)</option>
                {cocheraOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <button type="button" onClick={() => setShowAddCoch(true)} className="px-3 py-2 rounded-lg bg-gray-100">
                Agregar
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Inquilino *</label>
            <input className="w-full border rounded-lg px-3 py-2" value={inquilino} onChange={(e) => setInquilino(e.target.value)} required />
          </div>
        </div>

        {/* Línea 2: Fechas y Cotización */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Desde *</label>
            <input type="date" className="w-full border rounded-lg px-3 py-2" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Hasta *</label>
            <input type="date" className="w-full border rounded-lg px-3 py-2" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} required />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Cotización (USD→ARS) *</label>
            <input type="number" min="0" step="0.01" className="w-full border rounded-lg px-3 py-2" value={cotizacion} onChange={(e) => setCotizacion(e.target.value)} required />
          </div>
        </div>

        {/* Estado (solo admin) */}
        {isAdmin && (
          <div>
            <label className="block text-sm font-medium mb-1">Estado</label>
            <div className="flex gap-2">
              <select className="flex-1 border rounded-lg px-3 py-2" value={estadoId} onChange={(e) => setEstadoId(e.target.value)}>
                {estados.map((e) => (
                  <option key={e.id} value={e.id}>{e.nombre} ({e.id})</option>
                ))}
              </select>
              <button type="button" onClick={() => setShowAddEstado(true)} className="px-3 py-2 rounded-lg bg-gray-100">Agregar</button>
            </div>
          </div>
        )}

        {/* Importes: dos columnas ARS / USD (sin los totales editables) */}
        <div>
          <div className="text-center text-sm text-gray-600 mb-2">Importes</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="font-medium mb-2">ARS ($)</div>
              <div className="space-y-3">
                <NumberInput label="Importe Inquilino" value={impInqArs} onChange={setImpInqArs} />
                <NumberInput label="Importe Propietario" value={impPropArs} onChange={setImpPropArs} />
                <NumberInput label="Importe Limpieza" value={impLimpArs} onChange={setImpLimpArs} />
                <NumberInput label="Importe Recepción" value={impRecArs} onChange={setImpRecArs} />
                <NumberInput label="Importe Comisión" value={impComArs} onChange={setImpComArs} />
                <NumberInput label="Importe Publicidad" value={impPubArs} onChange={setImpPubArs} />
              </div>
            </div>
            <div>
              <div className="font-medium mb-2">USD (U$D)</div>
              <div className="space-y-3">
                <NumberInput label="Importe Inquilino" value={impInqUsd} onChange={setImpInqUsd} />
                <NumberInput label="Importe Propietario" value={impPropUsd} onChange={setImpPropUsd} />
                <NumberInput label="Importe Limpieza" value={impLimpUsd} onChange={setImpLimpUsd} />
                <NumberInput label="Importe Recepción" value={impRecUsd} onChange={setImpRecUsd} />
                <NumberInput label="Importe Comisión" value={impComUsd} onChange={setImpComUsd} />
                <NumberInput label="Importe Publicidad" value={impPubUsd} onChange={setImpPubUsd} />
              </div>
            </div>
          </div>
        </div>

        {/* Resumen (totales derivados, no editables) */}
        <div className="rounded-lg border bg-gray-50 p-4">
          <div className="text-sm text-gray-600 mb-2 font-medium">Resumen</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Importe Total (ARS)</span>
              <span className="font-semibold">${fmt(impTotalArs)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Importe Total (USD)</span>
              <span className="font-semibold">U$D {fmt(impTotalUsd)}</span>
            </div>
          </div>
        </div>

        {/* Concepto / Observaciones */}
        <div>
          <label className="block text-sm font-medium mb-1">Concepto / Observaciones</label>
          <textarea className="w-full border rounded-lg px-3 py-2 min-h-[90px]" value={concepto} onChange={(e) => setConcepto(e.target.value)} />
        </div>

        <div className="pt-2">
          <button disabled={loading} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Guardando…' : (editingId ? 'Actualizar estadía' : 'Crear estadía')}
          </button>
        </div>
      </form>

      {/* Modales */}
      {showAddDepto && (
        <Modal title="Agregar departamento" onClose={() => setShowAddDepto(false)}>
          <form onSubmit={saveDepto} className="space-y-3">
            <div>
              <label className="text-sm">Código *</label>
              <input className="w-full border rounded px-3 py-2" value={nuevoDepto} onChange={(e) => setNuevoDepto(e.target.value)} required />
            </div>
            <div>
              <label className="text-sm">Propietario</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={nuevoDeptoPropId === '' ? '' : String(nuevoDeptoPropId)}
                onChange={(e) => setNuevoDeptoPropId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">(sin propietario)</option>
                {propietarios.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowAddProp(true)}
                className="mt-2 text-sm text-blue-600 hover:underline"
              >
                + Nuevo propietario
              </button>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" className="px-3 py-2 rounded bg-gray-100" onClick={() => setShowAddDepto(false)}>Cancelar</button>
              <button className="px-3 py-2 rounded bg-green-600 text-white">Guardar</button>
            </div>
          </form>
        </Modal>
      )}

      {showAddCoch && (
        <Modal title="Agregar cochera" onClose={() => setShowAddCoch(false)}>
          <form onSubmit={saveCoch} className="space-y-3">
            <div>
              <label className="text-sm">Código *</label>
              <input className="w-full border rounded px-3 py-2" value={nuevaCoch} onChange={(e) => setNuevaCoch(e.target.value)} required />
            </div>
            <div>
              <label className="text-sm">Propietario</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={nuevaCochPropId === '' ? '' : String(nuevaCochPropId)}
                onChange={(e) => setNuevaCochPropId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">(sin propietario)</option>
                {propietarios.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowAddProp(true)}
                className="mt-2 text-sm text-blue-600 hover:underline"
              >
                + Nuevo propietario
              </button>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" className="px-3 py-2 rounded bg-gray-100" onClick={() => setShowAddCoch(false)}>Cancelar</button>
              <button className="px-3 py-2 rounded bg-green-600 text-white">Guardar</button>
            </div>
          </form>
        </Modal>
      )}

      {showAddEstado && (
        <Modal title="Agregar estado" onClose={() => setShowAddEstado(false)}>
          <form onSubmit={saveEstado} className="space-y-3">
            <div><label className="text-sm">ID (corto) *</label><input className="w-full border rounded px-3 py-2" value={nuevoEstadoId} onChange={(e) => setNuevoEstadoId(e.target.value)} required placeholder="Act / Cerr" /></div>
            <div><label className="text-sm">Nombre *</label><input className="w-full border rounded px-3 py-2" value={nuevoEstadoNombre} onChange={(e) => setNuevoEstadoNombre(e.target.value)} required /></div>
            <div className="flex justify-end gap-2"><button type="button" className="px-3 py-2 rounded bg-gray-100" onClick={() => setShowAddEstado(false)}>Cancelar</button><button className="px-3 py-2 rounded bg-green-600 text-white">Guardar</button></div>
          </form>
        </Modal>
      )}

      {showAddProp && (
        <Modal title="Agregar propietario" onClose={() => setShowAddProp(false)}>
          <form onSubmit={savePropietario} className="space-y-3">
            <div>
              <label className="text-sm">Nombre *</label>
              <input
                className="w-full border rounded px-3 py-2"
                value={nuevoPropNombre}
                onChange={(e) => setNuevoPropNombre(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm">DNI / CUIT</label>
              <input
                className="w-full border rounded px-3 py-2"
                value={nuevoPropDniCuit}
                onChange={(e) => setNuevoPropDniCuit(e.target.value)}
                placeholder="opcional"
              />
            </div>
            <div>
              <label className="text-sm">Teléfono</label>
              <input
                className="w-full border rounded px-3 py-2"
                value={nuevoPropTelefono}
                onChange={(e) => setNuevoPropTelefono(e.target.value)}
                placeholder="opcional"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="px-3 py-2 rounded bg-gray-100" onClick={() => setShowAddProp(false)}>Cancelar</button>
              <button className="px-3 py-2 rounded bg-green-600 text-white">Guardar</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function NumberInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm text-gray-700 mb-1">{label}</label>
      <input
        type="number"
        step="0.01"
        className="w-full border rounded-lg px-3 py-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-3 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="px-2 py-1 rounded bg-gray-100">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
