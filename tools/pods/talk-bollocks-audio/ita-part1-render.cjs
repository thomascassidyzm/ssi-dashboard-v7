#!/usr/bin/env node
// Job #983: Italian Talk Bollocks Part 1 -> listen-only audio through Popty's ONE route (POST /api/audio/render).
// TRIAL lane on purpose: clips connect to no course/pod (audio-trial-mode.cjs), 300 chars per call, so each turn is
// split at sentence boundaries into <=300-char pieces. Voices: Tom=Lorenzo, Aran=Luca (environment-conversation-pod.cjs).
//   node ita-part1-render.cjs build  <turns.json> <manifest.json>
//   node ita-part1-render.cjs run    <manifest.json> [--apply]     (dry run unless --apply; writes results back into the manifest)
const fs = require('fs')
const VOICE = { Tom: 'ee16f140-f6dc-490e-a1ed-c1d537ea0086', Aran: 'e019ed7e-6079-4467-bc7f-b599a5dccf6f' }
const MAX = 300
function pieces(text) {
  const sents = text.match(/[^.!?…]+[.!?…]+["»”)]*\s*|[^.!?…]+$/g) || [text]
  const out = []; let cur = ''
  const push = s => { s = s.trim(); if (s) out.push(s) }
  for (let s of sents) {
    while (s.length > MAX) { // break an over-long sentence at the last comma/space before MAX
      let cut = Math.max(s.lastIndexOf(', ', MAX - 1), s.lastIndexOf('; ', MAX - 1), s.lastIndexOf(': ', MAX - 1))
      if (cut < 100) cut = s.lastIndexOf(' ', MAX - 1)
      const head = s.slice(0, cut + 1)
      if ((cur + head).length > MAX) { push(cur); cur = '' }
      cur += head; push(cur); cur = ''; s = s.slice(cut + 1)
    }
    if ((cur + s).length > MAX) { push(cur); cur = '' }
    cur += s
  }
  push(cur); return out
}
async function post(body) {
  const r = await fetch('http://localhost:3470/api/audio/render', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': 'worker-983' }, body: JSON.stringify(body) })
  return { status: r.status, body: await r.json().catch(() => ({})) }
}
async function main() {
  const [cmd, a, b] = process.argv.slice(2)
  if (cmd === 'build') {
    const turns = JSON.parse(fs.readFileSync(a, 'utf8')); const m = []
    turns.forEach((t, i) => pieces(t.text).forEach((p, j) => m.push({ turn: i + 1, part: j + 1, chap: t.chap, spk: t.spk, voiceId: VOICE[t.spk], text: p })))
    fs.writeFileSync(b, JSON.stringify(m, null, 1)); console.log(m.length, 'clips', m.reduce((n, x) => n + x.text.length, 0), 'chars', 'max', Math.max(...m.map(x => x.text.length))); return
  }
  const m = JSON.parse(fs.readFileSync(a, 'utf8')); const apply = process.argv.includes('--apply'); let chars = 0, fail = 0
  for (const e of m) {
    if (apply && e.s3Key) continue // already rendered: once per line
    const { status, body } = await post({ courseCode: 'ita_for_eng', role: 'target1', text: e.text, purpose: 'Italian Talk Bollocks Part 1 listen-only audio for Tom (job #983)', voiceId: e.voiceId, trial: true, job: '#983', dryRun: !apply })
    if (status !== 200 || !body.ok) { console.log('STOP', status, e.turn, e.part, JSON.stringify(body)); fail++; break } // a refusal is the answer: no retry
    chars += apply ? body.charsSpent || 0 : body.wouldSpendChars || 0
    if (apply) { e.audioId = body.audioId; e.s3Key = body.s3Key; e.durationMs = body.durationMs; fs.writeFileSync(a, JSON.stringify(m, null, 1)) }
  }
  console.log(apply ? 'rendered' : 'dry-run', 'chars', chars, 'fail', fail)
}
main()
