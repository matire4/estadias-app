// index.js — backend adaptado a esquema nuevo con recreación opcional de BD
require('dotenv').config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const ExcelJS = require('exceljs');



const app = express();
const PORT = process.env.PORT || 3001;

// --- CORS seguro (localhost, Render, Vercel) ---
const ALLOWLIST = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://estadias-app.onrender.com",
  "https://estadias-app-8tam.vercel.app",
];
const corsOptions = {
  origin(origin, cb) {
    // permitir llamadas sin Origin (Postman/cURL)
    if (!origin) return cb(null, true);
    if (
      ALLOWLIST.includes(origin) ||
      /https:\/\/.*-.*\.vercel\.app$/.test(origin) // previews de Vercel opcionales
    ) {
      return cb(null, true);
    }
    return cb(new Error(`CORS bloqueado para ${origin}`), false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));
app.use(express.json());

// ========================
// Conexión a PostgreSQL
// ========================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ========================
// Utils auth
// ========================
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "2h";

function signJwt(user) {
  return jwt.sign(
    { uid: user.id, email: user.email, rol: user.rol, nombre: user.nombre },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}
function authMiddleware(req, _res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  req.token = token;
  next();
}
function requireAuth(req, res, next) {
  try {
    if (!req.token) return res.status(401).json({ error: "Falta token" });
    const payload = jwt.verify(req.token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ error: "Token inválido" });
  }
}
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "No autenticado" });
    if (req.user.rol !== role) return res.status(403).json({ error: "Acceso denegado" });
    return next();
  };
}
const formatDateISO = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);

// ========================
// RECREATE SCHEMA (opcional por env var)
// ========================
async function recreateSchema() {
  const sql = `
  BEGIN;

  DROP TABLE IF EXISTS observaciones CASCADE;
  DROP TABLE IF EXISTS movimientos   CASCADE;
  DROP TABLE IF EXISTS estadias      CASCADE;
  DROP TABLE IF EXISTS cocheras      CASCADE;
  DROP TABLE IF EXISTS departamentos CASCADE;
  DROP TABLE IF EXISTS propietarios  CASCADE;
  DROP TABLE IF EXISTS tipos         CASCADE;
  DROP TABLE IF EXISTS estados       CASCADE;
  DROP TABLE IF EXISTS usuarios      CASCADE;

  DO $$
  BEGIN
    CREATE EXTENSION IF NOT EXISTS btree_gist;
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'Sin privilegios para CREATE EXTENSION btree_gist. Se omite.';
  END $$;

  CREATE TABLE usuarios (
    id     SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email  VARCHAR(100) NOT NULL UNIQUE,
    clave  VARCHAR(255) NOT NULL,
    rol    VARCHAR(20)  NOT NULL DEFAULT 'operador'
  );

  CREATE TABLE estados (
    id     VARCHAR(10) PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL
  );

  CREATE TABLE tipos (
    id     VARCHAR(25) PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL
  );

  CREATE TABLE propietarios (
    id        SERIAL PRIMARY KEY,
    nombre    VARCHAR(100) NOT NULL,
    dni_cuit  VARCHAR(20) UNIQUE,
    telefono  VARCHAR(30)
  );

  CREATE TABLE departamentos (
    id             SERIAL PRIMARY KEY,
    codigo         TEXT NOT NULL UNIQUE,
    id_propietario INT REFERENCES propietarios(id) ON DELETE SET NULL
  );

  CREATE TABLE cocheras (
    id             SERIAL PRIMARY KEY,
    codigo         TEXT NOT NULL UNIQUE,
    id_propietario INT REFERENCES propietarios(id) ON DELETE SET NULL
  );

  CREATE TABLE estadias (
    id                     SERIAL PRIMARY KEY,
    departamento_id        INT  NOT NULL REFERENCES departamentos(id) ON DELETE RESTRICT,
    cochera_id             INT       REFERENCES cocheras(id)        ON DELETE SET NULL,
    inquilino              VARCHAR(100) NOT NULL,
    fecha_desde            DATE NOT NULL,
    fecha_hasta            DATE NOT NULL,
    estado_id              VARCHAR(10) NOT NULL REFERENCES estados(id),
    usuario_id             INT REFERENCES usuarios(id) ON DELETE SET NULL,

    importe_total_ars        NUMERIC(12,2),
    importe_total_usd        NUMERIC(12,2),

    importe_inquilino_ars    NUMERIC(12,2),
    importe_inquilino_usd    NUMERIC(12,2),
    importe_propietario_ars  NUMERIC(12,2),
    importe_propietario_usd  NUMERIC(12,2),

    importe_limpieza_ars     NUMERIC(12,2),
    importe_limpieza_usd     NUMERIC(12,2),
    importe_recepcion_ars    NUMERIC(12,2),
    importe_recepcion_usd    NUMERIC(12,2),
    importe_comision_ars     NUMERIC(12,2),
    importe_comision_usd     NUMERIC(12,2),
    importe_publicidad_ars   NUMERIC(12,2),
    importe_publicidad_usd   NUMERIC(12,2),

    cotizacion             NUMERIC(12,2) NOT NULL CHECK (cotizacion > 0),

    concepto               TEXT,

    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX idx_estadias_rango   ON estadias (departamento_id, fecha_desde, fecha_hasta);
  CREATE INDEX idx_estadias_estado  ON estadias (estado_id);
  CREATE INDEX idx_estadias_usuario ON estadias (usuario_id);

  DO $$
  BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'btree_gist') THEN
      ALTER TABLE estadias
        ADD CONSTRAINT no_overlap_departamento
        EXCLUDE USING GIST (
          departamento_id WITH =,
          daterange(fecha_desde, fecha_hasta, '[]') WITH &&
        );
    ELSE
      RAISE NOTICE 'btree_gist no disponible: no se crea EXCLUDE.';
    END IF;
  END $$;

  CREATE OR REPLACE FUNCTION set_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  CREATE TRIGGER tg_estadias_updated
  BEFORE UPDATE ON estadias
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

  CREATE TABLE movimientos (
    id           SERIAL PRIMARY KEY,
    cod_tipo     VARCHAR(25) REFERENCES tipos(id),
    importe_ars  NUMERIC(12,2),
    importe_usd  NUMERIC(12,2),
    cotizacion   NUMERIC(12,2) NOT NULL DEFAULT 1 CHECK (cotizacion > 0),
    concepto     TEXT,
    fecha        DATE NOT NULL DEFAULT CURRENT_DATE,
    usuario_id   INT REFERENCES usuarios(id) ON DELETE SET NULL
  );

  CREATE INDEX idx_mov_fecha ON movimientos (fecha);
  CREATE INDEX idx_mov_tipo  ON movimientos (cod_tipo);

  CREATE TABLE observaciones (
    id          SERIAL PRIMARY KEY,
    cod_estadia INT REFERENCES estadias(id) ON DELETE CASCADE,
    comentario  TEXT NOT NULL,
    fecha       DATE NOT NULL DEFAULT CURRENT_DATE,
    usuario_id  INT REFERENCES usuarios(id) ON DELETE SET NULL
  );

  INSERT INTO estados (id, nombre) VALUES
    ('Act',  'Activo'),
    ('Cerr', 'Cerrado');

  INSERT INTO tipos (id, nombre) VALUES
    ('Inqu', 'Inquilino'),
    ('Prop', 'Propietario'),
    ('Publ', 'Publicidad'),
    ('Limp', 'Limpieza'),
    ('Rece', 'Recepcion'),
    ('Comi', 'Comisión');

  COMMIT;
  `;
  await pool.query(sql);
  console.log("✅ Esquema recreado OK");
}

// ========================
// Endpoints
// ========================
app.get("/", (_req, res) => res.json({ ok: true, service: "backend-estadias" })); // sanity-check

app.get("/health", async (_req, res) => {
  try {
    const r = await pool.query("SELECT 1 AS ok");
    res.json({ status: "ok", db: r.rows[0].ok === 1 ? "ok" : "fail" });
  } catch (e) {
    res.status(500).json({ status: "fail", error: e.message });
  }
});

// AUTH / SETUP
app.get("/auth/setup-required", async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT COUNT(*)::int AS c FROM usuarios");
    res.json({ setup: rows[0].c === 0 });
  } catch {
    res.status(500).json({ error: "Error verificando usuarios" });
  }
});
app.post("/auth/setup", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT COUNT(*)::int AS c FROM usuarios");
    if (rows[0].c > 0) return res.status(400).json({ error: "Ya hay usuarios" });

    const { nombre, email, password } = req.body || {};
    if (!nombre || !email || !password) return res.status(400).json({ error: "Faltan campos" });

    const hash = await bcrypt.hash(password, 10);
    const ins = await pool.query(
      `INSERT INTO usuarios (nombre, email, clave, rol)
       VALUES ($1, $2, $3, 'programador')
       RETURNING id, nombre, email, rol`,
      [nombre, email, hash]
    );
    const user = ins.rows[0];
    const token = signJwt(user);
    res.status(201).json({ token, user });
  } catch (e) {
    res.status(500).json({ error: "Error creando usuario" });
  }
});
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "Email y password requeridos" });

    const { rows } = await pool.query(
      "SELECT id, nombre, email, clave, rol FROM usuarios WHERE email = $1",
      [email]
    );
    if (rows.length === 0) return res.status(401).json({ error: "Credenciales inválidas" });

    const u = rows[0];
    const ok = await bcrypt.compare(password, u.clave);
    if (!ok) return res.status(401).json({ error: "Credenciales inválidas" });

    const token = signJwt(u);
    res.json({ token, user: { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol } });
  } catch (e) {
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});
app.get("/auth/verify", authMiddleware, (req, res) => {
  try {
    if (!req.token) return res.status(401).json({ ok: false });
    const payload = jwt.verify(req.token, JWT_SECRET);
    res.json({ ok: true, user: payload });
  } catch {
    res.status(401).json({ ok: false });
  }
});

// USERS
app.get("/users", authMiddleware, requireAuth, async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT id, nombre, email, rol FROM usuarios ORDER BY id ASC");
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Error listando usuarios" });
  }
});
app.post("/users", authMiddleware, requireAuth, requireRole("programador"), async (req, res) => {
  try {
    const { nombre, email, rol, password } = req.body || {};
    if (!nombre || !email || !rol || !password) return res.status(400).json({ error: "Faltan campos" });
    if (!["normal", "admin", "programador"].includes(rol)) return res.status(400).json({ error: "Rol inválido" });

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO usuarios (nombre, email, clave, rol)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nombre, email, rol`,
      [nombre, email, hash, rol]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    if (String(e.message).toLowerCase().includes("unique")) return res.status(409).json({ error: "Email ya existe" });
    res.status(500).json({ error: "Error creando usuario" });
  }
});
app.put("/users/:id", authMiddleware, requireAuth, requireRole("programador"), async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, rol, password } = req.body || {};
    if (!nombre || !email || !rol) return res.status(400).json({ error: "Faltan campos" });
    if (!["normal", "admin", "programador"].includes(rol)) return res.status(400).json({ error: "Rol inválido" });

    if (password) {
      const hash = await bcrypt.hash(password, 10);
      const { rows } = await pool.query(
        `UPDATE usuarios SET nombre=$1, email=$2, rol=$3, clave=$4 WHERE id=$5
         RETURNING id, nombre, email, rol`,
        [nombre, email, rol, hash, id]
      );
      return res.json(rows[0]);
    } else {
      const { rows } = await pool.query(
        `UPDATE usuarios SET nombre=$1, email=$2, rol=$3 WHERE id=$4
         RETURNING id, nombre, email, rol`,
        [nombre, email, rol, id]
      );
      return res.json(rows[0]);
    }
  } catch {
    res.status(500).json({ error: "Error actualizando usuario" });
  }
});
app.delete("/users/:id", authMiddleware, requireAuth, requireRole("programador"), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM usuarios WHERE id=$1", [id]);
    res.json({ deleted: true });
  } catch {
    res.status(500).json({ error: "Error eliminando usuario" });
  }
});

// CATÁLOGOS: propietarios, departamentos, cocheras, estados, tipos
app.get("/propietarios", authMiddleware, requireAuth, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, nombre, dni_cuit, telefono FROM propietarios ORDER BY nombre ASC"
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Error listando propietarios" });
  }
});
app.post("/propietarios", authMiddleware, requireAuth, async (req, res) => {
  try {
    const { nombre, dni_cuit, telefono } = req.body || {};
    if (!nombre) return res.status(400).json({ error: "Falta nombre" });
    const { rows } = await pool.query(
      `INSERT INTO propietarios (nombre, dni_cuit, telefono)
       VALUES ($1, $2, $3)
       RETURNING id, nombre, dni_cuit, telefono`,
      [nombre, dni_cuit || null, telefono || null]
    );
    res.status(201).json(rows[0]);
  } catch {
    res.status(500).json({ error: "Error creando propietario" });
  }
});

// Departamentos: GET público (tu front lo usa sin token), POST protegido
app.get("/departamentos", async (_req, res) => {
  try {
    const q = `
      SELECT d.id, d.codigo, d.id_propietario,
             p.nombre AS propietario_nombre
      FROM departamentos d
      LEFT JOIN propietarios p ON p.id = d.id_propietario
      ORDER BY d.codigo ASC`;
    const r = await pool.query(q);
    res.json(r.rows);
  } catch {
    res.status(500).json({ error: "Error al obtener departamentos" });
  }
});
app.post("/departamentos", authMiddleware, requireAuth, async (req, res) => {
  try {
    const { codigo, id_propietario } = req.body || {};
    if (!codigo) return res.status(400).json({ error: "Falta codigo" });
    const { rows } = await pool.query(
      `INSERT INTO departamentos (codigo, id_propietario)
       VALUES ($1, $2) RETURNING id, codigo, id_propietario`,
      [codigo, id_propietario || null]
    );
    res.status(201).json(rows[0]);
  } catch {
    res.status(500).json({ error: "Error creando departamento" });
  }
});

// Cocheras
app.get("/cocheras", authMiddleware, requireAuth, async (_req, res) => {
  try {
    const q = `
      SELECT c.id, c.codigo, c.id_propietario,
             p.nombre AS propietario_nombre
      FROM cocheras c
      LEFT JOIN propietarios p ON p.id = c.id_propietario
      ORDER BY c.codigo ASC`;
    const r = await pool.query(q);
    res.json(r.rows);
  } catch {
    res.status(500).json({ error: "Error al obtener cocheras" });
  }
});
app.post("/cocheras", authMiddleware, requireAuth, async (req, res) => {
  try {
    const { codigo, id_propietario } = req.body || {};
    if (!codigo) return res.status(400).json({ error: "Falta codigo" });
    const { rows } = await pool.query(
      `INSERT INTO cocheras (codigo, id_propietario)
       VALUES ($1, $2) RETURNING id, codigo, id_propietario`,
      [codigo, id_propietario || null]
    );
    res.status(201).json(rows[0]);
  } catch {
    res.status(500).json({ error: "Error creando cochera" });
  }
});

// Estados/Tipos
app.get("/estados", authMiddleware, requireAuth, async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT id, nombre FROM estados ORDER BY nombre ASC");
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Error listando estados" });
  }
});
app.post("/estados", authMiddleware, requireAuth, async (req, res) => {
  try {
    const { id, nombre } = req.body || {};
    if (!id || !nombre) return res.status(400).json({ error: "Faltan id y nombre" });
    const { rows } = await pool.query(
      `INSERT INTO estados (id, nombre)
       VALUES ($1, $2)
       ON CONFLICT (id) DO NOTHING
       RETURNING id, nombre`,
      [id, nombre]
    );
    if (rows.length === 0) return res.status(409).json({ error: "El estado ya existe" });
    res.status(201).json(rows[0]);
  } catch {
    res.status(500).json({ error: "Error creando estado" });
  }
});
app.get("/tipos", authMiddleware, requireAuth, async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT id, nombre FROM tipos ORDER BY nombre ASC");
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Error listando tipos" });
  }
});
app.post("/tipos", authMiddleware, requireAuth, async (req, res) => {
  try {
    const { id, nombre } = req.body || {};
    if (!id || !nombre) return res.status(400).json({ error: "Faltan id y nombre" });
    const { rows } = await pool.query(
      `INSERT INTO tipos (id, nombre)
       VALUES ($1, $2)
       ON CONFLICT (id) DO NOTHING
       RETURNING id, nombre`,
      [id, nombre]
    );
    if (rows.length === 0) return res.status(409).json({ error: "El tipo ya existe" });
    res.status(201).json(rows[0]);
  } catch {
    res.status(500).json({ error: "Error creando tipo" });
  }
});

// ========================
// MOVIMIENTOS
// ========================

// GET /movimientos?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&cod_tipo=Inqu
app.get("/movimientos", authMiddleware, requireAuth, async (req, res) => {
  try {
    const { desde, hasta, cod_tipo } = req.query;
    const params = [];
    const where = [];

    if (desde) { params.push(desde); where.push(`m.fecha >= $${params.length}`); }
    if (hasta) { params.push(hasta); where.push(`m.fecha <= $${params.length}`); }
    if (cod_tipo) { params.push(cod_tipo); where.push(`m.cod_tipo = $${params.length}`); }

    const sql = `
      SELECT m.id, m.cod_tipo, t.nombre AS tipo_nombre,
             m.importe_ars, m.importe_usd, m.cotizacion, m.concepto,
             m.fecha, m.usuario_id, m.propietario_id,
             u.nombre AS usuario_nombre,
             p.nombre AS propietario_nombre
      FROM movimientos m
      LEFT JOIN tipos t ON t.id = m.cod_tipo
      LEFT JOIN usuarios u ON u.id = m.usuario_id
      LEFT JOIN propietarios p ON p.id = m.propietario_id
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY m.fecha DESC, m.id DESC
    `;

    const r = await pool.query(sql, params);
    const rows = r.rows.map(row => ({
      ...row,
      fecha: formatDateISO(row.fecha),
    }));
    res.json(rows);
  } catch (err) {
    console.error("Error en GET /movimientos:", err.message);
    res.status(500).json({ error: "Error al obtener movimientos" });
  }
});

// GET /movimientos/:id
app.get("/movimientos/:id", authMiddleware, requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const sql = `
      SELECT m.id, m.cod_tipo, t.nombre AS tipo_nombre,
             m.importe_ars, m.importe_usd, m.cotizacion, m.concepto,
             m.fecha, m.usuario_id, m.propietario_id,
             u.nombre AS usuario_nombre,
             p.nombre AS propietario_nombre
      FROM movimientos m
      LEFT JOIN tipos t ON t.id = m.cod_tipo
      LEFT JOIN usuarios u ON u.id = m.usuario_id
      LEFT JOIN propietarios p ON p.id = m.propietario_id
      WHERE m.id = $1
      LIMIT 1
    `;
    const r = await pool.query(sql, [id]);
    if (r.rowCount === 0) return res.status(404).json({ error: "No encontrado" });
    const row = r.rows[0];
    res.json({ ...row, fecha: formatDateISO(row.fecha) });
  } catch (err) {
    console.error("Error en GET /movimientos/:id:", err.message);
    res.status(500).json({ error: "Error al obtener el movimiento" });
  }
});

// POST /movimientos
app.post("/movimientos", authMiddleware, requireAuth, async (req, res) => {
  try {
    const {
      cod_tipo,
      importe_ars = null,
      importe_usd = null,
      cotizacion,
      concepto = null,
      fecha = null,
      propietario_id = null,
    } = req.body || {};

    if (!cod_tipo) return res.status(400).json({ error: "Falta cod_tipo" });
    if (cotizacion === undefined || cotizacion === null || Number(cotizacion) <= 0) {
      return res.status(400).json({ error: "La cotización es obligatoria y debe ser > 0" });
    }

    // para tipos que impactan propietario, exigir propietario_id
    const requiereProp = ["Prop", "Limp", "Rece", "Publ"].includes(String(cod_tipo));
    if (requiereProp && !propietario_id) {
      return res.status(400).json({ error: "propietario_id es requerido para este tipo" });
    }

    // usuario desde token
    let usuarioId = null;
    try {
      if (req.token) {
        const payload = jwt.verify(req.token, JWT_SECRET);
        usuarioId = payload.uid || null;
      }
    } catch {}

    const r = await pool.query(
      `INSERT INTO movimientos
         (cod_tipo, importe_ars, importe_usd, cotizacion, concepto, fecha, usuario_id, propietario_id)
       VALUES ($1,$2,$3,$4,$5,COALESCE($6, CURRENT_DATE),$7,$8)
       RETURNING *`,
      [cod_tipo, importe_ars, importe_usd, cotizacion, concepto, fecha, usuarioId, propietario_id]
    );
    const row = r.rows[0];
    res.status(201).json({ ...row, fecha: formatDateISO(row.fecha) });
  } catch (e) {
    console.error("POST /movimientos:", e.message);
    res.status(500).json({ error: "Error creando movimiento" });
  }
});

// PUT /movimientos/:id
app.put("/movimientos/:id", authMiddleware, requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const b = req.body || {};

    if (Object.prototype.hasOwnProperty.call(b, "cotizacion")) {
      if (Number(b.cotizacion) <= 0) return res.status(400).json({ error: "cotizacion debe ser > 0" });
    }

    // si cod_tipo es de los que requieren propietario, exigirlo
    if (b.cod_tipo && ["Prop","Limp","Rece","Publ"].includes(String(b.cod_tipo))) {
      if (!b.propietario_id) return res.status(400).json({ error: "propietario_id es requerido para este tipo" });
    }

    const fields = [];
    const params = [];
    let i = 1;
    const setF = (col, val) => { fields.push(`${col}=$${i++}`); params.push(val); };

    const updatable = ["cod_tipo","importe_ars","importe_usd","cotizacion","concepto","fecha","propietario_id"];
    for (const k of updatable) {
      if (Object.prototype.hasOwnProperty.call(b, k)) setF(k, b[k]);
    }
    if (!fields.length) return res.status(400).json({ error: "Nada para actualizar" });

    const sql = `UPDATE movimientos SET ${fields.join(", ")} WHERE id=$${i} RETURNING *`;
    params.push(id);
    const r = await pool.query(sql, params);
    if (r.rowCount === 0) return res.status(404).json({ error: "No encontrado" });
    const row = r.rows[0];
    res.json({ ...row, fecha: formatDateISO(row.fecha) });
  } catch (e) {
    console.error("PUT /movimientos/:id:", e.message);
    res.status(500).json({ error: "Error actualizando movimiento" });
  }
});

// DELETE /movimientos/:id
app.delete("/movimientos/:id", authMiddleware, requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM movimientos WHERE id = $1", [id]);
    res.json({ deleted: true });
  } catch (err) {
    console.error("Error en DELETE /movimientos/:id:", err.message);
    res.status(500).json({ error: "Error al eliminar movimiento" });
  }
});

// ESTADIAS
app.get("/estadias", async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    const params = [];
    let where = "";
    if (desde && hasta) {
      params.push(hasta, desde);
      where = "WHERE e.fecha_desde <= $1 AND e.fecha_hasta >= $2";
    }
    const q = `
      SELECT e.*,
             d.codigo AS departamento_codigo,
             c.codigo AS cochera_codigo
        FROM estadias e
        JOIN departamentos d ON d.id = e.departamento_id
        LEFT JOIN cocheras c ON c.id = e.cochera_id
        ${where}
        ORDER BY e.id ASC`;
    const result = await pool.query(q, params);
    const rows = result.rows.map(r => ({
      ...r,
      fecha_desde: formatDateISO(r.fecha_desde),
      fecha_hasta: formatDateISO(r.fecha_hasta),
    }));
    res.json(rows);
  } catch (err) {
    console.error("Error en GET /estadias:", err.message);
    res.status(500).json({ error: "Error al obtener estadías" });
  }
});

app.post("/estadias", authMiddleware, requireAuth, async (req, res) => {
  try {
    const body = req.body || {};

    // Compatibilidad: permitir departamento_id o departamento (codigo)
    let { departamento_id } = body;
    const { departamento, cochera_id, cochera } = body;

    if (!departamento_id) {
      if (!departamento) return res.status(400).json({ error: "Falta departamento_id o departamento (codigo)" });
      const dep = await pool.query("SELECT id FROM departamentos WHERE codigo = $1", [String(departamento)]);
      if (dep.rowCount === 0) return res.status(400).json({ error: "Departamento inexistente" });
      departamento_id = dep.rows[0].id;
    }
    let cocheraId = cochera_id || null;
    if (!cocheraId && cochera) {
      const car = await pool.query("SELECT id FROM cocheras WHERE codigo = $1", [String(cochera)]);
      if (car.rowCount === 1) cocheraId = car.rows[0].id;
    }

    const {
      inquilino,
      fecha_desde,
      fecha_hasta,
      estado_id = 'Act',
      cotizacion,
      concepto,

      // compat: importe_total (viejo) -> importe_total_ars (nuevo)
      importe_total,

      importe_total_ars,
      importe_total_usd,
      importe_inquilino_ars,
      importe_inquilino_usd,
      importe_propietario_ars,
      importe_propietario_usd,
      importe_limpieza_ars,
      importe_limpieza_usd,
      importe_recepcion_ars,
      importe_recepcion_usd,
      importe_comision_ars,
      importe_comision_usd,
      importe_publicidad_ars,
      importe_publicidad_usd,
    } = body;

    if (!inquilino || !fecha_desde || !fecha_hasta) {
      return res.status(400).json({ error: "Faltan campos obligatorios (inquilino, fecha_desde, fecha_hasta)" });
    }
    if (cotizacion === undefined || cotizacion === null || Number(cotizacion) <= 0) {
      return res.status(400).json({ error: "La cotización es obligatoria y debe ser > 0." });
    }

    // usuario_id desde JWT
    let usuarioId = null;
    try {
      const token = req.token;
      if (token) {
        const payload = jwt.verify(token, JWT_SECRET);
        usuarioId = payload.uid || null;
      }
    } catch {}

    const sql = `
      INSERT INTO estadias (
        departamento_id, cochera_id, inquilino, fecha_desde, fecha_hasta,
        estado_id, usuario_id,
        importe_total_ars, importe_total_usd,
        importe_inquilino_ars, importe_inquilino_usd,
        importe_propietario_ars, importe_propietario_usd,
        importe_limpieza_ars, importe_limpieza_usd,
        importe_recepcion_ars, importe_recepcion_usd,
        importe_comision_ars, importe_comision_usd,
        importe_publicidad_ars, importe_publicidad_usd,
        cotizacion, concepto
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,
              $8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
      RETURNING *`;

    const values = [
      departamento_id,
      cocheraId,
      inquilino,
      fecha_desde,
      fecha_hasta,
      estado_id,
      usuarioId,

      (importe_total_ars ?? importe_total ?? null),
      (importe_total_usd ?? null),

      (importe_inquilino_ars ?? null),
      (importe_inquilino_usd ?? null),
      (importe_propietario_ars ?? null),
      (importe_propietario_usd ?? null),
      (importe_limpieza_ars ?? null),
      (importe_limpieza_usd ?? null),
      (importe_recepcion_ars ?? null),
      (importe_recepcion_usd ?? null),
      (importe_comision_ars ?? null),
      (importe_comision_usd ?? null),
      (importe_publicidad_ars ?? null),
      (importe_publicidad_usd ?? null),

      cotizacion,
      (concepto ?? null),
    ];

    const r = await pool.query(sql, values);
    res.status(201).json(r.rows[0]);
  } catch (err) {
    console.error("Error en POST /estadias:", err.message);
    res.status(500).json({ error: "Error al crear estadía" });
  }
});

app.put("/estadias/:id", authMiddleware, requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    // exigir cotización final válida
    const curQ = await pool.query("SELECT cotizacion FROM estadias WHERE id=$1", [id]);
    if (curQ.rowCount === 0) return res.status(404).json({ error: "No encontrada" });
    const finalCot = body.cotizacion !== undefined ? body.cotizacion : curQ.rows[0].cotizacion;
    if (finalCot === undefined || finalCot === null || Number(finalCot) <= 0) {
      return res.status(400).json({ error: "La cotización es obligatoria y debe ser > 0." });
    }

    // Build update dinámico
    const fields = [];
    const params = [];
    let i = 1;
    const setField = (col, val) => { fields.push(`${col} = $${i++}`); params.push(val); };

    const updatable = [
      "departamento_id","cochera_id","inquilino","fecha_desde","fecha_hasta",
      "estado_id","usuario_id",
      "importe_total_ars","importe_total_usd",
      "importe_inquilino_ars","importe_inquilino_usd",
      "importe_propietario_ars","importe_propietario_usd",
      "importe_limpieza_ars","importe_limpieza_usd",
      "importe_recepcion_ars","importe_recepcion_usd",
      "importe_comision_ars","importe_comision_usd",
      "importe_publicidad_ars","importe_publicidad_usd",
      "cotizacion","concepto"
    ];
    for (const col of updatable) {
      if (Object.prototype.hasOwnProperty.call(body, col)) setField(col, body[col]);
    }
    if (Object.prototype.hasOwnProperty.call(body, "importe_total")) {
      setField("importe_total_ars", body.importe_total);
    }
    if (fields.length === 0) return res.status(400).json({ error: "Nada para actualizar" });

    const sql = `UPDATE estadias SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`;
    params.push(id);

    const r = await pool.query(sql, params);
    res.json(r.rows[0]);
  } catch (err) {
    console.error("Error en PUT /estadias:", err.message);
    res.status(500).json({ error: "Error al actualizar estadía" });
  }
});

// GET /estadias/:id  → devuelve la estadía con códigos de depto/cochera
app.get("/estadias/:id", authMiddleware, requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const sql = `
      SELECT
        e.*,
        d.codigo AS departamento,
        c.codigo AS cochera
      FROM estadias e
      LEFT JOIN departamentos d ON d.id = e.departamento_id
      LEFT JOIN cocheras c ON c.id = e.cochera_id
      WHERE e.id = $1
      LIMIT 1
    `;
    const r = await pool.query(sql, [id]);
    if (r.rowCount === 0) return res.status(404).json({ error: "No encontrada" });
    res.json(r.rows[0]);
  } catch (err) {
    console.error("Error en GET /estadias/:id:", err.message);
    res.status(500).json({ error: "Error al obtener la estadía" });
  }
});

app.delete("/estadias/:id", authMiddleware, requireAuth, async (req, res) => {
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
// EXPORTACIONES A EXCEL
// ========================
// GET /export/excel-all  → una hoja por tabla
app.get("/export/excel-all", async (req, res) => {
  const user = verifyTokenOr401(req, res);
  if (!user) return res.status(401).json({ error: "Falta token" });

  try {
    const wb = new ExcelJS.Workbook();

    // util para hoja
    async function addSheetFromQuery(sheetName, sql) {
      const sh = wb.addWorksheet(sheetName);
      const { rows, fields } = await pool.query(sql);
      if (!fields || fields.length === 0) { sh.addRow(["(sin columnas)"]); return; }
      sh.addRow(fields.map(f => f.name));
      rows.forEach(r => sh.addRow(fields.map(f => r[f.name])));
      sh.columns.forEach(col => { col.width = Math.min(40, Math.max(10, String(col.header || "").length + 2)); });
    }

    await addSheetFromQuery("usuarios", "SELECT id,nombre,email,rol FROM usuarios ORDER BY id");
    await addSheetFromQuery("propietarios", "SELECT id,nombre,dni_cuit,telefono FROM propietarios ORDER BY id");
    await addSheetFromQuery("departamentos", "SELECT id,codigo,id_propietario FROM departamentos ORDER BY id");
    await addSheetFromQuery("cocheras", "SELECT id,codigo,id_propietario FROM cocheras ORDER BY id");
    await addSheetFromQuery("estados", "SELECT id,nombre FROM estados ORDER BY id");
    await addSheetFromQuery("tipos", "SELECT id,nombre FROM tipos ORDER BY id");
    await addSheetFromQuery("estadias", `
      SELECT e.*, d.codigo AS departamento_codigo, c.codigo AS cochera_codigo
      FROM estadias e
      LEFT JOIN departamentos d ON d.id=e.departamento_id
      LEFT JOIN cocheras c ON c.id=e.cochera_id
      ORDER BY e.id
    `);
    await addSheetFromQuery("movimientos", `
      SELECT id, cod_tipo, propietario_id, importe_ars, importe_usd, cotizacion, concepto, fecha, usuario_id
      FROM movimientos ORDER BY fecha DESC, id DESC
    `);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="bd_completa.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  } catch (e) {
    console.error("EXPORT ALL", e);
    res.status(500).json({ error: "Error exportando" });
  }
});

// GET /export/estadias?scope=activas|cerradas|no-cerradas
app.get("/export/estadias", async (req, res) => {
  const user = verifyTokenOr401(req, res);
  if (!user) return res.status(401).json({ error: "Falta token" });

  try {
    const wb = new ExcelJS.Workbook();
    const sh = wb.addWorksheet("estadias");

    const { rows } = await pool.query(`
      SELECT e.id, d.codigo AS departamento, e.inquilino,
             to_char(e.fecha_desde,'YYYY-MM-DD') AS fecha_desde,
             to_char(e.fecha_hasta,'YYYY-MM-DD') AS fecha_hasta,
             e.estado_id
      FROM estadias e
      JOIN departamentos d ON d.id=e.departamento_id
      ORDER BY e.id
    `);

    const scope = String(req.query.scope || "");
    const today = new Date().toISOString().slice(0,10);
    const filtered = rows.filter(r => {
      if (scope === "activas") return r.fecha_hasta >= today;
      if (scope === "cerradas") return r.estado_id === "Cerr";
      if (scope === "no-cerradas") return r.estado_id !== "Cerr";
      return true;
    });

    sh.addRow(["ID","Depto","Inquilino","Desde","Hasta","Estado"]);
    filtered.forEach(r => sh.addRow([r.id, r.departamento, r.inquilino, r.fecha_desde, r.fecha_hasta, r.estado_id || ""]));
    sh.columns.forEach(c => c.width = 16);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="estadias.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  } catch (e) {
    console.error("EXPORT ESTADIAS", e);
    res.status(500).json({ error: "Error exportando" });
  }
});

// GET /export/movimientos?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&cod_tipo=Prop&propietario_id=#
app.get("/export/movimientos", async (req, res) => {
  const user = verifyTokenOr401(req, res);
  if (!user) return res.status(401).json({ error: "Falta token" });

  try {
    const { desde, hasta, cod_tipo, propietario_id } = req.query;

    const wb = new ExcelJS.Workbook();
    const sh = wb.addWorksheet("movimientos");
    sh.addRow(["Fecha","Tipo","Propietario","ARS","USD","Cotización","Concepto"]);

    const params = [];
    const where = [];
    if (desde) { params.push(desde); where.push(`m.fecha >= $${params.length}`); }
    if (hasta) { params.push(hasta); where.push(`m.fecha <= $${params.length}`); }
    if (cod_tipo) { params.push(cod_tipo); where.push(`m.cod_tipo = $${params.length}`); }
    if (propietario_id) { params.push(propietario_id); where.push(`m.propietario_id = $${params.length}`); }

    const sql = `
      SELECT to_char(m.fecha,'YYYY-MM-DD') AS fecha,
             m.cod_tipo, COALESCE(p.nombre,'—') AS propietario,
             COALESCE(m.importe_ars,0) AS importe_ars,
             COALESCE(m.importe_usd,0) AS importe_usd,
             m.cotizacion, m.concepto
      FROM movimientos m
      LEFT JOIN propietarios p ON p.id = m.propietario_id
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY m.fecha DESC, m.id DESC
    `;
    const { rows } = await pool.query(sql, params);
    rows.forEach(r =>
      sh.addRow([r.fecha, r.cod_tipo, r.propietario, r.importe_ars, r.importe_usd, r.cotizacion, r.concepto || ""])
    );
    sh.columns.forEach(c => c.width = 18);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="movimientos.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  } catch (e) {
    console.error("EXPORT MOVS", e);
    res.status(500).json({ error: "Error exportando" });
  }
});

// ========================
// Arranque controlado
// ========================

async function ensureDbPatches() {
  // 1) columna propietario_id en movimientos
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='movimientos' AND column_name='propietario_id'
      ) THEN
        ALTER TABLE movimientos
          ADD COLUMN propietario_id INT REFERENCES propietarios(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_mov_prop ON movimientos(propietario_id);
      END IF;
    END$$;
  `);
  console.log("✔ ensureDbPatches OK");
}

async function start() {
  if (process.env.RECREATE_SCHEMA_ON_BOOT === "true") {
    console.log("⚠ RECREATE_SCHEMA_ON_BOOT=true → recreando BD.");
    await recreateSchema();
  } else {
    console.log("ℹ RECREATE_SCHEMA_ON_BOOT no está en 'true' → no se toca el esquema.");
  }
  await ensureDbPatches(); // <-- NUEVO

  app.listen(PORT, () => {
    console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
  });
}

start().catch((e) => {
  console.error("❌ Falló el arranque:", e);
  process.exit(1);
});