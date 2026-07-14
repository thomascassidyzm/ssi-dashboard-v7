#!/usr/bin/env node
/**
 * refresh-round-index.cjs — refresh the course_round_index materialized view
 *
 * course_round_index (over course_legos) has no trigger/RPC that keeps it in
 * sync — nothing auto-refreshes it. Any manual course_legos surgery (merges,
 * deletes, id changes done outside the normal build API) can leave it
 * pointing at lego_ids that no longer exist, which round-map.ts then reads,
 * hanging affected seeds in play.
 *
 * Run this after any manual course_legos edit. Safe to run any time
 * (REFRESH ... CONCURRENTLY — no read lock, backed by the view's unique
 * indexes) and safe to re-run (idempotent, read-safe, touches no table data).
 *
 * Usage:
 *   node scripts/refresh-round-index.cjs           # verify, refresh, re-verify
 *   node scripts/refresh-round-index.cjs --check    # verify only, no refresh
 */
const fs = require('path').join(__dirname, '..', '.env.psql')
const psql = require('fs').readFileSync(fs, 'utf8')
const DATABASE_URL = (psql.match(/postgresql:\/\/[^\s"']+/) || [])[0]
if (!DATABASE_URL) { console.error('no DATABASE_URL in .env.psql'); process.exit(1) }

const { Client } = require('pg')
const CHECK_ONLY = process.argv.includes('--check')

const DANGLING_QUERY = `
  SELECT cri.course_code, cri.seed_number, cri.lego_id
  FROM course_round_index cri
  LEFT JOIN course_legos cl
    ON cl.course_code = cri.course_code AND cl.lego_id = cri.lego_id
  WHERE cl.lego_id IS NULL
  ORDER BY 1, 2, 3
`

async function main() {
  const client = new Client({ connectionString: DATABASE_URL })
  await client.connect()
  try {
    const before = (await client.query(DANGLING_QUERY)).rows
    console.log(`dangling rows before: ${before.length}`)
    if (before.length) console.log(before.map(r => `  ${r.course_code} S${String(r.seed_number).padStart(4, '0')} ${r.lego_id}`).join('\n'))

    if (CHECK_ONLY) return

    if (before.length === 0) {
      console.log('nothing dangling — skipping refresh')
      return
    }

    console.log('refreshing course_round_index (CONCURRENTLY)...')
    await client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index')

    const after = (await client.query(DANGLING_QUERY)).rows
    console.log(`dangling rows after: ${after.length}`)
    if (after.length) {
      console.error('REFRESH did not clear all dangling rows — investigate before relying on the view')
      process.exit(1)
    }
  } finally {
    await client.end()
  }
}

main().catch(e => { console.error('ERR:', e.message); process.exit(1) })
