/**
 * Syllable/mora counting for the two spaceless target languages in the
 * phrase-lab comparison: Mandarin (zho) and Japanese (jpn).
 *
 * WHY THIS FILE AND NOT tools/lib/syllable-counters.cjs. Registering these in the
 * global REGISTRY is a LIVE BEHAVIOUR CHANGE outside this lab: hasSyllableCounter()
 * is what keeps the speaking script's known-side review filter deliberately INERT
 * on languages with no counter, and flipping jpn/zho to "counted" would silently
 * switch that filter on for every jpn/zho-known course. This job is read-only
 * measurement, so the counters live here and are consulted only by the lab scorer.
 * If the estate later wants them globally, that is its own change with its own
 * blast radius.
 *
 * zho — HONEST AND EXACT. Mandarin is a syllable-per-character language: one Han
 * character is one syllable, with no exceptions worth modelling at this precision.
 * Latin runs and digits inside a Chinese string are counted by vowel groups.
 *
 * jpn — EXACT ON KANA, ESTIMATED ON KANJI, and the estimate is stated rather than
 * hidden. Kana morae are counted exactly: every full-size kana is one mora, the
 * small yōon (ゃゅょ and the small vowels in digraph position) fuse into the
 * preceding mora and count zero, and both the sokuon っ and the chōonpu ー are
 * morae in their own right. Kanji carry no reading in the stored text and this
 * repo has no morphological analyser, so each kanji is counted as **2 morae** —
 * the modal length of a Japanese character reading (on'yomi are overwhelmingly
 * 1-2 morae; kun'yomi run longer but usually trail okurigana that IS counted).
 *
 * The consequence, and it must be reported rather than buried: any axis divided by
 * jpn syllables carries an approximation on its denominator. Every such axis in
 * this lab (newEdgesPerSyllable, shortest-first ordering) is REPORTED-BUT-NOT-IN-
 * THE-FLOORS, so no acceptance verdict depends on it. Cross-course comparison of
 * that one axis against ita/fra/deu is not like-for-like and the reports say so.
 */

const HAN = /[㐀-䶿一-鿿豈-﫿]/;
const KANA = /[぀-ゟ゠-ヿｦ-ﾝ]/;
const SMALL_KANA = /[ぁぃぅぇぉゃゅょゎァィゥェォャュョヮ]/;
const LATIN_VOWELS = /[aeiouyáéíóúüàèìòùâêîôûäëïöü]+/gi;

/** Mandarin: one syllable per Han character, plus vowel groups in any Latin run. */
function countSyllablesZho(text) {
  const s = String(text || '');
  let n = 0;
  let latin = '';
  for (const ch of s) {
    if (HAN.test(ch)) n += 1;
    else latin += ch;
  }
  n += (latin.match(LATIN_VOWELS) || []).length;
  return n;
}

const KANJI_MORAE = 2;

/** Japanese: exact morae over kana, KANJI_MORAE per kanji (see header). */
function countSyllablesJpn(text) {
  const s = String(text || '');
  let n = 0;
  let latin = '';
  for (const ch of s) {
    if (HAN.test(ch)) n += KANJI_MORAE;
    else if (SMALL_KANA.test(ch)) n += 0;        // yōon: fuses into the preceding mora
    else if (KANA.test(ch) || ch === 'ー') n += 1; // includes っ and ー, both morae
    else latin += ch;
  }
  n += (latin.match(LATIN_VOWELS) || []).length;
  return n;
}

/** Fraction of a Japanese string's morae that came from the kanji ESTIMATE, 0..1. */
function jpnEstimatedShare(text) {
  const total = countSyllablesJpn(text);
  if (!total) return 0;
  let kanji = 0;
  for (const ch of String(text || '')) if (HAN.test(ch)) kanji += KANJI_MORAE;
  return Number((kanji / total).toFixed(3));
}

const LAB_COUNTERS = { zho: countSyllablesZho, jpn: countSyllablesJpn };

/** True when this language's count carries a stated approximation, not an exact value. */
const APPROXIMATE = new Set(['jpn']);

module.exports = { LAB_COUNTERS, APPROXIMATE, countSyllablesZho, countSyllablesJpn, jpnEstimatedShare, KANJI_MORAE };
