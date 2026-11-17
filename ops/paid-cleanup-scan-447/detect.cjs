#!/usr/bin/env node
// #447 paid-courses cleanup scan — MECHANICAL CANDIDATE DETECTORS over a dump made by dump-course.py.
// READ-ONLY, no database, no network: input is the dump file, output is a hits JSON + a one-line coverage summary.
// A HIT IS A CANDIDATE, NEVER A DEFECT (canon R0.9, "Before you believe a count"): every family is read by hand
// before it reaches Kai. ZUT keys, containment and the syllable estimate are the course builder's own functions.
// Usage: node detect.cjs <dump.json> <hits.json> [patterns.json]
'use strict'
const fs = require('fs'), path = require('path')
const R = path.resolve(__dirname, '../..')
const { normalizeForZUT, normalizeForContainment, checkWordContainment } = require(R + '/services/course-builder/lib/text-normalization.cjs')
const { isChinese, checkLegoSyllables } = require(R + '/services/course-builder/lib/language-config.cjs')
const [dumpFile, outFile, patFile] = process.argv.slice(2)
const D = JSON.parse(fs.readFileSync(dumpFile, 'utf8')), course = D.course
const [tgt, known] = course.split('_for_'), tlang = tgt.split('_')[0]
const spaceless = isChinese(course)                       // zho / jpn targets: token detectors EXCLUDED, never "clean"
const knownSpaceless = ['zho', 'jpn'].includes(known)
const zk = (t) => normalizeForZUT(String(t || ''), spaceless && false)
const zt = (t) => normalizeForZUT(String(t || ''), spaceless)
const toks = (t) => (String(t || '').toLowerCase().normalize('NFC').replace(/[ً-ْ]/g, '').match(/[\p{L}\p{M}\p{N}]+(?:['’][\p{L}\p{M}]+)*/gu) || [])
const H = {}, add = (k, o) => (H[k] ||= []).push(o)
const legos = [], phrases = []
for (const s of D.seeds) for (const l of s.legos) {
  const L = { ...l, seed: s.n, seedKnown: s.known, seedTarget: s.target }; legos.push(L)
  for (const p of l.phrases) phrases.push({ ...p, seed: s.n, lego: L })
}
const played = (p) => p.lego.is_new && (p.type === 'build' || p.type === 'use')
const short = (id) => String(id).replace(course + ':', '')

// 1. zut_lego — one known prompt, two target answers, at LEGO level (K2/K4/L34). Kai: only seed/LEGO clashes count.
{ const m = new Map()
  for (const l of legos) { const k = zk(l.known); if (!k) continue; (m.get(k) || m.set(k, new Map()).get(k)).set(zt(l.target), [...((m.get(k).get(zt(l.target))) || []), l.id]) }
  for (const [k, ts] of m) if (ts.size > 1) add('zut_lego', { known: k, targets: [...ts].map(([t, ids]) => ({ target: t, legos: ids })) }) }
// 2. zut_seed — same seed English, different target.
{ const m = new Map()
  for (const s of D.seeds) { const k = zk(s.known); if (!k) continue; (m.get(k) || m.set(k, new Map()).get(k)).set(zt(s.target), s.n) }
  for (const [k, ts] of m) if (ts.size > 1) add('zut_seed', { known: k, targets: [...ts] }) }
// 3. zut_use — a USE prompt (replays cold, P16) or a LEGO with the same known and a different target.
{ const m = new Map()
  const put = (k, t, id) => { if (!k) return; const e = m.get(k) || m.set(k, new Map()).get(k); e.set(t, [...(e.get(t) || []), id]) }
  for (const l of legos) if (l.is_new) put(zk(l.known), zt(l.target), l.id)
  for (const p of phrases) if (p.lego.is_new && p.type === 'use') put(zk(p.known), zt(p.target), short(p.id))
  for (const [k, ts] of m) if (ts.size > 1) add('zut_use', { known: k, targets: [...ts].map(([t, ids]) => ({ target: t, rows: ids.slice(0, 6), n: ids.length })) }) }
// 4. gapped_lego — a gap written into a LEGO (L32: absolutely no gapped LEGOs).
for (const l of legos) if (/…|\.\.\.|_{2,}|\s[-–—]\s*$|^\s*[-–—]\s/.test(l.known + ' | ' + l.target)) add('gapped_lego', { id: l.id, known: l.known, target: l.target })
// 5. tags — brackets, slashes, "as in" inside LEGO or phrase text (K11, K42; "as in" belongs in the presentation).
for (const l of legos) if (/[()\[\]{}\/+]|\bas in\b/i.test(l.known + ' | ' + l.target)) add('tag_lego', { id: l.id, known: l.known, target: l.target })
for (const p of phrases) if (p.type !== 'lego_debut' && /[()\[\]{}\/+]/.test(p.known + ' | ' + p.target)) add('tag_phrase', { id: short(p.id), known: p.known, target: p.target })
// 6. notnew_untaught / dup_debut — "a LEGO is a duplicate only if BOTH sides match" (Kai 23 Sep); P25/L31.
{ const seen = new Map()
  for (const l of legos) { const key = zk(l.known) + ' | ' + zt(l.target), first = seen.get(key)
    if (l.is_new === false && !first) add('notnew_untaught', { id: l.id, known: l.known, target: l.target })
    if (l.is_new === true && first) add('dup_debut', { id: l.id, earlier: first, known: l.known, target: l.target })
    if (!first) seen.set(key, l.id) } }
// 7. lego_syll — builder's own estimate; >8 breaks L3, 7-8 listed for Kai's "shortest cut" rule (17 Nov).
for (const l of legos) { const r = checkLegoSyllables(l.target, course); if (r.syllables >= 7) add(r.ok ? 'lego_syll_7_8' : 'lego_syll_over8', { id: l.id, syl: r.syllables, is_new: l.is_new, known: l.known, target: l.target }) }
// 8. lego_not_in_seed — L26 both sides; token containment, target side excluded for spaceless scripts.
for (const l of legos) {
  const st = new Set(toks(l.seedTarget)), sk = new Set(toks(l.seedKnown))
  const mt = spaceless ? (zt(l.seedTarget).replace(/\s/g, '').includes(zt(l.target).replace(/\s/g, '')) ? [] : ['<not a substring>']) : toks(l.target).filter((w) => !st.has(w))
  const mk = knownSpaceless ? [] : toks(l.known).filter((w) => !sk.has(w) && w !== 'to')     // K54: verb LEGOs carry "to"
  if (mt.length) add('lego_not_in_seed_target', { id: l.id, missing: mt, lego: l.target, seed: l.seedTarget })
  if (mk.length) add('lego_not_in_seed_known', { id: l.id, missing: mk, lego: l.known, seed: l.seedKnown }) }
// 9. phrase_missing_lego — P17, builder's word containment (K31/K49/L28 exceptions are read by hand).
for (const p of phrases) if (played(p)) {
  const ok = spaceless ? normalizeForContainment(p.target).replace(/\s/g, '').includes(normalizeForContainment(p.lego.target).replace(/\s/g, '')) : checkWordContainment(p.lego.target, p.target)
  if (!ok) add('phrase_missing_lego', { id: short(p.id), lego: p.lego.target, known: p.known, target: p.target }) }
// 10. article_drift — "the X" rows under an "a X" LEGO (Kai 10 Nov: fine if enough exact rows remain; early seeds strict).
for (const l of legos) { const m = /^(an?|some) (.+)$/i.exec(String(l.known || '').trim()); if (!m || !l.is_new) continue
  const noun = m[2].toLowerCase(), rows = l.phrases.filter((p) => p.type === 'build' || p.type === 'use')
  const the = rows.filter((p) => new RegExp('\\b(the|that|this|my|your|his|her|our|their) ' + noun.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(p.known) && !new RegExp('\\b' + m[1] + ' ' + noun.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(p.known))
  if (the.length) add('article_drift', { id: l.id, known: l.known, target: l.target, drift: the.length, exact: rows.length - the.length, rows: the.slice(0, 5).map((p) => short(p.id) + ' ' + p.known + ' | ' + p.target) }) }
// 11. dup_rows — the same pair twice in one basket.
for (const l of legos) { const seen = new Map(); for (const p of l.phrases) { if (p.type !== 'build' && p.type !== 'use') continue
  const k = zk(p.known) + ' | ' + zt(p.target); if (seen.has(k)) add('dup_rows', { id: short(p.id), twin: seen.get(k), known: p.known, target: p.target }); else seen.set(k, short(p.id)) } }
// 12. empty_audio — a played row (new LEGO: debut/build/use) with an empty known / target1 / target2 slot (A16).
for (const p of phrases) if (p.lego.is_new && ['lego_debut', 'build', 'use'].includes(p.type)) { const e = ['ka', 't1', 't2'].filter((s) => !p[s]); if (e.length) add('empty_audio', { id: short(p.id), lego: p.lego.id, type: p.type, empty: e.join(','), chars_known: (p.known || '').length, chars_target: (p.target || '').length }) }
// 13. debut_no_practice — P30. 14. seed_not_played — P26.
for (const l of legos) if (l.is_new && !l.phrases.some((p) => p.type === 'build' || p.type === 'use')) add('debut_no_practice', { id: l.id, known: l.known, target: l.target })
{ const set = new Set(phrases.filter(played).map((p) => zk(p.known) + ' | ' + zt(p.target)))
  for (const s of D.seeds) if (!set.has(zk(s.known) + ' | ' + zt(s.target))) add('seed_not_played', { seed: s.n, new_legos: s.legos.filter((l) => l.is_new).length, known: s.known, target: s.target }) }
// 15. untaught_target — P1/K8/K29: a played phrase uses a target word no LEGO (any earlier seed, or this one) contains. Space-delimited targets only.
if (!spaceless) { const first = new Map()
  for (const l of legos) for (const w of toks(l.target)) if (!first.has(w)) first.set(w, l.seed)
  for (const s of D.seeds) for (const w of toks(s.target)) if (!first.has(w)) first.set(w, s.n)
  for (const p of phrases) if (played(p)) { const bad = toks(p.target).filter((w) => !(first.get(w) <= p.seed)); if (bad.length) add('untaught_target', { id: short(p.id), words: bad.map((w) => w + (first.has(w) ? '@S' + first.get(w) : '@never')), known: p.known, target: p.target }) } }
// 16. qmark_mismatch — question on one side only (A7/A9). 17. same_both — identical known and target.
for (const p of phrases) if (played(p)) { const q = (t) => /[?？؟]\s*$/.test(String(t || '').trim())
  if (q(p.known) !== q(p.target)) add('qmark_mismatch', { id: short(p.id), known: p.known, target: p.target })
  if (zk(p.known) === zk(p.target) && toks(p.known).length > 1) add('same_both', { id: short(p.id), known: p.known, target: p.target }) }
// 18. lexical patterns — per-language regexes drawn from the fix history (patterns.json); each carries its known positive.
if (patFile) { const P = JSON.parse(fs.readFileSync(patFile, 'utf8'))
  for (const pat of [...(P[tlang] || []), ...(P['known:' + known] || [])]) { const re = new RegExp(pat.re, 'iu')
    if (pat.kp && !re.test(pat.kp)) { console.error(`CALIBRATION FAIL ${pat.id}: regex does not match its known positive`); process.exit(3) }
    const rows = [...legos.map((l) => ({ id: l.id, known: l.known, target: l.target, ok: true })), ...phrases.filter(played).map((p) => ({ id: short(p.id), known: p.known, target: p.target }))]
    for (const r of rows) if (re.test(pat.side === 'known' ? r.known : r.target)) add('lex:' + pat.id, { id: r.id, known: r.known, target: r.target }) } }

const cov = { course, dumped: D.dumped, seeds: D.seeds.length, legos: legos.length, new_legos: legos.filter((l) => l.is_new).length, phrase_rows: phrases.length, played_rows: phrases.filter(played).length,
  token_detectors_target_side: spaceless ? 'EXCLUDED (spaceless script) — substring fallback only for lego_not_in_seed and phrase_missing_lego; untaught_target NOT RUN' : 'run' }
fs.writeFileSync(outFile, JSON.stringify({ coverage: cov, counts: Object.fromEntries(Object.entries(H).map(([k, v]) => [k, v.length])), hits: H }, null, 1))
console.log(course, JSON.stringify(Object.fromEntries(Object.entries(H).map(([k, v]) => [k, v.length]))))
