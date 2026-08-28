/**
 * STAGE 1 of the "does this BUILD phrase actually use the word it teaches?" check.
 *
 * ONE JOB: CUT VOLUME. Nothing here convicts anything. It answers one question — "is this pair so
 * obviously fine that no one needs to read it?" — and where the answer is anything short of a
 * confident yes, the pair goes to a reader.
 *
 * THE TWO SIDES ARE JUDGED BY DIFFERENT RULES, AND THE ASYMMETRY IS THE POINT
 * -------------------------------------------------------------------------
 * Canon `docs/course-methodology-canon.md`:
 *
 *   K8 — "The TARGET side stays strict, always. Every target sentence tiles from taught chunks,
 *         no exceptions. K6 and K7 are known-side latitude only."
 *   K6 — "The known side MAY use uninstructed forms of taught words; only genuinely different
 *         WORDS are defects… The controlled-language constraint on the known side is about
 *         LEXEMES, not surface forms."
 *
 * So on the TARGET side an inflected form is NOT a pass — teach the form, get the form — and this
 * pre-filter may only clear an EXACT-FORM match. On the KNOWN side a different ending, case or
 * conjugation is expressly fine, so it may clear far more freely.
 *
 * Getting this backwards is not a small error. The 2026-08-28 first run cleared the target side on
 * plain substring, so a lesson teaching "parle" was cleared by a sentence saying "parlerai" — the
 * exact inflection the target rule forbids — and those defects were never even shown to a reader.
 *
 * THIS FILE CONTAINS NO MORPHOLOGY. No ending lists, no stemmer, no inflection tables, no
 * per-language configuration. That is the point of the rebuild (Kai's ruling, 2026-08-28): the old
 * gate needed a hand-authored `stemStrip` per language, four languages ever got one, and the other
 * thirty-five returned a zero that read as "clean" when it meant "did not look".
 *
 * Pure. No DB, no I/O, no network.
 */

const VERDICT = { CLEAR: 'clear', READ: 'read', SKIP: 'skip' };
const SIDE = { KNOWN: 'known', TARGET: 'target' };

// Authoring furniture that is not part of the word: a parenthesised disambiguation — (formal),
// （女性複数） — and the 〜/～ slot marker on bound forms. Removing them is an orthographic tidy,
// not a claim about any language's grammar.
const ANNOTATION_RE = /[（(][^）)]*[）)]/gu;
const UNCLOSED_ANNOTATION_RE = /[（(][^）)]*$/u;
const SLOT_MARKER_RE = /[〜~～]/gu;

// A gloss may offer the author's alternatives — 「嬉しい・満足している」, "to ask / to request".
// The LEGO teaches ONE of them, so using either is using its word. Disjunctive.
const ALTERNATIVE_RE = /[・／\/、]|(?:\s+\|\s+)/u;

const PUNCT_RE = /[\p{P}\p{S}]/gu;

/**
 * Does this text belong to a writing system that puts no spaces between words?
 *
 * This is a property of the SCRIPT — an orthographic fact about whether word boundaries are
 * written down at all — and no verdict depends on any language's grammar. It is needed because
 * "is this word present as a whole word" has no meaning where words are not separated: in Chinese
 * or Japanese the only available notion of an exact-form match is a substring one.
 *
 * It is NOT a morphology table and nothing here strips or rewrites anything.
 */
const UNSPACED_SCRIPT_RE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u;

function isUnspacedScript(text) {
  return UNSPACED_SCRIPT_RE.test(text || '');
}

function clean(s) {
  return (s || '')
    .normalize('NFC')
    .replace(ANNOTATION_RE, '')
    .replace(UNCLOSED_ANNOTATION_RE, '')
    .replace(SLOT_MARKER_RE, '')
    .trim();
}

/** Case-fold and drop punctuation, keeping word characters and spaces. Language-neutral. */
function fold(s) {
  return (s || '')
    .normalize('NFC')
    .toLowerCase()
    .replace(PUNCT_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function alternatives(cleaned) {
  const parts = cleaned.split(ALTERNATIVE_RE).map((s) => (s || '').trim()).filter(Boolean);
  return parts.length ? parts : [cleaned];
}

function tokens(folded) {
  return folded.split(' ').filter(Boolean);
}

/** Multiset containment: every word of `need`, in its exact written form, present in `have`. */
function allWordsPresent(needTokens, haveTokens) {
  const counts = new Map();
  for (const t of haveTokens) counts.set(t, (counts.get(t) || 0) + 1);
  for (const t of needTokens) {
    const c = counts.get(t) || 0;
    if (c === 0) return false;
    counts.set(t, c - 1);
  }
  return true;
}

/**
 * TARGET SIDE — strict. Clear only an exact-form match (canon K8).
 *
 * Splitting is allowed: the words of a multi-word LEGO may be separated by other words, which is
 * why this is multiset word containment and not contiguous substring. Inflection is not allowed,
 * which is why it is whole-word and not substring — "parle" must not be cleared by "parlerai".
 *
 * Where the script writes no word boundaries, whole-word has no meaning and substring is the only
 * available exact-form test.
 */
function clearsTarget(alt, sentence) {
  const fa = fold(alt);
  const fs = fold(sentence);
  if (!fa) return false;
  if (isUnspacedScript(alt) || isUnspacedScript(sentence)) {
    return fs.replace(/\s+/g, '').includes(fa.replace(/\s+/g, ''));
  }
  return allWordsPresent(tokens(fa), tokens(fs));
}

/**
 * KNOWN SIDE — loose. Canon K6 puts the constraint on LEXEMES, not surface forms, so a different
 * ending or contraction is expressly fine and this side may clear on any plain sign of the word,
 * contiguous or scattered. What it cannot judge is whether two different-looking words are the
 * same lexeme — that is exactly what the reader is for.
 */
function clearsKnown(alt, sentence) {
  const fa = fold(alt);
  const fs = fold(sentence);
  if (!fa) return false;
  if (fs.includes(fa)) return true;
  const at = tokens(fa);
  return at.length > 1 && allWordsPresent(at, tokens(fs));
}

/**
 * @param {string} taught   the LEGO's text on the side being checked
 * @param {string} sentence the BUILD phrase's text on the same side
 * @param {string} side     'target' (strict) or 'known' (loose) — REQUIRED, no default, because
 *                          a wrong default here silently clears real defects.
 */
function prefilter(taught, sentence, side) {
  if (side !== SIDE.KNOWN && side !== SIDE.TARGET) {
    throw new Error(`prefilter: side must be "known" or "target", got ${JSON.stringify(side)}`);
  }
  const t = clean(taught);
  const s = (sentence || '').normalize('NFC').trim();
  if (!t) return { verdict: VERDICT.SKIP, why: 'the lesson word is blank, so there is nothing to look for' };
  if (!s) return { verdict: VERDICT.SKIP, why: 'the practice sentence is blank' };

  const alts = alternatives(t);
  const clears = side === SIDE.TARGET ? clearsTarget : clearsKnown;
  for (const alt of alts) {
    if (clears(alt, s)) {
      return { verdict: VERDICT.CLEAR, side, rule: side === SIDE.TARGET ? 'exact-form' : 'plain-match', alternatives: alts };
    }
  }
  return {
    verdict: VERDICT.READ,
    side,
    alternatives: alts,
    why: side === SIDE.TARGET
      ? 'not an exact-form match — a reader must judge whether the difference is slight enough to pass'
      : 'no plain match — a reader must judge whether the sentence uses the same word in another form',
  };
}

module.exports = { prefilter, VERDICT, SIDE, clean, fold, alternatives, isUnspacedScript, allWordsPresent };
