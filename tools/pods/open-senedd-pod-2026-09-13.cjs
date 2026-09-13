#!/usr/bin/env node
/**
 * open-senedd-pod-2026-09-13.cjs — open the Senedd/S4C listening pod to every
 * Welsh (Northern) learner by clearing the role it was addressed to.
 *
 * TOM'S RULING (2026-09-13 20:31Z): release cym_n_for_eng:senedd-s4c-steve to
 * all Welsh North learners. It went live at 16:17Z the same day to named
 * accounts only, through `required_role='previewer_001'` (database/changes/
 * 20260903_restricted_content_by_role.sql), and RLS is what decides who sees
 * it: NULL means everyone. Job #604 found that the hold/release lever
 * (services/pod-visibility.cjs) never touches required_role, and that the
 * migration names a hand UPDATE as the sanctioned path. This is that UPDATE,
 * gated: it asserts the exact before-state, runs ONE statement whose WHERE
 * repeats that state, and refuses if it did not touch exactly one row. Job
 * #605 also gives the visibility route a required_role field so the next
 * such change is a request, not a script.
 *
 * WHAT IT DOES NOT DO. Steve's learner_roles row is left alone: a grant is a
 * fact about a person, revoked by tools/pods/grant-pod-role.cjs --revoke if
 * ever wanted, and a lingering grant on an open pod changes nothing. The
 * content_audit_log trigger on listening_pods records the overwrite by itself.
 *
 *   node tools/pods/open-senedd-pod-2026-09-13.cjs            # dry run: read, assert, report
 *   node tools/pods/open-senedd-pod-2026-09-13.cjs --apply    # write
 */
'use strict'
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')
const { evidencePath } = require('../lib/evidence-path.cjs')

const POD_ID = 'cym_n_for_eng:senedd-s4c-steve'
const ROLE = 'previewer_001'
const BEFORE = { id: POD_ID, visibility: 'live', required_role: ROLE }
const UPDATE_SQL =
  "UPDATE listening_pods SET required_role = NULL WHERE id = 'cym_n_for_eng:senedd-s4c-steve' AND required_role = 'previewer_001'"

/** Pure. The before-state gate: the row must be exactly what the ruling was made about. */
function assertBefore(row) {
  if (!row) return { ok: false, reason: `no row with id ${POD_ID}` }
  if (row.visibility !== BEFORE.visibility) return { ok: false, reason: `visibility is '${row.visibility}', expected '${BEFORE.visibility}'` }
  if (row.required_role !== BEFORE.required_role) return { ok: false, reason: `required_role is ${row.required_role === null ? 'NULL' : `'${row.required_role}'`}, expected '${BEFORE.required_role}'` }
  return { ok: true }
}

/** Pure. The write is refused unless it touched exactly the one row it named. */
function checkRowCount(n) {
  if (n === 1) return { ok: true }
  return { ok: false, reason: `UPDATE touched ${n} rows, expected exactly 1; transaction rolled back` }
}

async function main() {
  const apply = process.argv.includes('--apply')
  const db = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await db.connect()
  const log = { pod_id: POD_ID, mode: apply ? 'apply' : 'dry-run', at: new Date().toISOString(), before: null, after: null }
  try {
    const { rows } = await db.query('SELECT id, visibility, required_role, updated_at FROM listening_pods WHERE id = $1', [POD_ID])
    log.before = rows[0] || null
    const gate = assertBefore(rows[0])
    console.log(`${apply ? 'APPLY' : 'DRY-RUN'} ${POD_ID}: before = ${JSON.stringify(log.before)}`)
    if (!gate.ok) {
      console.error(`REFUSED: ${gate.reason}. Nothing written.`)
      process.exitCode = 2
      return
    }
    console.log(`would run: ${UPDATE_SQL}`)
    if (!apply) return
    await db.query('BEGIN')
    const res = await db.query(UPDATE_SQL)
    const count = checkRowCount(res.rowCount)
    if (!count.ok) {
      await db.query('ROLLBACK')
      console.error(`REFUSED: ${count.reason}`)
      process.exitCode = 3
      return
    }
    await db.query('COMMIT')
    const after = await db.query('SELECT id, visibility, required_role, updated_at FROM listening_pods WHERE id = $1', [POD_ID])
    log.after = after.rows[0]
    console.log(`written: after = ${JSON.stringify(log.after)}`)
  } finally {
    await db.end()
    const out = evidencePath(`tools/pods/open-senedd-pod-2026-09-13.${apply ? 'applied' : 'dryrun'}.json`)
    fs.mkdirSync(path.dirname(out), { recursive: true })
    fs.writeFileSync(out, JSON.stringify(log, null, 2))
    console.log(`log: ${out}`)
  }
}

if (require.main === module) {
  require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql') })
  main().catch((e) => { console.error(e.message || e); process.exit(1) })
}
module.exports = { assertBefore, checkRowCount, POD_ID, ROLE, BEFORE, UPDATE_SQL }
