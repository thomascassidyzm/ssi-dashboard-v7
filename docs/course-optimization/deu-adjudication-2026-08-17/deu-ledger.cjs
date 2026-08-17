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
  // DEMOTED 3→2 by #921's adversarial pass: Duden lists BOTH "Fun" (noun, der Fun) and "sorry"
  // (interjection) as current German loanwords, so the learner does hold the word — from outside
  // the course. That is not nothing: a learner who says "Sorry" colloquially in German is not
  // frightened by being asked for it in English, and Kai's tier 3 turns on the SCARE. What the
  // loanword does NOT supply is the frame ("I'm sorry, …" vs bare "Sorry"), so these stay defects.
  'eng_for_deu:S0038L03U06': { tier: 2, word: 'fun', debut: 64, gap: 26,
    why: 'must produce "it is fun" at S38; "fun" debuts S64 — and S64 teaches it via this very German phrase ("es macht Spaß"), so S38 is using a later seed\'s material wholesale. DEMOTED from 3 to 2 by #921: "Fun" is a Duden-listed German noun, so the word is available to the learner; the predicative English syntax is not.' },
  'eng_for_deu:S0043L01U06': { tier: 2, word: 'sorry', debut: 139, gap: 96,
    why: 'must produce "I\'m sorry" at S43; "sorry" debuts S139 — a 96-seed gap, still the largest in the course. DEMOTED from 3 to 2 by #921: Duden lists "sorry" as a German interjection in daily colloquial use, so the learner holds the word. German "Sorry" is bare, though, and the required "I\'m sorry, …" frame is not given.' },
  'eng_for_deu:S0084L01U06': { tier: 2, word: 'sorry', debut: 139, gap: 55,
    why: 'same word, same absence, at S84. Demoted with S43, same reasoning.' },
  // TAKE sub-claim REFUTED by #921 — and it was my prose, not my code, that over-reached.
  'eng_for_deu:S0047L02U06': { tier: 3, word: 'important', debut: 65, gap: 18,
    why: 'must produce "it\'s important to take time" at S47; "important" debuts S65, in this same phrase — S47 is using the S65 lego wholesale. #921 calls this the least refutable of the set: no cognate, no loanword, and "importieren" is a false friend. My hedged "possibly also TAKE" is REFUTED — S27 teaches "taking too much time", 20 seeds earlier.' },
  // STRENGTHENED by #921: both "hard" legos (S106, S109) are "work hard" — the manner ADVERB.
  'eng_for_deu:S0055L02U02': { tier: 3, word: 'hard', debut: 106, gap: 51,
    why: 'must produce "it\'s hard" at S55, and neither "hard" (S106) nor "difficult" (S66) is available. WORSE than I first wrote: #921 shows both "hard" legos are "work hard", the manner adverb — the PREDICATIVE sense this phrase needs is never taught in all 300 seeds. So "debuts S106" names a repair that does not exist, and a debut reorder cannot fix this one.' },
  'eng_for_deu:S0090L01U04': { tier: 2, word: 'hard', debut: 106, gap: 16,
    why: 'must produce "it\'s not so hard" at S90. By S90 "difficult" IS taught (S66), so a reach EXISTS — but it is the wrong word: the learner says "difficult" and is answered "hard". Kai tier 2 exactly. Per #921 the predicative "hard" never arrives at all, which makes the proposed swap to "difficult" the ONLY route rather than one of two.' },
  // PROMOTED from my dismissals by #921. My dismissals of these four were wrong.
  'eng_for_deu:S0047L04U06': { tier: 2, word: 'care', debut: 48, gap: 1,
    why: 'PROMOTED from my dismissal. I treated this as symmetric with S46 "good" — one seed, therefore tolerable. #921 shows it is not symmetric: "good" is transparent from "gut", whereas "care" has no cognate and no loanword status, and the only earlier reach is S37 "carefully", which is semantically unconnected to "care about". One seed of distance helps a learner at S48, not at S47. Real, shallow, cheap.' },
  'eng_for_deu:S0207L02U02': { tier: 2, word: 'knew', debut: null, gap: null,
    why: 'PROMOTED from my dismissal. I ruled that S105 "didn\'t know" gave the learner past-tense know. #921 shows the string "knew" appears in NO lego target_text anywhere in 300 seeds: the KNOW family is taught 15 times and routes around the simple past every time (S105 "didn\'t know", S128 "used to know", S152 "had known"). Worse, S105\'s glosses sit under "kannte" (kennen) while S207 prompts "wusste" (wissen). A German speaker asked for an affirmative past they have never met regularises it to "knowed".' },
  'eng_for_deu:S0211L02U05': { tier: 2, word: 'knew', debut: null, gap: null, why: 'PROMOTED, as S207 — same missing irregular, same wissen/kennen mismatch.' },
  'eng_for_deu:S0263L01U02': { tier: 2, word: 'knew', debut: null, gap: null, why: 'PROMOTED, as S207.' },
  // DISMISSAL UPHELD by #921.
  'eng_for_deu:S0046L03U06': { tier: 0, word: 'good', debut: 47, gap: 1,
    why: 'DISMISSED, and #921 upheld it: "gut"→"good" is perfectly transparent, plus the gap is one seed. Also, the "th" that appeared in the automated output was a stemmer artefact of "thing", not a word.' },
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
