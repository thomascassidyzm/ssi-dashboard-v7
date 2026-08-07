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
 * differ from Fast on the script side too — more reps, SHORTER phrases — so each
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

/** Cap on phrase length, as a fraction of the LONGEST phrase available for a
 *  given LEGO. 1.0 = uncapped = the historic behaviour; Fast ships 1.0, which
 *  is what keeps it byte-identical to the old normal mode. Easy ships 0.5 —
 *  Aran's "halve the longest possible phrase".
 *
 *  Note this replaced an earlier `phraseLengthPreference` sort-direction knob,
 *  which was built on an inverted reading (longest phrases on Easy). Sorting is
 *  shortest-first everywhere, exactly as it always was; length is governed by
 *  this cap alone. */
const DEFAULT_MAX_PHRASE_LENGTH_FRACTION = 1.0

/** ABSOLUTE ceiling on a phrase's target SYLLABLE count — above it the phrase
 *  is skipped (Tom, 2026-08-07). Distinct from the fraction above in two ways
 *  that matter: it is absolute rather than relative to the course, and it
 *  measures syllables rather than characters.
 *
 *  0 / absent / blank = NO LIMIT, which is Fast and is the historic behaviour.
 *  A cap must never appear by omission.
 *
 *  KNOWN LIMIT, stated because a silent no-op is the failure mode here: the
 *  syllable count both this generator and the learner app use is
 *  `target_syllable_count` if the column is populated, else a vowel-cluster
 *  heuristic with a CJK special case. Measured 2026-08-07: the column is
 *  populated on 10,813 of 818,220 phrases (1.3%), so the heuristic is the live
 *  path almost everywhere — and it returns 1 for any non-Latin, non-CJK script
 *  (Arabic, Hebrew, Devanagari, Cyrillic, Greek, Thai). On those courses this
 *  cap is INERT and maxPhraseLengthFraction is the only length control that
 *  bites. The admin page says so next to the knob. */
const DEFAULT_MAX_PHRASE_SYLLABLES = 0

/** Floors the length cap must never breach, from the methodology's per-LEGO
 *  phrase minimums (ralph: >=4 BUILD, >=5 USE — "fewer phrases is a FAIL").
 *  These are FLOORS, deliberately not the round's ceiling: passing the ceiling
 *  here would make the guard swallow the cap whenever a LEGO has fewer phrases
 *  than the ceiling, which is most of them, and the cap would never bite. */
const MIN_BUILD_PHRASES_AFTER_CAP = 4
const MIN_USE_PHRASES_AFTER_CAP = 5

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
 * The phrase-length cap fraction for a mode, validated. Anything missing,
 * non-numeric, <= 0 or > 1 degrades to 1.0 — a bad hand-edit must fall back to
 * TODAY'S uncapped script, never to a cap that silently shortens a course.
 */
function resolveMaxPhraseLengthFraction(modeConfig) {
  const f = modeConfig && modeConfig.maxPhraseLengthFraction
  if (typeof f !== 'number' || !Number.isFinite(f) || f <= 0 || f > 1) {
    return DEFAULT_MAX_PHRASE_LENGTH_FRACTION
  }
  return f
}

/**
 * The absolute syllable ceiling for a mode, validated. Anything missing,
 * non-numeric, non-finite or <= 0 degrades to 0 = NO LIMIT — the historic
 * behaviour. Symmetrical with the fraction above: a bad hand-edit falls back to
 * today's uncapped script, never to a cap that silently shortens a course.
 * Fractional values floor, so 12.9 is a ceiling of 12.
 */
function resolveMaxPhraseSyllables(modeConfig) {
  const n = modeConfig && modeConfig.maxPhraseSyllables
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) {
    return DEFAULT_MAX_PHRASE_SYLLABLES
  }
  return Math.floor(n)
}

/**
 * How the CAP measures phrase length: characters of target text.
 *
 * NOT syllables, deliberately. Two measured reasons (ara_for_eng, 11,340
 * phrases): `course_practice_phrases.target_syllable_count` is NULL for every
 * row, and the `countTargetSyllables` fallback is a Latin vowel-cluster
 * heuristic that returns 1 for all Arabic text — so a syllable-based ceiling
 * computed to 0.5 and the cap silently did nothing. Character length is always
 * present and works in every script.
 *
 * The shortest-first SORT still uses syllables, exactly as it always has —
 * untouched, so Fast stays byte-identical.
 */
function phraseLengthOf(p) {
  return ((p && p.target_text) || '').length
}

/**
 * The longest phrase in the COURSE — the "longest possible phrase" that the cap
 * fraction is a fraction OF.
 *
 * Course-wide, deliberately, not per-LEGO. A per-LEGO pool max was tried first
 * and is useless on real data: BUILD pools average ~3.2 phrases (measured on
 * ara_for_eng, 1,384 pools), so half-the-pool-max left under one eligible
 * phrase and the starvation guard fired on 100% of LEGOs — the cap never bit.
 * A course-wide ceiling is also the plainer reading of Aran's words.
 *
 * @param {Iterable<Array>} phraseLists  e.g. buildMap.values(), useMap.values()
 */
function courseMaxPhraseLength(phraseLists, lengthOf = phraseLengthOf) {
  let max = 0
  for (const list of phraseLists) {
    if (!list) continue
    for (const p of list) {
      const n = lengthOf(p)
      if (n > max) max = n
    }
  }
  return max
}

/**
 * Apply the mode's phrase-length cap to one LEGO's candidate pool.
 *
 * `limit` is an ABSOLUTE length ceiling (courseMaxPhraseLength * fraction),
 * computed once per run — so a phrase that is too long is too long wherever it
 * appears, rather than being judged against whatever happens to sit beside it.
 *
 * STARVATION GUARD: a length cap must never empty a round. If the cap leaves
 * fewer than `minKeep`, the shortest `minKeep` are returned instead. Phrase
 * volume is a hard methodology rail — fewer phrases is a FAIL — so the cap
 * yields to it, not the other way round.
 *
 * @param {Array}  phrases    candidates, any order
 * @param {number} limit      absolute length ceiling; Infinity = uncapped
 * @param {Function} lengthOf   phrase -> length
 * @param {number} minKeep    never return fewer than this (when available)
 */
function applyPhraseLengthCap(phrases, limit, lengthOf = phraseLengthOf, minKeep = 1) {
  if (!Array.isArray(phrases) || phrases.length === 0) return phrases || []
  if (!Number.isFinite(limit) || limit <= 0) return phrases   // uncapped — historic path
  const eligible = phrases.filter(p => lengthOf(p) <= limit)
  if (eligible.length >= Math.min(minKeep, phrases.length)) return eligible
  return [...phrases].sort((a, b) => lengthOf(a) - lengthOf(b)).slice(0, minKeep)
}

/**
 * Both length caps, applied to one LEGO's candidate pool, in one place.
 *
 * They compose rather than compete: a phrase survives only if it is inside the
 * relative CHARACTER ceiling AND the absolute SYLLABLE ceiling. Each is applied
 * through applyPhraseLengthCap with its own measure, so each carries its own
 * starvation guard and either one alone behaves exactly as it did before.
 * Order is irrelevant to the result when neither guard fires; when one does,
 * running the relative cap first keeps the guard's "shortest N" measured on the
 * pool the course-wide ceiling already agreed to.
 *
 * `caps.lengthLimit` of Infinity and `caps.syllableLimit` of 0 are both the
 * uncapped identity, so Fast short-circuits to the plain historic pool.
 *
 * @param {Array}  phrases   candidates, any order
 * @param {object} caps      { lengthLimit, lengthOf, syllableLimit, syllablesOf }
 * @param {number} minKeep   the methodology phrase floor for this pool
 */
function applyPhraseCaps(phrases, caps, minKeep = 1) {
  const byLength = applyPhraseLengthCap(phrases, caps.lengthLimit, caps.lengthOf || phraseLengthOf, minKeep)
  if (!caps.syllableLimit || !caps.syllablesOf) return byLength
  return applyPhraseLengthCap(byLength, caps.syllableLimit, caps.syllablesOf, minKeep)
}

module.exports = {
  MODE_KEYS,
  MODE_FALLBACKS,
  DEFAULT_MODE,
  SCRIPT_SHAPE_KEYS,
  DEFAULT_MAX_PHRASE_LENGTH_FRACTION,
  DEFAULT_MAX_PHRASE_SYLLABLES,
  MIN_BUILD_PHRASES_AFTER_CAP,
  MIN_USE_PHRASES_AFTER_CAP,
  resolveScriptShape,
  resolveMaxPhraseLengthFraction,
  resolveMaxPhraseSyllables,
  phraseLengthOf,
  courseMaxPhraseLength,
  applyPhraseLengthCap,
  applyPhraseCaps,
}
