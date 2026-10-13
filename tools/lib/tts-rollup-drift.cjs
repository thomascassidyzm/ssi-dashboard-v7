/**
 * Does the spend guard's per-day rollup still agree with the ledger it sums?
 * (job #806). tts_spend_reserve / tts_spend_totals read tts_spend_daily and
 * tts_spend_daily_job, kept by an AFTER INSERT trigger on tts_spend_ledger
 * (ssi-learning-app supabase/migrations/20261025e, mirrored in
 * ops/sql/20261025-tts-spend-daily-rollup.sql). Anything that inserts with
 * triggers off — a restore, session_replication_role = replica — skips the
 * rollup and quietly LOOSENS the caps. public.tts_spend_rollup_drift() names
 * every (provider, day, kind) and (day, job) where the two disagree; this asks it.
 *
 * Returns { checked: false } when the rollup is not deployed (no function), so
 * the nightly says nothing rather than crying wolf.
 */
const fs = require('fs')
const path = require('path')

// The nightly runs from the prod checkout, which holds no .env.psql of its
// own: fall back to the main Popty checkout's, where the DB URL lives.
function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const home = process.env.HOME || ''
  for (const f of [path.join(__dirname, '..', '..', '.env.psql'), path.join(home, 'SSi', 'ssi-dashboard-v7-clean', '.env.psql')]) {
    if (!fs.existsSync(f)) continue
    const m = fs.readFileSync(f, 'utf8').match(/DATABASE_URL=["']?([^"'\n]+)/)
    if (m) return m[1]
  }
  throw new Error('DATABASE_URL not found (env, ./.env.psql, ~/SSi/ssi-dashboard-v7-clean/.env.psql)')
}

async function rollupDrift({ client } = {}) {
  const { Client } = require('pg')
  const c = client || new Client({ connectionString: databaseUrl(), statement_timeout: 30000, application_name: 'tts-rollup-drift' })
  if (!client) await c.connect()
  try {
    const { rows: [has] } = await c.query("select to_regprocedure('public.tts_spend_rollup_drift()') is not null as ok")
    if (!has.ok) return { checked: false, rows: [] }
    const { rows } = await c.query('select * from public.tts_spend_rollup_drift() order by day, which, provider, job')
    return { checked: true, rows }
  } finally { if (!client) await c.end().catch(() => {}) }
}

module.exports = { rollupDrift }
