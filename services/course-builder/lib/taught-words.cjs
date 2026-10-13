/**
 * WHAT A PRACTICE PHRASE MAY USE — EVERY LANGUAGE (Aran, methodology lead, confirmed by Tom,
 * 2026-10-13; job #587). A practice phrase may use ANY word taught earlier in the course running
 * order, including a word the learner met only inside a bigger chunk: once the M-LEGO "to find
 * out" is taught, "find" and "out" may be used later, even in another meaning — occasional
 * surprises are fine. Exact other forms still count as NEW: Tom's 2026-10-09 ruling ("we hoped"
 * is not licensed by "to hope") holds, so a token is taught only if THAT spelling was met (case
 * folded, nothing else: no stemming, no accent stripping).
 *
 * This generalises the Welsh rule PR #80 landed (welsh-mutation.cjs welshUntaughtWords). Welsh
 * still runs through that code unchanged, because only Welsh folds a soft-mutated form into the
 * same word (cael/gael) — no other language gets mutation folding.
 *
 * Tokenising, per language:
 *   - space-separated scripts: a token is a run between spaces, punctuation stripped; it is taught
 *     when the whole token was met, OR when every piece of it was met, where the pieces are its
 *     hyphen parts ("peut-être" → peut + être) and, in the elision languages below, an apostrophe
 *     splits AFTER the elided proclitic ("l'entreprise" → l' + entreprise, "dell'acqua" → dell' +
 *     acqua). Elsewhere an apostrophe stays inside its word: English "don't" / "I'm" are their
 *     own forms, never "don" + "t".
 *   - scripts written WITHOUT spaces (Chinese, Japanese, Thai, Lao, Khmer, Burmese — language-
 *     config.cjs isChinese): NOT handled here. We have no tokeniser we trust for them, so the
 *     callers keep the whole-chunk tiling they always had. wordLevelApplies() says which.
 */
'use strict';

const { isWelshTarget, welshTaughtKeys, welshUntaughtWords } = require('./welsh-mutation.cjs');
const { isChinese, getLanguageName } = require('./language-config.cjs');

// Languages whose apostrophe marks an ELIDED PROCLITIC that belongs to the next word:
// French l'/d'/j'/qu', Italian dell'/un'/c', Catalan/Occitan l'/d', Irish d'/m'/b', Luxembourgish d'.
const ELISION_LANGS = new Set(['fra', 'ita', 'cat', 'oci', 'gle', 'ltz']);

const targetLangOf = (courseCode) => String(courseCode || '').split('_for_')[0].split('_')[0];

/** True when this course's phrases are read word by word (every space-separated target). */
function wordLevelApplies(courseCode) {
  return typeof courseCode === 'string' && courseCode.length > 0 && !isChinese(courseCode);
}

/** Space-separated tokens, case folded; letters, marks, digits, apostrophes and hyphens kept. */
function tokensOf(text) {
  return String(text || '').normalize('NFC').toLowerCase()
    .replace(/[ً-ْ]/g, '') // Arabic tashkeel, as normalizeForContainment strips it
    .replace(/[’‘`´]/g, "'")
    .replace(/[^\p{L}\p{M}\p{N}'\- ]/gu, ' ')
    .split(/\s+/)
    .map(t => t.replace(/^[-']+|-+$/g, '')) // stray edge hyphens/quotes; a trailing ' stays (po')
    .filter(t => t && t !== "'");
}

/** The pieces a token is made of: hyphen parts, then elided proclitics. [token] when unsplittable. */
function piecesOf(token, lang) {
  const out = [];
  for (const part of token.split('-').filter(Boolean)) {
    if (ELISION_LANGS.has(lang)) {
      const m = part.match(/^(\p{L}+')(\p{L}.*)$/u);
      if (m) { out.push(m[1], ...piecesOf(m[2], lang)); continue; }
    }
    out.push(part);
  }
  return out.length ? out : [token];
}

/** Every taught key of a vocabulary (LEGO, component and seed targets): whole tokens and their pieces. */
function taughtWordKeys(texts, courseCode) {
  if (isWelshTarget(courseCode)) return welshTaughtKeys(texts);
  const lang = targetLangOf(courseCode);
  const keys = new Set();
  for (const t of texts) for (const tok of tokensOf(t)) { keys.add(tok); for (const p of piecesOf(tok, lang)) keys.add(p); }
  return keys;
}

/**
 * The phrase's words NOT taught by `keys` (taughtWordKeys), in order; [] when all taught. For a
 * split token only the untaught pieces are named ("espérais" out of "j'espérais").
 */
function untaughtWords(phraseTarget, keys, courseCode) {
  if (isWelshTarget(courseCode)) return welshUntaughtWords(phraseTarget, keys);
  const lang = targetLangOf(courseCode);
  const out = [];
  for (const tok of tokensOf(phraseTarget)) {
    if (keys.has(tok)) continue;
    const pieces = piecesOf(tok, lang);
    const missing = pieces.length > 1 ? pieces.filter(p => !keys.has(p)) : [tok];
    out.push(...missing);
  }
  return out;
}

/**
 * The same rule in the words a phrase generator is given (v3 build-prompt, v4, build-escalation).
 * Kept beside the check that grades it so the two cannot drift apart. Empty for a no-space
 * script: those callers keep their whole-chunk wording. The Welsh soft-mutation note is Welsh only.
 */
function vocabRulePrompt(courseCode) {
  if (!wordLevelApplies(courseCode)) return '';
  const welsh = isWelshTarget(courseCode);
  const lang = welsh ? 'Welsh' : (getLanguageName(courseCode) || 'target-language');
  const example = welsh
    ? '("trio" is available once "dw i\'n trio" has been taught)'
    : '(once "to find out" has been taught, "find" and "out" are available on their own, even in another meaning)';
  const mutation = welsh
    ? ' A soft-mutated form of a taught word is the same word (cael/gael, calon/galon), but no nasal or aspirate mutation the course has not taught (nghath, chath).'
    : '';
  return `VOCABULARY RULE (Aran, methodology lead, confirmed by Tom, 2026-10-13): the ${lang} side may use ANY ${lang} word taught earlier in the course running order — including a word the learner met only inside a bigger chunk ${example}.${mutation} Any other form is still NEW until that exact form has been taught: no untaught conjugation, plural, contraction or other inflection ("we hoped" is not licensed by "to hope").`;
}

module.exports = { ELISION_LANGS, wordLevelApplies, tokensOf, piecesOf, taughtWordKeys, untaughtWords, vocabRulePrompt };
