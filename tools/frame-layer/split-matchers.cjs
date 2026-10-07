/**
 * TARGET-SIDE OUTCOMES for the pair's structural splits. Keyed by SPLIT ID.
 *
 * This file used to be `seed-splits.cjs` and was keyed "course:seed" — it told
 * the lab WHICH split a given seed had to cross. That was hardcoding a seed's
 * teaching job, and it got seed 600 wrong (see docs/frame-layer/frame-zut.md).
 * WHICH split applies to a seed is now DERIVED from the seed's own admission
 * diff by tools/frame-layer/derive-seed-job.cjs. All this file holds is the
 * list of outcomes per split — the one part that cannot be derived, because
 * it is a fact about Spanish grammar, not about the corpus.
 *
 * NO REGEX (Tom, 2026-10-07, r-2026-10-07-never-use-regex-to-classify-language).
 * Each outcome used to carry a `target_re`, and two splits (S5 relative-clause
 * mood, S11 personal 'a') had none and were reported NOT MACHINE-CHECKABLE.
 * Every outcome is now DEFINED in split-codex-<lang>.json and CLASSIFIED by
 * frame-tagger.cjs, a Haiku-family model reading those definitions against
 * the TARGET text, cached per text. An outcome here carries the codex id and
 * the outcome id the model answers with; `carries(outcome, text)` is the
 * cache lookup (throws for untagged text — run `ensureSplitsTagged` first).
 *
 * SCOPED BY TARGET LANGUAGE, because these are facts about SPANISH grammar.
 * Where a pair has no outcome codex the derivation says the splits are
 * UNREADABLE here, which is the honest thing a check that cannot see says.
 *
 * Split ids and names track docs/frame-layer/spanish-structural-splits.json.
 */
const { framesOf, ensureTagged, knownLanguageName } = require('./frame-tagger.cjs');

const CODEX_BY_TARGET_LANGUAGE = { spa: require('./split-codex-spa.json') };
const CODEX_BY_ID = Object.fromEntries(Object.values(CODEX_BY_TARGET_LANGUAGE).map(c => [c.id, c]));

/** Build a split's outcome list from the codex: the codex is the only place an outcome is defined. */
function outcomes(codex, ...ids) {
  return ids.map(id => {
    const f = codex.frames.find(x => x.id === id);
    if (!f) throw new Error(`${codex.id} codex has no outcome ${id}`);
    return { form: f.name.slice(f.name.indexOf(': ') + 2), outcome: id, codex: codex.id };
  });
}

const S = CODEX_BY_TARGET_LANGUAGE.spa;
const spa = {
  S1: { pattern: 'P1', name: 'want(X) to — subject switch', outcomes: outcomes(S, 'S1A', 'S1B') },
  S2: { pattern: 'P11', name: 'hope — subject switch', outcomes: outcomes(S, 'S2A', 'S2B') },
  S3: { pattern: 'P13', name: 'before / after — subject switch', outcomes: outcomes(S, 'S3A', 'S3B') },
  S4: { pattern: 'P9', name: 'think that — matrix negation', outcomes: outcomes(S, 'S4A', 'S4B') },
  S5: { pattern: 'P16', name: 'relative clause — specificity', outcomes: outcomes(S, 'S5A', 'S5B') },
  S6: { pattern: 'P4', name: 'could → podía / pudo / podría', outcomes: outcomes(S, 'S6A', 'S6B', 'S6C', 'S6D') },
  S7: { pattern: 'P17', name: "the double-'d — 'd = would vs 'd = had", outcomes: outcomes(S, 'S7A', 'S7B') },
  S8: { pattern: 'P31', name: 'like → dative inversion', outcomes: outcomes(S, 'S8A', 'S8B') },
  S9: { pattern: 'P10', name: 'know → saber / conocer (lexical)', outcomes: outcomes(S, 'S9A', 'S9B') },
  S10: { pattern: 'P12', name: 'ask → preguntar / pedir (lexical)', outcomes: outcomes(S, 'S10A', 'S10B') },
  S11: { pattern: 'P16', name: "personal 'a'", outcomes: outcomes(S, 'S11A') },
  S12: { pattern: 'P18', name: 'it is → ser / estar', outcomes: outcomes(S, 'S12A', 'S12B') },
};

const BY_TARGET_LANGUAGE = { spa };

/** Target language of a course code ("spa_for_eng" → "spa"); slug parsing, not classification. */
function targetLanguageOf(course) {
  const c = String(course || '');
  const i = c.indexOf('_for_');
  return i > 0 ? c.slice(0, i) : null;
}

/** The splits for a course's TARGET language, or null if none exist. */
function splitsFor(course) {
  return BY_TARGET_LANGUAGE[targetLanguageOf(course)] || null;
}
const splitCodexFor = (course) => CODEX_BY_TARGET_LANGUAGE[targetLanguageOf(course)] || null;

/** Does this target text carry this outcome? Cache lookup; throws if the text was never tagged. */
function carries(outcome, text) {
  if (!outcome || !outcome.outcome || !String(text || '').trim()) return false;
  const codex = CODEX_BY_ID[outcome.codex];
  if (!codex) throw new Error(`split-matchers: no outcome codex "${outcome.codex}"`);
  return framesOf(text, codex).includes(outcome.outcome);
}

/** Tag target texts for a course's split outcomes. A no-op for a pair with no outcome codex. */
async function ensureSplitsTagged(course, texts, opts = {}) {
  const codex = splitCodexFor(course);
  if (!codex) return null;
  return ensureTagged(texts, { ...opts, codex, knownLanguage: knownLanguageName(`x_for_${targetLanguageOf(course)}`) });
}

module.exports = { spa, BY_TARGET_LANGUAGE, CODEX_BY_TARGET_LANGUAGE, splitsFor, splitCodexFor, carries, ensureSplitsTagged, targetLanguageOf };
