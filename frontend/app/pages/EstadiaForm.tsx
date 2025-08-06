'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../context/AuthContext'

const BACKEND_URL = 'https://estadias-app.onrender.com'

export default function EstadiaForm() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useSearchParams()
  const editingId = params.get('id')

  const [formData, setFormData] = useState({
    departamento_id: '',
    inquilino: '',
    fecha_desde: '',
    fecha_hasta: '',
    cod_moneda: '',
    cotizacion: '',
    importe_total: '',
    concepto: '',
    cochera_id: '',
  })
  const [departamentos, setDepartamentos] = useState([])
  const [monedas, setMonedas] = useState([])
  const [cocheras, setCocheras] = useState([])

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) router.push('/login')
    fetchSelectOptions()
    if (editingId) fetchEstadia()
  }, [editingId, user])

  const fetchSelectOptions = async () => {
    try {
      const [res1, res2, res3] = await Promise.all([
        fetch(`${BACKEND_URL}/departamentos`),
        fetch(`${BACKEND_URL}/monedas`),
        fetch(`${BACKEND_URL}/cocheras`),
      ])
      const [dep, mon, coch] = await Promise.all([
        res1.json(),
        res2.json(),
        res3.json(),
      ])
      setDepartamentos(dep)
      setMonedas(mon)
      setCocheras(coch)
    } catch (err) {
      alert('Error cargando opciones')
    }
  }

  const fetchEstadia = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/estadias/${editingId}`)
      if (!res.ok) throw new Error('No encontrado')
      const data = await res.json()
      setFormData(data)
    } catch (err) {
      alert('Error cargando estadía')
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const url = editingId
      ? `${BACKEND_URL}/estadias/${editingId}`
      : `${BACKEND_URL}/estadias`
    const method = editingId ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error('Error al guardar')
      alert('Estadía guardada correctamente')
      router.push('/calendar')
    } catch (err) {
      alert('Error al guardar')
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">{editingId ? 'Editar' : 'Nueva'} Estadía</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <select name="departamento_id" value={formData.departamento_id} onChange={handleChange} required>
          <option value="">Seleccione un departamento</option>
          {departamentos.map((d) => (
            <option key={d.id} value={d.id}>{d.nro}</option>
          ))}
        </select>

        <input name="inquilino" value={formData.inquilino} onChange={handleChange} placeholder="Inquilino" required />

        <input type="date" name="fecha_desde" value={formData.fecha_desde} onChange={handleChange} required />
        <input type="date" name="fecha_hasta" value={formData.fecha_hasta} onChange={handleChange} required />

        <select name="cod_moneda" value={formData.cod_moneda} onChange={handleChange} required>
          <option value="">Seleccione moneda</option>
          {monedas.map((m) => (
            <option key={m.codigo} value={m.codigo}>{m.nombre}</option>
          ))}
        </select>

        <input type="number" name="cotizacion" value={formData.cotizacion} onChange={handleChange} placeholder="Cotización" required />
        <input type="number" name="importe_total" value={formData.importe_total} onChange={handleChange} placeholder="Importe Total" required />

        <input name="concepto" value={formData.concepto} onChange={handleChange} placeholder="Concepto u observaciones" />

        <select name="cochera_id" value={formData.cochera_id} onChange={handleChange}>
          <option value="">Seleccione cochera (opcional)</option>
          {cocheras.map((c) => (
            <option key={c.id} value={c.id}>Cochera {c.id}</option>
          ))}
        </select>

        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
          {editingId ? 'Actualizar' : 'Crear'} Estadía
        </button>
      </form>
    </div>
  )
}
