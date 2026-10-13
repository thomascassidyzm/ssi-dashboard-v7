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
  for (const r of rows) {
    const from = back ? r.revert_to : r.cura, to = back ? r.cura : r.revert_to
    if (!apply) { moved[r.course_code] = (moved[r.course_code] || 0) + 1; continue }
    if (!events.has(r.course_code)) events.set(r.course_code, await recordContentEdit(db, { identity: serviceIdentity('welsh-tom-clone-revert-606'), courseCode: r.course_code, surface: 'tools:audio/welsh-tom-clone-revert-606', operation: 'update', detail: { why: 'job #606: no Tom clone in a Welsh course; known-side slots back to their human take', ledger: 'ops/welsh-tom-clone-revert-606/ledger.csv' } }))
    const ok = await rv.setSlotPointer(db, { tbl: r.tbl, key: r.pk, col: 'known_audio_id', from, to, courseCode: r.course_code, editEventId: events.get(r.course_code) })
    const m = ok ? moved : left; m[r.course_code] = (m[r.course_code] || 0) + 1
  }
  if (apply) for (const c of Object.keys(moved)) { const v = await bumpCourseVersion(db, c, 'patch'); if (!v) throw new Error(`content_version bump failed for ${c}`) }
  console.log(`${apply ? '' : '(dry run) '}${back ? 'undo' : 'revert'}: ${JSON.stringify(moved)}; left (slot changed since): ${JSON.stringify(left)}`)
}
if (require.main === module) main().catch(e => { console.error(e); process.exit(1) })
module.exports = { readLedger }
