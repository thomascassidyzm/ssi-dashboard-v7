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
 *   predicateIsAnswerable — REPORTS, DOES NOT JUDGE. It lists phrases whose
 *     whole predicate is a verb that exists in this course only as an M-LEGO
 *     `component`, never as a LEGO of its own. That is NOT by itself a defect:
 *     canon K20 (Tom, 2026-08-28) rules a component to be AVAILABLE vocabulary
 *     the moment its carrier is taught, and L7/L23 (Kai, closing C13) call the
 *     component route the designed way a piece later becomes combinable. What
 *     the list is for is the question underneath it, which the canon does not
 *     settle: K20 says a component was "on screen and in their ears", and in
 *     this estate's learner path it is only ever on screen — cycles.ts,
 *     "Component rows never produce a cycle of any kind". A silent tile met
 *     once and demanded in the next round is a judgement about the learner's
 *     experience, and judgement of that kind is Kai's (canon section 7).
 *
 * WHAT THIS FILE DOES NOT LICENSE: adding a LEGO to introduce a form the
 * phrases already use. Canon K15 (Kai, 2026-09-08) forbids it outright --
 * "the repair direction is always downward into the phrases, never upward
 * into the curriculum" -- and in jpn_for_eng the seed sentences carry the
 * -tai forms and never the bare dictionary form, so no such LEGO could be
 * minted from a seed anyway.
 *
 * COVERAGE, stated next to the verdict as the canon's count checklist demands:
 * the mood and mo rules judge every non-component row, with no early return and
 * no unparsed class -- 10,583 of 11,864 jpn_for_eng rows, the 1,281 skipped
 * being `phrase_role = 'component'`, which is never delivered as a prompt.
 * componentVerbsNeverTaught is NARROWER than its name: VERB_SHAPED only admits
 * a dictionary form ending in u-row kana, so a component that is a noun, an
 * adjective, a bare particle or a ta/te form is invisible to it. Its output is
 * a floor, never a census.
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

/** The verb this phrase ends on, if the course never taught it as a LEGO of
 *  its own. Longest match wins, so a compound is not reported as its tail. */
function predicateIsAnswerable(targetText, neverTaught) {
  const t = strip(targetText);
  // Longest first, so a compound verb is never reported as its own tail.
  const candidates = [...neverTaught.keys()].sort((a, b) => b.length - a.length);
  for (const ct of candidates) {
    if (t.endsWith(ct)) return ct;
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
