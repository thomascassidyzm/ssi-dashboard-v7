#!/usr/bin/env node
/**
 * cs #127·AI — record target audio for the hrv_for_eng rows #119·AI switched to želim.
 * HTTP only: reads a silent-slot list (built from GET /api/production/hrv_for_eng/seeds, intersected with
 * ops/hrv-want/decisions.tsv), calls POST /api/audio/render once per (text, role), and appends each answer to a TSV.
 * Never retries a refusal: a refused (text, role) is written down and skipped.
 *   node ops/hrv-want/render-127.cjs <silent.tsv> <out.tsv> [--real] [--limit N] [--skip-done]
 * RENDER_PURPOSE / RENDER_AGENT_ID override the purpose and x-agent-id (cs #148·AI reused this driver after casting Sanja/Ivan).
 */
const fs = require('fs')
const [inF, outF] = process.argv.slice(2)
const real = process.argv.includes('--real')
const li = process.argv.indexOf('--limit'); const limit = li > 0 ? Number(process.argv[li + 1]) : Infinity
const rows = fs.readFileSync(inF, 'utf8').trim().split('\n').map((l) => l.split('\t'))
const done = new Set()
if (process.argv.includes('--skip-done') && fs.existsSync(outF)) for (const l of fs.readFileSync(outF, 'utf8').trim().split('\n')) { const c = l.split('\t'); if (c[3] === 'library' || c[3] === 'rendered') done.add(c[0] + '\t' + c[1]) }
const jobs = []; const seen = new Set()
for (const [kind, key, role, text] of rows) { const k = role + '\t' + text; if (seen.has(k) || done.has(k)) continue; seen.add(k); jobs.push({ role, text, legoId: kind === 'lego' ? key : undefined }) }
const todo = jobs.slice(0, limit)
if (!fs.existsSync(outF)) fs.writeFileSync(outF, 'role\ttext\tdry\tsource\taudioId\tcharsSpent\twouldSpendChars\tcode\terror\n')
let stop = false
async function one(j) {
  const body = { courseCode: 'hrv_for_eng', role: j.role, text: j.text, purpose: process.env.RENDER_PURPOSE || '#127·AI želim switch (#119·AI), Kai approved 16 Nov', dryRun: !real, ...(j.legoId ? { legoId: j.legoId } : {}) }
  // A dropped connection (Popty restarting) stops the run; --skip-done resumes it and the route's library-first lookup
  // links anything paid for mid-flight, free (cs #148·AI: a 16:18Z restart killed the run uncaught).
  let res
  try { res = await fetch('http://localhost:3470/api/audio/render', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': process.env.RENDER_AGENT_ID || 'cs-127-hrv-zelim' }, body: JSON.stringify(body) }) } catch (e) { stop = true; console.error(`transport failure, stopping: ${e.message}`); return }
  const o = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))
  const line = [j.role, j.text, real ? 'real' : 'dry', o.ok ? o.source : 'REFUSED', o.audioId || '', o.charsSpent ?? '', o.wouldSpendChars ?? '', o.code || (o.ok ? '' : res.status), (o.error || o.message || '').replace(/\s+/g, ' ').slice(0, 300)]
  fs.appendFileSync(outF, line.join('\t') + '\n')
  if (!o.ok && /DAILY/.test(o.code || '')) stop = true // the cap is the answer for today
}
;(async () => {
  let i = 0
  const worker = async () => { while (i < todo.length && !stop) { const j = todo[i++]; await one(j); await new Promise((r) => setTimeout(r, 150)) } }
  await Promise.all([worker(), worker(), worker()])
  console.log(`${real ? 'real' : 'dry'}: ${i} of ${todo.length} sent${stop ? ' — STOPPED on daily cap' : ''}`)
})()
