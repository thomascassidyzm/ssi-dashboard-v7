#!/usr/bin/env node
/**
 * cs #130·AI — re-record the ita_for_eng female (target1, Alessandra) clips that say the male form (Kai approved 16 Nov).
 *
 * WHY A RE-RECORD IN PLACE, NOT RENDER + LINK: link-clip refuses a clip whose words differ from the slot's (TEXT_MISMATCH,
 * services/shared/link-clip.cjs), and the course text stays "sicuro" by design (gender prep keeps the plain form in the row;
 * only the TTS input is the female reading). The render route's re-record does exactly what phase 8 does for a gendered line:
 * replaceAudioId = the served clip, text = its stored plain text, spokenText = the female reading. The row keeps its id and
 * its text, gets the new bytes as the next revision (make-before-break inside the route: new object uploaded and verified
 * before the swap, old object retained), so every slot that points at that clip is fixed with no relinking.
 * Library first still applies: the door may answer with an existing Alessandra clip of the female words (0 chars).
 *
 * HTTP only (POST /api/audio/render). Sequential. Stops at the first refusal of any kind — never retries — and at a
 * character ceiling. Appends one line per clip to the result TSV.
 *   node ops/ita-sicura/render-130.cjs <clips.tsv> <out.tsv> [--real] [--limit N] [--only <clipId>] [--ceiling CHARS]
 */
const fs = require('fs')
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null }
const [inF, outF] = process.argv.slice(2)
const real = process.argv.includes('--real')
const limit = arg('--limit') ? Number(arg('--limit')) : Infinity
const only = arg('--only')
const ceiling = Number(arg('--ceiling') || 17500)
const HEAD = 'clip\tstored_text\tfemale_text\tslots\tmode\tsource\taudioId\trevision\ts3Key\tcharsSpent\twouldSpendChars\tcode\terror\n'
const rows = fs.readFileSync(inF, 'utf8').trim().split('\n').slice(1).map((l) => l.split('\t'))
const done = new Set()
let spent = 0
if (fs.existsSync(outF)) for (const l of fs.readFileSync(outF, 'utf8').trim().split('\n').slice(1)) {
  const c = l.split('\t'); if (c[4] === 'real' && /^(library|rendered|already-rerecorded)$/.test(c[5])) done.add(c[0]); spent += Number(c[9]) || 0
} else fs.writeFileSync(outF, HEAD)
const todo = rows.filter(([clip, , , , note]) => !done.has(clip) && !note && (!only || clip === only)).slice(0, limit)
;(async () => {
  let n = 0
  for (const [clip, stored, female, slots] of todo) {
    const body = { courseCode: 'ita_for_eng', role: 'target1', text: stored, spokenText: female, replaceAudioId: clip,
      purpose: 'ita sicura female re-record, Kai approved 16 Nov (#130)', job: '#130', dryRun: !real }
    const res = await fetch('http://localhost:3470/api/audio/render', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': 'cs-130-ita-sicura' }, body: JSON.stringify(body) })
    const o = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))
    spent += Number(o.charsSpent) || 0
    fs.appendFileSync(outF, [clip, stored, female, slots, real ? 'real' : 'dry', o.ok ? o.source : 'REFUSED', o.audioId || '', o.revision ?? '', o.s3Key || '',
      o.charsSpent ?? '', o.wouldSpendChars ?? '', o.code || (o.ok ? '' : res.status), String(o.error || '').replace(/\s+/g, ' ').slice(0, 300)].join('\t') + '\n')
    n++
    if (!o.ok) { console.log(`STOPPED: refusal on ${clip}: ${res.status} ${o.code || ''} ${o.error || ''}`); break }
    if (spent > ceiling) { console.log(`STOPPED: ${spent} chars spent, over the ${ceiling} ceiling`); break }
  }
  console.log(`${real ? 'real' : 'dry'}: ${n} of ${todo.length} sent, ${spent} chars spent in this result file`)
})()
