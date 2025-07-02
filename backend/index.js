// index.js adaptado para Render y corregido el manejo de fechas
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Conexión a SQLite
const db = new sqlite3.Database("./estadias.db", (err) => {
  if (err) console.error(err.message);
  else console.log("Conectado a la base de datos SQLite");
});

// Crear tabla si no existe
const crearTabla = `
  CREATE TABLE IF NOT EXISTS estadias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    departamento TEXT NOT NULL,
    inquilino TEXT NOT NULL,
    fecha_desde TEXT NOT NULL,
    fecha_hasta TEXT NOT NULL
  )
`;
db.run(crearTabla);

// Helper para formato ISO (evitar +1 en frontend)
const formatDateISO = (fecha) => {
  const date = new Date(fecha);
  return date.toISOString().split("T")[0];
};

// Obtener estadías con filtro robusto
app.get("/estadias", (req, res) => {
  const { desde, hasta } = req.query;
  let query = "SELECT * FROM estadias";
  const params = [];

  if (desde && hasta) {
    query += " WHERE fecha_desde <= ? AND fecha_hasta >= ?";
    params.push(hasta, desde);
  }

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const formateadas = rows.map((row) => ({
      ...row,
      fecha_desde: formatDateISO(row.fecha_desde),
      fecha_hasta: formatDateISO(row.fecha_hasta),
    }));

    res.json(formateadas);
  });
});

// Crear estadía
app.post("/estadias", (req, res) => {
  const { departamento, inquilino, fecha_desde, fecha_hasta } = req.body;
  const sql =
    "INSERT INTO estadias (departamento, inquilino, fecha_desde, fecha_hasta) VALUES (?, ?, ?, ?)";
  db.run(
    sql,
    [departamento, inquilino, fecha_desde, fecha_hasta],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID });
    }
  );
});

// Actualizar estadía
app.put("/estadias/:id", (req, res) => {
  const { id } = req.params;
  const { departamento, inquilino, fecha_desde, fecha_hasta } = req.body;
  const sql =
    "UPDATE estadias SET departamento = ?, inquilino = ?, fecha_desde = ?, fecha_hasta = ? WHERE id = ?";
  db.run(
    sql,
    [departamento, inquilino, fecha_desde, fecha_hasta, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes });
    }
  );
});

// Eliminar estadía
app.delete("/estadias/:id", (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM estadias WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});