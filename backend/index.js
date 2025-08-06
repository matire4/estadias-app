// index.js adaptado a PostgreSQL en Render
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Conexión a PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // necesario para Render
});

// Helper para formato ISO (para frontend React)
const formatDateISO = (fecha) => {
  if (!fecha) return null;
  const date = new Date(fecha);
  return date.toISOString().split("T")[0];
};

// ========================
// RUTAS ESTADÍAS
// ========================

// Obtener estadías (con filtro opcional de fechas)
app.get("/estadias", async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    let query = "SELECT * FROM estadias ORDER BY id ASC";
    const params = [];

    if (desde && hasta) {
      query = "SELECT * FROM estadias WHERE fecha_desde <= $1 AND fecha_hasta >= $2 ORDER BY id ASC";
      params.push(hasta, desde);
    }

    const result = await pool.query(query, params);
    const formateadas = result.rows.map((row) => ({
      ...row,
      fecha_desde: formatDateISO(row.fecha_desde),
      fecha_hasta: formatDateISO(row.fecha_hasta),
    }));

    res.json(formateadas);
  } catch (err) {
    console.error("Error en GET /estadias:", err.message);
    res.status(500).json({ error: "Error al obtener estadías" });
  }
});

// Crear estadía
app.post("/estadias", async (req, res) => {
  try {
    const { departamento, inquilino, fecha_desde, fecha_hasta } = req.body;
    const sql = `
      INSERT INTO estadias (departamento, inquilino, fecha_desde, fecha_hasta)
      VALUES ($1, $2, $3, $4) RETURNING *`;
    const result = await pool.query(sql, [
      departamento,
      inquilino,
      fecha_desde,
      fecha_hasta,
    ]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error en POST /estadias:", err.message);
    res.status(500).json({ error: "Error al crear estadía" });
  }
});

// Actualizar estadía
app.put("/estadias/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { departamento, inquilino, fecha_desde, fecha_hasta } = req.body;

    const sql = `
      UPDATE estadias
      SET departamento = $1, inquilino = $2, fecha_desde = $3, fecha_hasta = $4
      WHERE id = $5 RETURNING *`;
    const result = await pool.query(sql, [
      departamento,
      inquilino,
      fecha_desde,
      fecha_hasta,
      id,
    ]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error en PUT /estadias:", err.message);
    res.status(500).json({ error: "Error al actualizar estadía" });
  }
});

// Eliminar estadía
app.delete("/estadias/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM estadias WHERE id = $1", [id]);
    res.json({ deleted: true });
  } catch (err) {
    console.error("Error en DELETE /estadias:", err.message);
    res.status(500).json({ error: "Error al eliminar estadía" });
  }
});

// ========================
// INICIAR SERVIDOR
// ========================
app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});
