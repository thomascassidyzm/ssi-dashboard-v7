#!/usr/bin/env node
/**
 * cs #142 — re-record in place the spa/fra/por female (target1) clips spoken from the male text (Kai approved 16 Nov).
 * Generalised from ops/ita-sicura/render-130.cjs (#130·AI): same shape, course code as an argument, input = the judged list
 * (judged-142-<course>.tsv; ONLY verdict=pass rows are sent — skips are Kai's rule: male default unless the word refers to
 * the female speaker or a woman).
 * replaceAudioId = the served clip, text = its stored plain text, spokenText = the female reading: the row keeps its id and
 * text, the new bytes become the next revision (make-before-break inside the route, old object retained). Library-first may
 * answer free.
 * HTTP only (POST /api/audio/render). Sequential. Stops at the FIRST refusal of any kind — never retries — and at a
 * character ceiling. Resumable: skips clips already done for real in the result TSV. One result line per clip.
 *   node ops/female-gender-gap-142/render-142.cjs <course> [--real] [--limit N] [--only <clipId>] [--ceiling CHARS]
 */
const fs = require('fs')
const path = require('path')
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null }
const course = process.argv[2]
if (!/^(spa|fra|por)_for_eng$/.test(course || '')) { console.error('usage: render-142.cjs <spa|fra|por>_for_eng ...'); process.exit(2) }
const dir = __dirname
const inF = path.join(dir, `judged-142-${course}.tsv`)
const outF = path.join(dir, `result-142-${course}.tsv`)
const real = process.argv.includes('--real')
const limit = arg('--limit') ? Number(arg('--limit')) : Infinity
const only = arg('--only')
const ceiling = Number(arg('--ceiling') || 30000)
const HEAD = 'clip\tstored_text\tfemale_text\tslots\tmode\tsource\taudioId\trevision\ts3Key\tcharsSpent\twouldSpendChars\tcode\terror\tat\n'
const lines = fs.readFileSync(inF, 'utf8').trim().split('\n')
const cols = lines[0].split('\t')
const rows = lines.slice(1).map((l) => Object.fromEntries(l.split('\t').map((v, i) => [cols[i], v])))
const done = new Set()
let spent = 0
if (fs.existsSync(outF)) for (const l of fs.readFileSync(outF, 'utf8').trim().split('\n').slice(1)) {
  const c = l.split('\t'); if (c[4] === 'real' && /^(library|rendered|already-rerecorded)$/.test(c[5])) done.add(c[0]); spent += Number(c[9]) || 0
} else fs.writeFileSync(outF, HEAD)
const todo = rows.filter((r) => r.verdict === 'pass' && !done.has(r.clip) && (!only || r.clip === only)).slice(0, limit)
;(async () => {
  let n = 0
  for (const r of todo) {
    const body = { courseCode: course, role: 'target1', text: r.stored_text, spokenText: r.female_text, replaceAudioId: r.clip,
      purpose: `${course} female re-record, Kai approved 16 Nov (#142)`, job: '#142', dryRun: !real }
    let res, o
    try {
      res = await fetch('http://localhost:3470/api/audio/render', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': 'cs-142-female-rerecord' }, body: JSON.stringify(body) })
      o = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))
    } catch (e) { res = { status: 'NETWORK' }; o = { ok: false, error: String(e.message || e) } }
    spent += Number(o.charsSpent) || 0
    fs.appendFileSync(outF, [r.clip, r.stored_text, r.female_text, r.slots, real ? 'real' : 'dry', o.ok ? o.source : 'REFUSED', o.audioId || '', o.revision ?? '', o.s3Key || '',
      o.charsSpent ?? '', o.wouldSpendChars ?? '', o.code || (o.ok ? '' : res.status), String(o.error || '').replace(/\s+/g, ' ').slice(0, 300), new Date().toISOString()].join('\t') + '\n')
    n++
    if (!o.ok) { console.log(`STOPPED: refusal on ${r.clip}: ${res.status} ${o.code || ''} ${o.error || ''}`); process.exitCode = 3; break }
    if (spent > ceiling) { console.log(`STOPPED: ${spent} chars spent, over the ${ceiling} ceiling`); process.exitCode = 4; break }
  }
  console.log(`${course} ${real ? 'real' : 'dry'}: ${n} of ${todo.length} sent, ${spent} chars spent in this result file`)
})()
