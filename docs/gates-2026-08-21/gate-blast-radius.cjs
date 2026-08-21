#!/usr/bin/env node
/**
 * Blast radius for the two gate fixes (2026-08-21).
 * Reads /tmp/estate_phrases.tsv (course, seed, lego_index, role, lego_target, phrase_target).
 * Compares OLD gate behaviour (inlined verbatim from the pre-fix code) with NEW.
 */
const fs = require('fs');
const path = require('path');
const LIB = path.join(__dirname, '..', 'services', 'course-builder', 'lib');
const N = require(path.join(LIB, 'text-normalization.cjs'));
const { isChinese } = require(path.join(LIB, 'language-config.cjs'));

// ── OLD implementations, copied verbatim from the pre-fix source ───────────────
const oldNormalizePhrase = (t) => (!t ? '' : t.replace(/[.,!?;:؟،؛]+$/, '').toLowerCase().trim());
const oldSubstring = (lego, phrase) => N.normalizeForContainment(phrase).includes(N.normalizeForContainment(lego));
const oldWord = (lego, phrase) => N.checkWordContainment(lego, phrase); // no courseCode → pre-fix behaviour
const oldIntraLegoDupKey = (t) => N.normalizeForContainment((t || '').trim());

const rows = [];
for (const line of fs.readFileSync('/tmp/estate_phrases.tsv', 'utf8').split('\n')) {
  if (!line) continue;
  const f = line.split('\t');
  if (f.length !== 6) continue;
  rows.push({ course: f[0], seed: +f[1], lego: +f[2], role: f[3], legoT: f[4], target: f[5] });
}

const per = new Map();
const bump = (course, key, n = 1) => {
  if (!per.has(course)) per.set(course, { rows: 0, subNewPass: 0, subNewFail: 0, wordNewPass: 0, wordNewFail: 0, dupSplitLego: 0, dupSplitSeed: 0, dupNewCollide: 0, examples: [] });
  per.get(course)[key] += n;
};

// ── DEFECT 1: containment ─────────────────────────────────────────────────────
for (const r of rows) {
  bump(r.course, 'rows');
  const c = per.get(r.course);
  const oS = oldSubstring(r.legoT, r.target), nS = N.checkSubstringContainment(r.legoT, r.target, r.course);
  if (!oS && nS) { bump(r.course, 'subNewPass'); if (c.examples.length < 3) c.examples.push(`"${r.legoT}" → "${r.target}"`); }
  if (oS && !nS) bump(r.course, 'subNewFail');
  const oW = oldWord(r.legoT, r.target), nW = N.checkWordContainment(r.legoT, r.target, r.course);
  if (!oW && nW) bump(r.course, 'wordNewPass');
  if (oW && !nW) bump(r.course, 'wordNewFail');
}

// ── DEFECT 2: duplicates ──────────────────────────────────────────────────────
// A "split" = two EXISTING rows that the OLD key collapsed but the NEW key keeps apart.
// That is content the old dedup would silently drop on any rebuild.
const groupBy = (keyFn) => {
  const g = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    if (!g.has(k)) g.set(k, []);
    g.get(k).push(r);
  }
  return g;
};
const countSplits = (groups, counterKey) => {
  for (const [, list] of groups) {
    const oldMap = new Map();
    for (const r of list) {
      const ok = oldNormalizePhrase(r.target);
      if (!oldMap.has(ok)) oldMap.set(ok, new Set());
      oldMap.get(ok).add(N.normalizePhrase(r.target));
    }
    for (const [, news] of oldMap) if (news.size > 1) bump(list[0].course, counterKey, news.size - 1);
  }
};
countSplits(groupBy(r => `${r.course}|${r.seed}|${r.lego}`), 'dupSplitLego');
countSplits(groupBy(r => `${r.course}|${r.seed}`), 'dupSplitSeed');
// Reverse direction: rows the NEW key collapses but the OLD key kept apart (must be 0).
for (const [, list] of groupBy(r => `${r.course}|${r.seed}`)) {
  const newMap = new Map();
  for (const r of list) {
    const nk = N.normalizePhrase(r.target);
    if (!newMap.has(nk)) newMap.set(nk, new Set());
    newMap.get(nk).add(oldNormalizePhrase(r.target));
  }
  for (const [, olds] of newMap) if (olds.size > 1) bump(list[0].course, 'dupNewCollide', olds.size - 1);
}

// ── report ────────────────────────────────────────────────────────────────────
const out = [...per.entries()].sort((a, b) => (b[1].subNewPass + b[1].dupSplitSeed) - (a[1].subNewPass + a[1].dupSplitSeed));
console.log('course'.padEnd(22), 'rows'.padStart(7), 'sub+'.padStart(6), 'sub-'.padStart(5), 'word+'.padStart(6), 'word-'.padStart(6), 'dupLego'.padStart(8), 'dupSeed'.padStart(8), 'newCol'.padStart(7), ' chinese');
let T = { rows: 0, subNewPass: 0, subNewFail: 0, wordNewPass: 0, wordNewFail: 0, dupSplitLego: 0, dupSplitSeed: 0, dupNewCollide: 0 };
for (const [course, s] of out) {
  for (const k of Object.keys(T)) T[k] += s[k];
  if (s.subNewPass || s.subNewFail || s.wordNewPass || s.wordNewFail || s.dupSplitLego || s.dupSplitSeed || s.dupNewCollide) {
    console.log(course.padEnd(22), String(s.rows).padStart(7), String(s.subNewPass).padStart(6), String(s.subNewFail).padStart(5),
      String(s.wordNewPass).padStart(6), String(s.wordNewFail).padStart(6), String(s.dupSplitLego).padStart(8),
      String(s.dupSplitSeed).padStart(8), String(s.dupNewCollide).padStart(7), ' ' + (isChinese(course) ? 'Y' : ''));
    if (s.examples.length) console.log('   e.g. ' + s.examples.join('  |  '));
  }
}
console.log('\nCOURSES:', per.size, ' ROWS:', T.rows);
console.log('TOTALS', JSON.stringify(T, null, 1));
