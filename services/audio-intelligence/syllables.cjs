/**
 * syllables.cjs — how long SHOULD this clip have been?
 *
 * Tom's design, verbatim, 2026-08-06: "we should be able to easily ascertain
 * the voice speed and proxy for length as syllables / words are useless, but
 * syllables are pretty consistent".
 *
 * He is right and the reason is worth stating, because it is what makes tier 1
 * work at all. Word count is a terrible predictor of duration — "I" and
 * "internationalisation" are both one word and differ by a factor of eight in
 * speaking time. Syllable count is a good one, because a syllable is
 * approximately one opening-and-closing of the vocal tract and a given speaker
 * produces them at a strikingly stable rate. So: count syllables from the
 * SCRIPT TEXT (free, exact, no audio needed), multiply by the voice's own
 * measured seconds-per-syllable, and you have an expected duration to compare
 * the file against.
 *
 * ⚠️ WHICH LANGUAGES ARE ACTUALLY CALIBRATED. English and German are
 * implemented and fitted against real SSi corpora, because those are the two
 * languages tonight's evidence covers. Everything else falls back to a generic
 * vowel-group counter which is a REASONABLE GUESS AND NOT A MEASUREMENT.
 * `count()` reports `calibrated: false` for those, and the engine downgrades
 * tier 1 to advisory rather than letting it flag. This qualifier is here
 * because the estate has been bitten by it before: the veracity check's CER
 * threshold was fitted on German and English and travelled without the caveat.
 * Do not let this one travel without it either.
 *
 * Adding a language = add an entry to COUNTERS and fit its rate against a real
 * corpus of that voice's good clips. Adding the counter alone does not make the
 * language calibrated; the fit does.
 */

/** Languages whose counter has been checked against real SSi script text. */
const CALIBRATED_LANGUAGES = new Set(['eng', 'en', 'deu', 'de', 'ger'])

/**
 * Strip everything that is not spoken. Digits are deliberately NOT expanded —
 * "1984" is four syllables in one language and five in another, and guessing
 * silently is worse than reporting that we cannot count it.
 */
function words (text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\s'-]/gu, ' ')
    .split(/[\s-]+/)
    .filter(Boolean)
}

function hasDigits (text) {
  return /\d/.test(String(text || ''))
}

/**
 * ENGLISH. Vowel groups, minus silent final -e, plus the handful of endings
 * where the naive rule is reliably wrong.
 *
 * The corrections are not cosmetic. "-le" after a consonant ("little",
 * "possible") is a syllable the silent-e rule would eat — and "possible" is the
 * exact word in Tom's R9 batch case, so getting it wrong would have mis-sized
 * every clip in that batch.
 */
function countEnglishWord (w) {
  if (!w) return 0

  let s = w.replace(/'/g, '')
  if (!s) return 0

  // Vowel groups: each run of vowels is one nucleus.
  let groups = (s.match(/[aeiouy]+/g) || []).length
  if (groups === 0) return 1 // e.g. "hmm", "shh" — still one beat

  // Silent final -e ("make", "German" is unaffected; "the" is protected below).
  if (/[^aeiou]e$/.test(s) && groups > 1) groups -= 1

  // Consonant + -le / -re keeps its own nucleus: "little", "possible", "acre".
  if (/[^aeioul]le$/.test(s) || /[^aeiour]re$/.test(s)) groups += 1

  // "-es"/"-ed" after a non-sibilant/non-dental is not its own syllable:
  // "spoke(s)" 1, but "watches" 2 and "wanted" 2.
  if (/[^aeiou](es)$/.test(s) && !/(s|z|x|ch|sh|ge|ce)es$/.test(s)) groups -= 1
  if (/[^aeiou]ed$/.test(s) && !/[td]ed$/.test(s)) groups -= 1

  return Math.max(1, groups)
}

/**
 * GERMAN. More regular than English, which is why tier 1 is stronger on the
 * German side of the course.
 *
 * The digraphs matter: "ei", "au", "eu", "äu", "ie" are ONE nucleus each, and
 * treating them as two is how you get "Deutsch" scored as 2 syllables when it
 * is 1 — which would make every clip in tonight's evidence look longer than it
 * should be, i.e. it would hide exactly the damage we are hunting.
 */
function countGermanWord (w) {
  if (!w) return 0

  let s = w.replace(/'/g, '')
  if (!s) return 0

  // Collapse the one-nucleus digraphs to a single marker before counting.
  s = s
    .replace(/(eu|äu|ei|ai|au|ie)/g, 'A')
    .replace(/(aa|ee|oo|ah|eh|ih|oh|uh|äh|öh|üh)/g, 'A')

  const groups = (s.match(/[aeiouäöüyA]+/g) || []).length
  if (groups === 0) return 1

  // German final -e is pronounced ("Reise", "heute") — no silent-e rule here.
  // That is the whole reason "lernen" is 2 and not 1, and the unstressed second
  // syllable is precisely what Tom heard being thrown away.
  return Math.max(1, groups)
}

/** Generic fallback: vowel groups, no language-specific correction. */
function countGenericWord (w) {
  const groups = (w.match(/[aeiouyäöüàáâãèéêìíîòóôõùúûåæø]+/g) || []).length
  return Math.max(1, groups)
}

const COUNTERS = {
  eng: countEnglishWord,
  en: countEnglishWord,
  deu: countGermanWord,
  de: countGermanWord,
  ger: countGermanWord,
}

/**
 * Count the syllables in a phrase.
 *
 * @param {string} text  the script text the clip was rendered from
 * @param {string} lang  language code as stored in course_audio.language
 * @returns {{syllables: number, words: number, calibrated: boolean,
 *            counter: string, uncountable: string|null}}
 */
function count (text, lang) {
  const key = String(lang || '').toLowerCase()
  const counter = COUNTERS[key] || countGenericWord
  const ws = words(text)

  const syllables = ws.reduce((n, w) => n + counter(w), 0)

  return {
    syllables,
    words: ws.length,
    calibrated: CALIBRATED_LANGUAGES.has(key),
    counter: COUNTERS[key] ? key : 'generic',
    // Digits would need per-language number expansion we have not written.
    // Reporting it beats guessing: the caller downgrades tier 1 to advisory.
    uncountable: hasDigits(text) ? 'contains digits; syllable count unreliable' : null,
  }
}

module.exports = { count, words, CALIBRATED_LANGUAGES, countEnglishWord, countGermanWord }
