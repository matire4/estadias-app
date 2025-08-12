// index.js completo adaptado con nuevos endpoints y estructura extendida
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

// === NUEVO: auth helpers ===
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

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

// === util ===
const formatDateISO = (fecha) => {
  if (!fecha) return null;
  const date = new Date(fecha);
  return date.toISOString().split("T")[0];
};

// === NUEVO: config JWT y middlewares ===
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

// ========================
// HEALTH (útil para probar despliegue/render)
// ========================
app.get("/health", async (_req, res) => {
  try {
    const r = await pool.query("SELECT 1 AS ok");
    res.json({ status: "ok", db: r.rows[0].ok === 1 ? "ok" : "fail" });
  } catch (e) {
    res.status(500).json({ status: "fail", error: e.message });
  }
});

// ========================
// AUTH / SETUP (NUEVO)
// ========================
app.get("/auth/setup-required", async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT COUNT(*)::int AS c FROM usuarios");
    res.json({ setup: rows[0].c === 0 });
  } catch (e) {
    res.status(500).json({ error: "Error verificando usuarios" });
  }
});

// Crear PRIMER usuario programador (solo si no hay usuarios)
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
    return res.status(201).json({ token, user });
  } catch (e) {
    console.error("POST /auth/setup", e.message);
    res.status(500).json({ error: "Error creando usuario" });
  }
});

// Login normal
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
    console.error("POST /auth/login", e.message);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});

// Verificar token (para middleware del front)
app.get("/auth/verify", authMiddleware, (req, res) => {
  try {
    if (!req.token) return res.status(401).json({ ok: false });
    const payload = jwt.verify(req.token, JWT_SECRET);
    res.json({ ok: true, user: payload });
  } catch {
    res.status(401).json({ ok: false });
  }
});

// ========================
// USERS (NUEVO) — sólo programador crea/edita/borra
// ========================
app.get("/users", authMiddleware, requireAuth, async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT id, nombre, email, rol FROM usuarios ORDER BY id ASC");
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: "Error listando usuarios" });
  }
});

app.post("/users", authMiddleware, requireAuth, requireRole("programador"), async (req, res) => {
  try {
    const { nombre, email, rol, password } = req.body || {};
    if (!nombre || !email || !rol || !password) return res.status(400).json({ error: "Faltan campos" });

    // Validar rol permitido
    if (!["normal", "admin", "programador"].includes(rol)) {
      return res.status(400).json({ error: "Rol inválido" });
    }

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO usuarios (nombre, email, clave, rol)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nombre, email, rol`,
      [nombre, email, hash, rol]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    if (String(e.message).toLowerCase().includes("unique")) {
      return res.status(409).json({ error: "Email ya existe" });
    }
    res.status(500).json({ error: "Error creando usuario" });
  }
});

app.put("/users/:id", authMiddleware, requireAuth, requireRole("programador"), async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, rol, password } = req.body || {};
    if (!nombre || !email || !rol) return res.status(400).json({ error: "Faltan campos" });
    if (!["normal", "admin", "programador"].includes(rol)) {
      return res.status(400).json({ error: "Rol inválido" });
    }

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
  } catch (e) {
    res.status(500).json({ error: "Error actualizando usuario" });
  }
});

app.delete("/users/:id", authMiddleware, requireAuth, requireRole("programador"), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM usuarios WHERE id=$1", [id]);
    res.json({ deleted: true });
  } catch (e) {
    res.status(500).json({ error: "Error eliminando usuario" });
  }
});

// ========================
// CATALOGOS (cualquier rol logueado): propietarios, departamentos, estados, tipos
// ========================

// --- PROPIETARIOS ---
app.get("/propietarios", authMiddleware, requireAuth, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, nombre, dni_cuit, telefono FROM propietarios ORDER BY nombre ASC"
    );
    res.json(rows);
  } catch (e) {
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
  } catch (e) {
    res.status(500).json({ error: "Error creando propietario" });
  }
});

// --- DEPARTAMENTOS ---
// Ya tenías GET /departamentos público; dejamos ese GET tal cual.
// Agregamos POST protegido:
app.post("/departamentos", authMiddleware, requireAuth, async (req, res) => {
  try {
    const { nro, id_propietario } = req.body || {};
    if (!nro) return res.status(400).json({ error: "Falta nro" });
    const { rows } = await pool.query(
      `INSERT INTO departamentos (nro, id_propietario)
       VALUES ($1, $2)
       RETURNING id, nro, id_propietario`,
      [nro, id_propietario || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: "Error creando departamento" });
  }
});

// --- ESTADOS ---
app.get("/estados", authMiddleware, requireAuth, async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT id, nombre FROM estados ORDER BY nombre ASC");
  res.json(rows);
  } catch (e) {
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
  } catch (e) {
    res.status(500).json({ error: "Error creando estado" });
  }
});

// --- TIPOS ---
app.get("/tipos", authMiddleware, requireAuth, async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT id, nombre FROM tipos ORDER BY nombre ASC");
    res.json(rows);
  } catch (e) {
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
  } catch (e) {
    res.status(500).json({ error: "Error creando tipo" });
  }
});

// ========================
// ENDPOINTS DE ESTADIAS (LOS TUYOS, SIN CAMBIOS)
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
      estado_id,        // <-- NUEVO: permitir elegir estado
      // los siguientes pueden venir null; los mantenemos por compatibilidad
      cod_moneda,
      cotizacion,
      importe_total,
      concepto,
      id_cochera
    } = req.body;

    // usuario_id desde JWT si viene Authorization
    let usuarioId = null;
    try {
      const h = req.headers.authorization || "";
      const token = h.startsWith("Bearer ") ? h.slice(7) : null;
      if (token) {
        const payload = jwt.verify(token, JWT_SECRET);
        usuarioId = payload.uid || null;
      }
    } catch {}

    const estado = estado_id || 'Act'; // default Act

    const sql = `
      INSERT INTO estadias (
        departamento, inquilino, fecha_desde, fecha_hasta, estado_id,
        cod_moneda, cotizacion, importe_total, concepto, id_cochera, usuario_id
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *`;

    const result = await pool.query(sql, [
      departamento,
      inquilino,
      fecha_desde,
      fecha_hasta,
      estado,
      cod_moneda || null,
      cotizacion || null,
      importe_total || null,
      concepto || null,
      id_cochera || null,
      usuarioId
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
// ENDPOINTS DE APOYO (TUS EXISTENTES)
// ========================
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
