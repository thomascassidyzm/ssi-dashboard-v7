#!/usr/bin/env node
/**
 * vocab.cjs <seed_number> — what the learner knows just BEFORE this seed.
 *
 * R5 ("the learner knows only what the course has taught them") is the rule this build is most
 * likely to break, because it is invisible: a practice sentence with one unintroduced word looks
 * perfectly fine on the page. This prints the two word lists so it can be checked rather than felt.
 *
 * Irish initial mutation is the trap. `focal` appears as `fhocal`, `Gaeilge` as `nGaeilge`,
 * `duine` as `dhuine`. A mutation-blind comparison reports known words as new and lets genuinely
 * new words through when they happen to resemble a known one, so both sides are compared on a
 * demutated stem.
 */
const { sb } = require('./q.cjs');

const COURSE = 'gle_cn_for_eng';

// Strip Irish initial mutation: lenition (h after the initial consonant) and eclipsis
// (a nasal prefixed to the initial consonant), plus the t-/n-/h- prefixes on vowels.
const ECLIPSIS = { mb: 'b', gc: 'c', nd: 'd', bhf: 'f', ng: 'g', bp: 'p', dt: 't' };
function demutate(w) {
  let s = w.toLowerCase().replace(/^[.,!?;:'"«»]+|[.,!?;:'"«»]+$/g, '');
  if (!s) return s;
  // eclipsis: longest prefix first, so `bhf` is tried before `bh`-as-lenition
  for (const p of ['bhf', 'mb', 'gc', 'nd', 'ng', 'bp', 'dt']) {
    if (s.startsWith(p) && s.length > p.length) return ECLIPSIS[p] + s.slice(p.length);
  }
  // n-/t-/h- before a vowel (written with or without the hyphen)
  if (/^[nth]-[aeiouáéíóú]/.test(s)) return s.slice(2);
  if (/^t[sS]/.test(s) && s.length > 2) return s.slice(1);
  // lenition: consonant + h
  if (/^[bcdfgmpst]h/.test(s) && s.length > 2) return s[0] + s.slice(2);
  return s;
}

const words = (t) => String(t || '')
  .split(/[\s—–-]+/)
  .map(demutate)
  .filter(Boolean);

// ─── KNOWN SIDE — do NOT demutate English (defect found 2026-08-21) ──────────
//
// `demutate` is an Irish rule and was being applied to the English side too. Its lenition
// clause (consonant + h -> consonant) silently rewrites ordinary English: the->te, that->tat,
// think->tink, this->tis, thank->tank, she->se, show->sow, than->tan. That does two kinds of
// damage at once. It fills the "known" list with non-words, which is why workers read the list
// and could not find words that were plainly there; and it CONFLATES DISTINCT ENGLISH WORDS, so
// a phrase using an untaught "tank" would pass because "thank" was taught. A checker that lets a
// breach through is worse than no checker.
//
// It also never expanded contractions, so "she's" tokenised as "se's" and matched nothing —
// while the submit endpoint expands it to "she is" and accepts it. The checker and the endpoint
// therefore disagreed about natural English, and the disagreement pushed workers into stiffer
// phrasing to appease a tool that was wrong. We reuse the endpoint's OWN expansion so the two
// agree by construction rather than by coincidence.
const { tokenizeKnown } = require('../../services/course-builder/lib/validation.cjs');

const knownWords = (t) => tokenizeKnown(String(t || ''));

async function vocabBefore(seedNumber) {
  const known = new Map(); // stem -> first seed
  const target = new Map();
  const note = (map, w, seed) => { if (w && (!map.has(w) || map.get(w) > seed)) map.set(w, seed); };

  const { data: seeds, error: e1 } = await sb.from('course_seeds')
    .select('seed_number,known_text,target_text')
    .eq('course_code', COURSE).lt('seed_number', seedNumber).order('seed_number');
  if (e1) throw new Error(e1.message);

  const { data: legos, error: e2 } = await sb.from('course_legos')
    .select('seed_number,known_text,target_text,components')
    .eq('course_code', COURSE).lt('seed_number', seedNumber).order('seed_number');
  if (e2) throw new Error(e2.message);

  // Practice phrases are part of what the learner has heard, so they count as introduction too.
  const phrases = [];
  for (let from = 0; ; from += 1000) {
    // PostgREST offset paging without an ORDER BY can repeat one row and drop another, which would
    // silently shrink the vocabulary and manufacture false R5 breaches. Order explicitly.
    const { data, error } = await sb.from('course_practice_phrases')
      .select('seed_number,known_text,target_text')
      .eq('course_code', COURSE).lt('seed_number', seedNumber)
      .order('seed_number').order('id').range(from, from + 999);
    if (error) throw new Error(error.message);
    phrases.push(...data);
    if (data.length < 1000) break;
  }

  for (const r of [...seeds, ...legos, ...phrases]) {
    for (const w of knownWords(r.known_text)) note(known, w, r.seed_number);
    for (const w of words(r.target_text)) note(target, w, r.seed_number);
    for (const c of r.components || []) {
      for (const w of knownWords(c.known)) note(known, w, r.seed_number);
      for (const w of words(c.target)) note(target, w, r.seed_number);
    }
  }
  return { known, target };
}

module.exports = { vocabBefore, demutate, words, knownWords };

if (require.main === module) {
  const n = parseInt(process.argv[2], 10);
  if (!n) { console.error('usage: node scripts/gle-cn/vocab.cjs <seed_number>'); process.exit(1); }
  vocabBefore(n).then(({ known, target }) => {
    const fmt = (m) => [...m.keys()].sort().join(' ');
    console.log(`=== Learner vocabulary BEFORE seed ${n} ===\n`);
    console.log(`KNOWN SIDE (English) — ${known.size} words\n${fmt(known)}\n`);
    console.log(`TARGET SIDE (Irish, demutated) — ${target.size} words\n${fmt(target)}\n`);
    console.log('Any content word in a practice sentence must be in these lists, or be a new tile');
    console.log('of the seed you are building. Mutated forms are fine — they demutate to the stem.');
  }).catch(e => { console.error('FAILED:', e.message); process.exit(1); });
}
