#!/usr/bin/env node
// cs #346·AL: daytime apply of the #225 census, seeds 1-450 ONLY. Files only, no DB: reads #234's changesets and a LIVE
// read saved from GET http://localhost:3470/api/production/jpn_for_eng/seeds.
//   node precheck.cjs <live.json>   → writes ops-<kind>.json (ready ops) + precheck.json (counts, holds, excluded)
// Kai's rule "Apply = live pre-check of row + LEGO + seed": an op is ready only if
//   · row: live phrase exists, seed_number/lego_index/known_text/target_text == the op's expect (as the census saw it);
//   · LEGO + seed: neither was touched after #234's live pre-check (2026-11-24T16:59:56Z, when their text was verified
//     equal to the census copy) — updated_at ≤ that moment; a later touch is HELD (never forced) with its reason.
// Seeds 451-668 are EXCLUDED (dropped, counted; #338/#247 rebuild them). Only known_text is ever set (asserted here).
'use strict'
const fs = require('fs'), path = require('path')
const cs = require('../../../services/shared/changeset.cjs')
const APPLY = path.join(__dirname, '..', 'apply')
const CUTOFF = Date.parse('2026-11-24T16:59:56Z')
const live = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
const P = new Map(), L = new Map(), S = new Map()
for (const s of live.seeds) { S.set(s.seed_number, s); for (const l of s.legos) { L.set(l.lego_id, l); for (const p of l.basket_phrases) P.set(p.id, p) } }
const seedOf = (id) => Number(String(id).replace(/^.*:/, '').slice(1, 5))
const out = { counts: {}, held: [], excluded: {} }
for (const kind of ['deletes', 'rewords', 'addend']) {
  const { ops } = cs.read(path.join(APPLY, `${kind}.changeset.jsonl`))
  const ready = []; let excl = 0
  for (const o of ops) {
    const seed = seedOf(o.phrase_id)
    if (seed > 450) { excl++; continue }
    const why = []
    if (o.set && Object.keys(o.set).some((k) => k !== 'known_text')) why.push('op sets more than known_text')
    const p = P.get(o.phrase_id), e = o.expect
    if (!p) why.push('row not live')
    else {
      for (const k of ['seed_number', 'lego_index', 'known_text', 'target_text']) if (p[k] !== e[k]) why.push(`row ${k} live ${JSON.stringify(p[k])} ≠ census ${JSON.stringify(e[k])}`)
      const lid = `S${String(e.seed_number).padStart(4, '0')}L${String(e.lego_index).padStart(2, '0')}`
      const l = L.get(lid), s = S.get(e.seed_number)
      if (!l) why.push(`LEGO ${lid} not live`); else if (Date.parse(l.updated_at) > CUTOFF) why.push(`LEGO ${lid} touched ${l.updated_at} (after #234 pre-check)`)
      if (!s) why.push(`seed ${e.seed_number} not live`); else if (Date.parse(s.updated_at) > CUTOFF) why.push(`seed ${e.seed_number} touched ${s.updated_at} (after #234 pre-check)`)
    }
    if (why.length) out.held.push({ kind, phrase_id: o.phrase_id, english_now: e.known_text, japanese: e.target_text, english_new: o.set ? o.set.known_text : null, reason: why.join('; ') })
    else ready.push(o)
  }
  out.counts[kind] = { in_changeset: ops.length, excluded_451_668: excl, ready: ready.length, held: out.held.filter((h) => h.kind === kind).length }
  fs.writeFileSync(path.join(__dirname, `ops-${kind}.json`), JSON.stringify(ready, null, 1) + '\n')
}
fs.writeFileSync(path.join(__dirname, 'precheck.json'), JSON.stringify({ at: new Date().toISOString(), live: path.basename(process.argv[2]), ...out }, null, 1) + '\n')
console.log(JSON.stringify(out.counts))
