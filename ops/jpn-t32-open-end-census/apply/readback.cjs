#!/usr/bin/env node
// cs #234·AL: read back a changeset against a LIVE read (GET /api/production/jpn_for_eng/seeds saved to a file). Files only, no DB.
//   node readback.cjs <live.json> <name…>   (name = deletes | rewords | addend)  → one JSON line per changeset
// For every op the ledger marks applied/already: a delete must be gone live; an update must show the new English AND the
// Japanese the census saw (Japanese is never written). Also reports each re-worded row's live known_audio_id (null = silent).
'use strict'
const fs = require('fs')
const path = require('path')
const cs = require('../../../services/shared/changeset.cjs')
const { loadLedger } = require('../../../tools/changeset/apply-changeset.cjs')
const [liveFile, ...names] = process.argv.slice(2)
const live = JSON.parse(fs.readFileSync(liveFile, 'utf8'))
const byId = new Map()
for (const s of live.seeds) for (const l of s.legos) for (const p of l.basket_phrases) byId.set(p.id, p)
for (const n of names) {
  const f = path.join(__dirname, `${n}.changeset.jsonl`)
  const { ops } = cs.read(f)
  const ledger = loadLedger(`${f}.applied.jsonl`)
  const status = {}, bad = []; let verified = 0, silent = 0
  ops.forEach((o, i) => {
    const st = ledger.get(i) || 'not_sent'; status[st] = (status[st] || 0) + 1
    if (st !== 'applied' && st !== 'already') return
    const p = byId.get(o.phrase_id)
    if (o.op === 'phrase.delete') { if (p) bad.push({ id: o.phrase_id, why: 'still live' }); else verified++; return }
    if (!p) { bad.push({ id: o.phrase_id, why: 'row gone' }); return }
    if (p.known_text !== o.set.known_text) bad.push({ id: o.phrase_id, why: `English live "${p.known_text}"` })
    else if (p.target_text !== o.expect.target_text) bad.push({ id: o.phrase_id, why: `Japanese changed "${p.target_text}"` })
    else { verified++; if (!p.known_audio_id) silent++ }
  })
  console.log(JSON.stringify({ changeset: n, ops: ops.length, ledger: status, verified_live: verified, readback_problems: bad.length, problems: bad.slice(0, 20), known_slot_silent: silent }))
}
