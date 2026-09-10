/**
 * scan-course Check 20 — tokenisation and containment for the seed-containment check.
 *
 * THE RULE (Kai, 2026-09-09): a LEGO is a fragment of its own seed sentence, and may
 * contain only words that seed actually says. "'a person' isn't in the seed, so it's
 * not a good thing to have in the lego." That one rule bars parenthetical brackets,
 * slashes, grammar labels (know-pl, knows-f-sent-final) and narrower glosses the seed
 * never said — and it needs NO linguistic knowledge, which is why it was approved.
 *
 * It is checked on BOTH SIDES. Kai: "this is relevant to both target and known."
 * We say KNOWN and TARGET, never "English" — English is the known side in some courses
 * and the target side in others.
 *
 * ONE NORMALISER. Canon WC-F9: a comparison routed through two normalisers that
 * disagree reports differences that do not exist. Seed text and LEGO text go through
 * exactly the function below, and nothing else ever normalises either of them.
 *
 * NO STEMMING, DELIBERATELY. Canon WC-F8: an exact-surface "untaught" count is an upper
 * bound, not a finding. Here that is the point rather than a flaw — this check is a
 * READING LIST, not a verdict, and a morphological variant ("know" where the seed says
 * "knows") is exactly the kind of row Kai asked to be able to look at. Rows whose only
 * missing word looks like a variant of a seed word are still reported, but tiered down
 * so a reader can skip them.
 *
 * SPACELESS SCRIPTS ARE EXCLUDED, NOT REPORTED CLEAN. Canon WC-F2: a check that cannot
 * read the alphabet returns zero and calls it a pass. Japanese, Chinese, Thai, Khmer,
 * Lao, Burmese and Tibetan do not delimit words with whitespace, so whitespace/letter
 * tokenisation is meaningless there. Any side written in one of those scripts returns
 * status 'excluded_spaceless' and is COUNTED as excluded, never as analysed.
 */

// Scripts with no whitespace word delimitation. Judged from the TEXT, not from the
// course's declared language code, so a stray script in the wrong column is still caught.
const SPACELESS_RANGES = [
  ['぀', 'ヿ'],  // Hiragana + Katakana
  ['㐀', '䶿'],  // CJK ext A
  ['一', '鿿'],  // CJK unified
  ['豈', '﫿'],  // CJK compatibility
  ['฀', '๿'],  // Thai
  ['຀', '໿'],  // Lao
  ['ក', '៿'],  // Khmer
  ['က', '႟'],  // Myanmar
  ['ༀ', '࿿'],  // Tibetan
];

function isSpacelessChar(ch) {
  return SPACELESS_RANGES.some(([lo, hi]) => ch >= lo && ch <= hi);
}

/** Fraction of a string's LETTERS that belong to a spaceless script. */
function spacelessFraction(text) {
  if (!text) return 0;
  const letters = [...text].filter((ch) => /\p{L}/u.test(ch));
  if (!letters.length) return 0;
  return letters.filter(isSpacelessChar).length / letters.length;
}

/** A side is unanalysable if a meaningful share of its letters are spaceless-script. */
function isSpaceless(text) {
  return spacelessFraction(text) >= 0.2;
}

/**
 * Tokenise for containment.
 *
 * - NFC first: canon notes Hebrew-script text arrives decomposed, and a decomposed
 *   string never string-equals its composed twin.
 * - Unicode letters/marks/digits only. Never [a-z], never \b — canon WC-F4 and Check 18:
 *   ASCII word boundaries silently never match "você", "هنا", "grüß".
 * - Apostrophes INSIDE a word are part of the word ("don't", "l'homme" stays "l'homme"),
 *   matching the tokenizer the existing Check 11 uses.
 * - Everything else — brackets, slashes, hyphens, dashes, punctuation — is a separator.
 *   That is deliberate: it is what makes "know-pl" report the missing word "pl", and
 *   "(sentence end)" report "sentence" and "end".
 */
// Arabic optional vocalisation. Canon WC-F4: a normaliser that folded diacritics via a
// Unicode range NOT containing the Arabic marks read one course as the estate's worst,
// at 1,126 invented defects. Tashkil and tatweel are optional decoration — a seed
// written with them says the same word as a LEGO written without.
const ARABIC_TASHKIL = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;

function tokenise(text) {
  if (!text) return [];
  const norm = text.normalize('NFC').toLowerCase().replace(ARABIC_TASHKIL, '');
  const re = /[\p{L}\p{M}\p{N}]+(?:['’ʼ][\p{L}\p{M}\p{N}]+)*/gu;
  return norm.match(re) || [];
}


/**
 * Apostrophe-contraction expansion, applied IDENTICALLY to both sides.
 *
 * A seed that says "I'm not sure" does say the words "I", "am", "not" and "sure", so a
 * LEGO reading "I am" is a fragment of it and must not be reported. Left unhandled this
 * is the single largest false-positive class on an English side — "am", "not", "is",
 * "will", "have" arriving from every contracted seed in the course.
 *
 * The suffix list is a WHITELIST, so it cannot touch an apostrophe that is not an
 * English contraction: French "l'homme", Welsh "i'n", Italian "c'è" all fall through
 * untouched. Both texts go through this same function — never one side only (WC-F9).
 */
const CONTRACTION_SUFFIXES = {
  m: ['am'], re: ['are'], ve: ['have'], ll: ['will'],
  s: ['is', 'has'], d: ['would', 'had'],
};
const IRREGULAR_NT = { "can't": ['can', 'not'], "won't": ['will', 'not'], "shan't": ['shall', 'not'] };

function expandContraction(token) {
  if (!/['\u2019\u02bc]/.test(token)) return null;
  const flat = token.replace(/[\u2019\u02bc]/g, "'");
  if (IRREGULAR_NT[flat]) return IRREGULAR_NT[flat];
  if (flat.endsWith("n't")) return [flat.slice(0, -3), 'not'];
  const i = flat.lastIndexOf("'");
  const stem = flat.slice(0, i);
  const suffix = flat.slice(i + 1);
  if (!stem || !CONTRACTION_SUFFIXES[suffix]) return null;
  return [stem, ...CONTRACTION_SUFFIXES[suffix]];
}

/**
 * Everything a side's tokens can be said to SAY, as one set:
 *   - the tokens themselves
 *   - what any English contraction in them expands to
 *   - the pieces either side of a non-English apostrophe clitic. Welsh writes
 *     "maen nhw'n hapus"; the seed plainly says "nhw", and without this the LEGO
 *     "maen nhw" reads as a defect.
 *   - consecutive tokens JOINED. Nepali writes "hijo bhanda" in the seed and
 *     "hijobhanda" in the LEGO — one orthographic choice, not a different word.
 * Applied to BOTH sides through the same function; never to one side only (WC-F9).
 */
function expandedTokenSet(tokens) {
  const set = new Set(tokens);
  for (const t of tokens) {
    const parts = expandContraction(t);
    if (parts) for (const p of parts) set.add(p);
    if (/['\u2019\u02bc]/.test(t)) for (const p of t.split(/['\u2019\u02bc]/)) if (p) set.add(p);
  }
  for (let i = 0; i < tokens.length; i += 1) {
    let joined = tokens[i];
    for (let n = 1; n < 4 && i + n < tokens.length; n += 1) {
      joined += tokens[i + n];
      set.add(joined);
    }
  }
  return set;
}


/**
 * Does some SEED token equal a run of 2..4 consecutive LEGO tokens that includes `t`?
 * The Nepali case in reverse: the seed joins what the LEGO spaces. Deliberately narrow —
 * it demands an exact concatenation of ADJACENT lego tokens, so it cannot swallow a
 * stray short word the way a substring test would.
 */
function seedCarriesJoinContaining(t, legoTokens, seedTokens) {
  const seedSet = new Set(seedTokens);
  for (let i = 0; i < legoTokens.length; i += 1) {
    let joined = legoTokens[i];
    let covers = legoTokens[i] === t;
    for (let n = 1; n < 4 && i + n < legoTokens.length; n += 1) {
      joined += legoTokens[i + n];
      covers = covers || legoTokens[i + n] === t;
      if (covers && seedSet.has(joined)) return true;
    }
  }
  return false;
}

/**
 * Which of the LEGO side's words the seed side does not say.
 *
 * Returns { status, missing, legoTokens, seedTokens }.
 *   status 'ok'                  — analysed, missing[] is the answer (may be empty)
 *   status 'excluded_spaceless'  — one side is a spaceless script; NOT a clean result
 *   status 'excluded_empty'      — the LEGO or seed side has no tokens at all
 */
function containment(legoText, seedText) {
  if (isSpaceless(legoText) || isSpaceless(seedText)) {
    return { status: 'excluded_spaceless', missing: [] };
  }
  const legoTokens = tokenise(legoText);
  const seedTokens = tokenise(seedText);
  if (!legoTokens.length || !seedTokens.length) {
    return { status: 'excluded_empty', missing: [] };
  }
  const seedSet = expandedTokenSet(seedTokens);
  const missing = [...new Set(legoTokens.filter((t) => !seedSet.has(t)))]
    .filter((t) => {
      // a LEGO word the seed does not carry alone, but which the seed's own joins or
      // expansions do carry, is not missing
      const parts = expandContraction(t) || (/['\u2019\u02bc]/.test(t) ? t.split(/['\u2019\u02bc]/).filter(Boolean) : null);
      if (parts && parts.every((p) => seedSet.has(p))) return false;
      // and the reverse join: the seed writes as ONE word what the LEGO writes as two
      return !seedCarriesJoinContaining(t, legoTokens, seedTokens);
    });
  const strictSeed = new Set(seedTokens);
  const strictMissing = legoTokens.filter((t) => !strictSeed.has(t));
  return {
    status: 'ok',
    missing,
    legoTokens,
    seedTokens,
    // visible, never silent: this row would have been a hit without contraction expansion
    contraction_only: strictMissing.length > 0 && missing.length === 0,
  };
}

/**
 * Is this missing word plausibly a surface variant of something the seed DOES say?
 * Used only to TIER the reading list, never to drop a row. Prefix-share is weak evidence
 * (canon: a shared ending is weaker still, and this is why nothing is filtered on it).
 */
function looksLikeVariantOf(word, seedTokens) {
  for (const s of seedTokens) {
    if (s === word) return s;
    if (word.length >= 3 && s.length >= 3) {
      if (s.startsWith(word) || word.startsWith(s)) return s;
      const n = Math.min(4, word.length, s.length);
      if (n >= 4 && s.slice(0, n) === word.slice(0, n)) return s;
    }
  }
  return null;
}

/** Does the LEGO text carry annotation markup — brackets or a slash? */
function hasMarkup(text) {
  return /[()\[\]{}\/]/.test(text || '');
}

/**
 * Tier a hit for a human reader.
 *   'markup'  — the LEGO carries brackets or a slash; already covered by Checks 1 and 2.
 *   'lexical' — a genuinely different word with no relative in the seed. HIGHEST value.
 *   'variant' — every missing word looks like an inflection of a seed word. LOWEST.
 */
function tierOf(legoText, missing, seedTokens) {
  if (hasMarkup(legoText)) return 'markup';
  const allVariants = missing.every((w) => looksLikeVariantOf(w, seedTokens));
  return allVariants ? 'variant' : 'lexical';
}

module.exports = {
  tokenise, containment, expandContraction, expandedTokenSet, isSpaceless, spacelessFraction, looksLikeVariantOf, hasMarkup, tierOf,
};
