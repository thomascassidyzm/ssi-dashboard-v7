#!/usr/bin/env node
/**
 * Apply the 80 ms equal-power fade to every live Tom-006 intro of a course (job #794). Each faded clip is a NEW course_audio row; pointers move through
 * the ledger; the unfaded clip stays. Ledger: ops/794-tom006-intros/<course>-fade-ledger.jsonl (kinds render|swap|partial|undo, oldId = the unfaded id).
 *   node tools/audio/tom006-fade.cjs --course deu_for_eng [--limit N] [--bump-every 25] [--dry-run]
 *   node tools/audio/tom006-fade.cjs --course deu_for_eng --undo [--dry-run]
 */
const fs = require('fs'), path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../../.env.psql'), quiet: true })
const { Client } = require('pg')
const { createClient } = require('@supabase/supabase-js')
const { bumpCourseVersion } = require('../../services/shared/course-version.cjs')
const { serviceIdentity } = require('../../services/shared/editor-identity.cjs')
const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs')
const { ledgerState, undoPlan, makeLog, undoRecordable, fadedAtRender } = require('./tom006-ledger.cjs')
const { makeFaded } = require('./tom006-fade-lib.cjs')
const argv = process.argv.slice(2), opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d }, has = f => argv.includes(f)
const course = opt('--course'); if (!course) { console.error('--course required'); process.exit(1) }
const dir = path.join(__dirname, '../../ops/794-tom006-intros'), ledger = path.join(dir, `${course}-fade-ledger.jsonl`), mainLedger = path.join(dir, `${course}-ledger.jsonl`)
const read = f => fs.existsSync(f) ? fs.readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : []
const dryRun = has('--dry-run')
const log = makeLog(ledger, dryRun)
function supa() {
  if (!process.env.SUPABASE_URL) for (const p of ['/home/tomcassidy/ssi-dashboard-v7-clean/.env', '/home/tomcassidy/SSi/ssi-dashboard-v7-clean-prod/.env'])
    if (fs.existsSync(p)) for (const l of fs.readFileSync(p, 'utf8').split('\n')) { const m = /^(SUPABASE_URL|SUPABASE_SERVICE_KEY)=(.*)$/.exec(l.trim()); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '') }
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
}
const { mayPoint } = require('../../services/shared/resolve-voice.cjs')   // job #53: every pointer this tool writes is checked against resolveVoice
const setPointer = async (db, s, from, to, ev, restore = false) => {
  if (!await mayPoint(db, { courseCode: course, col: 'presentation_audio_id', to, restore })) return false
  const { data, error } = await db.from(s.tbl).update({ presentation_audio_id: to, last_edit_event_id: ev }).eq('id', s.key).eq('presentation_audio_id', from).select('id')
  if (error) throw new Error(error.message); return data && data.length === 1
}
;(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect(); const db = supa()
  const identity = serviceIdentity('tom006-fade-794'); let eventId = null
  const event = async () => eventId || (eventId = await recordContentEdit(db, { identity, courseCode: course, surface: 'tools:audio/tom006-fade', operation: 'update', detail: { why: 'Tom 2026-10-12 job #794: 80 ms fade re-apply, new rows; old ids in ledger', ledger } }))
  const slotsOf = async id => (await pg.query(`select 'course_legos' tbl, id::text key from course_legos where course_code=$1 and presentation_audio_id::text=$2::text
      union all select 'course_practice_phrases', id::text from course_practice_phrases where course_code=$1 and presentation_audio_id::text=$2::text and phrase_role is distinct from 'component'`, [course, id])).rows
  if (has('--undo')) {
    let n = 0
    for (const p of undoPlan(read(ledger))) {
      if (dryRun) { console.log('would undo', p.lego_id, p.newId, '->', p.oldId, p.slots.length, 'slots'); n += p.slots.length; continue }
      let moved = 0; for (const s of p.slots) if (await setPointer(db, s, p.newId, p.oldId, await event(), true)) moved++   // conditional: only slots still on newId move
      if (undoRecordable(moved)) log({ kind: 'undo', oldId: p.oldId, newId: p.newId, lego_id: p.lego_id, moved }); else console.log('0 slots moved, NOT recorded as undone:', p.lego_id, p.newId)
      n += moved
    }
    if (n && !dryRun) console.log('content_version', await bumpCourseVersion(db, course, 'patch'))
    console.log(dryRun ? 'would undo' : 'undone slots', n); return pg.end()
  }
  // the unfaded clips = the current pointers of the Tom-006 swaps (newId of each applied swap in the main ledger, minus any since undone)
  const targets = [...ledgerState(read(mainLedger))].filter(([, v]) => v.applied && !fadedAtRender(v.row)).map(([, v]) => v.row)   // only rows whose rawId exists AND differs from newId were faded at render time (--fade80): never fade twice; rawId === newId is an unfaded take
  const limit = Number(opt('--limit', 1e9)), bumpEvery = Number(opt('--bump-every', 25)); let n = 0, sinceBump = 0
  for (const t of targets) {
    if (n >= limit) break
    const srcId = t.newId, prior = ledgerState(read(ledger)).get(srcId)
    if (prior && prior.applied) continue
    const slots = await slotsOf(srcId)
    if (!slots.length) { console.log('skip (source no longer linked)', t.lego_id); continue }
    if (dryRun) { console.log(prior && prior.newId ? 'would re-point' : 'would fade', t.lego_id, srcId); n++; continue }
    let newId = prior && prior.newId
    if (!newId) { const f = await makeFaded(db, srcId); newId = f.newId; log({ kind: 'render', lego_id: t.lego_id, oldId: srcId, newId, eosMs: f.eosMs, durationMs: f.durationMs, slots }) }
    let moved = 0; for (const s of slots) if (await setPointer(db, s, srcId, newId, await event())) moved++
    log({ kind: moved === slots.length ? 'swap' : 'partial', lego_id: t.lego_id, oldId: srcId, newId, moved, slots })
    n++; sinceBump += moved; console.log(`${t.lego_id} ${srcId} -> ${newId} ${moved}/${slots.length}`)
    if (n === 1 || sinceBump >= bumpEvery) { console.log('content_version', await bumpCourseVersion(db, course, 'patch')); sinceBump = 0 }
  }
  if (sinceBump && !dryRun) console.log('content_version', await bumpCourseVersion(db, course, 'patch'))
  console.log(`${dryRun ? 'dry run: ' : ''}faded ${n}`); await pg.end()
})().catch(e => { console.error(e); process.exit(1) })
