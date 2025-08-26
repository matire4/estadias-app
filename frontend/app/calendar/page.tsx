'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Plus, LogOut, Filter, X, Palette, Wallet } from 'lucide-react';

import { useMe } from '@/app/context/AuthContext';
import { api } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';

interface Estadia {
  id: number;
  departamento?: string;          // el backend puede enviar "departamento"
  departamento_codigo?: string;   // o "departamento_codigo"
  inquilino: string;
  fecha_desde: string;            // YYYY-MM-DD
  fecha_hasta: string;            // YYYY-MM-DD
}

type DeptColorMap = Record<string, string>;

/** --- colores --- */
function hashColor(key: string): string {
  const palette = [
    '#2563eb', '#16a34a', '#dc2626', '#7c3aed', '#ea580c',
    '#0891b2', '#4f46e5', '#65a30d', '#db2777', '#0ea5e9',
    '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#14b8a6'
  ];
  let h = 5381;
  for (let i = 0; i < key.length; i++) h = ((h << 5) + h) + key.charCodeAt(i);
  return palette[Math.abs(h) % palette.length];
}

/** --- fechas --- */
function addOneDay(yyyy_mm_dd: string): string {
  const d = new Date(yyyy_mm_dd + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isPast(est: Estadia): boolean {
  // gris si la estadía ya terminó: fecha_hasta < hoy
  const end = new Date(est.fecha_hasta + 'T23:59:59');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return end < today;
}

export default function CalendarPage() {
  const [estadias, setEstadias] = useState<Estadia[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [filterData, setFilterData] = useState<{ desde?: string; hasta?: string }>({ desde: '', hasta: '' });

  // colores
  const [showColors, setShowColors] = useState(false);
  const [deptColors, setDeptColors] = useState<DeptColorMap>({});

  const { me, logout } = useMe();
  const router = useRouter();

  // cargar colores guardados
  useEffect(() => {
    try {
      const raw = localStorage.getItem('deptColors');
      if (raw) setDeptColors(JSON.parse(raw));
    } catch {}
  }, []);
  // persistir colores
  useEffect(() => {
    try { localStorage.setItem('deptColors', JSON.stringify(deptColors)); } catch {}
  }, [deptColors]);

  useEffect(() => { fetchEstadias(); }, []);

  async function fetchEstadias(filters: { desde?: string; hasta?: string } = {}) {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.desde) params.append('desde', filters.desde);
      if (filters.hasta) params.append('hasta', filters.hasta);
      const path = `/estadias${params.toString() ? `?${params.toString()}` : ''}`;
      const data = await api.get<Estadia[]>(path);
      setEstadias(data);
    } catch (error) {
      console.error('Error al cargar las estadías', error);
      toastError('No se pudieron cargar las estadías');
    } finally {
      setLoading(false);
    }
  }

  const handleEventClick = (clickInfo: any) => {
    const estadiaId = clickInfo.event.id;
    router.push(`/estadia/edit/${estadiaId}`);
  };

  async function confirmAndDelete(id: string) {
    const ok = window.confirm('¿Eliminar esta estadía? Esta acción no se puede deshacer.');
    if (!ok) return;
    try {
      await api.del(`/estadias/${id}`);
      toastSuccess('Estadía eliminada');
      await fetchEstadias(filterData);
    } catch (e: any) {
      console.error(e);
      toastError('No se pudo eliminar la estadía');
    }
  }

  function renderEventContent(arg: any) {
    return (
      <div className="relative pr-6">
        <div className="font-medium">{arg.event.title}</div>
        <button
          title="Eliminar"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            confirmAndDelete(String(arg.event.id));
          }}
          className="absolute right-0 top-1/2 -translate-y-1/2 text-xs px-1 rounded hover:bg-red-100"
        >
          🗑
        </button>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.push('/login'); // redirección inmediata
  };

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEstadias(filterData);
    setShowFilter(false);
  };

  const clearFilter = () => {
    setFilterData({ desde: '', hasta: '' });
    fetchEstadias();
    setShowFilter(false);
  };

  // códigos presentes en la grilla
  const deptCodes = useMemo(() => {
    const set = new Set<string>();
    estadias.forEach(e => {
      const code = e.departamento_codigo || e.departamento;
      if (code) set.add(code);
    });
    return Array.from(set).sort();
  }, [estadias]);

  // eventos: color manual/hash + gris si terminó + “hasta” inclusiva
  const calendarEvents = useMemo(() => {
    return estadias.map((e) => {
      const dep = e.departamento_codigo || e.departamento || '—';
      const baseColor = deptColors[dep] || hashColor(dep);
      const color = isPast(e) ? '#9CA3AF' : baseColor; // gris si ya terminó
      return {
        id: String(e.id),
        title: `${dep} - ${e.inquilino}`,
        start: e.fecha_desde,
        end: addOneDay(e.fecha_hasta),   // ← inclusivo en FullCalendar
        allDay: true,
        backgroundColor: color,
        borderColor: color,
      };
    });
  }, [estadias, deptColors]);

  function updateDeptColor(code: string, color: string) {
    setDeptColors(prev => ({ ...prev, [code]: color }));
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestión de Estadías</h1>
              <p className="text-sm text-gray-600">Bienvenido, {me?.nombre || me?.email || '—'}</p>
            </div>
            <div className="flex items-center space-x-2">
              {/* Colores */}
              <button
                onClick={() => setShowColors(v => !v)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50"
                title="Colores por departamento"
              >
                <Palette className="w-4 h-4 mr-2" />
                Colores
              </button>

              {/* Filtros */}
              <button
                onClick={() => setShowFilter(!showFilter)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filtrar
              </button>

              {/* Agregar movimiento */}
              <button
                onClick={() => router.push('/movimientos/new')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Wallet className="w-4 h-4 mr-2" />
                Agregar movimiento
              </button>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      {showFilter && (
        <div className="bg-white border-b shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <form onSubmit={handleFilter} className="flex items-end space-x-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
                <input
                  type="date"
                  value={filterData.desde}
                  onChange={(e) => setFilterData((p) => ({ ...p, desde: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
                <input
                  type="date"
                  value={filterData.hasta}
                  onChange={(e) => setFilterData((p) => ({ ...p, hasta: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex space-x-2">
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Filtrar</button>
                <button type="button" onClick={clearFilter} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">Limpiar</button>
                <button type="button" onClick={() => setShowFilter(false)} className="px-3 py-2 text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showColors && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex flex-wrap gap-4 items-center">
              {deptCodes.length === 0 ? (
                <span className="text-sm text-gray-500">No hay departamentos en el rango actual.</span>
              ) : deptCodes.map(code => (
                <label key={code} className="flex items-center gap-2 text-sm">
                  <span className="w-16 font-medium">{code}</span>
                  <input
                    type="color"
                    value={deptColors[code] || hashColor(code)}
                    onChange={(e) => updateDeptColor(code, e.target.value)}
                    className="h-8 w-12 cursor-pointer"
                    title={`Color para ${code}`}
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          {loading ? (
            <div className="flex justify-center items-center h-96">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              events={calendarEvents}
              eventClick={handleEventClick}
              eventContent={renderEventContent}
              height="auto"
              locale="es"
              headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,dayGridWeek' }}
              buttonText={{ today: 'Hoy', month: 'Mes', week: 'Semana' }}
              eventDisplay="block"
              dayMaxEvents={3}
              moreLinkText="más"
            />
          )}
        </div>
      </main>

      {/* Botón flotante: nueva estadía */}
      <button
        onClick={() => router.push('/estadia/new')}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
