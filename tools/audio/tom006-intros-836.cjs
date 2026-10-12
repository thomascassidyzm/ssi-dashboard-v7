#!/usr/bin/env node
/**
 * Tom-006 whole presentation intros, seeds 101-668 (and 1-668 for the seven courses #794 does not own) — job #836, Tom 2026-10-12
 * (r-2026-10-12-goal-by-the-23-oct-reset). Same method as tools/audio/tom006-intros.cjs (#794: one render through Popty's one route, voice-bound, 80 ms fade
 * into a NEW row BEFORE any pointer moves), with the lane-review fixes the #813 prompt driver needed:
 *   - REUSE FIRST by text: an existing Tom-006 presentation row with the identical text (any course; the text names the language) is repointed to, never re-rendered
 *     (faded row if one exists; else the raw row is faded into a new row, no spend).
 *   - INTENT JOURNAL: {newId, slots with from-ids} is written BEFORE any pointer moves, reuse included; --undo reads it.
 *   - content_version bumped every --bump-every moved slots AND in a finally; --dry-run renders nothing, moves nothing, bumps nothing, writes nothing.
 *   - one work item per DISTINCT new text (slots of every old clip that text replaces), so no two takes of one text and no unique-key race on the faded row.
 * Plan: ops/836-tom006-intros/plan.cjs -> <course>.plan.json.  Ledger: ops/836-tom006-intros/<course>-ledger.jsonl.  Every render carries "job" (default #813, the job-scoped approval).
 *   node tools/audio/tom006-intros-836.cjs --course zho_for_eng [--limit N] [--bump-every 100] [--concurrency 3] [--job '#813'] [--dry-run]
 *   node tools/audio/tom006-intros-836.cjs --course zho_for_eng --undo [--dry-run]
 */
const fs = require('fs'), path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../../.env.psql'), quiet: true })
const { Client } = require('pg')
const { createClient } = require('@supabase/supabase-js')
const { bumpCourseVersion } = require('../../services/shared/course-version.cjs')
const { serviceIdentity } = require('../../services/shared/editor-identity.cjs')
const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs')
const { makeFaded, MARKER } = require('./tom006-fade-lib.cjs')
const { defaultRange } = require('./tom006-intros-plan.cjs')
const T6 = 'cartesia_d293d509-eb96-4df4-8cfd-80a693aa49a9'
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '')
const argv = process.argv.slice(2), opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d }, has = f => argv.includes(f)
const course = opt('--course'); if (!course) { console.error('--course required'); process.exit(1) }
const dryRun = has('--dry-run'), JOB = opt('--job', '#813')
const dir = path.join(__dirname, '../../ops/836-tom006-intros'), ledger = path.join(dir, `${course}-ledger.jsonl`)
const lines = () => fs.existsSync(ledger) ? fs.readFileSync(ledger, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : []
const log = e => { if (!dryRun) fs.appendFileSync(ledger, JSON.stringify({ ...e, at: new Date().toISOString() }) + '\n') }
function supa() {
  if (!process.env.SUPABASE_URL) for (const p of [path.join(__dirname, '../../.env'), '/home/tomcassidy/ssi-dashboard-v7-clean/.env', '/home/tomcassidy/SSi/ssi-dashboard-v7-clean-prod/.env'])
    if (fs.existsSync(p)) for (const l of fs.readFileSync(p, 'utf8').split('\n')) { const m = /^(SUPABASE_URL|SUPABASE_SERVICE_KEY)=(.*)$/.exec(l.trim()); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '') }
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
}
const setPointer = async (db, s, from, to, ev) => {
  const { data, error } = await db.from(s.tbl).update({ presentation_audio_id: to, last_edit_event_id: ev }).eq('id', s.key).eq('presentation_audio_id', from).select('id')
  if (error) throw new Error(error.message); return !!data && data.length === 1
}
const fetchRetry = async (url, init) => { for (let a = 1; ; a++) { try { return await fetch(url, init) } catch (e) { if (a >= 8) throw e; await new Promise(r => setTimeout(r, 15000)) } } }
let stopFlag = false; process.on('SIGTERM', () => { stopFlag = true; console.log('SIGTERM: finishing in-flight clips, then exit') })
;(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect(); await pg.query('set statement_timeout=0'); const db = supa()
  const identity = serviceIdentity('tom006-intros-836'); let eventId = null
  const event = async () => eventId || (eventId = await recordContentEdit(db, { identity, courseCode: course, surface: 'tools:audio/tom006-intros-836', operation: 'update', detail: { why: 'Tom 2026-10-12 job #836: Tom-006 faded presentation intros, seeds 101-668; old ids in ledger', ledger } }))
  let touched = 0; const BUMP_EVERY = Number(opt('--bump-every', 100))
  const bump = async () => { if (dryRun || !touched) return; touched = 0; console.log('content_version', await bumpCourseVersion(db, course, 'patch')) }
  const touch = async k => { touched += k; if (touched >= BUMP_EVERY) await bump() }

  if (has('--undo')) {
    // every intent/swap slot -> its ORIGINAL from-id; the before-check (newId must still be on the slot) keeps it safe; 'undone' rows remove slots already reverted
    const rows = lines(), orig = new Map()
    for (const e of rows) if (['intent', 'swap'].includes(e.kind)) for (const s of e.slots || []) if (s.from) { const k = `${s.tbl}:${s.key}`; if (!orig.has(k)) orig.set(k, { s, cur: e.newId }); else orig.get(k).cur = e.newId }
    for (const e of rows) if (e.kind === 'undone') for (const k of e.keys) orig.delete(k)
    let n = 0; const done = []
    try {
      for (const [k, { s, cur }] of [...orig].reverse()) {
        if (dryRun) { console.log('would undo', k, cur, '->', s.from); n++; continue }
        if (await setPointer(db, s, cur, s.from, await event())) { await touch(1); n++ }
        done.push(k)
      }
    } finally { if (!dryRun) { log({ kind: 'undone', keys: done }); await bump() } }
    console.log(dryRun ? 'would undo' : 'undone slots', n); return pg.end()
  }

  const { from, to } = { ...defaultRange(course), ...(opt('--from') ? { from: Number(opt('--from')) } : {}) }
  const plan = JSON.parse(fs.readFileSync(path.join(dir, `${course}.plan.json`), 'utf8')).filter(o => o.newText && o.oldClip && !o.alreadyT6 && o.seed >= from && o.seed <= to)
  const byText = new Map(); for (const o of plan) { if (!byText.has(o.newText)) byText.set(o.newText, { newText: o.newText, oldClips: new Set(), first: o }); byText.get(o.newText).oldClips.add(o.oldClip) }
  const items = [...byText.values()].sort((a, b) => a.first.seed - b.first.seed)
  const slotsOf = async oldClips => {
    const ids = [...oldClips]
    const { rows } = await pg.query(`select 'course_legos' tbl, id::text key, presentation_audio_id::text "from" from course_legos where course_code=$1 and seed_number between $3 and $4 and presentation_audio_id = any($2::text[])
      union all select 'course_practice_phrases', id::text, presentation_audio_id::text from course_practice_phrases where course_code=$1 and seed_number between $3 and $4 and presentation_audio_id = any($2::uuid[]) and phrase_role is distinct from 'component'`, [course, ids, from, to])
    return rows
  }
  const t6Row = async text => (await pg.query(`select id::text, voice_id, s3_key, duration_ms from course_audio where text=$1 and voice_id=$2 and role='presentation' and language='eng' and s3_key is not null and s3_key not like 'pending/%' and duration_ms > 500 order by created_at limit 1`, [text, T6])).rows[0]
  const st = { n: 0, rendered: 0, reused: 0, fadedFromExisting: 0, chars: 0, slots: 0, skipped: 0 }, limit = Number(opt('--limit', 1e9))
  const prior = new Map(); for (const e of lines()) if (e.kind === 'intent') prior.set(e.text, e)   // a crash after the intent re-points to the recorded id, no new take
  console.log(`${course} seeds ${from}-${to}: ${plan.length} legos, ${items.length} distinct texts${dryRun ? ' (DRY RUN)' : ''}`)
  let idx = 0
  const worker = async () => {
    while (!stopFlag && st.n < limit) {
      const it = items[idx++]; if (!it) return
      const slots = await slotsOf(it.oldClips)
      if (!slots.length) { st.skipped++; continue }   // already moved (earlier run) or old clip no longer linked in range
      if (dryRun) { const f = await t6Row(it.newText + MARKER); const r = f ? null : await t6Row(it.newText); console.log(f ? 'would reuse faded' : r ? 'would fade existing raw' : 'would render', it.first.lego_id, it.newText.length, 'chars', slots.length, 'slots'); st.n++; continue }
      let newId, how, chars = 0
      const pri = prior.get(it.newText)
      if (pri) { newId = pri.newId; how = 'recorded' }
      else {
        const faded = await t6Row(it.newText + MARKER)
        if (faded) { newId = faded.id; how = 'reuse' }
        else {
          let raw = await t6Row(it.newText), rawId = raw && raw.id
          if (!raw) {
            // a DROPPED CONNECTION (Popty restarts under auto-deploys) is retried; a refusal never is. A take that completed before the drop comes back as source:'library', free.
            const res = await fetchRetry(`${POPTY}/api/audio/render`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': 'job-836' },
              body: JSON.stringify({ courseCode: course, role: 'presentation', text: it.newText, language: 'eng', voiceId: T6, voiceBound: true, job: JOB, purpose: `#836 Tom-006 intro ${it.first.lego_id}` }) })
            const r = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))
            if (!res.ok || !r.ok) { log({ kind: 'refused', lego_id: it.first.lego_id, text: it.newText, r }); console.log('REFUSED — stopping, no retry:', it.first.lego_id, JSON.stringify(r).slice(0, 400)); stopFlag = true; return }
            const { rows: [ca] } = await pg.query('select id::text, voice_id, s3_key, duration_ms from course_audio where id=$1', [r.audioId])
            if (!ca || ca.voice_id !== T6 || !ca.s3_key || ca.s3_key.startsWith('pending/') || !(ca.duration_ms > 500)) { log({ kind: 'verify-failed', text: it.newText, r, ca }); console.log('VERIFY FAILED — stopping:', it.first.lego_id, JSON.stringify(ca)); stopFlag = true; return }
            rawId = r.audioId; chars = r.charsSpent || 0; how = r.source === 'library' ? 'reuse' : 'render'
            log({ kind: 'raw-render', text: it.newText, rawId, source: r.source, charsSpent: chars })
          } else how = 'reuse'
          try { newId = (await makeFaded(db, rawId)).newId } catch (e) { log({ kind: 'fade-failed', text: it.newText, rawId, error: e.message }); console.log('FADE FAILED — stopping, nothing repointed:', it.first.lego_id, e.message); stopFlag = true; return }
          if (how === 'reuse') st.fadedFromExisting++
        }
      }
      log({ kind: 'intent', text: it.newText, newId, how, slots })   // BEFORE any pointer moves, reuse included: undo reads this
      const moved = []
      for (const s of slots) if (await setPointer(db, s, s.from, newId, await event())) moved.push(s)
      log({ kind: 'swap', text: it.newText, newId, slots: moved, wanted: slots.length, how })
      st.n++; st[how === 'render' ? 'rendered' : 'reused']++; st.chars += chars; st.slots += moved.length
      console.log(`${it.first.lego_id} -> ${newId} (${how}) ${moved.length}/${slots.length} slots, ${chars} chars`)
      await touch(moved.length); if (st.n === 1) await bump()   // the first clip bumps at once so the proof clip is in a version
    }
  }
  try { await Promise.all(Array.from({ length: Number(opt('--concurrency', 3)) }, async () => { try { await worker() } catch (e) { stopFlag = true; console.error(e) } })) } finally { await bump(); await pg.end() }
  console.log(`${course} ${stopFlag ? 'STOPPED' : dryRun ? 'DRY' : 'DONE'}: items ${st.n} (rendered ${st.rendered}, reused ${st.reused}, of which faded from an existing raw row ${st.fadedFromExisting}), slots ${st.slots}, chars ${st.chars}, already-moved/skipped ${st.skipped}`)
})().catch(e => { console.error(e); process.exit(1) })
