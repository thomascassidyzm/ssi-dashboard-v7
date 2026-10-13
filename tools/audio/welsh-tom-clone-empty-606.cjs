#!/usr/bin/env node
/**
 * Follow-on to job #606 (Tom GO 2026-10-13, "yes to both"): the 209 Welsh known-side slots that still point at a Tom clone
 * and have NO human take to go back to (ops/welsh-tom-clone-revert-606/no-human-take.csv) are EMPTIED — known_audio_id = NULL.
 * Tom's rule: a slot stays empty until a human take exists; never a synthetic stand-in, so no voice is substituted.
 *
 *   node tools/audio/welsh-tom-clone-empty-606.cjs [--apply]          dry run unless --apply
 *   node tools/audio/welsh-tom-clone-empty-606.cjs --undo [--apply]   put the Tom-clone pointers back (slot must still be empty)
 *
 * Before the first apply the touched rows are copied whole into public.backup_cym_tom_clone_empty_606 (kept if it exists).
 * Each row asserts the slot still holds the CSV's clip_id (undo: still NULL). Clips are never deleted. content_version is
 * bumped once per touched course. The learner app drops a cycle whose known audio is missing (generateLearningScript emitItem),
 * so an empty slot costs that cycle until the human take lands — no crash, nothing fetched.
 */
const fs = require('fs'), path = require('path')
for (const p of [path.join(__dirname, '../../.env.psql'), '/home/tomcassidy/ssi-dashboard-v7-clean/.env.psql']) if (fs.existsSync(p)) { require('dotenv').config({ path: p, quiet: true }); break }
for (const p of [path.join(__dirname, '../../.env'), '/home/tomcassidy/ssi-dashboard-v7-clean/.env']) if (fs.existsSync(p) && !process.env.SUPABASE_URL) { require('dotenv').config({ path: p, quiet: true }); break }
const CSV = path.join(__dirname, '../../ops/welsh-tom-clone-revert-606/no-human-take.csv')
const BACKUP = 'backup_cym_tom_clone_empty_606'

/** pk/clip_id/tbl/course_code are the first five plain columns; txt (last) may be quoted and is not needed here. */
function readRows(file = CSV) {
  const [head, ...lines] = fs.readFileSync(file, 'utf8').trim().split('\n'); const cols = head.split(',').slice(0, 6)
  return lines.map(l => Object.fromEntries(l.split(',').slice(0, 6).map((v, i) => [cols[i], v])))
}

async function main() {
  const apply = process.argv.includes('--apply'), back = process.argv.includes('--undo')
  const db = require('@supabase/supabase-js').createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
  const { bumpCourseVersion } = require('../../services/shared/course-version.cjs')
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs')
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs')
  const rows = readRows(), moved = {}, left = {}
  const { Client } = require('pg')
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect(); await pg.query('set statement_timeout=0')
  if (apply && !back) {
    const ids = rows.map(r => r.pk)
    await pg.query(`create table if not exists ${BACKUP} (tbl text, backed_up_at timestamptz default now(), row jsonb)`)
    const { rows: [{ n }] } = await pg.query(`select count(*)::int n from ${BACKUP}`)
    if (!n) for (const tbl of ['course_seeds', 'course_legos']) await pg.query(`insert into ${BACKUP}(tbl,row) select $1, to_jsonb(t) from ${tbl} t where t.id::text = any($2)`, [tbl, ids])
    const { rows: [{ m }] } = await pg.query(`select count(*)::int m from ${BACKUP}`)
    if (m !== rows.length) throw new Error(`backup holds ${m} rows, expected ${rows.length} — stopping before any write`)
  }
  for (const course of [...new Set(rows.map(r => r.course_code))]) for (const tbl of ['course_seeds', 'course_legos']) {
    const mine = rows.filter(r => r.course_code === course && r.tbl === tbl)
    if (!mine.length) continue
    if (!apply) {
      const res = await pg.query(`select count(*)::int n from ${tbl} t join unnest($1::text[], $2::text[]) as v(pk, clip) on t.id::text = v.pk where ${back ? 't.known_audio_id is null' : 't.known_audio_id = v.clip::uuid'}`, [mine.map(r => r.pk), mine.map(r => r.clip_id)])
      moved[course] = (moved[course] || 0) + res.rows[0].n; left[course] = (left[course] || 0) + mine.length - res.rows[0].n; continue
    }
    const ev = await recordContentEdit(db, { identity: serviceIdentity('welsh-tom-clone-empty-606'), courseCode: course, surface: 'tools:audio/welsh-tom-clone-empty-606', operation: 'update', detail: { why: back ? 'undo: Tom-clone pointers put back' : 'Tom GO 2026-10-13: Welsh known slot with no human take emptied (no synthetic stand-in)', csv: 'ops/welsh-tom-clone-revert-606/no-human-take.csv', backup: BACKUP } })
    const res = back
      ? await pg.query(`update ${tbl} t set known_audio_id = v.clip::uuid, last_edit_event_id = $3 from unnest($1::text[], $2::text[]) as v(pk, clip) where t.id::text = v.pk and t.known_audio_id is null`, [mine.map(r => r.pk), mine.map(r => r.clip_id), ev])
      : await pg.query(`update ${tbl} t set known_audio_id = null, last_edit_event_id = $3 from unnest($1::text[], $2::text[]) as v(pk, clip) where t.id::text = v.pk and t.known_audio_id = v.clip::uuid`, [mine.map(r => r.pk), mine.map(r => r.clip_id), ev])
    moved[course] = (moved[course] || 0) + res.rowCount; left[course] = (left[course] || 0) + mine.length - res.rowCount
  }
  await pg.end()
  if (apply) for (const c of Object.keys(moved)) if (moved[c]) { const v = await bumpCourseVersion(db, c, 'patch'); if (!v) throw new Error(`content_version bump failed for ${c}`); console.log(`${c}: content_version -> ${v}`) }
  console.log(`${apply ? '' : '(dry run) '}${back ? 'undo' : 'empty'}: ${JSON.stringify(moved)}; left (slot changed since): ${JSON.stringify(left)}`)
}
if (require.main === module) main().catch(e => { console.error(e); process.exit(1) })
module.exports = { readRows }
