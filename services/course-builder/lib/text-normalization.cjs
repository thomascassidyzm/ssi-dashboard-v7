/**
 * Text normalization — pure functions for text comparison and vocabulary extraction.
 * No state, no DB access.
 */

const { isChinese } = require('./language-config.cjs');

/**
 * Normalize phrase text for deduplication comparison.
 * Strips trailing punctuation and lowercases.
 * e.g., "I want" == "I want." == "i want"
 */
function normalizePhrase(text) {
  if (!text) return '';
  return text.replace(/[.,!?;:؟،؛]+$/, '').toLowerCase().trim();
}

/**
 * Normalize text for LEGO containment checks (phonetic matching for TTS).
 *
 * KEEPS (phonetically significant):
 * - Accents: sì ≠ si, è ≠ e (different words!)
 * - Contractive punctuation: it's ≠ its, l'homme ≠ le homme
 *
 * REMOVES (cosmetic only):
 * - Capitalization: Sì = sì
 * - Non-contractive punctuation: sì, è = sì è
 */
function normalizeForContainment(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[\u064B-\u0652]/g, '')     // Strip Arabic tashkeel (vowel marks, tanwin, shadda, sukun)
    .replace(/[.,!?;:¿¡«»""''。，！？؟،؛、：；]/g, '')  // Strip all punctuation incl. Arabic comma/semicolon
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Word-based containment check for languages with bracket structures (e.g. German).
 * Checks that ALL words from the LEGO target appear in the phrase (in any position).
 */
function checkWordContainment(legoTarget, phraseTarget) {
  const legoWords = normalizeForContainment(legoTarget).split(/\s+/);
  const phraseWords = normalizeForContainment(phraseTarget).split(/\s+/);
  const phraseWordCounts = {};
  for (const w of phraseWords) {
    phraseWordCounts[w] = (phraseWordCounts[w] || 0) + 1;
  }
  const legoWordCounts = {};
  for (const w of legoWords) {
    legoWordCounts[w] = (legoWordCounts[w] || 0) + 1;
  }
  for (const [word, count] of Object.entries(legoWordCounts)) {
    if ((phraseWordCounts[word] || 0) < count) return false;
  }
  return true;
}

/**
 * Normalize text for ZUT comparison (strips diacritics for collision detection).
 * Used ONLY for comparing whether two words are "the same" for ZUT purposes.
 */
function normalizeForZUT(text, chinese = false) {
  if (!text) return '';
  let normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')     // Strip Latin combining diacritics
    .replace(/[\u064B-\u0652]/g, '')     // Strip Arabic tashkeel
    .replace(/[¿¡.,;:!?؟،؛«»""。，！？、：；""\u0589]/g, '')  // \u0589 = Armenian full stop ։
    .trim();
  if (!chinese) {
    normalized = normalized.replace(/\s+/g, ' ');
  }
  return normalized;
}

/**
 * Normalize text for vocab storage (PRESERVES diacritics).
 * Used for extracting and storing vocabulary.
 * CRITICAL: Diacritics are essential orthography in Romance languages.
 */
function normalizeForStorage(text, chinese = false) {
  if (!text) return '';
  let normalized = text
    .toLowerCase()
    .replace(/[\u064B-\u0652]/g, '')     // Strip Arabic tashkeel
    .replace(/[¿¡.,;:!?؟،؛«»""。，！？、：；""\u0589]/g, '')  // \u0589 = Armenian full stop ։
    .trim();
  if (!chinese) {
    normalized = normalized.replace(/\s+/g, ' ');
  }
  return normalized;
}

/**
 * Legacy function — delegates to normalizeForZUT
 * @deprecated Use normalizeForZUT or normalizeForStorage explicitly
 */
function normalizeText(text, chinese = false) {
  return normalizeForZUT(text, chinese);
}

/**
 * Extract vocab units from text.
 * Returns the complete normalized text as a single unit.
 * The LEGO target IS the vocabulary — no splitting, no character decomposition.
 */
function extractVocab(text, chinese = false) {
  const normalized = normalizeForStorage(text, chinese);
  if (!normalized) return [];
  return [normalized];
}

// Punctuation that can hang off either end of a word token.
const WORD_EDGE_PUNCT = /^[.,!?;:¿¡«»""''„“”‘’(){}\[\]…—–-]+|[.,!?;:¿¡«»""''„“”‘’(){}\[\]…—–-]+$/g;
// Apostrophes that attach a clitic to a stem: I'm, l'homme, dwi'n.
const APOSTROPHE = /['’‘`´]/;

/** Strip edge punctuation from a single word token. */
function trimWordPunct(word) {
  return (word || '').replace(WORD_EDGE_PUNCT, '');
}

/** The part of a word before any clitic apostrophe: "I'm" → "I", "Deitsch" → "Deitsch". */
function apostropheStem(word) {
  return word.split(APOSTROPHE)[0] || word;
}

/**
 * Learn, from the submission itself, which words are inherently capitalised.
 *
 * Two signals, both taken from the author's own writing:
 *   - a word capitalised anywhere OTHER than at the start of a text is capitalised
 *     for a reason — a proper noun ("Deitsch"), a German / Pennsylvania-Dutch noun
 *     ("Zeit"), English "I". Never lowercase it.
 *   - a word written lowercase anywhere at all (including at the start of a text)
 *     is not inherently capitalised, so a capital on it at position 0 is just the
 *     author writing a fragment as a sentence.
 *
 * A capital at position 0 is the one thing that carries no signal — it is exactly
 * the ambiguity we are trying to resolve — so it is never recorded as evidence.
 *
 * This replaces guessing from a hard-coded word list: the corpus is the evidence.
 *
 * @param {string[]} texts - all texts on ONE side (known or target) of a submission
 * @returns {{inherentlyCapitalised: Set<string>, seenLowercase: Set<string>}} lowercased keys
 */
function collectCasingEvidence(texts) {
  const inherentlyCapitalised = new Set();
  const seenLowercase = new Set();
  for (const text of texts || []) {
    if (!text) continue;
    const words = String(text).trim().split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      const word = trimWordPunct(words[i]);
      if (!word) continue;
      const isCapital = /\p{Lu}/u.test(word[0]);
      if (i === 0 && isCapital) continue;   // ambiguous — carries no signal
      const bucket = isCapital ? inherentlyCapitalised : seenLowercase;
      bucket.add(word.toLowerCase());
      bucket.add(apostropheStem(word).toLowerCase());
    }
  }
  return { inherentlyCapitalised, seenLowercase };
}

/**
 * Strip bookend punctuation from phrase text for storage.
 * - Removes trailing period (keeps ! ?)
 * - Lowercases the first character ONLY when the capital is demonstrably accidental
 *
 * The job this does is undoing sentence-case that an author put on a fragment
 * ("Want to go" → "want to go"), because phrases are fragments reused mid-round.
 * It must never touch a capital that belongs to the word — proper nouns, German /
 * Pennsylvania-Dutch nouns, and English "I" (including I'm / I've / I'd / I'll).
 *
 * Decision order for the first word:
 *   1. in keepCapSet (legacy backstop list)                  → keep the capital
 *   2. capitalised mid-sentence elsewhere in the submission  → keep the capital
 *   3. written lowercase elsewhere in the submission         → lowercase it
 *   4. no evidence either way                                → keep the capital
 *
 * Step 4 is the safe default: a stray capital is cosmetic, a wrongly-lowercased
 * noun is wrong text. The author's casing wins when we cannot prove otherwise.
 *
 * @param {string} text - The phrase text
 * @param {Set<string>} [keepCapSet] - Legacy backstop list of always-capitalised words
 * @param {{inherentlyCapitalised: Set<string>, seenLowercase: Set<string>}} [evidence]
 *        - output of collectCasingEvidence() for this side of the submission
 * @returns {string} Cleaned text
 */
function stripBookendPunctuation(text, keepCapSet, evidence) {
  if (!text) return '';
  // Remove trailing period
  const result = text.replace(/\.$/, '');
  if (!result.length || !/\p{Lu}/u.test(result[0])) return result;

  const firstWord = trimWordPunct(result.split(/\s+/)[0]);
  const stem = apostropheStem(firstWord);
  const lowerWord = firstWord.toLowerCase();
  const lowerStem = stem.toLowerCase();

  if (keepCapSet && (keepCapSet.has(firstWord) || keepCapSet.has(stem))) return result;
  if (evidence) {
    if (evidence.inherentlyCapitalised.has(lowerWord) || evidence.inherentlyCapitalised.has(lowerStem)) {
      return result;
    }
    if (evidence.seenLowercase.has(lowerWord) || evidence.seenLowercase.has(lowerStem)) {
      return result[0].toLowerCase() + result.slice(1);
    }
  }
  // No evidence — leave the author's capital alone rather than risk damaging it.
  return result;
}

/**
 * Normalise bookend punctuation and casing across a whole LEGO submission, in place.
 *
 * Casing is decided per side (known / target) using evidence from every text on that
 * side of the submission, so a word's own capitalisation elsewhere decides whether a
 * leading capital is inherent or accidental. See collectCasingEvidence.
 *
 * @param {Array} legos - LEGO objects, each optionally with .build / .use / .phrases
 * @param {object} [opts]
 * @param {boolean} [opts.skipKnown]  - known language has no capitalisation concept
 * @param {boolean} [opts.skipTarget] - target language has no capitalisation concept
 * @param {Set<string>} [opts.keepCapSet] - legacy backstop list of always-capitalised words
 */
function normalizeSubmissionCasing(legos, opts = {}) {
  if (!legos || !Array.isArray(legos)) return;
  const { skipKnown = false, skipTarget = false, keepCapSet = null } = opts;

  const eachRow = (fn) => {
    for (const lego of legos) {
      if (!lego) continue;
      fn(lego);
      for (const arr of [lego.build, lego.use, lego.phrases].filter(Array.isArray)) {
        for (const p of arr) if (p) fn(p);
      }
    }
  };

  // Gather every text on each side FIRST — evidence must come from the untouched submission.
  const knownTexts = [];
  const targetTexts = [];
  eachRow((row) => {
    if (row.known) knownTexts.push(row.known);
    if (row.target) targetTexts.push(row.target);
  });
  const knownEvidence = collectCasingEvidence(knownTexts);
  const targetEvidence = collectCasingEvidence(targetTexts);

  eachRow((row) => {
    if (row.known) {
      row.known = stripBookendPunctuation(row.known, skipKnown ? null : keepCapSet, skipKnown ? null : knownEvidence);
    }
    if (row.target) {
      row.target = stripBookendPunctuation(row.target, skipTarget ? null : keepCapSet, skipTarget ? null : targetEvidence);
    }
  });
}

module.exports = {
  normalizePhrase,
  normalizeForContainment,
  checkWordContainment,
  normalizeForZUT,
  normalizeForStorage,
  normalizeText,
  extractVocab,
  stripBookendPunctuation,
  collectCasingEvidence,
  normalizeSubmissionCasing,
};
