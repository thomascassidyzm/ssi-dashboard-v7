#!/usr/bin/env node
/**
 * THE IN-TRAY: add a human recording to the library — a thin client for
 * POST /api/audio/add-recording on production Popty (job #703, Tom 2026-09-29:
 * human recordings "enter the SAME library through an 'add a recording' in-tray
 * that is part of the one Popty chain").
 *
 *   node tools/audio/add-recording.cjs --file take.wav --artist aran_cym_n --text "dw i isio siarad" \
 *        --purpose "why this is being added" [--lang cym_n] [--gender m] [--course cym_n_for_eng] [--role target1] [--replace]
 *   # a NEW artist:
 *   node tools/audio/add-recording.cjs --file t.wav --text "…" --purpose "…" \
 *        --register-name "Cerys Matthews" --register-language cym_s --register-dialect south [--register-gender f]
 *
 * --artist takes a voice id or the artist's name. Exit 0 = the clip is in the
 * library (source: recorded | library), 2 = refused (the reason is printed —
 * a refusal is the answer, fix the request), 1 = bad usage.
 * Env: POPTY_URL (default http://localhost:3470), AGENT_ID (who you are; default $USER).
 */
const fs = require('fs')
const argv = process.argv.slice(2)
const opt = f => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : undefined }
const file = opt('--file')
const registerName = opt('--register-name')
const body = {
  artist: opt('--artist'), text: opt('--text'), purpose: opt('--purpose'), language: opt('--lang'), gender: opt('--gender'),
  courseCode: opt('--course'), role: opt('--role'), replace: argv.includes('--replace'), mimeType: opt('--mime'),
  register: registerName ? { name: registerName, clip_language: opt('--register-language'), dialect: opt('--register-dialect'), gender: opt('--register-gender') } : undefined,
}
const missing = ['text', 'purpose'].filter(k => !body[k])
if (!file) missing.push('--file')
if (!body.artist && !body.register) missing.push('--artist (or --register-name)')
if (missing.length) { console.error(`usage: add-recording.cjs --file F --artist A --text T --purpose P [--lang L] [--gender f|m] [--course C] [--role R] [--replace]\nmissing: ${missing.join(', ')}`); process.exit(1) }
if (!fs.existsSync(file)) { console.error(`no such file: ${file}`); process.exit(1) }
const ext = file.split('.').pop().toLowerCase()
body.mimeType = body.mimeType || ({ wav: 'audio/wav', mp3: 'audio/mpeg', m4a: 'audio/mp4', webm: 'audio/webm', ogg: 'audio/ogg', flac: 'audio/flac' }[ext] || 'audio/webm')
body.audio = fs.readFileSync(file).toString('base64')
const base = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '')
;(async () => {
  const res = await fetch(`${base}/api/audio/add-recording`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-agent-id': process.env.AGENT_ID || process.env.USER || 'unknown-agent' },
    body: JSON.stringify(body),
  })
  const out = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))
  console.log(JSON.stringify(out, null, 2))
  process.exit(res.ok && out.ok ? 0 : 2)
})().catch(e => { console.error(`Popty unreachable at ${base}: ${e.message}`); process.exit(2) })
