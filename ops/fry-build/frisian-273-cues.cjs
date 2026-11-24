#!/usr/bin/env node
/**
 * cs #273·AL (Kai 24 Nov: "Frisian" said FREE-zhən, pick B, d/b1989450): re-record IN PLACE every fry_for_eng English cue
 * clip (Tom-006, role known) whose words hold "Frisian". POPTY HTTP ONLY — no database access of any kind:
 *   read   GET  /api/production/fry_for_eng/seeds                       (live rows; re-read before every batch = the pre-check)
 *   read   GET  /api/production/fry_for_eng/audio/:id/url               (the clip's current S3 key, before and after: undo ledger)
 *   audio  POST /api/audio/render  {replaceAudioId}                     (one named clip re-recorded in its own voice)
 * No spokenText is sent: the English word rule (services/shared/pronunciation-overrides.cjs, a6738c2ec) makes the TTS door
 * send <<ˈ|f|ɹ|iː|ʒ|ə|n>> for "Frisian" on every Cartesia render, and an explicit spokenText would leave a clip_spoken_text
 * verdict that bars the new clip from reuse for its own stored words.
 * PRE-CHECK (Kai's standing rule): before each batch the live rows are re-read; a clip whose slots no longer carry the
 * planned text, or no longer point at the planned clip, is HELD, never forced. Old S3 objects are kept (re-record mints a
 * new key); the ledger records old→new keys. A cap/stop refusal ends the run; any other refusal holds that clip only.
 *   node ops/fry-build/frisian-273-cues.cjs [--limit 10] [--batch 25] [--stop-at 30000]
 */
const fs = require('fs'), path = require('path')
const COURSE = 'fry_for_eng', POPTY = 'http://localhost:3470', WHO = 'kai-273'
const argv = process.argv.slice(2), opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d }
const LIMIT = Number(opt('--limit', 1e9)), BATCH = Number(opt('--batch', 25)), STOP_AT = Number(opt('--stop-at', 30000))
const LEDGER = path.join(__dirname, 'frisian-273', 'cues-ledger.jsonl')
fs.mkdirSync(path.dirname(LEDGER), { recursive: true })
const PURPOSE = 'fry_for_eng English cue: Frisian said FREE-zhən (cs #273·AL, Kai pick B 24 Nov, d/b1989450)'
const STOP_CODES = ['DAILY_TOTAL_CAP', 'DAILY_CAP', 'POOL_SHARE', 'STOPPED_BY_TOM', 'TRIPPED', 'REPEAT', 'NOT_IN_CHAIN']
const RX = /(?<![\p{L}\p{N}])frisian(?![\p{L}\p{N}])/iu
const hdr = { 'Content-Type': 'application/json', 'x-agent-id': WHO, 'x-agent-role': 'audio-render' }
const log = (e) => fs.appendFileSync(LEDGER, JSON.stringify({ ...e, at: new Date().toISOString() }) + '\n')
const norm = (t) => String(t || '').trim().replace(/[\s.?!,;:]+$/u, '').toLowerCase()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function liveSlots() {
  const r = await fetch(`${POPTY}/api/production/${COURSE}/seeds`, { headers: { 'x-agent-id': WHO } })
  if (!r.ok) throw new Error(`/seeds ${r.status}`)
  const byClip = new Map()
  const add = (key, text, aid) => {
    if (!text || !RX.test(text)) return
    if (!byClip.has(aid || 'SILENT:' + key)) byClip.set(aid || 'SILENT:' + key, [])
    byClip.get(aid || 'SILENT:' + key).push({ key, text })
  }
  for (const s of (await r.json()).seeds) {
    add('S' + String(s.seed_number).padStart(4, '0'), s.known_text, s.known_audio_id)
    for (const l of s.legos) {
      add(l.lego_id, l.known_text, l.known_audio_id)
      for (const p of l.basket_phrases) add(p.id, p.known_text, p.known_audio_id)
    }
  }
  return byClip
}
async function keyOf(id) {
  const r = await fetch(`${POPTY}/api/production/${COURSE}/audio/${id}/url`, { headers: { 'x-agent-id': WHO } })
  const j = await r.json().catch(() => ({}))
  const m = /amazonaws\.com\/([^?]+)/.exec(j.url || '')
  return m ? decodeURIComponent(m[1]) : null
}

;(async () => {
  const done = new Set(); let spent = 0
  if (fs.existsSync(LEDGER)) for (const l of fs.readFileSync(LEDGER, 'utf8').split('\n').filter(Boolean)) {
    const e = JSON.parse(l); if (e.kind === 'rerecorded' || e.kind === 'held' || e.kind === 'refused') done.add(e.clip); if (e.kind === 'rerecorded') spent += e.charsSpent || 0
  }
  const plan0 = await liveSlots()
  const silent = [...plan0.keys()].filter((k) => k.startsWith('SILENT:'))
  const todo = [...plan0.keys()].filter((k) => !k.startsWith('SILENT:') && !done.has(k)).slice(0, LIMIT)
  const slotsTotal = [...plan0.values()].reduce((n, v) => n + v.length, 0)
  console.log(`live: ${slotsTotal} slots, ${plan0.size - silent.length} clips, ${silent.length} silent; ledger done ${done.size}; this run ${todo.length}; spent so far ${spent}`)
  for (let b = 0; b < todo.length; b += BATCH) {
    const live = b === 0 ? plan0 : await liveSlots()   // the pre-check: rows re-read live before every batch
    for (const clip of todo.slice(b, b + BATCH)) {
      const planned = plan0.get(clip), now = live.get(clip)
      const texts = new Set(planned.map((s) => norm(s.text)))
      if (!now || now.length !== planned.length || now.some((s, i) => s.key !== planned[i].key || s.text !== planned[i].text) || texts.size !== 1) {
        log({ kind: 'held', clip, why: !now ? 'clip no longer served by the planned slots' : texts.size !== 1 ? 'slots sharing the clip hold different texts' : 'slot text or pointer changed since plan', planned, now: now || null })
        console.log('HELD', clip); continue
      }
      if (spent >= STOP_AT) { log({ kind: 'hard-stop', spent, next: clip }); console.log('HARD STOP', spent); return }
      const text = planned[0].text
      const oldKey = await keyOf(clip)
      const r = await fetch(`${POPTY}/api/audio/render`, { method: 'POST', headers: hdr, body: JSON.stringify({ courseCode: COURSE, role: 'known', text, replaceAudioId: clip, purpose: PURPOSE }) })
      const out = await r.json().catch(() => ({ ok: false, error: `non-JSON ${r.status}` }))
      if (!out.ok) {
        const stop = STOP_CODES.find((c) => out.code === c || String(out.error || '').includes(c))
        log({ kind: 'refused', clip, status: r.status, code: out.code || null, error: String(out.error || '').slice(0, 400), slots: planned.map((s) => s.key) })
        console.log('REFUSED', clip, r.status, out.code, String(out.error || '').slice(0, 160))
        if (stop || r.status === 402) { console.log('STOPPED by', stop || 402); return }
        continue
      }
      const newKey = await keyOf(clip)
      spent += out.charsSpent || 0
      log({ kind: 'rerecorded', clip, text, slots: planned.map((s) => s.key), source: out.source, charsSpent: out.charsSpent || 0, voiceId: out.voiceId, revision: out.revision || null, oldKey, newKey, spoken: out.spoken })
      console.log(out.source, out.charsSpent, clip, oldKey === newKey ? 'KEY UNCHANGED?' : '', JSON.stringify(text))
      await sleep(300)
    }
  }
  console.log(`done; spent ${spent}`)
})().catch((e) => { console.error('FATAL', e.message); process.exit(1) })
