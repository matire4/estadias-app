"use client"
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import { Plus, LogOut, Filter, X } from 'lucide-react'

interface Estadia {
  id: string
  departamento: string
  inquilino: string
  fecha_desde: string
  fecha_hasta: string
}

const BACKEND_URL = "https://estadias-app.onrender.com"

export default function Calendar() {
  const [estadias, setEstadias] = useState<Estadia[]>([])
  const [loading, setLoading] = useState(false)
  const [showFilter, setShowFilter] = useState(false)
  const [filterData, setFilterData] = useState({
    desde: '',
    hasta: ''
  })

  const { user, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    fetchEstadias()
  }, [])

  const fetchEstadias = async (filters: { desde?: string; hasta?: string } = {}) => {
    try {
      setLoading(true)
      let url = `${BACKEND_URL}/estadias`
      const params = new URLSearchParams()
      
      if (filters.desde) params.append('desde', filters.desde)
      if (filters.hasta) params.append('hasta', filters.hasta)
      
      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setEstadias(data)
      } else {
        console.error('Error al cargar las estadías')
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEventClick = (clickInfo: any) => {
    const estadiaId = clickInfo.event.id
    navigate(`/estadia/edit/${estadiaId}`)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault()
    fetchEstadias(filterData)
    setShowFilter(false)
  }

  const clearFilter = () => {
    setFilterData({ desde: '', hasta: '' })
    fetchEstadias()
    setShowFilter(false)
  }

  const calendarEvents = estadias.map(estadia => ({
    id: estadia.id,
    title: `${estadia.departamento} - ${estadia.inquilino}`,
    start: estadia.fecha_desde,
    end: estadia.fecha_hasta,
    backgroundColor: '#3b82f6',
    borderColor: '#2563eb'
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestión de Estadías</h1>
              <p className="text-sm text-gray-600">Bienvenido, {user?.name}</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowFilter(!showFilter)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filtrar
              </button>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Filter Panel */}
      {showFilter && (
        <div className="bg-white border-b shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <form onSubmit={handleFilter} className="flex items-end space-x-4">
              <div className="flex-1">
                <label htmlFor="filter_desde" className="block text-sm font-medium text-gray-700 mb-1">
                  Desde
                </label>
                <input
                  id="filter_desde"
                  name="desde"
                  type="date"
                  value={filterData.desde}
                  onChange={(e) => setFilterData(prev => ({ ...prev, desde: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="filter_hasta" className="block text-sm font-medium text-gray-700 mb-1">
                  Hasta
                </label>
                <input
                  id="filter_hasta"
                  name="hasta"
                  type="date"
                  value={filterData.hasta}
                  onChange={(e) => setFilterData(prev => ({ ...prev, hasta: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Filtrar
                </button>
                <button
                  type="button"
                  onClick={clearFilter}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Limpiar
                </button>
                <button
                  type="button"
                  onClick={() => setShowFilter(false)}
                  className="px-3 py-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Content */}
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
              height="auto"
              locale="es"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,dayGridWeek'
              }}
              buttonText={{
                today: 'Hoy',
                month: 'Mes',
                week: 'Semana'
              }}
              eventDisplay="block"
              dayMaxEvents={3}
              moreLinkText="más"
            />
          )}
        </div>
      </main>

      {/* Floating Action Button */}
      <button
        onClick={() => navigate('/estadia/new')}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  )
}
