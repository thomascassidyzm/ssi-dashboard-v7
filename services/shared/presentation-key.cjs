/**
 * presentation-key.cjs — how a COMPONENT presentation clip is named, in one place.
 *
 * WHY THIS EXISTS. A component's `presentation_audio_id` had no defensible key,
 * so tools/audio-link-reconcile.cjs refused to heal that slot (HEAL_EXCLUDE).
 * The key was never missing, though — it was only undocumented. phase8's
 * `linkComponentPresentationAudio` MINTS the narration from a template and then
 * matches on the minted text, so the key is the generator's own output:
 *
 *     template(known_lang)
 *       .replace('{target_lang_name}', localisedLangName(target, known))
 *       .replace('{known}',            component.known_text)
 *       .replace('{seed}',             parent M-LEGO known_text)
 *
 * ...normalised with the canonical normalizeForAudio(). Reconstruct that string
 * and you have the clip's name, which is the whole trick.
 *
 * WHY IT IS LANGUAGE-AWARE WITHOUT KNOWING ANY LANGUAGE. The template is read
 * from the estate's own `presentation_templates` table, one row per KNOWN
 * language — nothing here parses narration and nothing here hard-codes a
 * translation. That matters because the narration templates genuinely have no
 * common shape to parse:
 *
 *     eng   The German for: 'nearly', is:
 *     fra   En anglais — 'dans quelques minutes' — c'est :
 *     zho   英语里 —「我想」— 是：
 *     jpn   もうすぐ をフランス語で言うと：          ← no quote delimiters AT ALL
 *
 * Any matcher that pattern-matches the wrapper scores zero on Japanese. Any
 * matcher that pulls out "the quoted bit" scores zero on Japanese too. Building
 * the string the way the generator built it is the only approach that does not
 * care, and it is exactly as language-aware as the estate itself is.
 *
 * WHY THE CARRIER MUST BE IN THE KEY. Keying on the component's known_text
 * alone collides constantly — 445 of German's 926 components share their chunk
 * with another component. Every one of those pairs differs in its "as in"
 * carrier sentence, which the learner HEARS. Putting {seed} in the key is what
 * turns 445 ambiguities into 0: two clips that match this key are, by
 * construction, the same words in the same order, so no learner can tell them
 * apart and picking either is safe. Two clips that differ in the carrier can
 * never collide here in the first place.
 *
 * Consequence worth stating plainly, because it is the safety argument: a
 * candidate set produced by this key is always internally interchangeable. The
 * remaining way to be WRONG is structural — a clip whose own `lego_id` names a
 * different LEGO than the row asking for it — and callers are expected to
 * reject that case rather than resolve it (see `legoRefFor`).
 *
 * NOT AUTHORED HERE. `getOrCreatePresentationTemplate` in
 * services/phases/presentation-author.cjs will ask Haiku for a template when a
 * known language has none. This module NEVER does: a missing template means no
 * key, which means the rows stay NULL and get reported. Reading is free;
 * authoring is a content decision.
 */
const { getName: getLangEnglishName, databaseToManifest } = require('../language-code-service.cjs')
const { normalizeForAudio } = require('./text-normalize.cjs')

/**
 * The target language's name, written in the known language — the value phase8
 * substitutes for {target_lang_name}. English-known courses use the house names
 * from the CSV ("Bengali", not CLDR's "Bangla") because that is how the courses
 * brand themselves; everything else asks CLDR via Intl.DisplayNames.
 */
function localisedLangName(targetLang, knownLang) {
  if (knownLang === 'eng') return getLangEnglishName(targetLang)
  try {
    const target2 = databaseToManifest(targetLang)
    const known2 = databaseToManifest(knownLang)
    const dn = new Intl.DisplayNames([known2], { type: 'language' })
    const name = dn.of(target2)
    if (name && name !== target2) return name
  } catch (_) { /* fall through to the English name */ }
  return getLangEnglishName(targetLang)
}

/**
 * The narration a component presentation clip carries, rebuilt exactly as
 * phase8 minted it. Returns null when any ingredient is missing — a caller with
 * no template, no chunk or no carrier has no key, and must report rather than
 * guess.
 */
function buildComponentPresentationText({ template, targetLangName, knownText, carrierText }) {
  if (!template || !targetLangName || !knownText || !carrierText) return null
  return template
    .replace('{target_lang_name}', targetLangName)
    .replace('{known}', knownText)
    .replace('{seed}', carrierText)
}

/** The same string under the canonical audio key, or null if it cannot be built. */
function componentPresentationKey(parts) {
  const text = buildComponentPresentationText(parts)
  return text == null ? null : normalizeForAudio(text)
}

/**
 * The LEGO a content row belongs to, in the form `course_audio.lego_id` uses
 * (`S0001L05`). Derived from the row's own seed/lego numbering, so it is
 * available even though `course_practice_phrases.lego_id` is NULL on every
 * course this was written for. Used as an INDEPENDENT second axis: a candidate
 * that names a different LEGO is a structural conflict, not a duplicate.
 */
function legoRefFor(seedNumber, legoIndex) {
  if (seedNumber == null || legoIndex == null) return null
  return `S${String(seedNumber).padStart(4, '0')}L${String(legoIndex).padStart(2, '0')}`
}

module.exports = {
  localisedLangName,
  buildComponentPresentationText,
  componentPresentationKey,
  legoRefFor,
}
