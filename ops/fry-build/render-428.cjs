#!/usr/bin/env node
/**
 * cs #428·AI (Kai, approved 17 Nov 2026 12:30Z, ~465k Cartesia chars, HARD STOP 600,000): render fry_for_eng's English side.
 * POPTY HTTP ONLY — no database access of any kind:
 *   read   GET  /api/production/fry_for_eng/seeds                      (the live rows)
 *   audio  POST /api/audio/render                                      (library first, spend guard, one render, write-back)
 *   link   POST /api/production/fry_for_eng/link-clip                  (fill-only: known slots → the clip the render answered)
 * Known cues: one render per distinct text (normalizeForAudio + foldTypography), role 'known' (the course cast = Tom-006),
 *   then every empty known slot holding those words is linked to it.
 * Intros: ops/fry-build/intros-411.json (#411·AI), role 'presentation' + legoId — Popty splices from Charlotte pieces and
 *   binds presentation_audio_id itself. The 3 held intros take Kai's 17 Nov ruling (heads-up shape, "it" inside the chunk).
 * Frisian target audio is never asked for (Auke records it).
 * A refusal is logged verbatim and skipped — never retried. A cap/stop refusal ends the run. Ledger (write-ahead, resumable): $LEDGER or ~/ssi-evidence/.../ops/fry-build/428/ledger.jsonl.
 *   node ops/fry-build/render-428.cjs --seeds 1-20 [--concurrency 2] [--stop-at 600000]
 */
const fs = require('fs'), path = require('path')
const { normalizeForAudio, foldTypography } = require('../../services/shared/text-normalize.cjs')
const COURSE = 'fry_for_eng', POPTY = 'http://localhost:3470', WHO = 'cs-428-fry-english'
const argv = process.argv.slice(2), opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d }
const [lo, hi] = String(opt('--seeds', '1-668')).split('-').map(Number)
const CONC = Number(opt('--concurrency', 2)), STOP_AT = Number(opt('--stop-at', 600000))
const LEDGER = process.env.LEDGER || path.join(process.env.HOME, 'ssi-evidence/ssi-dashboard-v7/ops/fry-build/428/ledger.jsonl')
fs.mkdirSync(path.dirname(LEDGER), { recursive: true })
const PURPOSE_K = 'fry_for_eng English known cue, Tom-006 cast (cs #428·AI, Kai approved 17 Nov 12:30Z)'
const PURPOSE_I = 'fry_for_eng English intro, Charlotte splice (cs #428·AI, Kai approved 17 Nov 12:30Z)'
// Kai 17 Nov: the three held intros use the heads-up shape with the "it" inside the chunk.
const HELD = {
  S0060L01: "The Frisian for: 'I don't know yet', as in — 'I don't know it yet', is:",
  S0113L01: "The Frisian for: 'why don't I know any more', as in — 'why don't I know it any more', is:",
  S0606L01: "The Frisian for: 'if I'd known then', as in — 'if I'd known it then', is:",
}
// A cap or stop refusal ends the run (the guard says "do not retry and do not split the job"): logged, reported, nothing re-asked.
const STOP_CODES = ['DAILY_TOTAL_CAP', 'DAILY_CAP', 'POOL_SHARE', 'STOPPED_BY_TOM', 'TRIPPED']
const stopCode = (out) => STOP_CODES.find(c => out.code === c || String(out.error || '').includes(`(402) ${c}`))
const done = new Map(); let spent = 0
if (fs.existsSync(LEDGER)) for (const l of fs.readFileSync(LEDGER, 'utf8').split('\n').filter(Boolean)) {
  const e = JSON.parse(l); if (e.kind === 'render' || e.kind === 'refused') done.set(e.key, e); if (e.kind === 'render') spent += e.charsSpent || 0
}
const log = (e) => fs.appendFileSync(LEDGER, JSON.stringify({ ...e, at: new Date().toISOString() }) + '\n')
const hdr = { 'Content-Type': 'application/json', 'x-agent-id': WHO, 'x-agent-role': 'audio-render' }
async function post(p, body) {
  const r = await fetch(POPTY + p, { method: 'POST', headers: hdr, body: JSON.stringify(body) })
  let j; try { j = await r.json() } catch { j = { ok: false, error: `non-JSON ${r.status}` } }
  return { status: r.status, j }
}

;(async () => {
  const seeds = (await (await fetch(`${POPTY}/api/production/${COURSE}/seeds`, { headers: { 'x-agent-id': WHO } })).json()).seeds
  const intros = JSON.parse(fs.readFileSync(path.join(__dirname, 'intros-411.json'), 'utf8'))
  const introOf = new Map(intros.map(r => [r.lego_id, HELD[r.lego_id] || r.text]))
  const jobs = [], groups = new Map()
  for (const s of seeds.sort((a, b) => a.seed_number - b.seed_number)) {
    if (s.seed_number < lo || s.seed_number > hi) continue
    const add = (slot, text, cur) => {
      if (cur) return; const k = 'known:' + normalizeForAudio(foldTypography(text))
      if (!groups.has(k)) { groups.set(k, { key: k, kind: 'known', text, slots: [] }); jobs.push(groups.get(k)) }
      groups.get(k).slots.push(slot)
    }
    add({ seedNumber: s.seed_number }, s.known_text, s.known_audio_id)
    for (const l of s.legos) {
      add({ legoId: l.lego_id }, l.known_text, l.known_audio_id)
      for (const p of l.basket_phrases) add({ phraseId: p.id }, p.known_text, p.known_audio_id)
      if (l.is_new && !l.presentation_audio_id && introOf.has(l.lego_id)) jobs.push({ key: 'intro:' + l.lego_id, kind: 'intro', legoId: l.lego_id, text: introOf.get(l.lego_id) })
    }
  }
  console.log(`seeds ${lo}-${hi}: ${jobs.filter(j => j.kind === 'known').length} known texts, ${jobs.filter(j => j.kind === 'intro').length} intros; ledger has ${done.size} done, ${spent} chars spent`)
  let i = 0, stopped = false
  // A Popty restart (deploys happen under us) closes the socket mid-call. That is not a refusal: wait for health, put the
  // item back at the end of the queue (library-first answers it free if the clip was stored), and give up after 30.
  let transport = 0
  const waitHealthy = async () => { for (let t = 0; t < 60; t++) { try { if ((await fetch(POPTY + '/api/audio/health')).ok) return } catch {} await new Promise(r => setTimeout(r, 5000)) } }
  const work = async () => {
    while (!stopped && i < jobs.length) {
      const j = jobs[i++]
      try { await one(j) } catch (e) {
        transport++; log({ kind: 'transport', key: j.key, error: String(e && (e.cause?.code || e.message)) })
        if (transport > 30) { stopped = true; console.log('STOPPED: 30 transport errors'); return }
        await waitHealthy(); jobs.push(j)
      }
    }
  }
  const one = async (j) => {
    {
      const prior = done.get(j.key)
      if (prior && prior.kind === 'refused') return
      let audioId = prior && prior.audioId
      if (!prior) {
        if (spent + j.text.length * 1.2 > STOP_AT) { stopped = true; log({ kind: 'hard-stop', spent, next: j.key }); console.log('HARD STOP at', spent); return }
        const body = { courseCode: COURSE, role: j.kind === 'known' ? 'known' : 'presentation', text: j.text, purpose: j.kind === 'known' ? PURPOSE_K : PURPOSE_I, ...(j.legoId ? { legoId: j.legoId } : {}) }
        let { status, j: out } = await post('/api/audio/render', body)
        if (!out.ok && stopCode(out)) { stopped = true; log({ kind: 'cap-stop', key: j.key, status, code: stopCode(out), error: out.error }); console.log('STOPPED by', stopCode(out), out.error); return }
        if (status >= 500 && !out.code) throw new Error(`popty ${status}: ${out.error}`)
        if (!out.ok) { log({ kind: 'refused', key: j.key, text: j.text, status, code: out.code || null, error: out.error || null, slots: j.slots || [j.legoId] }); done.set(j.key, { kind: 'refused' }); return }
        spent += out.charsSpent || 0; audioId = out.audioId
        const e = { kind: 'render', key: j.key, text: j.text, legoId: j.legoId || null, source: out.source, charsSpent: out.charsSpent || 0, audioId, voiceId: out.voiceId || null, linked: out.linked ?? null }
        log(e); done.set(j.key, e)
      }
      if (j.kind === 'known' && audioId) {
        for (let b = 0; b < j.slots.length; b += 500) {
          const links = j.slots.slice(b, b + 500).map(s => ({ ...s, role: 'known', audioId }))
          const { status, j: out } = await post(`/api/production/${COURSE}/link-clip`, { links })
          const bad = (out.results || []).filter(r => !r.ok)
          log({ kind: 'link', key: j.key, audioId, status, linked: out.linked ?? 0, failed: bad.length ? bad : undefined, error: out.ok === false && !out.results ? out.error : undefined })
        }
      }
    }
  }
  await Promise.all(Array.from({ length: CONC }, work))
  console.log(`finished seeds ${lo}-${hi}: ${spent} chars spent in ledger total${stopped ? ' (HARD STOP)' : ''}`)
})().catch(e => { console.error(e); process.exit(1) })
