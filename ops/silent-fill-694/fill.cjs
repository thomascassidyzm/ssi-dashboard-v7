#!/usr/bin/env node
'use strict'
// cs #694·AI — fill silent played-row audio slots through Popty's routes ONLY (no database access of its own).
//   node fill.cjs probe <course> [n=2]     dryRun:true on n slots per role (Popty allows 100 dry runs/hour/caller)
//   node fill.cjs run <course> [--max N]   real: POST /api/audio/render (library first → free; else ONE render), then
//                                          POST /api/production/<course>/link-clip FILL-ONLY (never `replace`)
// Slots come from live/slots.json (plan.py). Held rows (held_text_fix / lego_fix_pending) are never sent.
// Spend: running total of every answer's charsSpent across ALL courses (results/*.jsonl). A render is not sent if
// total + len(text) would pass STOP_AT (45,000 — the brief's "something changed" line; the hard cap is 72,000).
// Resumable: a slot already answered (ok, or refused — a refusal is the answer, never retried) is skipped.
// Options (cs #712·AI): --voice <voiceId> names the voice in every render body (dry run and real) and in each results line;
// without it Popty uses the course's cast voice (tel/mar: the uncast Sept draft → VOICE_NOT_CAST). --dir <path> reads
// <dir>/live/slots.json and writes <dir>/results (default: this directory); --who / --job / --purpose label the calls.
// Slots carrying a non-empty held_job (another live job is changing that row) are held like the #447 holds.
const fs = require('fs'); const path = require('path')
const [mode, course, ...rest] = process.argv.slice(2)
const arg = (k, d) => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : d }
const DIR = path.resolve(arg('--dir', __dirname)); const RES = path.join(DIR, 'results')
const API = 'http://localhost:3470'; const WHO = arg('--who', 'cs-694-silent-fill'); const HARD_CAP = 72000
const STOP_AT = Number(process.env.STOP_AT || 45000)
const VOICE = arg('--voice', null); const JOB = arg('--job', '#694·AI')
const vo = VOICE ? { voiceId: VOICE } : {}
const slots = JSON.parse(fs.readFileSync(path.join(DIR, 'live/slots.json'), 'utf8')).filter(s => s.course === course)
const ARA = fs.existsSync(path.join(__dirname, 'live/ara-candidates.json')) && ['ara_eg_for_eng', 'ara_lb_for_eng'].includes(course)
  ? JSON.parse(fs.readFileSync(path.join(__dirname, 'live/ara-candidates.json'), 'utf8')) : {}
// A lego_debut row whose id is a bare uuid is script-view's stand-in for the LEGO itself: its slot is course_legos (link by legoId).
const slotRef = s => /^[0-9a-f-]{36}$/i.test(s.phraseId) ? { legoId: s.lego } : { phraseId: s.phraseId }
// --roles target1,target2: send only these roles (tel/mar known: one probe answered VOICE_NOT_CAST for the whole language).
const ROLES = arg('--roles', null) ? arg('--roles').split(',') : null
const key = s => `${s.phraseId}|${s.role}`
const readLog = f => fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : []
const spentSoFar = () => fs.readdirSync(RES).filter(f => f.endsWith('.jsonl')).flatMap(f => readLog(path.join(RES, f)))
  .reduce((a, r) => a + (r.dryRun ? 0 : Number(r.render && r.render.charsSpent) || 0), 0)
async function post(url, body) {
  const r = await fetch(API + url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': WHO }, body: JSON.stringify(body) })
  let j; try { j = await r.json() } catch { j = { ok: false, error: 'non-JSON answer' } }
  return { status: r.status, ...j }
}
const held = s => (s.held_text_fix && s.held_text_fix.length) || (s.lego_fix_pending && s.lego_fix_pending.length) || (s.held_job && s.held_job.length)
const purpose = arg('--purpose', 'cs #694·AI: fill a silent played-row slot (paid-course cleanup item 1, Kai approved 18 Nov)')
;(async () => {
  if (!course || !slots.length) { console.error('no slots for', course); process.exit(1) }
  fs.mkdirSync(RES, { recursive: true })
  if (mode === 'probe') {
    const n = Number(/^\d+$/.test(rest[0] || '') ? rest[0] : 2); const out = path.join(RES, `probe-${course}.jsonl`)
    for (const role of ROLES || ['known', 'target1', 'target2']) {
      for (const s of slots.filter(x => x.role === role && !held(x)).slice(0, n)) {
        const r = await post('/api/audio/render', { courseCode: course, role, text: s.text, purpose, job: JOB, ...vo, dryRun: true })
        const rec = { at: new Date().toISOString(), dryRun: true, voiceAsked: VOICE, phraseId: s.phraseId, row: s.row, role, text: s.text, render: r }
        fs.appendFileSync(out, JSON.stringify(rec) + '\n')
        console.log(role, s.row, r.status, r.code || '', r.source || '', r.charsSpent ?? '', r.voiceId || r.voice || '', (r.error || '').slice(0, 140))
      }
    }
    return
  }
  if (mode !== 'run') throw new Error('mode: probe | run')
  const log = path.join(RES, `${course}.jsonl`); const done = new Set(readLog(log).map(r => r.key))
  let spent = spentSoFar(); const max = Number(arg('--max', 1e9)); let sent = 0
  const tally = { linked_library: 0, linked_rendered: 0, refused: {}, link_failed: {}, held: 0, skipped_done: 0, stopped_cap: 0 }
  for (const s of slots) {
    if (ROLES && !ROLES.includes(s.role)) continue
    if (held(s)) { tally.held++; continue }
    if (done.has(key(s))) { tally.skipped_done++; continue }
    if (sent >= max) break
    const len = String(s.text || '').length
    if (spent + len > STOP_AT || spent + len > HARD_CAP) { tally.stopped_cap++; continue }
    // ARABIC ENGLISH PROMPTS WITH THE WORDS ALREADY RECORDED (Kai's hold, 18 Nov): never render. Offer the existing clips to
    // link-clip, fill-only; its voice check accepts only the slot's cast voice. Accepted = a free same-voice link (in scope);
    // every candidate refused (VOICE_MISMATCH) = Kai's held 575, nothing written.
    const cands = ARA[s.phraseId]
    if (cands && cands.length) {
      sent++
      const rec = { at: new Date().toISOString(), key: key(s), phraseId: s.phraseId, row: s.row, lego: s.lego, role: s.role, text: s.text, tries: [] }
      for (const audioId of cands.slice(0, 4)) {
        const l = await post(`/api/production/${course}/link-clip`, { links: [{ ...slotRef(s), role: s.role, audioId }] })
        const one = (l.results && l.results[0]) || l
        const ok = !!(l.ok && one.ok !== false)
        rec.tries.push({ audioId, status: l.status, ok, code: one.code || l.code, error: (one.error || l.error) && String(one.error || l.error).slice(0, 200) })
        if (ok) { rec.render = { ok: true, source: 'library', audioId, charsSpent: 0 }; rec.link = { ok: true, status: l.status }; break }
      }
      if (rec.link) tally.linked_library++
      else { rec.held = 'kai_crossvoice'; tally.held_kai_crossvoice = (tally.held_kai_crossvoice || 0) + 1 }
      fs.appendFileSync(log, JSON.stringify(rec) + '\n')
      continue
    }
    sent++
    const r = await post('/api/audio/render', { courseCode: course, role: s.role, text: s.text, purpose, job: JOB, ...vo, dryRun: false })
    spent += Number(r.charsSpent) || 0
    const rec = { at: new Date().toISOString(), key: key(s), phraseId: s.phraseId, row: s.row, lego: s.lego, role: s.role, text: s.text, voiceAsked: VOICE,
      render: { status: r.status, ok: r.ok, code: r.code, source: r.source, audioId: r.audioId, charsSpent: r.charsSpent, voiceId: r.voiceId, error: r.error && String(r.error).slice(0, 300), existing: r.existing } }
    if (r.ok && r.audioId) {
      const l = await post(`/api/production/${course}/link-clip`, { links: [{ ...slotRef(s), role: s.role, audioId: r.audioId }] })
      const one = (l.results && l.results[0]) || l
      rec.link = { status: l.status, ok: !!(l.ok && one.ok !== false), code: one.code || l.code, error: (one.error || l.error) && String(one.error || l.error).slice(0, 300), eventId: l.eventId || l.event_id }
      if (rec.link.ok) tally[r.source === 'library' ? 'linked_library' : 'linked_rendered']++
      else tally.link_failed[rec.link.code || l.status] = (tally.link_failed[rec.link.code || l.status] || 0) + 1
    } else tally.refused[r.code || r.status] = (tally.refused[r.code || r.status] || 0) + 1
    fs.appendFileSync(log, JSON.stringify(rec) + '\n')
    if (sent % 25 === 0) console.log(new Date().toISOString(), course, 'sent', sent, 'spent(all courses)', spent, JSON.stringify(tally))
  }
  console.log('DONE', course, 'spent(all courses)', spent, JSON.stringify(tally))
})().catch(e => { console.error(e); process.exit(1) })
