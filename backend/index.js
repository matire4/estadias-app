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

// ========================
// CREACIÓN AUTOMÁTICA DE TABLAS
// ========================
const initDb = async () => {
  try {
    const script = `
      -- Usuarios
      CREATE TABLE IF NOT EXISTS usuarios (
          id SERIAL PRIMARY KEY,
          nombre VARCHAR(100) NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          clave VARCHAR(255) NOT NULL,
          rol VARCHAR(20) NOT NULL DEFAULT 'operador'
      );

      -- Estados
      CREATE TABLE IF NOT EXISTS estados (
          id VARCHAR(10) PRIMARY KEY,
          nombre VARCHAR(50) NOT NULL
      );

      -- Tipos de movimientos
      CREATE TABLE IF NOT EXISTS tipos (
          id VARCHAR(10) PRIMARY KEY,
          nombre VARCHAR(50) NOT NULL
      );

      -- Monedas
      CREATE TABLE IF NOT EXISTS monedas (
          id SERIAL PRIMARY KEY,
          nombre VARCHAR(20) NOT NULL,
          simbolo VARCHAR(5),
          cotizacion DECIMAL(12,2) DEFAULT 1
      );

      -- Estadías
      CREATE TABLE IF NOT EXISTS estadias (
          id SERIAL PRIMARY KEY,
          departamento VARCHAR(50) NOT NULL,
          inquilino VARCHAR(100) NOT NULL,
          fecha_desde DATE NOT NULL,
          fecha_hasta DATE NOT NULL,
          estado_id VARCHAR(10) REFERENCES estados(id),
          usuario_id INT REFERENCES usuarios(id)
      );

      -- Movimientos
      CREATE TABLE IF NOT EXISTS movimientos (
          id SERIAL PRIMARY KEY,
          cod_estadia INT REFERENCES estadias(id) ON DELETE CASCADE,
          cod_tipo VARCHAR(10) REFERENCES tipos(id),
          cod_moneda INT REFERENCES monedas(id),
          importe DECIMAL(12,2) NOT NULL,
          cotizacion DECIMAL(12,2) NOT NULL DEFAULT 1,
          concepto TEXT,
          fecha DATE NOT NULL DEFAULT CURRENT_DATE,
          usuario_id INT REFERENCES usuarios(id)
      );

      -- Observaciones
      CREATE TABLE IF NOT EXISTS observaciones (
          id SERIAL PRIMARY KEY,
          cod_estadia INT REFERENCES estadias(id) ON DELETE CASCADE,
          comentario TEXT NOT NULL,
          fecha DATE NOT NULL DEFAULT CURRENT_DATE,
          usuario_id INT REFERENCES usuarios(id)
      );

      -- Datos iniciales
      INSERT INTO estados (id, nombre)
      VALUES ('Act', 'Activo'), ('Cerr', 'Cerrado')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO tipos (id, nombre)
      VALUES ('Inqu', 'Inquilino'),
             ('Prop', 'Propietario'),
             ('Publ', 'Publicidad'),
             ('Limp', 'Recepcion/Limpieza'),
             ('Comi', 'Comisión')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO monedas (nombre, simbolo, cotizacion)
      VALUES ('Pesos', '$', 1),
             ('Dólares', 'USD', 900)
      ON CONFLICT (nombre) DO NOTHING;
    `;

    await pool.query(script);
    console.log("✅ Tablas verificadas/creadas en PostgreSQL");
  } catch (err) {
    console.error("❌ Error creando tablas:", err.message);
  }
};

initDb();

// ========================
// Helper para fechas
// ========================
const formatDateISO = (fecha) => {
  if (!fecha) return null;
  const date = new Date(fecha);
  return date.toISOString().split("T")[0];
};

// ========================
// RUTAS ESTADÍAS
// ========================
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
      INSERT INTO estadias (departamento, inquilino, fecha_desde, fecha_hasta, estado_id)
      VALUES ($1, $2, $3, $4, 'Act') RETURNING *`;
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
