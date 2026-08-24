// Shared pg connection for the English distinct-text render run (2026-08-13).
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.psql') })
const { Client } = require('pg')
async function q(sql, params) {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await c.connect()
  try { const r = await c.query(sql, params); return r.rows } finally { await c.end() }
}
module.exports = { q }
