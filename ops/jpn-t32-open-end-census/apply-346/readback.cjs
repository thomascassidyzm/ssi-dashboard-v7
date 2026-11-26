#!/usr/bin/env node
// cs #346·AL: final readback of this job's applied ops against a LIVE read (GET /api/production/jpn_for_eng/seeds saved
// to a file). Files only. A delete must be gone; an update must show the new English, the census Japanese, and a
// non-null known_audio_id. Held ops (precheck.json) must still read as the census saw them (untouched).
'use strict'
const fs = require('fs'), path = require('path')
const live = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')); const P = new Map()
for (const s of live.seeds) for (const l of s.legos) for (const p of l.basket_phrases) P.set(p.id, p)
const out = {}
for (const k of ['deletes', 'rewords', 'addend']) {
  const ops = JSON.parse(fs.readFileSync(path.join(__dirname, `ops-${k}.json`), 'utf8')); const bad = []; let ok = 0, silent = 0
  for (const o of ops) {
    const p = P.get(o.phrase_id)
    if (o.op === 'phrase.delete') { p ? bad.push(`${o.phrase_id} still live`) : ok++; continue }
    if (!p) { bad.push(`${o.phrase_id} gone`); continue }
    if (p.known_text !== o.set.known_text) bad.push(`${o.phrase_id} English "${p.known_text}"`)
    else if (p.target_text !== o.expect.target_text) bad.push(`${o.phrase_id} Japanese "${p.target_text}"`)
    else { ok++; if (!p.known_audio_id) { silent++; bad.push(`${o.phrase_id} known audio null`) } }
  }
  out[k] = { ops: ops.length, verified: ok, known_silent: silent, problems: bad }
}
const held = JSON.parse(fs.readFileSync(path.join(__dirname, 'precheck.json'), 'utf8')).held
out.held_untouched = held.map((h) => { const p = P.get(h.phrase_id); return { id: h.phrase_id, untouched: !!p && p.known_text === h.english_now && p.target_text === h.japanese, voiced: !!(p && p.known_audio_id) } })
console.log(JSON.stringify(out, null, 1))
