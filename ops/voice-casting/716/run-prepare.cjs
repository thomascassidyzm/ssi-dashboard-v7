#!/usr/bin/env node
// cs #716·AI — prepare the missing Voice Lab samples for Kai's all-languages casting page.
// HTTP only: every call goes through tools/agent-admin/call.cjs --key kai (signed), to
// GET  /api/voicelab/languages/:lang/samples          (free: what is missing, what it costs)
// POST /api/voicelab/languages/:lang/samples/prepare  (renders ONLY missing voices; never `force`)
// and, for a language with no course line but a pod line (ara_sy), the pod-voices pair.
// Hard cap: stops before the run's estimated chars would pass CAP. A refusal is recorded, never retried.
//   node ops/voice-casting/716/run-prepare.cjs <voices-to-sample.json> <outDir> [--cap 40000]
'use strict'
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const [wantFile, outDir] = process.argv.slice(2)
const ci = process.argv.indexOf('--cap')
const CAP = ci > 0 ? Number(process.argv[ci + 1]) : 40000
const CALL = path.join(__dirname, '../../../tools/agent-admin/call.cjs')
const want = JSON.parse(fs.readFileSync(wantFile, 'utf8'))
fs.mkdirSync(outDir, { recursive: true })

// Kai's priority (brief): draft-only with no heard Cartesia voice, then uncast, then
// Azure-cast-but-Cartesia-exists, then everything else.
const ORDER = ['ben', 'kan', 'mar', 'tel', 'bul', 'ces', 'dan', 'nld', 'heb', 'nor', 'pol', 'ron', 'rus', 'swe', 'tha', 'tur', 'ukr', 'deu_at', 'ind',
  'tam', 'guj', 'pan', 'ara_eg', 'ara_lb', 'ell', 'ara_sy', 'deu_ch']
const langs = [...ORDER.filter((l) => want[l]), ...Object.keys(want).filter((l) => !ORDER.includes(l))]
const POD_LANES = new Set(['ara_sy'])

function call (method, p, body) {
  try {
    const out = execFileSync('node', [CALL, '--key', 'kai', '--agent', 'kai-716', method, p, ...(body ? [JSON.stringify(body)] : [])],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 20 * 60 * 1000 })
    return JSON.parse(out)
  } catch (e) {
    const txt = String(e.stdout || e.message)
    try { return { httpError: true, ...JSON.parse(txt) } } catch { return { httpError: true, error: txt.slice(0, 500) } }
  }
}

let spent = 0
const log = []
for (const lang of langs) {
  const ids = want[lang].voiceIds
  const lane = POD_LANES.has(lang) ? 'pod-voices' : 'languages'
  const before = call('GET', `/api/voicelab/${lane}/${lang}/samples?voices=${ids.join(',')}`)
  if (!before.line) { log.push({ lang, skipped: 'no line', error: before.error || null }); console.log(`${lang}: no line — ${before.error || ''}`); continue }
  const per = before.line.text.length
  let missing = before.missing || []
  const row = { lang, line: before.line.text, source: before.line.source, per, missingBefore: missing.length, rendered: 0, chars: 0, failed: [], stopped: null }
  const chunk = lane === 'pod-voices' ? 12 : 80
  while (missing.length) {
    let take = missing.slice(0, chunk)
    const room = Math.floor((CAP - spent) / per)
    if (room <= 0) { row.stopped = `over the ${CAP}-char cap`; break }
    if (take.length > room) take = take.slice(0, room)
    const r = call('POST', `/api/voicelab/${lane}/${lang}/samples/prepare`, { voiceIds: take, max: take.length })
    if (r.httpError || !r.ok) { row.stopped = `refused: ${r.error || JSON.stringify(r).slice(0, 300)}`; break }
    spent += r.chars || 0
    row.chars += r.chars || 0
    row.rendered += (r.rendered || []).length
    row.failed.push(...(r.failed || []))
    fs.writeFileSync(path.join(outDir, `${lang}-${Date.now()}.json`), JSON.stringify(r))
    const nowMissing = r.missing || []
    // A press that rendered nothing and failed nothing would loop forever; stop it.
    if (!(r.rendered || []).length) { row.stopped = row.stopped || 'press rendered nothing'; break }
    missing = nowMissing.filter((v) => !row.failed.some((f) => f.voiceId === v))
  }
  row.missingAfter = missing.length
  log.push(row)
  console.log(`${lang}: +${row.rendered} clips, ${row.chars} chars, failed ${row.failed.length}, left ${missing.length}${row.stopped ? ' — ' + row.stopped : ''}; run total ${spent}`)
  fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify({ cap: CAP, spent, log }, null, 1))
}
console.log(`DONE spent ${spent} chars`)
