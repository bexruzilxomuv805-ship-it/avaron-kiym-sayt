require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;
const COLLECTIONS = ["products", "users", "orders"];

if (!DATABASE_URL) {
  console.error(
    "DATABASE_URL is not set. Copy .env.example to .env and fill in your Supabase connection string."
  );
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "25mb" }));

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function rowToDoc(row) {
  if (!row) return null;
  return { ...row.data, id: Number(row.id) };
}

async function ensureSchema() {
  for (const name of COLLECTIONS) {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS ${name} (id BIGINT PRIMARY KEY, data JSONB NOT NULL)`
    );
  }
}

// Seeds each table from the bundled db.json snapshot the first time it's
// empty, so a fresh Supabase project starts out with the same products
// and users the site already ships with.
async function seedIfEmpty() {
  const seedPath = path.join(__dirname, "src", "data", "db.json");
  const seed = JSON.parse(fs.readFileSync(seedPath, "utf8"));

  for (const name of COLLECTIONS) {
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS count FROM ${name}`);
    const seedDocs = Array.isArray(seed[name]) ? seed[name] : [];
    if (rows[0].count === 0 && seedDocs.length) {
      for (const doc of seedDocs) {
        await pool.query(
          `INSERT INTO ${name} (id, data) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
          [doc.id, doc]
        );
      }
      console.log(`Seeded ${seedDocs.length} document(s) into "${name}"`);
    }
  }
}

function requireKnownCollection(req, res, next) {
  if (!COLLECTIONS.includes(req.params.collection)) {
    return res.status(404).json({ error: "Unknown collection" });
  }
  next();
}

app.get("/:collection", requireKnownCollection, async (req, res) => {
  const { rows } = await pool.query(`SELECT id, data FROM ${req.params.collection} ORDER BY id`);
  res.json(rows.map(rowToDoc));
});

app.get("/:collection/:id", requireKnownCollection, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, data FROM ${req.params.collection} WHERE id = $1`,
    [Number(req.params.id)]
  );
  if (!rows.length) return res.status(404).json({ error: "Not found" });
  res.json(rowToDoc(rows[0]));
});

app.post("/:collection", requireKnownCollection, async (req, res) => {
  const collection = req.params.collection;
  let id = req.body.id;
  if (id === undefined || id === null) {
    const { rows } = await pool.query(`SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM ${collection}`);
    id = Number(rows[0].next_id);
  }
  const doc = { ...req.body, id };
  await pool.query(`INSERT INTO ${collection} (id, data) VALUES ($1, $2)`, [id, doc]);
  res.status(201).json(doc);
});

app.patch("/:collection/:id", requireKnownCollection, async (req, res) => {
  const update = { ...req.body };
  delete update.id;
  const { rows } = await pool.query(
    `UPDATE ${req.params.collection} SET data = data || $2::jsonb WHERE id = $1 RETURNING id, data`,
    [Number(req.params.id), JSON.stringify(update)]
  );
  if (!rows.length) return res.status(404).json({ error: "Not found" });
  res.json(rowToDoc(rows[0]));
});

app.put("/:collection/:id", requireKnownCollection, async (req, res) => {
  const id = Number(req.params.id);
  const doc = { ...req.body, id };
  const { rows } = await pool.query(
    `UPDATE ${req.params.collection} SET data = $2::jsonb WHERE id = $1 RETURNING id, data`,
    [id, JSON.stringify(doc)]
  );
  if (!rows.length) return res.status(404).json({ error: "Not found" });
  res.json(rowToDoc(rows[0]));
});

app.delete("/:collection/:id", requireKnownCollection, async (req, res) => {
  const { rows } = await pool.query(
    `DELETE FROM ${req.params.collection} WHERE id = $1 RETURNING id, data`,
    [Number(req.params.id)]
  );
  if (!rows.length) return res.status(404).json({ error: "Not found" });
  res.json(rowToDoc(rows[0]));
});

async function start() {
  await ensureSchema();
  await seedIfEmpty();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`API server (Postgres-backed) running on port ${PORT}`);
  });
}

start().catch((error) => {
  console.error("Failed to start server:", error.message);
  process.exit(1);
});
