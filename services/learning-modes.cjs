/**
 * Learning modes — the canonical mode set and the script-shape layering rule.
 *
 * There are exactly two modes: EASY and FAST (Aran's ruling, relayed by Tom,
 * 2026-08-06). Turbo is gone. FAST is what "normal_mode" was — a rename, not a
 * retune. EASY is new, seeded from fast and tuned by hand in
 * /admin/configs/speaking.
 *
 * WHY THIS FILE EXISTS: `script_shape` is a GLOBAL row (one shape for every
 * learner), while the pause/playback knobs are PER-MODE rows. Easy needs to
 * differ from Fast on the script side too — more reps, longer phrases — so each
 * mode row carries an optional `scriptShape` override block whose keys mirror
 * the global row. Turbo used to express its script-side difference as a *cull*
 * (fibKeep/buildKeep/useKeep); the override block replaces that mechanism with
 * a plainly-editable one.
 *
 * The learner app mirrors these exact semantics in
 * packages/player-vue/src/providers/generateLearningScript.ts. Popty's Script
 * View and the learner MUST NOT diverge — there is prior art on that failure in
 * docs/voice-engine/script-divergence-report.md. If you change the rule here,
 * change it there in the same commit.
 */

/** Row key for each mode. `normal_mode` is retained in the DB as a live
 *  fallback alias until the learner app ships reading `fast_mode`. */
const MODE_KEYS = {
  easy: 'easy_mode',
  fast: 'fast_mode',
}

/** Fallback chain per mode: first key that exists in algorithm_config wins.
 *  Fast falls back to normal_mode so an old bundle and a new bundle both work
 *  during the promotion window. */
const MODE_FALLBACKS = {
  easy_mode: ['easy_mode', 'fast_mode', 'normal_mode'],
  fast_mode: ['fast_mode', 'normal_mode'],
}

const DEFAULT_MODE = 'fast'

/** Which end of the syllable-sorted phrase list survives truncation at the cap.
 *  'shortest' is the historic behaviour and the default; 'longest' is what Easy
 *  uses to satisfy "longest possible phrase". */
const PHRASE_LENGTH_PREFERENCES = ['shortest', 'longest']
const DEFAULT_PHRASE_LENGTH_PREFERENCE = 'shortest'

/** Keys a mode's `scriptShape` block may override. Anything else is ignored, so
 *  a stray key in a hand-edited row cannot silently reshape a round. */
const SCRIPT_SHAPE_KEYS = [
  'spacedRepOffsets',
  'maxBuildPhrases',
  'useConsolidationCount',
  'maxSpacedRepPhrases',
  'n1PhraseCount',
]

/**
 * Layer a mode's scriptShape override on top of the global script_shape row.
 * Global is the base; the mode's block wins per-key. An absent/empty override
 * returns the global shape unchanged — which is how `fast_mode` is provably
 * identical to the old `normal_mode` behaviour.
 *
 * @param {object} globalShape  the algorithm_config.script_shape config
 * @param {object} modeConfig   the mode row's config (may carry .scriptShape)
 * @returns {object} the effective script shape
 */
function resolveScriptShape(globalShape, modeConfig) {
  const base = { ...(globalShape || {}) }
  const override = (modeConfig && modeConfig.scriptShape) || {}
  for (const key of SCRIPT_SHAPE_KEYS) {
    if (override[key] !== undefined && override[key] !== null) base[key] = override[key]
  }
  return base
}

/**
 * The phrase-length preference for a mode, validated. An unknown or missing
 * value falls back to 'shortest' (historic behaviour) rather than throwing —
 * a bad hand-edit should degrade to today's script, not break the round.
 */
function resolvePhraseLengthPreference(modeConfig) {
  const pref = modeConfig && modeConfig.phraseLengthPreference
  return PHRASE_LENGTH_PREFERENCES.includes(pref) ? pref : DEFAULT_PHRASE_LENGTH_PREFERENCE
}

/**
 * Comparator for ordering phrases before the cap truncates them. 'shortest'
 * sorts ascending by target syllable count (historic); 'longest' descending.
 * `syllablesOf` lets the caller supply its own counter.
 */
function phraseLengthComparator(preference, syllablesOf) {
  const dir = preference === 'longest' ? -1 : 1
  return (a, b) => dir * (syllablesOf(a) - syllablesOf(b))
}

module.exports = {
  MODE_KEYS,
  MODE_FALLBACKS,
  DEFAULT_MODE,
  SCRIPT_SHAPE_KEYS,
  PHRASE_LENGTH_PREFERENCES,
  DEFAULT_PHRASE_LENGTH_PREFERENCE,
  resolveScriptShape,
  resolvePhraseLengthPreference,
  phraseLengthComparator,
}
