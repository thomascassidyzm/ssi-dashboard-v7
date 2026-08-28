/**
 * STAGE 1 of the "does this BUILD phrase actually use the word it teaches?" check.
 *
 * ONE JOB: CUT VOLUME. Nothing here convicts anything, and nothing here makes a language
 * judgment. It answers exactly one question — "is this pair so obviously fine that no one
 * needs to read it?" — and where the answer is anything other than a confident yes, the pair
 * goes to a reader.
 *
 * THIS FILE CONTAINS NO MORPHOLOGY. No ending lists, no stemmer, no inflection tables, no
 * per-language configuration of any kind. That is the point of the rebuild (Kai's ruling,
 * 2026-08-28): the old gate needed a hand-authored `stemStrip` per language, only four
 * languages ever got one, and on the other 35 content-bearing courses it returned a zero that
 * read as "clean" when it meant "did not look". If you ever find yourself adding a language
 * name to this file, you have reverted to the old method.
 *
 * The two clearing rules are the only two that are safe in every language at once:
 *
 *   C1 CONTIGUOUS — the taught word appears verbatim inside the sentence. Nothing about any
 *      language makes that not-using-the-word.
 *   C2 ALL TOKENS — every whitespace-token of the taught word appears as a whole token of the
 *      sentence. Same claim, for a multi-word gloss whose parts got separated.
 *
 * Both are ONE-DIRECTIONAL. They can say FINE. They can never say DEFECT. A pair that clears
 * neither is UNDECIDED — not guilty — and is handed to stage 2 to be read.
 *
 * Pure. No DB, no I/O, no network.
 */

const VERDICT = { CLEAR: 'clear', READ: 'read', SKIP: 'skip' };

// Glosses carry authoring annotations that are not part of the word: a parenthesised
// disambiguation — (formal), （女性複数） — and the 〜/～ slot marker on bound forms. Both are
// orthographic furniture, present in every language's authoring convention here, and removing
// them is not a morphological claim.
const ANNOTATION_RE = /[（(][^）)]*[）)]/gu;
const UNCLOSED_ANNOTATION_RE = /[（(][^）)]*$/u;
const SLOT_MARKER_RE = /[〜~～]/gu;

// A gloss may offer the author's alternatives — 「嬉しい・満足している」, "to ask / to request".
// The LEGO teaches ONE of them, so a sentence using either has used its word. Disjunctive.
const ALTERNATIVE_RE = /[・／\/、]|(?:\s+\|\s+)/u;

// Punctuation is not a word. Stripped from both sides before comparison so that a sentence
// ending in a full stop still contains the word that sits in front of it.
const PUNCT_RE = /[\p{P}\p{S}]/gu;

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

/**
 * @param {string} taught   the LEGO's text on the side being checked (the word being taught)
 * @param {string} sentence the BUILD phrase's text on the same side (what the learner meets)
 * @returns {{verdict:string, rule?:string, why?:string, alternatives?:string[]}}
 */
function prefilter(taught, sentence) {
  const t = clean(taught);
  const s = (sentence || '').normalize('NFC').trim();
  if (!t) return { verdict: VERDICT.SKIP, why: 'the lesson word is blank, so there is nothing to look for' };
  if (!s) return { verdict: VERDICT.SKIP, why: 'the practice sentence is blank' };

  const alts = alternatives(t);
  const fs = fold(s);
  const sTokens = new Set(tokens(fs));

  for (const alt of alts) {
    const fa = fold(alt);
    if (!fa) continue;
    // C1 — the taught word sits verbatim inside the sentence.
    if (fs.includes(fa)) return { verdict: VERDICT.CLEAR, rule: 'contiguous', alternatives: alts };
    // C2 — every part of a multi-word gloss is present as a whole word.
    const aTokens = tokens(fa);
    if (aTokens.length > 1 && aTokens.every((tok) => sTokens.has(tok))) {
      return { verdict: VERDICT.CLEAR, rule: 'all-tokens', alternatives: alts };
    }
  }
  return { verdict: VERDICT.READ, alternatives: alts, why: 'no exact match — a reader must judge whether the sentence uses the word in another form' };
}

module.exports = { prefilter, VERDICT, clean, fold, alternatives };
