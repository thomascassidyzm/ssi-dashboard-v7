/**
 * Local replica of the server's own gates, run against the yid_for_eng golden
 * decompositions BEFORE submission. Uses the server's real functions — not a
 * reimplementation — so a pass here means the same code will pass on the wire.
 *
 *   node docs/yid-for-eng-build-2026-08-15/verify-gates.cjs
 *
 * Gates replicated:
 *   1. NFC / script integrity on every authored string
 *   2. LEGO syllable cap        (checkLegoSyllables)
 *   3. Seed tiling              (checkTiling)
 *   4. Untaught-word rule       (checkVocabViolations) — accumulating vocab in
 *      idx order, snapshotted BEFORE each LEGO's own phrases, exactly as
 *      seed-complete.cjs does it
 *   5. LEGO-containment: every phrase contains its LEGO target
 *   6. ZUT across the authored set (same known -> two targets)
 */
const path = require('path');
const SEEDS = require('./golden-decompositions-seeds-1-10.cjs');
const LIB = path.join(__dirname, '../../services/course-builder/lib');
const { checkTiling, checkVocabViolations } = require(path.join(LIB, 'validation.cjs'));
const { checkLegoSyllables, estimateSyllables } = require(path.join(LIB, 'language-config.cjs'));
const { extractVocab, normalizeForContainment } = require(path.join(LIB, 'text-normalization.cjs'));

const COURSE = 'yid_for_eng';
const fail = [];
const warn = [];
const hex = (s) => [...s].map((c) => c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join(' ');

// ── Gate 1: script integrity on every authored Yiddish string ──────────────
const allTargets = [];
for (const s of SEEDS) {
  allTargets.push(['seed ' + s.seed_number + ' target', s.target_text]);
  for (const l of s.legos) {
    allTargets.push([`S${s.seed_number}L${l.idx} lego`, l.target]);
    for (const c of l.components || []) allTargets.push([`S${s.seed_number}L${l.idx} comp`, c.target]);
    for (const p of l.build || []) allTargets.push([`S${s.seed_number}L${l.idx} build`, p.target]);
    for (const p of l.use || []) allTargets.push([`S${s.seed_number}L${l.idx} use`, p.target]);
  }
}
let presForm = 0;
let nonNfc = 0;
const badChars = new Map();
for (const [where, t] of allTargets) {
  if (t !== t.normalize('NFC')) { nonNfc++; fail.push(`NOT NFC: ${where} "${t}" -> ${hex(t)}`); }
  for (const ch of t) {
    const c = ch.codePointAt(0);
    if (c >= 0xfb1d && c <= 0xfb4f) { presForm++; fail.push(`PRESENTATION FORM U+${c.toString(16).toUpperCase()} in ${where}: "${t}"`); }
    // Allowed: Hebrew block, space, and the three punctuation marks the corpus uses
    const ok = (c >= 0x0590 && c <= 0x05f4) || c === 0x20 || c === 0x3f || c === 0x2c || c === 0x2e;
    if (!ok) badChars.set(ch, (badChars.get(ch) || 0) + 1);
  }
}
for (const [ch, n] of badChars) fail.push(`UNEXPECTED CHAR ${JSON.stringify(ch)} (U+${ch.codePointAt(0).toString(16).toUpperCase()}) x${n}`);

// ── Gate 6 setup: ZUT map across everything authored ───────────────────────
const zut = new Map();
const noteZut = (known, target, where) => {
  const k = known.trim().toLowerCase();
  if (!zut.has(k)) zut.set(k, new Map());
  const m = zut.get(k);
  if (!m.has(target)) m.set(target, []);
  m.get(target).push(where);
};

// ── Gates 2-5, seed by seed, accumulating vocab exactly as the server does ──
const vocabSet = new Set();
for (const s of SEEDS) {
  const sid = `S${String(s.seed_number).padStart(4, '0')}`;

  // Gate 2: syllable cap
  for (const l of s.legos) {
    const chk = checkLegoSyllables(l.target, COURSE);
    if (!chk.ok) fail.push(`SYLLABLE CAP: ${sid}L${l.idx} "${l.target}" = ${chk.syllables} > ${chk.max}`);
    else if (chk.syllables >= 7) warn.push(`near cap: ${sid}L${l.idx} "${l.target}" = ${chk.syllables}/8`);
  }

  // Gate 3: tiling (vocab from PRIOR seeds only, as the server loads it)
  const tiling = checkTiling(s.target_text, s.legos, COURSE, vocabSet);
  if (!tiling.valid) fail.push(`TILING ${sid}: untiled [${tiling.untiled}]`);

  // Gates 4 + 5, per LEGO in idx order
  for (const l of [...s.legos].sort((a, b) => a.idx - b.idx)) {
    const lid = `${sid}L${String(l.idx).padStart(2, '0')}`;
    noteZut(l.known, l.target, lid);

    // Snapshot vocab BEFORE this LEGO's phrases, then add this LEGO + its comps
    extractVocab(l.target, false).forEach((v) => vocabSet.add(v));
    for (const c of l.components || []) extractVocab(c.target, false).forEach((v) => vocabSet.add(v));
    const snapshot = new Set(vocabSet);

    const phrases = [...(l.build || []), ...(l.use || [])];
    // Gate 5: containment
    for (const p of phrases) {
      if (!normalizeForContainment(p.target).includes(normalizeForContainment(l.target))) {
        fail.push(`CONTAINMENT ${lid}: phrase "${p.target}" does not contain lego "${l.target}"`);
      }
      noteZut(p.known, p.target, lid + ' phrase');
    }
    // Gate 4: untaught words
    const v = checkVocabViolations(phrases.map((p) => ({ target: p.target })), snapshot, COURSE);
    for (const viol of v) fail.push(`UNTAUGHT ${lid}: "${viol.phrase}" -> untileable: ${viol.unknown}`);
  }

  // BUILD/USE duplicate check (server rejects an identical build+use pair)
  for (const l of s.legos) {
    const b = new Set((l.build || []).map((p) => p.target));
    for (const u of l.use || []) if (b.has(u.target)) fail.push(`DUP ${sid}L${l.idx}: build and use share "${u.target}"`);
  }
}

// ── Gate 6: report ZUT collisions ──────────────────────────────────────────
for (const [known, targets] of zut) {
  if (targets.size > 1) {
    fail.push(`ZUT "${known}" -> ${[...targets.keys()].map((t) => `"${t}"`).join(' AND ')} (${[...targets.values()].flat().join(', ')})`);
  }
}

// ── Output ─────────────────────────────────────────────────────────────────
const nLegos = SEEDS.reduce((a, s) => a + s.legos.length, 0);
const nPhrases = SEEDS.reduce((a, s) => a + s.legos.reduce((b, l) => b + (l.build || []).length + (l.use || []).length, 0), 0);
console.log(`yid_for_eng golden set: ${SEEDS.length} seeds, ${nLegos} LEGOs, ${nPhrases} authored phrases, ${allTargets.length} Yiddish strings`);
console.log(`script: ${nonNfc} non-NFC, ${presForm} presentation-form codepoints, ${badChars.size} unexpected chars`);
console.log(`vocab set after seed 10: ${vocabSet.size} chunks`);
if (warn.length) { console.log(`\n--- ${warn.length} warning(s) ---`); warn.forEach((w) => console.log('  ! ' + w)); }
if (fail.length) { console.log(`\n--- ${fail.length} FAILURE(S) ---`); fail.forEach((f) => console.log('  x ' + f)); process.exitCode = 1; }
else console.log('\nALL GATES PASS');
