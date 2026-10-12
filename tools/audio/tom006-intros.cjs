#!/usr/bin/env node
/**
 * Tom-006 whole presentation intros, seeds 1-100 (job #794, Tom 2026-10-12): render each planned intro ONCE through the Popty render route
 * (voice-bound, lang eng, role presentation), verify voice + freshness, repoint presentation_audio_id as each clip lands, bump content_version.
 * Plan: ops/794-tom006-intros/plan.cjs -> <course>.plan.json (as-in only at score 3-5). Old clips are never deleted. Undo ledger: ops/794-tom006-intros/<course>-ledger.jsonl.
 *   node tools/audio/tom006-intros.cjs --course deu_for_eng [--limit N] [--bump-every 20] [--dry-run]
 *   node tools/audio/tom006-intros.cjs --course deu_for_eng --undo
 */
const fs = require('fs'), path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../../.env.psql'), quiet: true })
const { Client } = require('pg')
const { createClient } = require('@supabase/supabase-js')
const { bumpCourseVersion } = require('../../services/shared/course-version.cjs')
const { serviceIdentity } = require('../../services/shared/editor-identity.cjs')
const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs')
const T6 = 'cartesia_d293d509-eb96-4df4-8cfd-80a693aa49a9'
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '')
const argv = process.argv.slice(2), opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d }, has = f => argv.includes(f)
const course = opt('--course'); if (!course) { console.error('--course required'); process.exit(1) }
const dir = path.join(__dirname, '../../ops/794-tom006-intros'), ledger = path.join(dir, `${course}-ledger.jsonl`)
const lines = () => fs.existsSync(ledger) ? fs.readFileSync(ledger, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : []
const log = e => fs.appendFileSync(ledger, JSON.stringify({ ...e, at: new Date().toISOString() }) + '\n')
function supa() {
  if (!process.env.SUPABASE_URL) for (const p of [path.join(__dirname, '../../.env'), '/home/tomcassidy/ssi-dashboard-v7-clean/.env', '/home/tomcassidy/SSi/ssi-dashboard-v7-clean-prod/.env'])
    if (fs.existsSync(p)) for (const l of fs.readFileSync(p, 'utf8').split('\n')) { const m = /^(SUPABASE_URL|SUPABASE_SERVICE_KEY)=(.*)$/.exec(l.trim()); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '') }
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
}
const setPointer = async (db, s, from, to, ev) => {
  const { data, error } = await db.from(s.tbl).update({ presentation_audio_id: to, last_edit_event_id: ev }).eq('id', s.key).eq('presentation_audio_id', from).select('id')
  if (error) throw new Error(error.message); return data && data.length === 1
}
;(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect(); const db = supa()
  const identity = serviceIdentity('tom006-intros-794')
  const event = await recordContentEdit(db, { identity, courseCode: course, surface: 'tools:audio/tom006-intros', operation: 'update', detail: { why: 'Tom 2026-10-12 job #794: Tom-006 presentation intros; old ids in ledger', ledger } })
  if (has('--undo')) {
    let n = 0
    for (const e of lines().filter(x => x.kind === 'swap').reverse()) { for (const s of e.slots) if (await setPointer(db, s, e.newId, e.oldId, event)) n++ }
    if (n) console.log('content_version', await bumpCourseVersion(db, course, 'patch')); console.log('undone slots', n); return pg.end()
  }
  const plan = JSON.parse(fs.readFileSync(path.join(dir, `${course}.plan.json`), 'utf8')).filter(o => o.newText && o.oldClip)
  const done = new Set(lines().filter(x => x.kind === 'swap').map(x => x.oldId))
  const limit = Number(opt('--limit', 1e9)), bumpEvery = Number(opt('--bump-every', 20)); let n = 0, spent = 0, sinceBump = 0
  for (const o of plan) {
    if (n >= limit) break
    if (done.has(o.oldClip)) continue
    const { rows: slots } = await pg.query(`select 'course_legos' tbl, id::text key from course_legos where course_code=$1 and presentation_audio_id::text=$2::text
      union all select 'course_practice_phrases', id::text from course_practice_phrases where course_code=$1 and presentation_audio_id::text=$2::text and phrase_role is distinct from 'component'`, [course, o.oldClip])
    if (!slots.length) { log({ kind: 'skip', lego_id: o.lego_id, why: 'old clip no longer linked' }); continue }
    if (has('--dry-run')) { console.log('would render', o.lego_id, o.newText, slots.length, 'slots'); n++; continue }
    const res = await fetch(`${POPTY}/api/audio/render`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': 'job-794' },
      body: JSON.stringify({ courseCode: course, role: 'presentation', text: o.newText, language: 'eng', voiceId: T6, voiceBound: true, job: '#794', purpose: `#794 Tom-006 intro ${o.lego_id}` }) })
    const r = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))
    if (!res.ok || !r.ok) { log({ kind: 'refused', lego_id: o.lego_id, text: o.newText, r }); console.log('REFUSED — stopping, no retry:', o.lego_id, JSON.stringify(r)); break }
    const { rows: [ca] } = await pg.query('select id::text, voice_id, text, s3_key, duration_ms, created_at from course_audio where id=$1', [r.audioId])
    const fresh = ca && Date.now() - new Date(ca.created_at).getTime() < 15 * 60e3
    if (!ca || ca.voice_id !== T6 || !ca.s3_key || !(ca.duration_ms > 500)) { log({ kind: 'verify-failed', lego_id: o.lego_id, r, ca }); console.log('VERIFY FAILED — stopping:', o.lego_id, JSON.stringify(ca)); break }
    log({ kind: 'swap', lego_id: o.lego_id, seed: o.seed, oldId: o.oldClip, newId: r.audioId, oldVoice: o.oldVoice, source: r.source, fresh, charsSpent: r.charsSpent || 0, score: o.score, asIn: o.keepAsIn, text: o.newText, slots: slots.map(s => ({ tbl: s.tbl, key: s.key })) })
    let moved = 0; for (const s of slots) if (await setPointer(db, s, o.oldClip, r.audioId, event)) moved++
    n++; spent += r.charsSpent || 0; sinceBump += moved
    console.log(`${o.lego_id} -> ${r.audioId} (${r.source}${fresh ? ', fresh' : ''}) ${moved}/${slots.length} slots, ${r.charsSpent || 0} chars`)
    if (n === 1 || sinceBump >= bumpEvery) { console.log('content_version', await bumpCourseVersion(db, course, 'patch')); sinceBump = 0 }
  }
  if (sinceBump) console.log('content_version', await bumpCourseVersion(db, course, 'patch'))
  console.log(`done ${n} this run, ${spent} chars`); await pg.end()
})().catch(e => { console.error(e); process.exit(1) })
