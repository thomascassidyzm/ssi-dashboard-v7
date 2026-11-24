#!/usr/bin/env node
'use strict'
/**
 * s0328.cjs (cs #253·AL) — the ONLY deletes of this job (Kai's amendment, 24 Nov 17:56Z):
 * S0328L01B06 "I'd prefer if I don't care whenever you breathe" in cym_s_for_eng and its twin in cym_sv2_for_eng.
 *
 *   node s0328.cjs write <dumpdir>   changesets from the nightly-copy dumps (no DB), expect = what the copy held
 *   node s0328.cjs precheck          LIVE pre-check through Popty's own read route (GET …/seed/S0328/baskets):
 *                                    seed text, LEGO S0328L01 text, and the row's text must all equal the copy.
 *                                    Exit 0 = all match; 3 = mismatch (HELD — never forced, Kai 19 Nov).
 */
const fs = require('fs'), path = require('path')
const cs = require('../../services/shared/changeset.cjs')
const HERE = __dirname
const COURSES = ['cym_s_for_eng', 'cym_sv2_for_eng']
const SEED = 328, LEGO = 'S0328L01', ROW = 'S0328L01B06'
const snapFile = path.join(HERE, 's0328-copy-snapshot.json')

if (process.argv[2] === 'write') {
  const snap = {}
  for (const c of COURSES) {
    const d = JSON.parse(fs.readFileSync(path.join(process.argv[3], c + '.json'), 'utf8'))
    const s = d.seeds.find((x) => x.n === SEED); const l = s.legos.find((x) => x.id === LEGO)
    const p = l.phrases.find((x) => x.id === `${c}:${ROW}`)
    if (!p || p.type !== 'build') throw new Error(`${c}: ${ROW} not a build row in the copy`)
    snap[c] = { copy: d.copy_db, seed: { known: s.known, target: s.target }, lego: { known: l.known, target: l.target },
      row: { id: p.id, known: p.known, target: p.target, role: p.type, pos: p.pos } }
    cs.write(path.join(HERE, `changeset-s0328-${c}.jsonl`), { course: c, job: '#253·AL', id: `${c}-s0328-253`,
      why: 'Senseless BUILD row pulled on Kai\'s amendment 24 Nov 17:56Z (Aran agreed in his thread); also uses anadlu before S0328L03 teaches it (P2)',
      kai_go: 'Kai 24 Nov 17:56Z: DELETE ONLY the S0328L01B06 row in cym_s_for_eng and its twin in cym_sv2_for_eng' },
      [cs.op('phrase.delete', { phrase_id: p.id, expect: { known_text: p.known, target_text: p.target, phrase_role: 'build', seed_number: SEED, lego_index: 1 } })])
  }
  fs.writeFileSync(snapFile, JSON.stringify(snap, null, 1))
  console.log('wrote', COURSES.length, 'changesets')
} else if (process.argv[2] === 'precheck') {
  (async () => {
    const snap = JSON.parse(fs.readFileSync(snapFile, 'utf8')); let bad = 0
    for (const c of COURSES) {
      const r = await fetch(`${process.env.POPTY_URL || 'http://localhost:3470'}/api/production/${c}/seed/S0328/baskets`)
      const d = await r.json(); const b = (d.baskets || {})[LEGO] || {}
      // the seed route carries seed + LEGO text but no phrase ids; the row is read from the LEGO basket route, which has them
      const rb = await (await fetch(`${process.env.POPTY_URL || 'http://localhost:3470'}/api/production/${c}/lego/${LEGO}/basket`)).json()
      if (!Array.isArray(rb.phrases)) throw new Error(`${c}: basket route gave no phrases`)
      const row = rb.phrases.find((p) => p.id === snap[c].row.id)
      const checks = [
        ['seed', d.seed_pair && d.seed_pair.known === snap[c].seed.known && d.seed_pair.target === snap[c].seed.target],
        ['lego', b.lego && b.lego.known === snap[c].lego.known && b.lego.target === snap[c].lego.target],
        ['row', row ? (row.known_text === snap[c].row.known && row.target_text === snap[c].row.target && row.phrase_role === 'build') : 'gone'],
      ]
      for (const [k, ok] of checks) { console.log(c, k, ok === true ? 'MATCH' : ok === 'gone' ? 'ALREADY GONE' : 'MISMATCH — HELD'); if (ok !== true && ok !== 'gone') bad++ }
    }
    process.exit(bad ? 3 : 0)
  })().catch((e) => { console.error(e); process.exit(1) })
}
