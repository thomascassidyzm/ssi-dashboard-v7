#!/usr/bin/env node
/**
 * deu-ledger.cjs — the AUDITABLE adjudication ledger for eng_for_deu's 486 known-side findings.
 *
 * This file is where machine classification stops and HAND RULINGS start. Every ruling that is
 * mine rather than the classifier's is written out below with its evidence, so a reviewer can
 * disagree with a specific line rather than with a number.
 *
 * THE FRAME (Kai, 2026-08-17):
 *   TIER 1  fine by design — an uninstructed FORM of a word the learner knows.
 *   TIER 2  mild defect — a distinct lexeme for a concept taught under a different word.
 *   TIER 3  serious — no closest-word reach is available at all.
 *
 * THE DIRECTION, which decides most of this: eng_for_deu teaches ENGLISH to German speakers.
 * known_text is the GERMAN prompt (their native language); target_text is the ENGLISH they must
 * produce. So an un-introduced GERMAN prompt word cannot itself scare the learner — it only
 * harms them where the ENGLISH it demands has not been taught. That is why the German-side
 * finding class largely dies here, and why the surviving items are the ones with an English gap.
 */
const fs = require('fs');
const path = require('path');
const rows = JSON.parse(fs.readFileSync(path.join(__dirname, 'deu-english-axis.json'), 'utf8'));

// ── HAND CORRECTION 1: pairings the string classifier got right for the WRONG reason, or missed.
// Each verified against the real lego list (seed + known_text + target_text quoted in the report).
const MORPH_OVERRIDE = {
  // token: [correct earlier-taught form, its debut seed, note]
  'hören':        ['hört (S71 "die Wahrheit hört" = "hear the truth")', 71, 'classifier paired to aufhören S19 — wrong lexeme; the right pairing is hört S71, and every use is at or after S71'],
  'meinst':       ['meine (S8 "was ich meine" = "what I mean")', 8, 'classifier used a homograph family; the VERB meinen really is taught at S8, so the pairing holds'],
  'warte':        ['warten (S82 "ich werde nicht auf dich warten")', 82, 'classifier paired to war S70 (string coincidence); warten S82 is the real pairing, use is S155'],
  'ändere':       ['ändern (S104 "wir müssen ändern")', 104, 'classifier paired to ander- S5 (different lexeme); ändern S104 is the real pairing, use is S188'],
  'zustimme':     ['stimme … zu (S83 "ich stimme dem zu")', 83, 'separable-prefix form of a verb taught the same seed'],
  'stellen':      ['stelle (S190 "ein paar Fragen stelle")', 190, 'same seed'],
  // MISSED by the classifier's length guards / ablaut gaps — verified present and EARLIER:
  'verstanden':   ['verstehst (S58) / verstehen (S74)', 58, 'strong participle; classifier has no ablaut rule for versteh→verstand'],
  'übst':         ['üben (S5 "üben" = "to practise")', 5, 'classifier length guard refused to strip -en from a 4-char stem'],
  'nachdenkst':   ['nachzudenken (S37 "darüber nachzudenken")', 37, 'zu-infix form taught S37; the S49 use is later'],
  'zustimmst':    ['stimme … zu (S83)', 83, 'as zustimme'],
  'kennenlernen': ['kennen lernen (S133, taught as TWO words)', 133, 'identical collocation, spaced spelling; both constituents taught far earlier (lernen S2, kenne S85)'],
  'zurechtkomme': ['ich komme zurecht (S173)', 173, 'same seed, separable form'],
  'fern':         ['ferngesehen (S220 "ein bisschen ferngesehen")', 220, 'stranded separable prefix of a verb taught S220'],
};

// ── HAND CORRECTION 2: rulings on the items that survive the English axis.
// Keyed by phrase_id. Verified English debut seeds, re-derived by hand from course_legos.
const RULINGS = {
  'eng_for_deu:S0026L03U06': { tier: 3, word: 'think', debut: 37, gap: 11,
    why: 'must produce "I think" at S26; English "think" debuts S37 ("to think about it"). No English word for the concept is available at S26, so there is no closest-word reach.' },
  'eng_for_deu:S0027L01U05': { tier: 3, word: 'understand', debut: 58, gap: 31,
    why: 'must produce "understand" at S27; debuts S58. Nothing in the S1–S26 inventory approximates it.' },
  'eng_for_deu:S0043L02U04': { tier: 3, word: 'understand', debut: 58, gap: 15,
    why: 'same word, same absence, at S43.' },
  'eng_for_deu:S0038L03U06': { tier: 3, word: 'fun', debut: 64, gap: 26,
    why: 'must produce "it is fun" at S38; "fun" debuts S64 — and S64 teaches it via this very German phrase ("es macht Spaß"). The S38 prompt uses the S64 lego 26 seeds before its own debut.' },
  'eng_for_deu:S0043L01U06': { tier: 3, word: 'sorry', debut: 139, gap: 96,
    why: 'must produce "I\'m sorry" at S43; "sorry" debuts S139. A 96-seed gap and the largest single item in the course.' },
  'eng_for_deu:S0084L01U06': { tier: 3, word: 'sorry', debut: 139, gap: 55,
    why: 'same word, same absence, at S84.' },
  'eng_for_deu:S0047L02U06': { tier: 3, word: 'important + take', debut: 65, gap: 18,
    why: 'must produce "it\'s important to take time" at S47; BOTH "important" and "take" debut at S65, together, in this same phrase. Two untaught content words in one prompt.' },
  'eng_for_deu:S0055L02U02': { tier: 3, word: 'hard', debut: 106, gap: 51,
    why: 'must produce "it\'s hard" at S55; "hard" debuts S106 and its near-synonym "difficult" only at S66. At S55 the learner has neither, so no reach exists.' },
  'eng_for_deu:S0090L01U04': { tier: 2, word: 'hard', debut: 106, gap: 16,
    why: 'must produce "it\'s not so hard" at S90. By S90 "difficult" IS taught (S66), so a reach EXISTS — but it is the wrong word: the learner says "difficult" and is answered "hard". Kai tier 2 exactly: a distinct lexeme for a concept they hold under another word.' },
  // DISMISSED on adjudication — confirmed NOT defects.
  'eng_for_deu:S0046L03U06': { tier: 0, word: 'good', debut: 47, gap: 1,
    why: 'DISMISSED. "good" debuts S47, used S46 — one seed. A one-seed lead is inside authoring tolerance and the German "gut" is taught from S13 ("sehr gut"). Also: "th" in the automated output was a stemmer artefact of "thing", not a real word.' },
  'eng_for_deu:S0047L04U06': { tier: 0, word: 'care', debut: 48, gap: 1,
    why: 'DISMISSED. "I don\'t care about" debuts S48, used S47 — one seed. Same tolerance. ("carefully" at S37 is a different lexeme and is not the licence.)' },
  'eng_for_deu:S0207L02U02': { tier: 0, word: 'knew', debut: 105, gap: -102,
    why: 'DISMISSED. The English past of "know" is taught at S105 ("didn\'t know" ← "kannte nicht") and exercised again at S128 ("I used to know"). The surface string "knew" is not separately drilled, but the learner has had past-tense know for a hundred seeds — tier 1, an uninstructed form of a word they hold.' },
  'eng_for_deu:S0211L02U05': { tier: 0, word: 'knew', debut: 105, gap: -106, why: 'DISMISSED, as S207.' },
  'eng_for_deu:S0263L01U02': { tier: 0, word: 'knew', debut: 105, gap: -158, why: 'DISMISSED, as S207.' },
};

// ── build the funnel ────────────────────────────────────────────────────────────────
const withOverride = rows.map(r => ({
  ...r,
  morph_ok: !!(r.morph || MORPH_OVERRIDE[r.token]),
  morph_note: MORPH_OVERRIDE[r.token] || null,
}));

const englishOk = withOverride.filter(r => !r.en_missing.length);
const englishGap = withOverride.filter(r => r.en_missing.length);
const tier1Morph = englishOk.filter(r => r.morph_ok);
const tier1Direction = englishOk.filter(r => !r.morph_ok);

const adjudicated = englishGap.map(r => ({ ...r, ruling: RULINGS[r.phrase_id] || null }));
const unruled = adjudicated.filter(r => !r.ruling);
const dismissed = adjudicated.filter(r => r.ruling && r.ruling.tier === 0);
const tier2 = adjudicated.filter(r => r.ruling && r.ruling.tier === 2);
const tier3 = adjudicated.filter(r => r.ruling && r.ruling.tier === 3);

const uniq = (list) => new Set(list.map(r => r.phrase_id)).size;

console.log('════ THE FUNNEL — eng_for_deu, 486 known-side findings ════\n');
console.log(`RAW                                       ${String(rows.length).padStart(4)} findings   ${String(uniq(rows)).padStart(4)} phrases`);
console.log(`  ├─ TIER 1, German form-variant          ${String(tier1Morph.length).padStart(4)}            ${String(uniq(tier1Morph)).padStart(4)}   (a form of a German gloss taught by that seed, English answer taught)`);
console.log(`  ├─ TIER 1, direction-void               ${String(tier1Direction.length).padStart(4)}            ${String(uniq(tier1Direction)).padStart(4)}   (German lexeme new to the course, but the learner is a NATIVE speaker and the English answer is taught)`);
console.log(`  │     ── dead at tier 1: ${tier1Morph.length + tier1Direction.length}/${rows.length} = ${((tier1Morph.length + tier1Direction.length) / rows.length * 100).toFixed(1)}%`);
console.log(`  └─ SURVIVED to adjudication             ${String(englishGap.length).padStart(4)}            ${String(uniq(englishGap)).padStart(4)}   (the English the prompt demands is not taught yet)`);
console.log(`       ├─ DISMISSED on adjudication       ${String(dismissed.length).padStart(4)}            ${String(uniq(dismissed)).padStart(4)}`);
console.log(`       ├─ TIER 2 (mild)                   ${String(tier2.length).padStart(4)}            ${String(uniq(tier2)).padStart(4)}`);
console.log(`       ├─ TIER 3 (serious)                ${String(tier3.length).padStart(4)}            ${String(uniq(tier3)).padStart(4)}`);
console.log(`       └─ UNRULED (must not happen)       ${String(unruled.length).padStart(4)}            ${String(uniq(unruled)).padStart(4)}`);
if (unruled.length) { console.log('\nUNRULED:'); unruled.forEach(r => console.log('  ', r.phrase_id, r.en_missing_debuts.join(','))); }

console.log('\n════ CONFIRMED DEFECTS ════');
const byPhrase = new Map();
for (const r of [...tier3, ...tier2]) {
  if (!byPhrase.has(r.phrase_id)) byPhrase.set(r.phrase_id, { r, toks: [] });
  byPhrase.get(r.phrase_id).toks.push(r.token);
}
for (const [pid, { r, toks }] of [...byPhrase].sort((a, b) => (b[1].r.ruling.tier - a[1].r.ruling.tier) || (a[1].r.seed - b[1].r.seed))) {
  console.log(`\nTIER ${r.ruling.tier}  ${pid}  S${r.seed} [${r.role}]  gap ${r.ruling.gap} seeds`);
  console.log(`   DE  "${r.known}"`);
  console.log(`   EN  "${r.target}"`);
  console.log(`   untaught English: ${r.ruling.word} (debuts S${r.ruling.debut})   german tokens flagged: ${toks.join(',')}`);
  console.log(`   ${r.ruling.why}`);
}

console.log('\n════ DISMISSED, with reasons ════');
for (const pid of [...new Set(dismissed.map(r => r.phrase_id))]) {
  const r = dismissed.find(x => x.phrase_id === pid);
  console.log(`\n${pid}  S${r.seed}  "${r.ruling.word}"\n   ${r.ruling.why}`);
}

console.log('\n════ HAND CORRECTIONS TO THE MACHINE CLASSIFIER ════');
for (const [tok, [form, seed, note]] of Object.entries(MORPH_OVERRIDE)) {
  const n = withOverride.filter(r => r.token === tok).length;
  console.log(`${tok.padEnd(14)} (${String(n).padStart(2)} hits) ← ${form}\n   ${note}`);
}

fs.writeFileSync(path.join(__dirname, 'deu-ledger.json'), JSON.stringify({
  funnel: {
    raw: rows.length, tier1_form_variant: tier1Morph.length, tier1_direction_void: tier1Direction.length,
    survived: englishGap.length, dismissed: dismissed.length, tier2: tier2.length, tier3: tier3.length,
    tier2_phrases: uniq(tier2), tier3_phrases: uniq(tier3),
  },
  tier3, tier2, dismissed, morph_overrides: MORPH_OVERRIDE,
}, null, 2));
