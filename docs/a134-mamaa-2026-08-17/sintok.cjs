// Unicode-aware Sinhala tokenizer for the known-side gate.
//
// WHY THIS EXISTS: the shipped known-side gate is INERT for Sinhala.
// tokenizeKnown() in the builder splits on an ASCII-only character class, so a
// Sinhala string tokenizes to nothing and a "0 violations" result means nothing
// at all. Any consistency claim about the Sinhala known side has to come from a
// tokenizer I wrote and disclosed.
//
// METHOD, stated plainly:
//  * Word split on whitespace and ASCII punctuation ONLY. Sinhala has no case.
//  * Grapheme-cluster segmentation via Intl.Segmenter('si',{granularity:'grapheme'})
//    for all length/prefix work, so a vowel sign (ා, ෙ, ි …) and the ZWJ inside a
//    conjunct (ග්‍ර) are NEVER split off the consonant they belong to. Naive
//    code-unit slicing corrupts Sinhala; that is how two earlier workers on this
//    plate silently produced Telugu look-alike glyphs.
//  * Latin runs are kept as their own tokens and FLAGGED — on a Sinhala known
//    side a Latin word is corruption (seed 226 is full of it), not vocabulary.
//
// STEMMING: Sinhala is agglutinative — වෙනවා / වෙන්න / වෙන්නට are one verb, and
// case endings pile onto nouns (ගෙදර / ගෙදරදී / ගෙදරට). I therefore compare on a
// GRAPHEME-PREFIX basis: token A counts as "the same word as" B when one is a
// grapheme-prefix of the other and the shared prefix is at least MIN_STEM
// graphemes. This is NOT a morphological analyser.
//
// WHICH WAY THIS ERRS — stated because it matters:
//   Prefix matching is DELIBERATELY LENIENT. It correctly unifies වෙනවා/වෙන්නට
//   and ගෙදර/ගෙදරදී, but it will also conflate unrelated words sharing a
//   3-grapheme opening — including මම / මමා, the very pair this job turns on.
//   So the corruption check uses EXACT identity, never the stem match.
//   Net effect: it UNDER-reports "not yet introduced" violations and does not
//   invent them. A violation it reports is trustworthy; a clean result is weak
//   evidence. That asymmetry is the right way round for a gate whose false
//   positives would block good content.
const SEG = new Intl.Segmenter('si', { granularity: 'grapheme' })
const MIN_STEM = 3

const graphemes = (s) => [...SEG.segment(String(s))].map(g => g.segment)
const SINHALA = /[඀-෿]/
const LATIN = /[A-Za-z]/

function tokenize(text) {
  const raw = String(text || '').split(/[\s.,:;!?"'()\[\]\/…–—-]+/).filter(Boolean)
  return raw.map(t => ({
    text: t,
    graphemes: graphemes(t),
    isSinhala: SINHALA.test(t),
    isLatin: LATIN.test(t) && !SINHALA.test(t),
    mixed: LATIN.test(t) && SINHALA.test(t),
  }))
}
function sameWord(a, b) {
  if (a === b) return true
  const ga = graphemes(a), gb = graphemes(b)
  const n = Math.min(ga.length, gb.length)
  if (n < MIN_STEM) return false
  for (let i = 0; i < n; i++) if (ga[i] !== gb[i]) return false
  return true
}
const knownBy = (tok, vocab) => vocab.some(v => sameWord(tok, v))

module.exports = { tokenize, graphemes, sameWord, knownBy, MIN_STEM, SINHALA, LATIN }

if (require.main === module) {
  const t = tokenize(process.argv[2] || '')
  console.log(JSON.stringify(t.map(x => ({ t: x.text, g: x.graphemes.length, sin: x.isSinhala, lat: x.isLatin })), null, 1))
}
