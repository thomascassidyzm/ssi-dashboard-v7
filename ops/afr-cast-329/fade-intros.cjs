// job #329: the 80 ms equal-power fade (Tom 2026-10-12, r-2026-10-12-tom-006-intro-clips-get-an) on the Tom-006 afr intros rendered today.
// Same pieces as tools/audio/tom006-fade.cjs (makeFaded -> NEW course_audio row, pointer moved through mayPoint; the unfaded clip stays).
// Ledger: ops/afr-cast-329/fade-ledger.jsonl (oldId = the unfaded clip, for undo).   node fade-intros.cjs [--dry-run]
const fs = require('fs'), path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../../.env.psql'), quiet: true })
require('dotenv').config({ path: path.join(__dirname, '../../.env'), quiet: true })
const { Client } = require('pg')
const { createClient } = require('@supabase/supabase-js')
const { bumpCourseVersion } = require('../../services/shared/course-version.cjs')
const { serviceIdentity } = require('../../services/shared/editor-identity.cjs')
const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs')
const { mayPoint } = require('../../services/shared/resolve-voice.cjs')
const { makeFaded } = require('../../tools/audio/tom006-fade-lib.cjs')
const course = 'afr_for_eng', ledger = path.join(__dirname, 'fade-ledger.jsonl'), dry = process.argv.includes('--dry-run')
;(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect()
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  const { rows } = await pg.query(`select l.lego_id, l.id::text key, l.presentation_audio_id::text old, a.text from course_legos l join course_audio a on a.id::text=l.presentation_audio_id::text
    where l.course_code=$1 and a.voice_id like '%d293d509%' and a.created_at >= '2026-10-13' and a.spliced_from is null order by l.lego_id`, [course])
  let ev = null, n = 0
  for (const r of rows) {
    if (dry) { console.log('would fade', r.lego_id, r.old); n++; continue }
    const f = await makeFaded(db, r.old)
    ev = ev || await recordContentEdit(db, { identity: serviceIdentity('afr-tom006-fade-329'), courseCode: course, surface: 'ops/afr-cast-329/fade-intros', operation: 'update', detail: { why: 'job #329: 80 ms fade on new afr Tom-006 intros; old ids in ledger', ledger } })
    if (!await mayPoint(db, { courseCode: course, col: 'presentation_audio_id', to: f.newId })) { console.log('mayPoint refused', r.lego_id); continue }
    const { data, error } = await db.from('course_legos').update({ presentation_audio_id: f.newId, last_edit_event_id: ev }).eq('id', r.key).eq('presentation_audio_id', r.old).select('id')
    if (error || !data || data.length !== 1) { console.log('pointer not moved', r.lego_id, error && error.message); continue }
    fs.appendFileSync(ledger, JSON.stringify({ kind: 'swap', lego_id: r.lego_id, oldId: r.old, newId: f.newId, eosMs: f.eosMs, durationMs: f.durationMs }) + '\n')
    console.log(r.lego_id, r.old, '->', f.newId, f.eosMs + 'ms'); n++
  }
  if (n && !dry) console.log('content_version', await bumpCourseVersion(db, course, 'patch'))
  console.log(dry ? 'dry run' : 'faded', n); await pg.end()
})().catch(e => { console.error(e); process.exit(1) })
