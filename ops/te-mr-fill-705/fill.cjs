#!/usr/bin/env node
'use strict'
// cs #705·AI — record the 856 silent known-side prompts in eng_for_tel / eng_for_mar (refused VOICE_NOT_CAST by #694·AI).
// Popty HTTP routes ONLY (no database access): POST /api/audio/render (library first, else ONE render, never retried),
// then POST /api/production/<course>/link-clip FILL-ONLY (never `replace`).
//   node fill.cjs dry <course> [n=5]      dryRun:true on n slots (Popty allows ~100 dry runs/hour/caller)
//   node fill.cjs run <course> [--max N]  real; resumable (a slot already answered, ok or refused, is skipped)
// Voice is NAMED, never defaulted: left to choose, Popty picks the 2026-09-04 draft Cartesia voice and refuses. These are the
// courses' own known-side voices of record, which Kai cast PROVISIONALLY into the Voice Lab known slot on 18 Nov 12:52Z
// ("fill whatever needs filling, doesn't matter if it doesn't match"); the cast gate admits them on its Azure-only leg.
// Slots: ../silent-fill-694/live/slots.json (#694's plan), known role only; held rows (pending text fix) are never sent.
const fs = require('fs'); const path = require('path')
const DIR = __dirname; const RES = path.join(DIR, 'results')
const API = 'http://localhost:3470'; const WHO = 'cs-705-te-mr-fill'
const VOICE = { eng_for_tel: 'azure_te-IN-ShrutiNeural', eng_for_mar: 'azure_mr-IN-ManoharNeural' }
const HARD_CAP = 40000   // the brief's 32,454 chars plus headroom; Azure, outside the Cartesia budget
const [mode, course, ...rest] = process.argv.slice(2)
const arg = (k, d) => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : d }
if (!VOICE[course]) { console.error('course must be eng_for_tel or eng_for_mar'); process.exit(1) }
const held = s => (s.held_text_fix && s.held_text_fix.length) || (s.lego_fix_pending && s.lego_fix_pending.length)
const slots = JSON.parse(fs.readFileSync(path.join(DIR, '../silent-fill-694/live/slots.json'), 'utf8'))
  .filter(s => s.course === course && s.role === 'known')
const slotRef = s => /^[0-9a-f-]{36}$/i.test(s.phraseId) ? { legoId: s.lego } : { phraseId: s.phraseId }
const key = s => `${s.phraseId}|${s.role}`
const readLog = f => fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : []
const purpose = 'cs #705·AI: fill a silent known-side prompt (Kai 18 Nov 12:52Z: provisional Azure cast, fill now)'
async function post(url, body) {
  const r = await fetch(API + url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': WHO }, body: JSON.stringify(body) })
  let j; try { j = await r.json() } catch { j = { ok: false, error: 'non-JSON answer' } }
  return { status: r.status, ...j }
}
const render = (s, dryRun) => post('/api/audio/render', { courseCode: course, role: 'known', text: s.text, voiceId: VOICE[course], purpose, job: '#705·AI', dryRun })
;(async () => {
  fs.mkdirSync(RES, { recursive: true })
  const todo = slots.filter(s => !held(s))
  console.log(course, 'known slots', slots.length, 'held', slots.length - todo.length, 'to send', todo.length,
    'chars', todo.reduce((a, s) => a + String(s.text).length, 0))
  if (mode === 'dry') {
    for (const s of todo.slice(0, Number(rest[0] || 5))) {
      const r = await render(s, true)
      fs.appendFileSync(path.join(RES, `dry-${course}.jsonl`), JSON.stringify({ at: new Date().toISOString(), row: s.row, text: s.text, render: r }) + '\n')
      console.log(s.row, r.status, r.code || '', r.source || '', r.wouldSpendChars ?? '', (r.error || '').slice(0, 140))
    }
    return
  }
  if (mode !== 'run') throw new Error('mode: dry | run')
  const log = path.join(RES, `${course}.jsonl`); const done = new Set(readLog(log).map(r => r.key))
  let spent = readLog(log).reduce((a, r) => a + (Number(r.render && r.render.charsSpent) || 0), 0)
  const max = Number(arg('--max', 1e9)); let sent = 0
  const t = { linked_library: 0, linked_rendered: 0, refused: {}, link_failed: {}, skipped_done: 0, stopped_cap: 0 }
  for (const s of todo) {
    if (done.has(key(s))) { t.skipped_done++; continue }
    if (sent >= max) break
    if (spent + String(s.text).length > HARD_CAP) { t.stopped_cap++; continue }
    sent++
    const r = await render(s, false)
    spent += Number(r.charsSpent) || 0
    const rec = { at: new Date().toISOString(), key: key(s), phraseId: s.phraseId, row: s.row, lego: s.lego, role: 'known', text: s.text,
      render: { status: r.status, ok: r.ok, code: r.code, source: r.source, audioId: r.audioId, charsSpent: r.charsSpent, voiceId: r.voiceId || VOICE[course], error: r.error && String(r.error).slice(0, 300) } }
    if (r.ok && r.audioId) {
      const l = await post(`/api/production/${course}/link-clip`, { links: [{ ...slotRef(s), role: 'known', audioId: r.audioId }] })
      const one = (l.results && l.results[0]) || l
      rec.link = { status: l.status, ok: !!(l.ok && one.ok !== false), code: one.code || l.code, error: (one.error || l.error) && String(one.error || l.error).slice(0, 300), eventId: l.eventId || l.event_id }
      if (rec.link.ok) t[r.source === 'library' ? 'linked_library' : 'linked_rendered']++
      else t.link_failed[rec.link.code || l.status] = (t.link_failed[rec.link.code || l.status] || 0) + 1
    } else t.refused[r.code || r.status] = (t.refused[r.code || r.status] || 0) + 1
    fs.appendFileSync(log, JSON.stringify(rec) + '\n')
    if (sent % 50 === 0) console.log(course, 'sent', sent, 'spent', spent, JSON.stringify(t))
  }
  console.log(course, 'DONE spent', spent, JSON.stringify(t))
})().catch(e => { console.error(e); process.exit(1) })
