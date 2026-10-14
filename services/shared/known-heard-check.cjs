// services/shared/known-heard-check.cjs
//
// The known-side fallback for a known language with no pair-contract: was every
// known word (every character, for scripts written without spaces) already HEARD
// in this course by the LEGO's seed — in a seed sentence, a LEGO or a component?
// Moved out of tools/frame-layer/v4/generate-v4.cjs (which re-exports it) so the
// Popty phrase-v4 gap-fill door can run the same check the staging stage ran.

// Own normaliser, not availability.norm: that one drops combining marks (\p{M}),
// which shreds Devanagari, Tamil, Bengali… words into consonant fragments.
const normAny = (s) => String(s || '').toLowerCase().replace(/[^\p{L}\p{M}\p{N}' ]/gu, ' ').replace(/\s+/g, ' ').trim();
const unitsOf = (s, noSpace) => noSpace ? [...normAny(s).replace(/\s+/g, '')] : normAny(s).split(' ').filter(Boolean);

/** Known words/characters of `known` that no text in `heardTexts` contains. */
function knownHeardCheck(known, heardTexts, noSpace) {
  const heard = new Set(heardTexts.flatMap(t => unitsOf(t, noSpace)));
  return [...new Set(unitsOf(known, noSpace).filter(u => !heard.has(u)))];
}

module.exports = { normAny, unitsOf, knownHeardCheck };
