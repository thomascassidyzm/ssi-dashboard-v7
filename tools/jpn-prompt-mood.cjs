/**
 * jpn_for_eng — does the ENGLISH prompt ask for exactly what the JAPANESE says?
 *
 * Written 2026-09-08 after a learner, and then Deborah, reported that the
 * prompt sometimes says "I want to ..." where the Japanese answer carries no
 * desiderative at all. Three rules, all judged on the pair (known_text,
 * target_text):
 *
 *   desiderativeAgreement — たい / ほしい on the Japanese side and "want to" on
 *     the English side must be present together or absent together.
 *   additiveMoAgreement   — the additive particle も must be answered by
 *     "too" / "either" / "as well" in the prompt.
 *   predicateIsAnswerable — the verb the phrase ends on must be a form the
 *     learner has been TAUGHT as a LEGO by this round. An M-LEGO's `components`
 *     do not count: components are visual tiles, never a spoken cue, so a
 *     phrase that ends on one asks for a form the course never introduced.
 *
 * WHY THE CHECKS MATCH MORPHEMES, NOT TOKENS: Japanese is written without
 * spaces, so the token-position checks used for Latin-script courses see
 * nothing here. Every rule below matches the morpheme in the string — and,
 * for the desiderative, anywhere in the string, because 聞きたいことがある
 * carries たい in the middle and ends on ある.
 */

const strip = (t) => (t || '').replace(/[。．.\s!！?？、,]+$/, '').trim();

// たい inside a lexical adjective is not a desiderative (冷たい = cold).
const LEXICAL_TAI = /冷たい|重たい|平たい|めでたい/g;
const DESIDERATIVE = /たい|たく(な|て)|たけれ|たがっ|たかっ|ほし(い|かっ|く|けれ)|欲し(い|かっ|く|けれ)/;

const EN_WANT = /\bwant(s|ed|ing)?\b|\bwanna\b|\bwould like\b|\b(?:I|we|he|she|they|you)'d like\b/i;
// "as soon as you want" is an adjunct meaning "whenever", not the desiderative
// of the main verb; it renders いつでも and must not count as a "want to".
const EN_WANT_ADJUNCT = /\b(?:as soon as|whenever)\s+(?:you|they|he|she|we)\s+want(?:s|ed)?\b(?!\s+to)/gi;

// も has many non-additive homes; strip them before asking whether one is left.
const NON_ADDITIVE_MO =
  /子ども|おもちゃ|とても|いつでも|いつまでも|いつも|なにも|何も|だれも|誰も|どこも|[誰だれ何なにどこどちらいつ]に?も|どちらも|どれも|だれでも|誰でも|なんでも|何でも|いくらでも|何度も|つもり|他にも|二人とも|もう|もっと|もらえ|もらう|もらっ|もらい|もし|かも|もの|[てで]も/g;
const EN_TOO = /\b(too|as well|also|either|neither|nor|both)\b/i;

function japaneseWants(target) {
  return DESIDERATIVE.test(strip(target).replace(LEXICAL_TAI, ''));
}
function englishWants(known) {
  return EN_WANT.test((known || '').replace(EN_WANT_ADJUNCT, ''));
}
function japaneseHasAdditiveMo(target) {
  return /も/.test(strip(target).replace(NON_ADDITIVE_MO, ''));
}
function englishHasToo(known) {
  return EN_TOO.test(known || '');
}

/** One phrase, judged. Returns a list of rule names it breaks (possibly empty). */
function judgePhrase({ known_text, target_text }) {
  const broken = [];
  const jw = japaneseWants(target_text);
  const ew = englishWants(known_text);
  if (ew && !jw) broken.push('want-in-english-only');
  if (jw && !ew) broken.push('want-in-japanese-only');
  if (japaneseHasAdditiveMo(target_text) && !englishHasToo(known_text)) broken.push('mo-without-too');
  return broken;
}

/**
 * A dictionary-form verb is "answerable" only if some LEGO's own target_text is
 * that verb. Being listed in another LEGO's `components` is NOT enough — that
 * is the trap this whole check exists for.
 */
const VERB_SHAPED = (s) =>
  s.length >= 2 && /[うくぐすつぬふぶむるゆ]$/.test(s) && (/[一-龯]/.test(s) || s.length >= 3);

function componentVerbsNeverTaught(legos) {
  const answerable = new Set(legos.map((l) => strip(l.target_text)));
  const out = new Map();
  for (const l of legos) {
    for (const c of l.components || []) {
      const ct = strip(c.target);
      if (!ct || ct === strip(l.target_text) || !VERB_SHAPED(ct)) continue;
      if (answerable.has(ct)) continue;
      if (!out.has(ct)) out.set(ct, { known: c.known, firstSeenIn: l.lego_id });
    }
  }
  return out;
}

/** Does this phrase end on a verb the course never taught as a LEGO? */
function predicateIsAnswerable(targetText, neverTaught) {
  const t = strip(targetText);
  for (const ct of neverTaught.keys()) {
    const idx = t.lastIndexOf(ct);
    if (idx < 0) continue;
    if (idx + ct.length === t.length) return ct;
  }
  return null;
}

module.exports = {
  judgePhrase,
  japaneseWants,
  englishWants,
  japaneseHasAdditiveMo,
  englishHasToo,
  componentVerbsNeverTaught,
  predicateIsAnswerable,
};
