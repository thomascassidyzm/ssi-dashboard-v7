#!/usr/bin/env node
/**
 * restrict-senedd-pod-2026-09-14.cjs — put the Senedd/S4C pod on Welsh (North) back
 * behind `previewer_001`, the one pod Tom has ruled is the exception to "a live pod
 * is never narrowed".
 *
 * TOM'S RULING (2026-09-14 11:05Z): "Senedd POD is not a typical POD - it is a
 * special case that must be restricted to JUST ssi admin and Steve Dimmicks." That
 * binds both courses. The South row (cym_s_for_eng:senedd-s4c-steve) was BORN with
 * the role earlier today (clone-pod --required-role, job #648). The North row was
 * opened to every North learner by job #605 at 22:25Z on 2026-09-13, and the DB
 * trigger `listening_pods_live_never_held` (#583/#611/#614) refuses exactly the
 * write this ruling asks for: setting a role on a live pod.
 *
 * THE HONEST OVERRIDE. The trigger is right in general and stays as it is for every
 * other pod. This script, inside ONE transaction: disables that single trigger on
 * the table (an ALTER TABLE, which holds an exclusive lock on listening_pods for the
 * few milliseconds the transaction lives, so nothing else can slip a write past the
 * gate meanwhile), runs the one UPDATE whose WHERE repeats the asserted before-state,
 * refuses unless exactly one row moved, re-enables the trigger, and writes the trail
 * — then, after COMMIT, proves the trigger is enabled again by attempting the same
 * narrowing on the South row in a transaction it rolls back, expecting the raise.
 *
 * THE TRAIL. content_audit_log's trigger skips a NULL -> value change (it audits
 * overwrites only), so it would record NOTHING for this write; this script inserts
 * that row itself with the true old_row, and one content_edit_events row per pod
 * (North: update, this ruling; South: insert, the 11:01Z ruling — clone-pod wrote no
 * attribution row, so it is recorded here) carrying Tom's words verbatim.
 *
 *   node tools/pods/restrict-senedd-pod-2026-09-14.cjs            # dry run: read, assert, report
 *   node tools/pods/restrict-senedd-pod-2026-09-14.cjs --apply    # write
 */
'use strict'
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')
const { evidencePath } = require('../lib/evidence-path.cjs')
const { serviceIdentity } = require('../../services/shared/editor-identity.cjs')

const NORTH = 'cym_n_for_eng:senedd-s4c-steve'
const SOUTH = 'cym_s_for_eng:senedd-s4c-steve'
const ROLE = 'previewer_001'
const TRIGGER = 'listening_pods_live_never_held'
const SURFACE = 'tools/pods/restrict-senedd-pod-2026-09-14.cjs'
const RULING = {
  at: '2026-09-14T11:05:00Z',
  by: 'Tom',
  words: 'Senedd POD is not a typical POD - it is a special case that must be restricted to JUST ssi admin and Steve Dimmicks.',
}
const RULING_SOUTH = {
  at: '2026-09-14T11:01:00Z',
  by: 'Tom',
  words: "Yes, make it available in South Welsh. It's only for ssi admin and Steve Dimmicks at the moment.",
}
const BEFORE = { id: NORTH, visibility: 'live', required_role: null }
const UPDATE_SQL =
  "UPDATE listening_pods SET required_role = 'previewer_001' WHERE id = 'cym_n_for_eng:senedd-s4c-steve' AND visibility = 'live' AND required_role IS NULL"

/** Pure. The North row must be exactly what the ruling was made about: live and open. */
function assertBefore(row) {
  if (!row) return { ok: false, reason: `no row with id ${NORTH}` }
  if (row.visibility !== BEFORE.visibility) return { ok: false, reason: `visibility is '${row.visibility}', expected '${BEFORE.visibility}'` }
  if (row.required_role !== null) return { ok: false, reason: `required_role is '${row.required_role}', expected NULL (already restricted? nothing to do)` }
  return { ok: true }
}

/** Pure. The South row must already be what this ruling asks for, or the two courses would diverge. */
function assertSouth(row) {
  if (!row) return { ok: false, reason: `no row with id ${SOUTH}; create it first (clone-pod --to-course)` }
  if (row.visibility !== 'live' || row.required_role !== ROLE) return { ok: false, reason: `${SOUTH} is ${row.visibility}/${row.required_role ?? 'NULL'}, expected live/${ROLE}` }
  return { ok: true }
}

/** Pure. Refused unless it touched exactly the one row it named. */
function checkRowCount(n) {
  if (n === 1) return { ok: true }
  return { ok: false, reason: `UPDATE touched ${n} rows, expected exactly 1; transaction rolled back` }
}

/** Pure. After COMMIT the trigger must be enabled ('O' = origin, i.e. normal). */
function checkTriggerEnabled(tgenabled) {
  return tgenabled === 'O' ? { ok: true } : { ok: false, reason: `${TRIGGER} tgenabled is '${tgenabled}', expected 'O'` }
}

async function main() {
  const apply = process.argv.includes('--apply')
  const db = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await db.connect()
  const log = { mode: apply ? 'apply' : 'dry-run', at: new Date().toISOString(), ruling: RULING, before: {}, after: {}, trail: {}, post_checks: {} }
  const readRow = async (id) => (await db.query('SELECT id, course_code, visibility, required_role, updated_at FROM listening_pods WHERE id = $1', [id])).rows[0] || null
  const readTrigger = async () => (await db.query("SELECT tgenabled FROM pg_trigger WHERE tgrelid = 'listening_pods'::regclass AND tgname = $1", [TRIGGER])).rows[0]?.tgenabled ?? null
  try {
    log.before.north = await readRow(NORTH)
    log.before.south = await readRow(SOUTH)
    log.before.trigger = await readTrigger()
    console.log(`${apply ? 'APPLY' : 'DRY-RUN'}: north = ${JSON.stringify(log.before.north)}`)
    console.log(`         south = ${JSON.stringify(log.before.south)}; trigger ${TRIGGER} tgenabled=${log.before.trigger}`)
    for (const gate of [assertBefore(log.before.north), assertSouth(log.before.south), checkTriggerEnabled(log.before.trigger)]) {
      if (!gate.ok) { console.error(`REFUSED: ${gate.reason}. Nothing written.`); process.exitCode = 2; return }
    }
    console.log(`would run, inside one transaction with ${TRIGGER} disabled: ${UPDATE_SQL}`)
    if (!apply) return

    const identity = serviceIdentity(SURFACE, { role: 'content-editor' })
    const fullOld = (await db.query('SELECT * FROM listening_pods WHERE id = $1', [NORTH])).rows[0]
    await db.query('BEGIN')
    try {
      await db.query(`ALTER TABLE listening_pods DISABLE TRIGGER ${TRIGGER}`)
      const res = await db.query(UPDATE_SQL)
      const count = checkRowCount(res.rowCount)
      if (!count.ok) throw new Error(count.reason)
      await db.query(`ALTER TABLE listening_pods ENABLE TRIGGER ${TRIGGER}`)
      // The audit trigger skips NULL -> value; write the row it would otherwise have written, with the true old_row.
      const audit = await db.query(
        `INSERT INTO content_audit_log (table_name, change_type, primary_key, old_row, changed_by_role)
         VALUES ('listening_pods', 'UPDATE', $1, $2::jsonb, current_user) RETURNING id, changed_at`,
        [NORTH, JSON.stringify(fullOld)])
      log.trail.content_audit_log = audit.rows[0]
      const ev = async (courseCode, operation, podId, detail) => (await db.query(
        `INSERT INTO content_edit_events (course_code, surface, operation, actor_kind, actor_id, actor_label, actor_verified, actor_role, scope, detail)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb) RETURNING id, occurred_at`,
        [courseCode, SURFACE, operation, identity.kind, identity.id, identity.label, identity.verified, identity.role,
          JSON.stringify({ pod_ids: [podId], rows: 1 }), JSON.stringify(detail)])).rows[0]
      log.trail.north_event = await ev('cym_n_for_eng', 'update', NORTH, {
        ruling: RULING,
        before: { visibility: 'live', required_role: null },
        after: { visibility: 'live', required_role: ROLE },
        trigger_bypassed: TRIGGER,
        why: 'Tom ruled this pod the one exception to "a live pod is never narrowed"; the trigger was disabled for this transaction only and re-enabled before commit; every other pod is still guarded.',
        undoes: 'job #605, 2026-09-13 22:25:15Z (tools/pods/open-senedd-pod-2026-09-13.cjs)',
      })
      log.trail.south_event = await ev('cym_s_for_eng', 'insert', SOUTH, {
        ruling: RULING_SOUTH,
        written_at: log.before.south.updated_at,
        how: 'tools/pods/clone-pod.cjs --course=cym_n_for_eng --from=senedd-s4c-steve --to-course=cym_s_for_eng --to=senedd-s4c-steve --title-suffix= --visibility=live --required-role=previewer_001 --apply (job #648)',
        rows: { pod: 1, sentences: 567, known_clips: 567, target_clips: 564 },
        note: 'pointer rows to the same course_audio ids as the North pod; nothing rendered or re-recorded; row born live/previewer_001 in one INSERT',
      })
      await db.query('COMMIT')
    } catch (e) {
      await db.query('ROLLBACK')
      console.error(`REFUSED: ${e.message}`)
      process.exitCode = 3
      return
    }
    log.after.north = await readRow(NORTH)
    log.after.south = await readRow(SOUTH)
    log.after.trigger = await readTrigger()
    console.log(`written: north = ${JSON.stringify(log.after.north)}`)
    const enabled = checkTriggerEnabled(log.after.trigger)
    log.post_checks.trigger_enabled = enabled
    if (!enabled.ok) { console.error(`POST-CHECK FAILED: ${enabled.reason}`); process.exitCode = 4; return }
    // Prove the guard is back: the same narrowing on the South row must raise, in a transaction we roll back.
    await db.query('BEGIN')
    try {
      await db.query("UPDATE listening_pods SET required_role = 'previewer_002' WHERE id = $1", [SOUTH])
      log.post_checks.guard_probe = { ok: false, reason: 'narrowing the South row did NOT raise' }
    } catch (e) {
      log.post_checks.guard_probe = { ok: true, raised: e.message }
    } finally {
      await db.query('ROLLBACK')
    }
    console.log(`post-checks: ${JSON.stringify(log.post_checks)}`)
    if (!log.post_checks.guard_probe.ok) process.exitCode = 5
  } finally {
    await db.end()
    const out = evidencePath(`tools/pods/restrict-senedd-pod-2026-09-14.${apply ? 'applied' : 'dryrun'}.json`)
    fs.mkdirSync(path.dirname(out), { recursive: true })
    fs.writeFileSync(out, JSON.stringify(log, null, 2))
    console.log(`log: ${out}`)
  }
}

if (require.main === module) {
  require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql') })
  main().catch((e) => { console.error(e.message || e); process.exit(1) })
}
module.exports = { assertBefore, assertSouth, checkRowCount, checkTriggerEnabled, NORTH, SOUTH, ROLE, TRIGGER, BEFORE, UPDATE_SQL }
