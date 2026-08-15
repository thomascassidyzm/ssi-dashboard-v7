/**
 * cym_for_yor — checks the server does NOT do.
 *
 * The course-builder gates all run on the WELSH (target) side. The YORUBA
 * (known) side is completely ungated: no tiling, no untaught-word rule, no
 * containment. This harness supplies those checks, plus the slice-correspondence
 * defect hunt the brief asked for.
 *
 * EVERY Yoruba comparison here is DIACRITIC-EXACT. Nothing is lowercased into
 * a merge, nothing is NFD-stripped, nothing is deduped on a tone-blind key.
 * Tone is lexical in Yoruba; kọ́ (learn) and kọ (practise) are different verbs
 * and this harness must never see them as the same string.
 *
 * Run:  node docs/cym-for-yor-build-2026-08-15/verify-known-side.cjs
 */
const seeds = require('./golden-decompositions-seeds-1-10.cjs');

// ── tone-exact tokenisation: NFC only, strip bookend punctuation, never marks ──
const NFC = s => (s || '').normalize('NFC');
const words = s => NFC(s)
  .replace(/[.,!?;:]/g, ' ')
  .split(/\s+/)
  .map(w => w.trim())
  .filter(Boolean);
// Case is folded ONLY for sentence-initial capitals, which the API also folds.
// This touches ASCII case only and cannot disturb a combining mark.
const fold = s => words(s).map(w => w.toLowerCase()).join(' ');

let problems = 0;
const note = (tag, msg) => { console.log(`  ✗ [${tag}] ${msg}`); problems++; };

// ═══════════════════════════════════════════════════════════════════
// 1. KNOWN-SIDE TILING — does every Yoruba prompt compose from Yoruba
//    chunks already introduced? Same whole-chunk DP the server uses on Welsh.
// ═══════════════════════════════════════════════════════════════════
const knownChunks = new Set();
const addKnown = l => {
  knownChunks.add(fold(l.known));
  if (l.components) for (const c of l.components) knownChunks.add(fold(c.known));
};
const tileable = (phrase) => {
  const w = fold(phrase).split(' ').filter(Boolean);
  const n = w.length;
  const dp = new Array(n + 1).fill(false); dp[0] = true;
  const chunks = [...knownChunks].map(c => c.split(' ').filter(Boolean)).filter(c => c.length);
  for (let i = 0; i < n; i++) {
    if (!dp[i]) continue;
    for (const c of chunks) {
      if (i + c.length > n) continue;
      let ok = true;
      for (let j = 0; j < c.length; j++) if (w[i + j] !== c[j]) { ok = false; break; }
      if (ok) dp[i + c.length] = true;
    }
  }
  if (dp[n]) return null;
  // first untileable position
  let i = n; while (i > 0 && !dp[i]) i--;
  return w.slice(i).join(' ');
};

console.log('\n══════ 1. KNOWN-SIDE (YORUBA) UNTAUGHT-WORD RULE ══════');
console.log('   (the server never checks this side at all)\n');
let knownPhrases = 0;
for (const seed of seeds) {
  for (const lego of seed.legos) {
    addKnown(lego);
    for (const p of [...(lego.build || []), ...(lego.use || [])]) {
      knownPhrases++;
      const bad = tileable(p.known);
      if (bad) note('YOR-UNTAUGHT', `S${seed.seed_number} L${lego.idx}: "${p.known}"  ← untaught: "${bad}"`);
    }
  }
}
console.log(`  checked ${knownPhrases} Yoruba prompts against ${knownChunks.size} taught Yoruba chunks`);

// ═══════════════════════════════════════════════════════════════════
// 2. ZUT, TONE-EXACT — one Yoruba prompt must have exactly one Welsh form.
// ═══════════════════════════════════════════════════════════════════
console.log('\n══════ 2. ZUT (tone-exact, production direction yor→cym) ══════\n');
const zut = new Map();       // yoruba(folded, tone-exact) -> Set(welsh)
const record = (k, t, where) => {
  const key = fold(k);
  if (!zut.has(key)) zut.set(key, new Map());
  const m = zut.get(key);
  const tv = fold(t);
  if (!m.has(tv)) m.set(tv, []);
  m.get(tv).push(where);
};
for (const seed of seeds) {
  for (const lego of seed.legos) {
    record(lego.known, lego.target, `S${seed.seed_number}L${lego.idx}`);
    if (lego.components) lego.components.forEach((c, i) =>
      record(c.known, c.target, `S${seed.seed_number}L${lego.idx}C${i + 1}`));
    for (const p of [...(lego.build || []), ...(lego.use || [])])
      record(p.known, p.target, `S${seed.seed_number}L${lego.idx}phrase`);
  }
}
let zutViolations = 0;
for (const [k, m] of zut) {
  if (m.size > 1) {
    zutViolations++;
    note('ZUT', `"${k}" → ${m.size} different Welsh forms: ${[...m.keys()].map(x => `"${x}" (${m.get(x)[0]})`).join('  vs  ')}`);
  }
}
console.log(`  ${zut.size} distinct Yoruba prompts; ${zutViolations} with more than one Welsh form`);

// convergence (allowed, reported for information)
const byTarget = new Map();
for (const [k, m] of zut) for (const t of m.keys()) {
  if (!byTarget.has(t)) byTarget.set(t, new Set());
  byTarget.get(t).add(k);
}
const convergent = [...byTarget.entries()].filter(([, s]) => s.size > 1);
console.log(`  ${convergent.length} Welsh forms reached by more than one Yoruba prompt (CONVERGENCE — allowed):`);
convergent.slice(0, 8).forEach(([t, s]) => console.log(`      "${t}"  ←  ${[...s].map(x => `"${x}"`).join(', ')}`));

// ═══════════════════════════════════════════════════════════════════
// 3. THE TONE-BLINDNESS PROBE — what a diacritic-stripping gate would do
//    to THIS output. Run for evidence; its verdict is NEVER acted on.
// ═══════════════════════════════════════════════════════════════════
console.log('\n══════ 3. TONE-BLINDNESS PROBE (evidence only, never acted on) ══════\n');
const strip = s => fold(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
const blind = new Map();
for (const k of zut.keys()) {
  const s = strip(k);
  if (!blind.has(s)) blind.set(s, new Set());
  blind.get(s).add(k);
}
const merged = [...blind.entries()].filter(([, s]) => s.size > 1);
console.log(`  Distinct Yoruba prompts, tone-exact : ${zut.size}`);
console.log(`  Distinct after stripping U+0300-U+036F: ${blind.size}`);
console.log(`  Prompt groups a tone-blind key would MERGE: ${merged.length}`);
let falseZut = 0;
for (const [s, set] of merged) {
  const targets = new Set();
  for (const k of set) for (const t of zut.get(k).keys()) targets.add(t);
  const verdict = targets.size > 1 ? 'WOULD FALSELY REJECT (different Welsh forms)' : 'would merge silently (same Welsh)';
  if (targets.size > 1) falseZut++;
  console.log(`   · "${s}"  ←  ${[...set].map(x => `"${x}"`).join('  |  ')}   → ${verdict}`);
}
console.log(`  ${falseZut} of those would be a FALSE ZUT REJECTION if the known side were tone-stripped.`);

// word-level tone minimal pairs actually present in this output
const allWords = new Map();
for (const k of zut.keys()) for (const w of k.split(' ')) allWords.set(w, (allWords.get(w) || 0) + 1);
const wblind = new Map();
for (const w of allWords.keys()) {
  const s = strip(w);
  if (!wblind.has(s)) wblind.set(s, new Set());
  wblind.get(s).add(w);
}
const wpairs = [...wblind.entries()].filter(([, s]) => s.size > 1);
console.log(`\n  Yoruba WORD forms in this output that a tone-blind key would merge: ${wpairs.length}`);
wpairs.forEach(([s, set]) => console.log(`   · strip="${s}"  ←  ${[...set].map(w => `${w} (×${allWords.get(w)})`).join('  vs  ')}`));

// ═══════════════════════════════════════════════════════════════════
// 4. SLICE CORRESPONDENCE — the estate-wide defect: a LEGO whose known
//    side and target side were sliced from different pieces of the seed.
// ═══════════════════════════════════════════════════════════════════
console.log('\n══════ 4. SLICE CORRESPONDENCE / ROTATION CHECK ══════\n');
let covKnownGaps = 0, covTargetGaps = 0, crossings = 0, spanFail = 0;

// A seed word is legitimately covered either by one of THIS seed's LEGOs or by
// a chunk taught in an EARLIER seed. Only a word covered by neither is a
// genuine missing-LEGO defect.
const priorK = new Set(), priorT = new Set();
const wordsOf = set => { const o = new Set(); for (const c of set) for (const w of c.split(' ')) if (w) o.add(w); return o; };

for (const seed of seeds) {
  const priorKW = wordsOf(priorK), priorTW = wordsOf(priorT);
  const kw = fold(seed.known_text).split(' ');
  const tw = fold(seed.target_text).split(' ');
  const kCover = new Array(kw.length).fill(0);
  const tCover = new Array(tw.length).fill(0);
  const positions = [];

  const findSpan = (hay, needle) => {
    const n = fold(needle).split(' ').filter(Boolean);
    if (!n.length) return -1;
    for (let i = 0; i + n.length <= hay.length; i++) {
      let ok = true;
      for (let j = 0; j < n.length; j++) if (hay[i + j] !== n[j]) { ok = false; break; }
      if (ok) return i;
    }
    return -1;
  };

  for (const lego of seed.legos) {
    const ki = findSpan(kw, lego.known);
    const ti = findSpan(tw, lego.target);
    const klen = fold(lego.known).split(' ').filter(Boolean).length;
    const tlen = fold(lego.target).split(' ').filter(Boolean).length;

    if (ki < 0) { note('SPAN', `S${seed.seed_number}L${lego.idx}: known "${lego.known}" is not a contiguous span of the seed prompt`); spanFail++; }
    else for (let j = 0; j < klen; j++) kCover[ki + j]++;

    if (ti < 0) { note('SPAN', `S${seed.seed_number}L${lego.idx}: target "${lego.target}" is not a contiguous span of the seed target`); spanFail++; }
    else for (let j = 0; j < tlen; j++) tCover[ti + j]++;

    if (ki >= 0 && ti >= 0) positions.push({ idx: lego.idx, ki, ti, lego });
  }

  for (const lego of seed.legos) {
    priorK.add(fold(lego.known)); priorT.add(fold(lego.target));
    if (lego.components) for (const c of lego.components) { priorK.add(fold(c.known)); priorT.add(fold(c.target)); }
  }

  const kGaps = kw.filter((w, i) => kCover[i] === 0 && !priorKW.has(w));
  const tGaps = tw.filter((w, i) => tCover[i] === 0 && !priorTW.has(w));
  if (kGaps.length) { note('MISSING-LEGO-KNOWN', `S${seed.seed_number}: Yoruba words no LEGO teaches: ${kGaps.join(', ')}`); covKnownGaps++; }
  if (tGaps.length) { note('MISSING-LEGO-TARGET', `S${seed.seed_number}: Welsh words no LEGO teaches: ${tGaps.join(', ')}`); covTargetGaps++; }

  // Rotation test: sort LEGOs by their position in the KNOWN sentence; their
  // positions in the TARGET sentence must not cross. A crossing is the exact
  // signature of two LEGOs holding each other's material.
  const sorted = [...positions].sort((a, b) => a.ki - b.ki);
  for (let a = 0; a < sorted.length; a++)
    for (let b = a + 1; b < sorted.length; b++)
      if (sorted[a].ti > sorted[b].ti) {
        crossings++;
        console.log(`  ⚠ [ORDER-CROSSING] S${seed.seed_number}: "${sorted[a].lego.known}"→"${sorted[a].lego.target}" and "${sorted[b].lego.known}"→"${sorted[b].lego.target}" cross. Needs eyes: legitimate word-order difference, or a swapped slice?`);
      }
}
console.log(`  seeds with an uncovered Yoruba word : ${covKnownGaps}`);
console.log(`  seeds with an uncovered Welsh word  : ${covTargetGaps}`);
console.log(`  LEGO sides not found as a seed span : ${spanFail}`);
console.log(`  known/target order crossings        : ${crossings}  (flagged for eyes, not auto-failed)`);

// ═══════════════════════════════════════════════════════════════════
// 5. SELF-CONTRADICTION — same word paired with different counterparts,
//    or different words with the same counterpart, at LEGO/component level.
// ═══════════════════════════════════════════════════════════════════
console.log('\n══════ 5. SELF-CONTRADICTION TEST (no language knowledge required) ══════\n');
const pairs = [];
for (const seed of seeds) for (const lego of seed.legos) {
  pairs.push({ k: fold(lego.known), t: fold(lego.target), where: `S${seed.seed_number}L${lego.idx}` });
  if (lego.components) lego.components.forEach((c, i) =>
    pairs.push({ k: fold(c.known), t: fold(c.target), where: `S${seed.seed_number}L${lego.idx}C${i + 1}` }));
}
const fwd = new Map(), rev = new Map();
for (const p of pairs) {
  if (!fwd.has(p.k)) fwd.set(p.k, new Map());
  fwd.get(p.k).set(p.t, p.where);
  if (!rev.has(p.t)) rev.set(p.t, new Map());
  rev.get(p.t).set(p.k, p.where);
}
let contra = 0;
for (const [k, m] of fwd) if (m.size > 1) {
  contra++;
  note('CONTRADICTION', `Yoruba "${k}" is paired with ${m.size} different Welsh forms: ${[...m.entries()].map(([t, w]) => `"${t}" @${w}`).join(' vs ')}`);
}
let conv = 0;
for (const [t, m] of rev) if (m.size > 1) conv++;
console.log(`  ${pairs.length} known/target pairs across LEGOs and components`);
console.log(`  same Yoruba → different Welsh (DEFECT)     : ${contra}`);
console.log(`  different Yoruba → same Welsh (allowed)    : ${conv}`);

console.log('\n────────────────────────────────────────');
console.log(problems ? `✗ ${problems} PROBLEM(S)` : `✓ ALL KNOWN-SIDE AND CORRESPONDENCE CHECKS PASS`);
process.exit(problems ? 1 : 0);
