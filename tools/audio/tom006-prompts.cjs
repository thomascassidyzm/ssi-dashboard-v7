#!/usr/bin/env node
/**
 * Tom-006 English known PROMPTS, seeds 1-100 of deu/spa/fra/ita_for_eng (job #818, Tom 2026-10-12). Raw takes, NO fade (fade is for intros only).
 * One render per distinct English text (ops/818-tom006-prompts/plan.cjs -> plan.json), every known_audio_id slot (seeds/legos/phrases, all four courses,
 * seed<=100) on that text's old clips repointed to it. Old clips are never deleted. Undo ledger: ops/818-tom006-prompts/ledger.jsonl (same pair format as #794).
 *   node tools/audio/tom006-prompts.cjs [--limit N] [--conc 5] [--dry-run]      resumable: a recorded render is re-pointed, never re-rendered
 *   node tools/audio/tom006-prompts.cjs --undo [--dry-run]
 */
const fs = require('fs'), path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../../.env.psql'), quiet: true })
const { Client } = require('pg')
const { createClient } = require('@supabase/supabase-js')
const { bumpCourseVersion } = require('../../services/shared/course-version.cjs')
const { serviceIdentity } = require('../../services/shared/editor-identity.cjs')
const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs')
const { ledgerPairs, undoPlan, makeLog } = require('./tom006-ledger.cjs')
const T6 = 'cartesia_d293d509-eb96-4df4-8cfd-80a693aa49a9', COURSES = ['deu_for_eng', 'spa_for_eng', 'fra_for_eng', 'ita_for_eng']
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '')
const argv = process.argv.slice(2), opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d }, has = f => argv.includes(f)
const dir = path.join(__dirname, '../../ops/818-tom006-prompts'), ledger = path.join(dir, 'ledger.jsonl'), dryRun = has('--dry-run')
const lines = () => fs.existsSync(ledger) ? fs.readFileSync(ledger, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : []
const log = makeLog(ledger, dryRun)
function supa() {
  if (!process.env.SUPABASE_URL) for (const p of [path.join(__dirname, '../../.env')])
    if (fs.existsSync(p)) for (const l of fs.readFileSync(p, 'utf8').split('\n')) { const m = /^(SUPABASE_URL|SUPABASE_SERVICE_KEY)=(.*)$/.exec(l.trim()); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '') }
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
}
const setPointer = async (db, s, from, to, ev) => {
  const { data, error } = await db.from(s.tbl).update({ known_audio_id: to, last_edit_event_id: ev }).eq('id', s.key).eq('known_audio_id', from).select('id')
  if (error) throw new Error(error.message); return data && data.length === 1
}
;(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect(); const db = supa()
  const identity = serviceIdentity('tom006-prompts-818'), events = {}, touched = new Set()
  const event = async course => events[course] || (events[course] = recordContentEdit(db, { identity, courseCode: course, surface: 'tools:audio/tom006-prompts', operation: 'update', detail: { why: 'Tom 2026-10-12 job #818: Tom-006 English known prompts seeds 1-100; old ids in ledger', ledger } }))
  const courseOf = new Map()
  const slotsOf = async old => { const r = (await pg.query(`select 'course_seeds' tbl,id::text key,course_code from course_seeds where known_audio_id::text=$1 and course_code=any($2) and seed_number<=100
      union all select 'course_legos',id::text,course_code from course_legos where known_audio_id::text=$1 and course_code=any($2) and seed_number<=100
      union all select 'course_practice_phrases',id::text,course_code from course_practice_phrases where known_audio_id::text=$1 and course_code=any($2) and seed_number<=100`, [old, COURSES])).rows
    r.forEach(s => courseOf.set(`${s.tbl}:${s.key}`, s.course_code)); return r.map(s => ({ tbl: s.tbl, key: s.key })) }
  const move = async (slots, from, to) => { let n = 0; for (const s of slots) { const c = courseOf.get(`${s.tbl}:${s.key}`) || COURSES[0]; if (await setPointer(db, s, from, to, await event(c))) { n++; touched.add(c) } } return n }
  const bump = async () => { for (const c of touched) console.log('content_version', c, await bumpCourseVersion(db, c, 'patch')); touched.clear() }

  if (has('--undo')) {
    let n = 0
    for (const p of undoPlan(lines())) {
      const slots = p.slots; if (dryRun) { n += slots.length; continue }
      const m = await move(slots, p.newId, p.oldId); log({ kind: 'undo', oldId: p.oldId, newId: p.newId, lego_id: p.lego_id, moved: m }); n += m
    }
    if (!dryRun) await bump(); console.log(dryRun ? 'would undo' : 'undone slots', n); return pg.end()
  }
  const recorded = new Map()   // text key -> rendered newId (a render row is write-ahead: on record before any pointer moves)
  for (const e of lines()) if (e.kind === 'render' && e.key) recorded.set(e.key, e.newId)
  const pairsDone = new Set(ledgerPairs(lines()).filter(p => p.applied).map(p => `${p.oldId}|${p.newId}`))
  const plan = JSON.parse(fs.readFileSync(path.join(dir, 'plan.json'), 'utf8')), limit = Number(opt('--limit', 1e9)), conc = Number(opt('--conc', 5))
  const held = []; let n = 0, spent = 0, rendered = 0, moved = 0, stop = false, sinceBump = 0, i = 0
  const one = async p => {
    let newId = recorded.get(p.key)
    if (!newId) {   // reuse before any send: an existing Tom-006 English clip with this text (punctuation/case-insensitive) is repointed to, never re-rendered
      const { rows: [ex] } = await pg.query(`select id::text from course_audio where voice_id=$1 and language='eng' and role in ('known','target1','target2') and s3_key is not null and duration_ms>300
        and regexp_replace(lower(text),'[^a-z0-9 ]','','g')=$2 order by created_at desc limit 1`, [T6, p.key])
      if (ex) { newId = ex.id; recorded.set(p.key, newId); log({ kind: 'render', key: p.key, text: p.text, newId, oldId: '-', source: 'reused-existing', charsSpent: 0 }) }
    }
    if (!newId) {
      if (dryRun) { console.log('would render', JSON.stringify(p.text)); return }
      const res = await fetch(`${POPTY}/api/audio/render`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': 'job-818' },
        body: JSON.stringify({ courseCode: COURSES[0], role: 'known', text: p.text, language: 'eng', voiceId: T6, voiceBound: true, job: '#818', purpose: '#818 Tom-006 English prompt seeds 1-100' }) })
      const r = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))
      if (!res.ok || !r.ok) { log({ kind: 'refused', key: p.key, text: p.text, r }); console.log('REFUSED —', r.code, p.text); if (r.code === 'REPEAT') { held.push(p.text); return } stop = true; return }   // REPEAT: hold this one text over (never retried, guard untouched); anything else stops the run
      const { rows: [ca] } = await pg.query('select voice_id, role, language, s3_key, duration_ms from course_audio where id=$1', [r.audioId])
      if (!ca || ca.voice_id !== T6 || !ca.s3_key || !(ca.duration_ms > 300)) { log({ kind: 'verify-failed', key: p.key, r, ca }); console.log('VERIFY FAILED — stopping:', p.text, JSON.stringify(ca)); stop = true; return }
      newId = r.audioId; recorded.set(p.key, newId); spent += r.charsSpent || 0; rendered++
      log({ kind: 'render', key: p.key, text: p.text, newId, oldId: '-', source: r.source, charsSpent: r.charsSpent || 0 })
    }
    for (const old of p.oldClips) {
      if (pairsDone.has(`${old}|${newId}`)) continue
      const slots = await slotsOf(old); if (!slots.length) continue
      const m = await move(slots, old, newId); moved += m; sinceBump += m
      log({ kind: m === slots.length ? 'swap' : 'partial', oldId: old, newId, lego_id: p.key, key: p.key, moved: m, slots })
    }
  }
  const queue = plan.slice(); const workers = Array.from({ length: conc }, async () => {
    while (!stop && n < limit) { const p = queue.shift(); if (!p) return; n++; await one(p); if (n % 200 === 0) console.log(`${n}/${plan.length} items, ${rendered} rendered, ${spent} chars, ${moved} slots moved`); if (sinceBump >= 3000) { sinceBump = 0; await bump() } }
  })
  await Promise.all(workers); if (!dryRun) await bump()
  console.log(`${dryRun ? 'dry run: ' : ''}${n} items, ${rendered} rendered, ${spent} chars, ${moved} slots moved${stop ? ' (STOPPED)' : ''}; held over by REPEAT guard: ${held.length}`); if (held.length) fs.writeFileSync(path.join(dir, 'held-repeat.json'), JSON.stringify(held, null, 1)); await pg.end()
})().catch(e => { console.error(e); process.exit(1) })
