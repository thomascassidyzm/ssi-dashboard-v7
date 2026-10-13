#!/usr/bin/env node
/**
 * Job #606 (Tom 2026-10-13 HARD RULE, r-2026-10-13-hard-rule-tom-s-voice-clone): "my clone should never have been used for anything in the WELSH courses".
 * Puts every Welsh `known_audio_id` slot that was repointed to a Tom clone back to the human take it held before.
 *
 *   node tools/audio/welsh-tom-clone-revert-606.cjs [--apply]        dry run unless --apply
 *   node tools/audio/welsh-tom-clone-revert-606.cjs --undo [--apply] put the Tom-clone pointers back (before-state asserted both ways)
 *
 * The ledger (ops/welsh-tom-clone-revert-606/ledger.csv, committed) was read from content_audit_log: for each slot, the latest previous
 * pointer whose clip is not a Tom clone. `cura` is the Tom-clone clip the slot holds now, `revert_to` the human clip it goes back to.
 * Each move asserts the slot still holds `from` (setSlotPointer), never deletes a clip, and bumps the course's content_version.
 */
const fs = require('fs'), path = require('path')
for (const p of [path.join(__dirname, '../../.env.psql'), '/home/tomcassidy/ssi-dashboard-v7-clean/.env.psql']) if (fs.existsSync(p)) { require('dotenv').config({ path: p, quiet: true }); break }
for (const p of [path.join(__dirname, '../../.env'), '/home/tomcassidy/ssi-dashboard-v7-clean/.env']) if (fs.existsSync(p) && !process.env.SUPABASE_URL) { require('dotenv').config({ path: p, quiet: true }); break }
const rv = require('../../services/shared/resolve-voice.cjs')
const LEDGER = path.join(__dirname, '../../ops/welsh-tom-clone-revert-606/ledger.csv')

function readLedger(file = LEDGER) {
  const [head, ...lines] = fs.readFileSync(file, 'utf8').trim().split('\n'); const cols = head.split(',')
  return lines.map(l => Object.fromEntries(l.split(',').map((v, i) => [cols[i], v])))
}

async function main() {
  const apply = process.argv.includes('--apply'), back = process.argv.includes('--undo')
  const db = require('@supabase/supabase-js').createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
  const { bumpCourseVersion } = require('../../services/shared/course-version.cjs')
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs')
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs')
  const rows = readLedger(), events = new Map(), moved = {}, left = {}
  // Bulk, on the direct connection with no statement timeout: the REST role's 8 s cap cancels single-row updates on these tables (seen 2026-10-13).
  // Per table, per course: one UPDATE ... FROM the ledger, each row asserting the slot still holds `from`. Destination clips are human takes.
  const { Client } = require('pg')
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect(); await pg.query('set statement_timeout=0')
  for (const course of [...new Set(rows.map(r => r.course_code))]) for (const tbl of ['course_seeds', 'course_legos', 'course_practice_phrases']) {
    const mine = rows.filter(r => r.course_code === course && r.tbl === tbl)
    if (!mine.length) continue
    if (!apply) { moved[course] = (moved[course] || 0) + mine.length; continue }
    if (!events.has(course)) events.set(course, await recordContentEdit(db, { identity: serviceIdentity('welsh-tom-clone-revert-606'), courseCode: course, surface: 'tools:audio/welsh-tom-clone-revert-606', operation: 'update', detail: { why: 'job #606: no Tom clone in a Welsh course; known-side slots back to their human take', ledger: 'ops/welsh-tom-clone-revert-606/ledger.csv' } }))
    for (let i = 0; i < mine.length; i += 200) {
      const chunk = mine.slice(i, i + 200)
      const pairs = chunk.map(r => (back ? [r.revert_to, r.cura] : [r.cura, r.revert_to]))
      const res = await pg.query(`update ${tbl} t set known_audio_id = v.to_id::uuid, last_edit_event_id = $4 from unnest($1::text[], $2::text[], $3::text[]) as v(pk, from_id, to_id) where t.id::text = v.pk and t.known_audio_id = v.from_id::uuid`,
        [chunk.map(r => r.pk), pairs.map(p => p[0]), pairs.map(p => p[1]), events.get(course)])
      moved[course] = (moved[course] || 0) + res.rowCount; left[course] = (left[course] || 0) + chunk.length - res.rowCount
    }
  }
  await pg.end()
  if (apply) for (const c of Object.keys(moved)) { const v = await bumpCourseVersion(db, c, 'patch'); if (!v) throw new Error(`content_version bump failed for ${c}`) }
  console.log(`${apply ? '' : '(dry run) '}${back ? 'undo' : 'revert'}: ${JSON.stringify(moved)}; left (slot changed since): ${JSON.stringify(left)}`)
}
if (require.main === module) main().catch(e => { console.error(e); process.exit(1) })
module.exports = { readLedger }
