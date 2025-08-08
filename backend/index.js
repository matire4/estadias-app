// index.js completo adaptado con nuevos endpoints y estructura extendida
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
  ssl: { rejectUnauthorized: false },
});

// ========================
// CREACION DE TABLAS Y COLUMNAS (ALTER IF NOT EXISTS)
// ========================
const initDb = async () => {
  try {
    // Tablas base (sin columnas nuevas)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        clave VARCHAR(255) NOT NULL,
        rol VARCHAR(20) NOT NULL DEFAULT 'operador'
      );

      CREATE TABLE IF NOT EXISTS estados (
        id VARCHAR(10) PRIMARY KEY,
        nombre VARCHAR(50) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tipos (
        id VARCHAR(10) PRIMARY KEY,
        nombre VARCHAR(50) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS monedas (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(20) NOT NULL UNIQUE,
        simbolo VARCHAR(5),
        cotizacion DECIMAL(12,2) DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS propietarios (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        dni_cuit VARCHAR(20) UNIQUE,
        telefono VARCHAR(30)
      );

      CREATE TABLE IF NOT EXISTS departamentos (
        id SERIAL PRIMARY KEY,
        nro VARCHAR(20) NOT NULL,
        id_propietario INT REFERENCES propietarios(id)
      );

      CREATE TABLE IF NOT EXISTS cocheras (
        id SERIAL PRIMARY KEY,
        id_propietario INT REFERENCES propietarios(id)
      );

      CREATE TABLE IF NOT EXISTS estadias (
        id SERIAL PRIMARY KEY,
        departamento VARCHAR(50) NOT NULL,
        inquilino VARCHAR(100) NOT NULL,
        fecha_desde DATE NOT NULL,
        fecha_hasta DATE NOT NULL
      );

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

      CREATE TABLE IF NOT EXISTS observaciones (
        id SERIAL PRIMARY KEY,
        cod_estadia INT REFERENCES estadias(id) ON DELETE CASCADE,
        comentario TEXT NOT NULL,
        fecha DATE NOT NULL DEFAULT CURRENT_DATE,
        usuario_id INT REFERENCES usuarios(id)
      );

      INSERT INTO estados (id, nombre) VALUES ('Act', 'Activo'), ('Cerr', 'Cerrado')
        ON CONFLICT (id) DO NOTHING;

      INSERT INTO tipos (id, nombre) VALUES
        ('Inqu', 'Inquilino'),
        ('Prop', 'Propietario'),
        ('Publ', 'Publicidad'),
        ('Limp', 'Recepcion/Limpieza'),
        ('Comi', 'Comisión')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO monedas (nombre, simbolo, cotizacion) VALUES
        ('Pesos', '$', 1),
        ('Dólares', 'USD', 900)
      ON CONFLICT (nombre) DO NOTHING;
    `);

    // Agregar columnas a estadias si no existen
    await pool.query(`DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estadias' AND column_name='estado_id') THEN
        ALTER TABLE estadias ADD COLUMN estado_id VARCHAR(10);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estadias' AND column_name='usuario_id') THEN
        ALTER TABLE estadias ADD COLUMN usuario_id INT;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estadias' AND column_name='cod_moneda') THEN
        ALTER TABLE estadias ADD COLUMN cod_moneda INT;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estadias' AND column_name='cotizacion') THEN
        ALTER TABLE estadias ADD COLUMN cotizacion DECIMAL(12,2);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estadias' AND column_name='importe_total') THEN
        ALTER TABLE estadias ADD COLUMN importe_total DECIMAL(12,2);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estadias' AND column_name='concepto') THEN
        ALTER TABLE estadias ADD COLUMN concepto TEXT;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estadias' AND column_name='id_cochera') THEN
        ALTER TABLE estadias ADD COLUMN id_cochera INT;
      END IF;
    END $$;
    `);

    console.log("✅ Tablas verificadas/actualizadas en PostgreSQL");
  } catch (err) {
    console.error("❌ Error en initDb:", err.message);
  }
};

initDb();

const formatDateISO = (fecha) => {
  if (!fecha) return null;
  const date = new Date(fecha);
  return date.toISOString().split("T")[0];
};

// ========================
// ENDPOINTS DE ESTADIAS
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

app.post("/estadias", async (req, res) => {
  try {
    const {
      departamento,
      inquilino,
      fecha_desde,
      fecha_hasta,
      cod_moneda,
      cotizacion,
      importe_total,
      concepto,
      id_cochera
    } = req.body;

    const sql = `
      INSERT INTO estadias (departamento, inquilino, fecha_desde, fecha_hasta, estado_id, cod_moneda, cotizacion, importe_total, concepto, id_cochera)
      VALUES ($1, $2, $3, $4, 'Act', $5, $6, $7, $8, $9) RETURNING *`;

    const result = await pool.query(sql, [
      departamento,
      inquilino,
      fecha_desde,
      fecha_hasta,
      cod_moneda,
      cotizacion,
      importe_total,
      concepto,
      id_cochera
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error en POST /estadias:", err.message);
    res.status(500).json({ error: "Error al crear estadía" });
  }
});

app.put("/estadias/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      departamento,
      inquilino,
      fecha_desde,
      fecha_hasta,
      cod_moneda,
      cotizacion,
      importe_total,
      concepto,
      id_cochera
    } = req.body;

    const sql = `
      UPDATE estadias SET
        departamento = $1,
        inquilino = $2,
        fecha_desde = $3,
        fecha_hasta = $4,
        cod_moneda = $5,
        cotizacion = $6,
        importe_total = $7,
        concepto = $8,
        id_cochera = $9
      WHERE id = $10 RETURNING *`;

    const result = await pool.query(sql, [
      departamento,
      inquilino,
      fecha_desde,
      fecha_hasta,
      cod_moneda,
      cotizacion,
      importe_total,
      concepto,
      id_cochera,
      id
    ]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error en PUT /estadias:", err.message);
    res.status(500).json({ error: "Error al actualizar estadía" });
  }
});

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
// ENDPOINTS DE APOYO
// ========================

// Obtener departamentos con propietario
app.get("/departamentos", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.id, d.nro, p.nombre AS propietario
      FROM departamentos d
      LEFT JOIN propietarios p ON d.id_propietario = p.id
      ORDER BY d.id ASC`);
    res.json(result.rows);
  } catch (err) {
    console.error("Error en GET /departamentos:", err.message);
    res.status(500).json({ error: "Error al obtener departamentos" });
  }
});

// ========================
// INICIAR SERVIDOR
// ========================
app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});
