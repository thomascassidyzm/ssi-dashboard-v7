#!/usr/bin/env node
'use strict'
/**
 * check-pilot.cjs (cs #345·AL) — runs the pilot baskets through the SAME pure functions POST /api/seed/complete calls
 * (services/course-builder/lib: checkTiling, checkVocabViolations, checkBuildRecombination, checkBuildUsePhrases,
 * checkLegoSyllables, checkNonExampleText), offline. No database, no HTTP, nothing written but pilot-1-30.json and
 * pilot-check.json. The route's two DB-backed checks (checkLegoConflict, checkPhraseZUT) are replaced by an in-memory
 * ZUT over the pilot itself: one known text, two target texts.
 *   node ops/bre-rebuild-345/check-pilot.cjs
 */
const fs = require('fs'), path = require('path')
const R = path.resolve(__dirname, '../..'), L = R + '/services/course-builder/lib/'
const V = require(L + 'validation.cjs'), PS = require(L + 'phrase-structure.cjs'), LC = require(L + 'language-config.cjs')
const C = 'bre_for_fra'
const pairs = Object.fromEntries(JSON.parse(fs.readFileSync(__dirname + '/pairs-1-300.json', 'utf8')).map((r) => [r.seed, r]))
const norm = (s) => String(s || '').toLowerCase().replace(/[.,?!;:«»"]/g, ' ').replace(/’/g, "'").replace(/\s+/g, ' ').trim()

// ── parse pilot-*.txt ──
const seeds = []; let seed = null, lego = null
for (const f of fs.readdirSync(__dirname).filter((x) => /^pilot-\d.*\.txt$/.test(x)).sort()) {
  for (const raw of fs.readFileSync(path.join(__dirname, f), 'utf8').split('\n')) {
    const line = raw.trim(); if (!line || line.startsWith('#')) continue
    if (line.startsWith('@')) { const n = Number(line.slice(2)); seed = { n, known: pairs[n].proposed_french, target: pairs[n].proposed_breton, legos: [], notes: [] }; seeds.push(seed); continue }
    if (line.startsWith('N ')) { seed.notes.push(line.slice(2)); continue }
    const kind = line.split(' ')[0], parts = line.slice(kind.length + 1).split('|').map((x) => x.trim())
    if (kind === 'L' || kind === 'L-') {
      lego = { id: `S${String(seed.n).padStart(4, '0')}L${String(seed.legos.length + 1).padStart(2, '0')}`, idx: seed.legos.length + 1, target: parts[0], known: parts[1], type: parts[2] || 'A',
        is_new: kind === 'L', components: (parts[3] || '').split(';').map((c) => c.trim()).filter(Boolean).map((c) => { const [t, k] = c.split('='); return { target: t.trim(), known: (k || '').trim() } }), build: [], use: [] }
      seed.legos.push(lego)
    } else if (kind === 'B') lego.build.push({ target: parts[0], known: parts[1] })
    else if (kind === 'U' || kind === 'U*') lego.use.push({ target: parts[0], known: parts[1], seed_sentence: kind === 'U*' })
    else throw new Error('bad line: ' + line)
  }
}
fs.writeFileSync(__dirname + '/pilot-1-30.json', JSON.stringify(seeds, null, 1))

// ── check ──
const prior = new Set(); const legoZut = new Map(), phraseZut = new Map(); const out = []; const tot = { seeds: 0, legos: 0, new_legos: 0, build: 0, use: 0, hard: 0, warn: 0 }
const quiet = console.log; console.log = () => {}
for (const s of seeds) {
  const res = { seed: s.n, target: s.target, known: s.known, hard: [], warn: [], legos: [] }
  const til = V.checkTiling(s.target, s.legos, C, prior, { seedNumber: s.n })
  if (!til.valid) res.hard.push('TILING: ' + (til.message || JSON.stringify(til.untiled)))
  const seedT = new Set(norm(s.target).split(' ')), seedK = new Set(norm(s.known).replace(/\b([djlmnst]|qu)'/g, '$1e ').split(' '))
  for (const l of s.legos) {
    const lr = { id: l.id, target: l.target, known: l.known, is_new: l.is_new, build: l.build.length, use: l.use.length, hard: [], warn: [] }
    const syl = LC.checkLegoSyllables(l.target, C); lr.syllables = syl.syllables
    if (!syl.ok) lr.hard.push(`SYLLABLES ${syl.syllables} > ${syl.max}`)
    if (l.type === 'M' && !l.components.length) lr.hard.push('M-LEGO with no components')
    const ne = V.checkNonExampleText([l]); if (ne && ne.valid === false) lr.hard.push('NON-EXAMPLE TEXT')
    for (const w of norm(l.target).split(' ')) if (!seedT.has(w)) lr.warn.push(`L26 target word not in seed: ${w}`)
    for (const w of norm(l.known).replace(/\b([djlmnst]|qu)'/g, '$1e ').split(' ')) if (!seedK.has(w)) lr.warn.push(`L26 known word not in seed: ${w}`)
    // vocabulary: earlier seeds + earlier siblings + this LEGO (as the route does)
    const own = [l.target, ...l.components.map((c) => c.target)]
    const vocab = new Set([...prior, ...own])
    const rows = [...l.build, ...l.use]
    const vv = V.checkVocabViolations(rows, vocab, C, { seedNumber: s.n })
    const viol = Array.isArray(vv) ? vv : (vv.violations || [])
    for (const v of viol) lr.hard.push(`VOCAB: "${v.phrase}" untaught: ${JSON.stringify(v.unknown)}`)
    if (l.is_new) {
      const bu = PS.checkBuildUsePhrases(l, C, s.n)
      if (!bu.valid) lr[/need \d/.test(bu.error) ? 'floor' : 'hard'] = /need \d/.test(bu.error) ? bu.error : [...lr.hard, bu.error]
      const rc = V.checkBuildRecombination(l, C, s.n, prior)
      if (!rc.valid) lr.hard.push('BUILD RECOMBINATION: ' + JSON.stringify(rc.rejects || rc).slice(0, 200))
      const nL = norm(l.target)
      for (const p of rows) { if (norm(p.target) === nL) lr.hard.push('BARE LEGO as a phrase'); const pt = ' ' + norm(p.target) + ' '; if (!nL.split(' ').every((w) => pt.includes(' ' + w + ' '))) lr.hard.push(`P17: "${p.target}" lacks its LEGO`) }
      const k = norm(l.known); if (legoZut.has(k) && legoZut.get(k).t !== norm(l.target)) lr.hard.push(`ZUT (LEGO): "${l.known}" is also ${legoZut.get(k).id} "${legoZut.get(k).t}"`); else legoZut.set(k, { t: norm(l.target), id: l.id })
      for (const p of rows) { const pk = norm(p.known); if (phraseZut.has(pk) && phraseZut.get(pk).t !== norm(p.target)) lr.hard.push(`ZUT (phrase): "${p.known}" → "${p.target}" and ${phraseZut.get(pk).id} "${phraseZut.get(pk).t}"`); else phraseZut.set(pk, { t: norm(p.target), id: l.id }) }
      tot.new_legos++; tot.build += l.build.length; tot.use += l.use.length
    } else if (rows.length) lr.warn.push('P25: phrases under a not-new LEGO are never played')
    for (const t of own) prior.add(t)
    tot.legos++; res.legos.push(lr)
  }
  const said = s.legos.some((l) => l.is_new && l.use.some((p) => norm(p.target) === norm(s.target) && norm(p.known) === norm(s.known)))
  if (!said) res.hard.push('P26: the seed sentence is not a USE row under a new LEGO of this seed')
  if (!s.legos.some((l) => l.is_new)) res.hard.push('P25: no new LEGO, the seed would never play')
  tot.seeds++; tot.hard += res.hard.length + res.legos.reduce((a, l) => a + l.hard.length, 0); tot.warn += res.legos.reduce((a, l) => a + l.warn.length, 0)
  out.push(res)
}
console.log = quiet
const floor = out.flatMap((r) => r.legos.filter((l) => l.floor).map((l) => `${l.id} ${l.floor}`))
fs.writeFileSync(__dirname + '/pilot-check.json', JSON.stringify({ checker: 'services/course-builder/lib pure functions, offline; ZUT in memory over the pilot', totals: tot, below_floor: floor, seeds: out }, null, 1))
console.log(JSON.stringify(tot)); console.log('below floor:', floor.length ? floor : 'none')
for (const r of out) { for (const h of r.hard) console.log(`S${r.seed} HARD ${h}`); for (const l of r.legos) { for (const h of l.hard) console.log(`${l.id} HARD ${h}`); if (process.argv.includes('--warn')) for (const w of l.warn) console.log(`${l.id} warn ${w}`) } }
