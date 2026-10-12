#!/usr/bin/env node
/**
 * Tom-006 ENGLISH, step 1 (job #813, Tom 2026-10-12, r-2026-10-12-tom-006-english-order): every live English KNOWN prompt whose text has NO Cartesia clip in any voice
 * gets ONE Tom-006 take (Cartesia d293d509), RAW (no fade: the 80 ms fade is for intros only). Existing Cartesia clips are never touched. Reuse is by (language, text)
 * across courses, so a rendered text repoints EVERY live (released/beta) course's known slot that holds a non-Cartesia clip of that text. Old rows are never deleted.
 * Queue = the --course's known slots in first-heard seed order; one render per distinct text through Popty's ONE route (voice-bound, no retry on refusal).
 * Ledger (write-ahead): ops/813-tom006-english/ledger.jsonl.   Undo: --undo (appends {kind:undo}, repoints back with before-state asserted, bumps versions).
 *   node tools/audio/tom006-english.cjs --course deu_for_eng --budget 99000 [--limit N] [--concurrency 3] [--dry-run]
 *   node tools/audio/tom006-english.cjs --undo [--dry-run]
 */
const fs = require('fs'), path = require('path')
for (const p of [path.join(__dirname, '../../.env.psql'), '/home/tomcassidy/ssi-dashboard-v7-clean/.env.psql']) if (fs.existsSync(p)) { require('dotenv').config({ path: p, quiet: true }); break }
const { Client } = require('pg')
const { createClient } = require('@supabase/supabase-js')
const { bumpCourseVersion } = require('../../services/shared/course-version.cjs')
const { serviceIdentity } = require('../../services/shared/editor-identity.cjs')
const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs')
const T6 = 'cartesia_d293d509-eb96-4df4-8cfd-80a693aa49a9'
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '')
const argv = process.argv.slice(2), opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d }, has = f => argv.includes(f)
const dryRun = has('--dry-run')
const dir = path.join(__dirname, '../../ops/813-tom006-english'), ledger = path.join(dir, 'ledger.jsonl')
const lines = () => fs.existsSync(ledger) ? fs.readFileSync(ledger, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : []
const log = e => { if (!dryRun) fs.appendFileSync(ledger, JSON.stringify({ ...e, at: new Date().toISOString() }) + '\n') }
function supa() {
  if (!process.env.SUPABASE_URL) for (const p of [path.join(__dirname, '../../.env'), '/home/tomcassidy/ssi-dashboard-v7-clean/.env'])
    if (fs.existsSync(p)) for (const l of fs.readFileSync(p, 'utf8').split('\n')) { const m = /^(SUPABASE_URL|SUPABASE_SERVICE_KEY)=(.*)$/.exec(l.trim()); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '') }
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
}
const setPointer = async (db, s, from, to, ev) => {
  const { data, error } = await db.from(s.tbl).update({ known_audio_id: to, last_edit_event_id: ev }).eq('id', s.key).eq('known_audio_id', from).select('id')
  if (error) throw new Error(error.message); return !!data && data.length === 1
}
// ledger state: slots currently moved (renders/swaps minus undos), per text
const TABLES = ['course_seeds', 'course_legos', 'course_practice_phrases']
;(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect(); await pg.query('set statement_timeout=0'); const db = supa()
  const identity = serviceIdentity('tom006-english-813'), events = new Map(), touched = new Set()
  const event = async course => { if (!events.has(course)) events.set(course, await recordContentEdit(db, { identity, courseCode: course, surface: 'tools:audio/tom006-english', operation: 'update', detail: { why: 'Tom 2026-10-12 job #813: English known prompts with no Cartesia clip -> Tom-006; old ids in ledger', ledger } })); return events.get(course) }
  const bump = async () => { for (const c of touched) console.log('content_version', c, await bumpCourseVersion(db, c, 'patch')); touched.clear() }

  if (has('--undo')) {
    // newest first; a swap row lists {tbl,key,course,from,to}; skip slots already undone (before-state assertion handles it too)
    const rows = lines().filter(e => e.kind === 'swap'); let n = 0
    for (const e of rows.reverse()) for (const s of e.slots) {
      if (dryRun) { console.log('would undo', s.tbl, s.key, e.newId, '->', s.from); n++; continue }
      if (await setPointer(db, s, e.newId, s.from, await event(s.course))) { touched.add(s.course); n++ }
    }
    if (!dryRun) { log({ kind: 'undo', n }); await bump() }
    console.log(dryRun ? 'would undo' : 'undone slots', n); return pg.end()
  }

  const course = opt('--course'); if (!course) { console.error('--course required'); process.exit(1) }
  const budget = Number(opt('--budget', 99000)), limit = Number(opt('--limit', 1e9)), conc = Number(opt('--concurrency', 3))
  // queue: this course's known clips that are non-Cartesia and whose text has no Cartesia clip anywhere (English), first-heard order
  const { rows: queue } = await pg.query(`
    with s as (
      select seed_number pos, known_audio_id kid from course_seeds where course_code=$1 and known_audio_id is not null
      union all select seed_number, known_audio_id from course_legos where course_code=$1 and known_audio_id is not null
      union all select seed_number, known_audio_id from course_practice_phrases where course_code=$1 and known_audio_id is not null)
    select ca.text_normalized t, min(ca.text) tx, min(s.pos) pos from s join course_audio ca on ca.id=s.kid
    where ca.language in ('eng','en') and ca.role='known' and ca.voice_id not like 'cartesia\\_%'
      and not exists (select 1 from course_audio c2 where c2.language in ('eng','en') and c2.text_normalized=ca.text_normalized and c2.voice_id like 'cartesia\\_%')
    group by 1 order by 3 nulls last, 1`, [course])
  console.log('queue', queue.length, 'distinct texts,', queue.reduce((a, q) => a + q.tx.length, 0), 'chars')
  const done = new Set(lines().filter(e => e.kind === 'swap').map(e => e.t))
  let spent = 0, n = 0, slotsMoved = 0, stop = false, idx = 0, sinceBump = 0
  const oneSlotsOf = async t => {
    const { rows: olds } = await pg.query(`select id::text from course_audio where text_normalized=$1 and language in ('eng','en') and role='known' and voice_id not like 'cartesia\\_%'`, [t])
    const ids = olds.map(r => r.id); if (!ids.length) return []
    const out = []
    for (const tbl of TABLES) {
      const { rows } = await pg.query(`select x.id::text key, x.course_code course, x.known_audio_id::text "from" from ${tbl} x join courses c on c.course_code=x.course_code
        where x.known_audio_id::text = any($1::text[]) and c.status in ('released','beta')`, [ids])
      out.push(...rows.map(r => ({ tbl, ...r })))
    }
    return out
  }
  const worker = async () => {
    while (!stop) {
      const q = queue[idx++]; if (!q || n >= limit) return
      if (done.has(q.t)) continue
      if (spent + q.tx.length > budget) { stop = true; return }
      // REUSE FIRST (Tom/Watson 2026-10-12, spend guard tripped on repeats): a Tom-006 known row with this text already exists (another job rendered it) -> repoint only, never render again
      if (!dryRun) {
        const { rows: [ex] } = await pg.query(`select id::text from course_audio where text_normalized=$1 and language in ('eng','en') and role='known' and voice_id=$2 and s3_key is not null and s3_key not like 'pending/%' and duration_ms>200 order by created_at limit 1`, [q.t, T6])
        if (ex) {
          const slots = await oneSlotsOf(q.t); log({ kind: 'reuse', t: q.t, newId: ex.id, slots })
          const moved = []; for (const s of slots) if (await setPointer(db, s, s.from, ex.id, await event(s.course))) { moved.push(s); touched.add(s.course) }
          log({ kind: 'swap', t: q.t, newId: ex.id, slots: moved, wanted: slots.length, reused: true }); n++; slotsMoved += moved.length; sinceBump += moved.length; continue
        }
      }
      spent += q.tx.length   // reserve
      const res = await fetch(`${POPTY}/api/audio/render`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': 'job-813' },
        body: JSON.stringify({ courseCode: course, role: 'known', text: q.tx, language: 'eng', voiceId: T6, voiceBound: true, job: '#813', dryRun, purpose: `#813 Tom-006 step 1 English known (seed ${q.pos})` }) })
      const r = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))
      if (dryRun) { n++; spent += (r.wouldSpendChars || 0) - q.tx.length; if (!r.ok) { console.log('DRY REFUSED', q.tx, JSON.stringify(r)); stop = true } continue }
      if (!res.ok || !r.ok) { spent -= q.tx.length; log({ kind: 'refused', t: q.t, r }); console.log('REFUSED — stopping, no retry:', JSON.stringify(r)); stop = true; return }
      spent += (r.charsSpent || 0) - q.tx.length
      const { rows: [ca] } = await pg.query('select id::text, voice_id, s3_key, duration_ms, created_at from course_audio where id=$1', [r.audioId])
      if (!ca || ca.voice_id !== T6 || !ca.s3_key || ca.s3_key.startsWith('pending/') || !(ca.duration_ms > 200)) { log({ kind: 'verify-failed', t: q.t, r, ca }); console.log('VERIFY FAILED — stopping:', q.tx, JSON.stringify(ca)); stop = true; return }
      const slots = await oneSlotsOf(q.t)
      log({ kind: 'render', t: q.t, newId: r.audioId, source: r.source, charsSpent: r.charsSpent || 0, slots })   // write-ahead
      let moved = []
      for (const s of slots) if (await setPointer(db, s, s.from, r.audioId, await event(s.course))) { moved.push(s); touched.add(s.course) }
      log({ kind: 'swap', t: q.t, newId: r.audioId, slots: moved, wanted: slots.length })
      n++; slotsMoved += moved.length; sinceBump += moved.length
      if (n <= 3 || n % 25 === 0) console.log(`#${n} seed ${q.pos} ${r.source} ${moved.length}/${slots.length} slots, spent ${spent}: ${q.tx.slice(0, 50)}`)
      if (n === 1) { console.log('PROOF', q.tx, '->', r.audioId, JSON.stringify(moved.slice(0, 3))); await bump(); sinceBump = 0; if (has('--proof-only')) stop = true }
      else if (sinceBump >= 400) { await bump(); sinceBump = 0 }
    }
  }
  await Promise.all(Array.from({ length: conc }, worker))
  if (!dryRun) await bump()
  console.log(`${dryRun ? 'dry run: ' : ''}rendered/handled ${n} texts, ${slotsMoved} slots repointed, ${spent} chars`); await pg.end()
})().catch(e => { console.error(e); process.exit(1) })
