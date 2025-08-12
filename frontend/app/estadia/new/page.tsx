'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';

import { usePropietarios } from '@/hooks/usePropietarios';
import { useDepartamentos } from '@/hooks/useDepartamentos';
import { useEstados } from '@/hooks/useEstados';
import { useTipos } from '@/hooks/useTipos';

export default function NuevaEstadiaPage() {
  const router = useRouter();

  // catálogos
  const { items: propietarios, create: createProp } = usePropietarios();
  const { items: departamentos, create: createDep } = useDepartamentos();
  const { items: estados, create: createEst } = useEstados();
  const { items: tipos, create: createTipo } = useTipos();

  // form principal
  const [departamentoId, setDepartamentoId] = useState<number | ''>('');
  const [inquilino, setInquilino] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [estadoId, setEstadoId] = useState<string | ''>('');

  // selects
  const depOptions = departamentos.map(d => ({ value: d.id, label: d.nro + (d.propietario ? ` · ${d.propietario}` : '') }));
  const estOptions = estados.map(e => ({ value: e.id, label: `${e.nombre} (${e.id})` }));

  useEffect(()=> {
    // si existe 'Act' lo preseleccionamos
    const act = estados.find(e => e.id === 'Act');
    if (act) setEstadoId('Act');
  }, [estados]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (!departamentoId || !inquilino || !fechaDesde || !fechaHasta) {
        return toastError('Completá los campos obligatorios');
      }
      const dep = departamentos.find(d => d.id === departamentoId);
      const payload = {
        departamento: dep ? dep.nro : String(departamentoId),
        inquilino,
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
        estado_id: estadoId || 'Act'
      };
      await api.post('/estadias', payload);
      toastSuccess('Estadía creada');
      router.replace('/calendar');
    } catch (e:any) {
      toastError('Error al crear la estadía');
      console.error(e);
    }
  }

  // ---- Modales "Agregar ..." ----
  const [showAddProp, setShowAddProp] = useState(false);
  const [pNombre, setPNombre] = useState(''); const [pDni, setPDni] = useState(''); const [pTel, setPTel] = useState('');

  const [showAddDep, setShowAddDep] = useState(false);
  const [dNro, setDNro] = useState(''); const [dPropId, setDPropId] = useState<number | ''>('');

  const [showAddEst, setShowAddEst] = useState(false);
  const [eId, setEId] = useState(''); const [eNombre, setENombre] = useState('');

  const [showAddTipo, setShowAddTipo] = useState(false);
  const [tId, setTId] = useState(''); const [tNombre, setTNombre] = useState('');

  async function saveProp(e: React.FormEvent) {
    e.preventDefault();
    await createProp({ nombre: pNombre, dni_cuit: pDni || null, telefono: pTel || null });
    setShowAddProp(false); setPNombre(''); setPDni(''); setPTel('');
  }
  async function saveDep(e: React.FormEvent) {
    e.preventDefault();
    await createDep({ nro: dNro, id_propietario: dPropId || null });
    setShowAddDep(false); setDNro(''); setDPropId('');
  }
  async function saveEst(e: React.FormEvent) {
    e.preventDefault();
    if (!eId || !eNombre) return;
    await createEst({ id: eId, nombre: eNombre });
    setShowAddEst(false); setEId(''); setENombre('');
  }
  async function saveTipo(e: React.FormEvent) {
    e.preventDefault();
    if (!tId || !tNombre) return;
    await createTipo({ id: tId, nombre: tNombre });
    setShowAddTipo(false); setTId(''); setTNombre('');
  }

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Nueva estadía</h1>

      <form className="space-y-4" onSubmit={submit}>
        {/* Departamento */}
        <div>
          <label className="block text-sm font-medium mb-1">Departamento *</label>
          <div className="flex gap-2">
            <select
              className="flex-1 border rounded-lg px-3 py-2"
              value={departamentoId}
              onChange={e => setDepartamentoId(e.target.value ? Number(e.target.value) : '')}
              required
            >
              <option value="">Seleccioná...</option>
              {depOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <button type="button" onClick={() => setShowAddDep(true)} className="px-3 py-2 rounded-lg bg-gray-100">Agregar</button>
          </div>
        </div>

        {/* Inquilino */}
        <div>
          <label className="block text-sm font-medium mb-1">Inquilino *</label>
          <input className="w-full border rounded-lg px-3 py-2" value={inquilino} onChange={e=>setInquilino(e.target.value)} required />
        </div>

        {/* Fechas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Desde *</label>
            <input type="date" className="w-full border rounded-lg px-3 py-2" value={fechaDesde} onChange={e=>setFechaDesde(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Hasta *</label>
            <input type="date" className="w-full border rounded-lg px-3 py-2" value={fechaHasta} onChange={e=>setFechaHasta(e.target.value)} required />
          </div>
        </div>

        {/* Estado */}
        <div>
          <label className="block text-sm font-medium mb-1">Estado</label>
          <div className="flex gap-2">
            <select
              className="flex-1 border rounded-lg px-3 py-2"
              value={estadoId}
              onChange={e => setEstadoId(e.target.value)}
            >
              <option value="">(por defecto: Act)</option>
              {estOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <button type="button" onClick={() => setShowAddEst(true)} className="px-3 py-2 rounded-lg bg-gray-100">Agregar</button>
          </div>
        </div>

        {/* Gestor rápido adicional: Tipos (no se usa en la estadía pero se puede cargar) */}
        <div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">¿Necesitás cargar un <b>Tipo</b> (catálogo global)?</span>
            <button type="button" onClick={() => setShowAddTipo(true)} className="px-3 py-2 rounded-lg bg-gray-100">Agregar tipo</button>
          </div>
        </div>

        <div className="pt-2">
          <button className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Crear estadía</button>
        </div>
      </form>

      {/* -------- Modales -------- */}
      {showAddProp && (
        <Modal onClose={()=>setShowAddProp(false)} title="Agregar propietario">
          <form onSubmit={saveProp} className="space-y-3">
            <div><label className="text-sm">Nombre *</label><input className="w-full border rounded px-3 py-2" value={pNombre} onChange={e=>setPNombre(e.target.value)} required /></div>
            <div><label className="text-sm">DNI/CUIT</label><input className="w-full border rounded px-3 py-2" value={pDni} onChange={e=>setPDni(e.target.value)} /></div>
            <div><label className="text-sm">Teléfono</label><input className="w-full border rounded px-3 py-2" value={pTel} onChange={e=>setPTel(e.target.value)} /></div>
            <div className="flex justify-end gap-2"><button type="button" onClick={()=>setShowAddProp(false)} className="px-3 py-2 rounded bg-gray-100">Cancelar</button><button className="px-3 py-2 rounded bg-green-600 text-white">Guardar</button></div>
          </form>
        </Modal>
      )}

      {showAddDep && (
        <Modal onClose={()=>setShowAddDep(false)} title="Agregar departamento">
          <form onSubmit={saveDep} className="space-y-3">
            <div><label className="text-sm">Nro *</label><input className="w-full border rounded px-3 py-2" value={dNro} onChange={e=>setDNro(e.target.value)} required /></div>
            <div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="text-sm">Propietario</label>
                  <select className="w-full border rounded px-3 py-2" value={dPropId} onChange={e=>setDPropId(e.target.value ? Number(e.target.value) : '')}>
                    <option value="">(sin propietario)</option>
                    {propietarios.map(p=> <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <button type="button" className="px-3 py-2 rounded bg-gray-100" onClick={()=>setShowAddProp(true)}>Nuevo propietario</button>
              </div>
            </div>
            <div className="flex justify-end gap-2"><button type="button" onClick={()=>setShowAddDep(false)} className="px-3 py-2 rounded bg-gray-100">Cancelar</button><button className="px-3 py-2 rounded bg-green-600 text-white">Guardar</button></div>
          </form>
        </Modal>
      )}

      {showAddEst && (
        <Modal onClose={()=>setShowAddEst(false)} title="Agregar estado">
          <form onSubmit={saveEst} className="space-y-3">
            <div><label className="text-sm">ID (corto) *</label><input className="w-full border rounded px-3 py-2" value={eId} onChange={e=>setEId(e.target.value)} placeholder="Act / Cerr / ..." required /></div>
            <div><label className="text-sm">Nombre *</label><input className="w-full border rounded px-3 py-2" value={eNombre} onChange={e=>setENombre(e.target.value)} required /></div>
            <div className="flex justify-end gap-2"><button type="button" onClick={()=>setShowAddEst(false)} className="px-3 py-2 rounded bg-gray-100">Cancelar</button><button className="px-3 py-2 rounded bg-green-600 text-white">Guardar</button></div>
          </form>
        </Modal>
      )}

      {showAddTipo && (
        <Modal onClose={()=>setShowAddTipo(false)} title="Agregar tipo">
          <form onSubmit={saveTipo} className="space-y-3">
            <div><label className="text-sm">ID (corto) *</label><input className="w-full border rounded px-3 py-2" value={tId} onChange={e=>setTId(e.target.value)} placeholder="Inqu / Prop / ..." required /></div>
            <div><label className="text-sm">Nombre *</label><input className="w-full border rounded px-3 py-2" value={tNombre} onChange={e=>setTNombre(e.target.value)} required /></div>
            <div className="flex justify-end gap-2"><button type="button" onClick={()=>setShowAddTipo(false)} className="px-3 py-2 rounded bg-gray-100">Cancelar</button><button className="px-3 py-2 rounded bg-green-600 text-white">Guardar</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose, title }:{ children: React.ReactNode; onClose:()=>void; title:string }) {
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
