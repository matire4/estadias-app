"use client"

import { useState, useEffect } from "react"
import "./App.css"
import "materialize-css/dist/css/materialize.min.css"
import M from "materialize-css"

function App() {
  const [estadias, setEstadias] = useState([])
  const [formData, setFormData] = useState({
    departamento: "",
    inquilino: "",
    fecha_desde: "",
    fecha_hasta: "",
  })
  const [filterData, setFilterData] = useState({
    desde: "",
    hasta: "",
  })
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchEstadias()
    M.AutoInit()
  }, [])

  const fetchEstadias = async (filters = {}) => {
    try {
      setLoading(true)
      let url = "https://estadias-app.onrender.com/estadias"

      const params = new URLSearchParams()
      if (filters.desde) params.append("desde", filters.desde)
      if (filters.hasta) params.append("hasta", filters.hasta)

      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setEstadias(data)
      } else {
        M.toast({ html: "Error al cargar las estadías", classes: "red darken-2" })
      }
    } catch (error) {
      console.error("Error:", error)
      M.toast({ html: "Error de conexión", classes: "red darken-2" })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilterData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.departamento || !formData.inquilino || !formData.fecha_desde || !formData.fecha_hasta) {
      M.toast({ html: "Por favor completa todos los campos", classes: "orange darken-2" })
      return
    }

    if (new Date(formData.fecha_desde) >= new Date(formData.fecha_hasta)) {
      M.toast({ html: "La fecha desde debe ser anterior a la fecha hasta", classes: "orange darken-2" })
      return
    }

    try {
      const method = editingId ? "PUT" : "POST"
      const url = editingId
        ? `https://estadias-app.onrender.com/estadias/${editingId}`
        : "https://estadias-app.onrender.com/estadias"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        M.toast({
          html: editingId ? "Estadía actualizada exitosamente" : "Estadía creada exitosamente",
          classes: "green darken-2",
        })
        resetForm()
        fetchEstadias()
      } else {
        M.toast({ html: "Error al guardar la estadía", classes: "red darken-2" })
      }
    } catch (error) {
      console.error("Error:", error)
      M.toast({ html: "Error de conexión", classes: "red darken-2" })
    }
  }

  const handleEdit = (estadia) => {
    setFormData({
      departamento: estadia.departamento,
      inquilino: estadia.inquilino,
      fecha_desde: estadia.fecha_desde,
      fecha_hasta: estadia.fecha_hasta,
    })
    setEditingId(estadia.id)
  }

  const handleDelete = async (id) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar esta estadía?")) {
      try {
        const response = await fetch(`https://estadias-app.onrender.com/estadias/${id}`, {
          method: "DELETE",
        })

        if (response.ok) {
          M.toast({ html: "Estadía eliminada exitosamente", classes: "green darken-2" })
          fetchEstadias()
        } else {
          M.toast({ html: "Error al eliminar la estadía", classes: "red darken-2" })
        }
      } catch (error) {
        console.error("Error:", error)
        M.toast({ html: "Error de conexión", classes: "red darken-2" })
      }
    }
  }

  const resetForm = () => {
    setFormData({
      departamento: "",
      inquilino: "",
      fecha_desde: "",
      fecha_hasta: "",
    })
    setEditingId(null)
  }

  const handleFilter = (e) => {
    e.preventDefault()
    if (!filterData.desde && !filterData.hasta) {
      M.toast({ html: "Ingresa al menos una fecha para filtrar", classes: "orange darken-2" })
      return
    }
    fetchEstadias(filterData)
  }

  const clearFilter = () => {
    setFilterData({ desde: "", hasta: "" })
    fetchEstadias()
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("es-ES")
  }

  return (
    <div className="App">
      {/* Tu interfaz y contenido permanecen igual que antes */}
    </div>
  )
}

export default App
