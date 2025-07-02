"use client"

import { useState, useEffect } from "react"
import "./App.css"
import "materialize-css/dist/css/materialize.min.css"
import M from "materialize-css"

const BACKEND_URL = "https://estadias-app.onrender.com"

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
      let url = `${BACKEND_URL}/estadias`

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
        ? `${BACKEND_URL}/estadias/${editingId}`
        : `${BACKEND_URL}/estadias`

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
        const response = await fetch(`${BACKEND_URL}/estadias/${id}`, {
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
      <div className="container">
        <div className="main-content">
          <h3 className="center-align title">Gestión de Estadías</h3>

          {/* Formulario Principal */}
          <div className="form-container">
            <h5>{editingId ? "Editar Estadía" : "Nueva Estadía"}</h5>
            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="input-field col s12 m6">
                  <input
                    id="departamento"
                    name="departamento"
                    type="text"
                    value={formData.departamento}
                    onChange={handleInputChange}
                    required
                  />
                  <label htmlFor="departamento" className={formData.departamento ? "active" : ""}>
                    Departamento
                  </label>
                </div>
                <div className="input-field col s12 m6">
                  <input
                    id="inquilino"
                    name="inquilino"
                    type="text"
                    value={formData.inquilino}
                    onChange={handleInputChange}
                    required
                  />
                  <label htmlFor="inquilino" className={formData.inquilino ? "active" : ""}>
                    Inquilino
                  </label>
                </div>
              </div>
              <div className="row">
                <div className="input-field col s12 m6">
                  <input
                    id="fecha_desde"
                    name="fecha_desde"
                    type="date"
                    value={formData.fecha_desde}
                    onChange={handleInputChange}
                    required
                  />
                  <label htmlFor="fecha_desde" className="active">
                    Fecha Desde
                  </label>
                </div>
                <div className="input-field col s12 m6">
                  <input
                    id="fecha_hasta"
                    name="fecha_hasta"
                    type="date"
                    value={formData.fecha_hasta}
                    onChange={handleInputChange}
                    required
                  />
                  <label htmlFor="fecha_hasta" className="active">
                    Fecha Hasta
                  </label>
                </div>
              </div>
              <div className="row">
                <div className="col s12 center-align">
                  <button className="btn primary-btn waves-effect waves-light" type="submit">
                    {editingId ? "Actualizar" : "Crear"}
                  </button>
                  <button
                    className="btn secondary-btn waves-effect waves-light"
                    type="button"
                    onClick={resetForm}
                    style={{ marginLeft: "10px" }}
                  >
                    {editingId ? "Cancelar" : "Limpiar"}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Filtro */}
          <div className="form-container">
            <h5>Filtrar por Fecha</h5>
            <form onSubmit={handleFilter}>
              <div className="row">
                <div className="input-field col s12 m6">
                  <input
                    id="filter_desde"
                    name="desde"
                    type="date"
                    value={filterData.desde}
                    onChange={handleFilterChange}
                  />
                  <label htmlFor="filter_desde" className="active">
                    Desde (opcional)
                  </label>
                </div>
                <div className="input-field col s12 m6">
                  <input
                    id="filter_hasta"
                    name="hasta"
                    type="date"
                    value={filterData.hasta}
                    onChange={handleFilterChange}
                  />
                  <label htmlFor="filter_hasta" className="active">
                    Hasta (opcional)
                  </label>
                </div>
              </div>
              <div className="row">
                <div className="col s12 center-align">
                  <button className="btn primary-btn waves-effect waves-light" type="submit">
                    Buscar por fecha
                  </button>
                  <button
                    className="btn secondary-btn waves-effect waves-light"
                    type="button"
                    onClick={clearFilter}
                    style={{ marginLeft: "10px" }}
                  >
                    Limpiar filtro
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Tabla de estadías */}
          <div className="table-container">
            <h5>Estadías Registradas ({estadias.length})</h5>
            {loading ? (
              <div className="center-align">
                <div className="preloader-wrapper active">
                  <div className="spinner-layer spinner-primary-only">
                    <div className="circle-clipper left">
                      <div className="circle"></div>
                    </div>
                    <div className="gap-patch">
                      <div className="circle"></div>
                    </div>
                    <div className="circle-clipper right">
                      <div className="circle"></div>
                    </div>
                  </div>
                </div>
              </div>
            ) : estadias.length === 0 ? (
              <p className="center-align grey-text">No hay estadías registradas</p>
            ) : (
              <div className="table-responsive">
                <table className="striped responsive-table">
                  <thead>
                    <tr>
                      <th>Departamento</th>
                      <th>Inquilino</th>
                      <th>Fecha Desde</th>
                      <th>Fecha Hasta</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estadias.map((estadia) => (
                      <tr key={estadia.id}>
                        <td>{estadia.departamento}</td>
                        <td>{estadia.inquilino}</td>
                        <td>{formatDate(estadia.fecha_desde)}</td>
                        <td>{formatDate(estadia.fecha_hasta)}</td>
                        <td>
                          <button
                            className="btn-small primary-btn waves-effect waves-light"
                            onClick={() => handleEdit(estadia)}
                            style={{ marginRight: "5px" }}
                          >
                            Editar
                          </button>
                          <button
                            className="btn-small danger-btn waves-effect waves-light"
                            onClick={() => handleDelete(estadia.id)}
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
