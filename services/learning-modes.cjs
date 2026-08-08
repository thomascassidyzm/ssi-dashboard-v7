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

const { countSyllables, hasSyllableCounter, syllableLangOf } = require('../tools/lib/syllable-counters.cjs')

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

/** The KNOWN-side pull filter for REVIEW and CONSOLIDATE slots (Tom,
 *  2026-08-07): "the parameterization should be on things like the syllable
 *  cap, as measured in the known language".
 *
 *  This REPLACED an absolute target-syllable ceiling (`maxPhraseSyllables`)
 *  that shipped earlier the same day and was retired within hours. That one
 *  was wrong in three ways at once and none of them are worth repeating: it
 *  counted the TARGET side, which is the side the learner is not reading; it
 *  applied to the whole script rather than to the review/consolidate pull; and
 *  it never came off, so a course stayed clipped forever. It also leant on a
 *  Latin vowel-cluster heuristic that returns 1 for every non-Latin, non-CJK
 *  script, so it silently did nothing on most of the estate.
 *
 *  The replacement counts the learner's OWN language with the canonical
 *  per-language registry (tools/lib/syllable-counters.cjs), which knows nine
 *  languages and declares itself inert rather than guessing for the rest.
 *
 *  0 / absent / blank / non-finite = NO FILTER. A filter must never appear by
 *  omission. Mirrors normalizeMaxKnownSyllables in the learner app. */
const DEFAULT_REVIEW_MAX_KNOWN_SYLLABLES = Infinity

/** Last round on which the known-side filter applies; past it the whole basket
 *  is in play again. Absent / non-finite / <= 0 degrades to 100 rather than to
 *  "forever", because the filter's whole point is that it COMES OFF: the
 *  learner who has done a hundred rounds is not the learner it protects.
 *  Mirrors normalizeReviewFilterMaxRound in the learner app. */
const DEFAULT_REVIEW_FILTER_MAX_ROUND = 100

/** Whether the character-length cap applies to BUILD pools at all. "No
 *  filtering on BLD phrases" (Tom, 2026-08-07) — Easy ships false and takes
 *  its whole BUILD pool. Default TRUE keeps every other caller on the historic
 *  path. */
const DEFAULT_FILTER_BUILD_PHRASES = true

/** The hard ceiling on how many times one phrase may play back to back. Tom's
 *  rule, not a preference — "we do NOT ever want to repeat exactly the same
 *  phrase more than 2x - a phrase repeated 3x would drive people nuts, but
 *  doubled up is perfect" (2026-08-07). No DB row may raise it; a row asking
 *  for 3 is clamped here exactly as it is in the learner's
 *  normalizePhraseRepeatCount. */
const MAX_PHRASE_REPEAT_COUNT = 2

/** Absent / <=1 ⇒ each cycle plays once, which is Fast's value and the
 *  historic behaviour. */
const DEFAULT_PHRASE_REPEAT_COUNT = 1

/** The four practice cycles Tom named — BLD, REVIEW, USE and CONSOLIDATE —
 *  spelled in the LEARNER'S vocabulary, because the vocabulary is what the DB
 *  row carries: `build`, `spaced_rep`, `use`. The INTRO and the bare LEGO are
 *  absent by his ruling ("of course not - the intro LEGO and not the LEGO
 *  alone"); adding them is a config decision, not a code change. */
const DEFAULT_REPEATED_CYCLE_TYPES = ['build', 'spaced_rep', 'use']

/** Script View spells two of those cycle types differently from the learner:
 *  its spaced-rep items are `review` and its consolidation items are
 *  `consolidate` (the learner emits both as `use`/`spaced_rep`). The DB row is
 *  written in the LEARNER'S vocabulary — SpeakingConfig.vue writes
 *  `['build','spaced_rep','use']` — so Script View translates on read rather
 *  than asking anyone to keep two spellings of one setting in sync.
 *
 *  `use` maps to `consolidate` because a consolidation cycle IS a use phrase
 *  (Tom: "every CONSOLIDATE (these are just USE phrases)"), and Script View has
 *  no separate `use` type: its USE phrases are emitted either as BUILD padding
 *  (already type `build`) or as `consolidate`. */
const CYCLE_TYPE_ALIASES = {
  spaced_rep: 'review',
  use: 'consolidate',
}

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
 * The known-language syllable ceiling for review/consolidate pulls, validated.
 * Anything missing, non-numeric, non-finite or <= 0 degrades to Infinity = NO
 * FILTER. Fractional values floor, so 15.9 is a ceiling of 15.
 */
function resolveReviewMaxKnownSyllables(modeConfig) {
  const n = modeConfig && modeConfig.reviewMaxKnownSyllables
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) {
    return DEFAULT_REVIEW_MAX_KNOWN_SYLLABLES
  }
  return Math.floor(n)
}

/**
 * The last round the known-side filter applies on, validated. Anything
 * missing, non-numeric, non-finite or <= 0 degrades to 100 — see
 * DEFAULT_REVIEW_FILTER_MAX_ROUND for why the degradation is a window and not
 * "forever".
 */
function resolveReviewFilterMaxRound(modeConfig) {
  const n = modeConfig && modeConfig.reviewSyllableFilterMaxRound
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) {
    return DEFAULT_REVIEW_FILTER_MAX_ROUND
  }
  return Math.floor(n)
}

/**
 * Whether this mode filters its BUILD pool by the character-length cap. Only
 * an explicit `false` turns it off, so an absent key keeps the historic path.
 */
function resolveFilterBuildPhrases(modeConfig) {
  return !(modeConfig && modeConfig.filterBuildPhrases === false)
}

/**
 * How many times each eligible practice cycle plays, back to back.
 *
 * Anything missing, non-numeric, non-finite or <= 1 degrades to 1 — no
 * repetition, which is Fast's value and makes Fast's script provably identical
 * to the pre-2026-08-07 walk. Above MAX_PHRASE_REPEAT_COUNT clamps to 2, which
 * is the one thing on this row config cannot raise.
 *
 * Mirrors the learner's `normalizePhraseRepeatCount`
 * (packages/player-vue/src/composables/useAlgorithmConfig.ts).
 */
function resolvePhraseRepeatCount(modeConfig) {
  const n = modeConfig && modeConfig.phraseRepeatCount
  if (typeof n !== 'number' || !Number.isFinite(n)) return DEFAULT_PHRASE_REPEAT_COUNT
  const floored = Math.floor(n)
  if (floored <= 1) return DEFAULT_PHRASE_REPEAT_COUNT
  return Math.min(floored, MAX_PHRASE_REPEAT_COUNT)
}

/**
 * Which Script View cycle types the repeat applies to, as a Set.
 *
 * Reads the row in the learner's vocabulary and translates through
 * CYCLE_TYPE_ALIASES, so one setting drives both views. A non-array degrades
 * to the four types Tom named; an EMPTY array is honoured as "repeat nothing",
 * because that is a deliberate configuration rather than a bad value — same
 * reading as the learner's `normalizeRepeatedCycleTypes`.
 */
function resolveRepeatedCycleTypes(modeConfig) {
  const raw = modeConfig && modeConfig.repeatedCycleTypes
  const list = Array.isArray(raw)
    ? raw.filter(t => typeof t === 'string' && t.length > 0)
    : DEFAULT_REPEATED_CYCLE_TYPES
  return new Set(list.map(t => CYCLE_TYPE_ALIASES[t] || t))
}

/**
 * Is this a cycle the active config repeats?
 *
 * The seed-phase production review is never repeated whatever the row says:
 * that drained sandwich is already several cycles of one sentence, so doubling
 * it would give four hearings of the same seed and breach the
 * never-more-than-twice rule. Structural, not a setting — and the same carve-out
 * the learner makes in `isRepeatedCycle`.
 */
function isRepeatedCycle(item, types) {
  if (!types.has(item.type)) return false
  if (item.reviewItemKind === 'seed') return false
  return true
}

/**
 * Easy doubling for Script View — every eligible practice cycle listed `count`
 * times, consecutively.
 *
 * WHY A PASS OVER THE FINISHED LIST. The learner does exactly this
 * (packages/player-vue/src/providers/repeatPhraseCycles.ts): repetition is a
 * duplication of whole cycles, never a replay inside one, so a single pass over
 * the assembled round list makes every emitter obey the same rule. Script View
 * must show the round the learner actually hears, so it repeats the same way,
 * at the same point in the pipeline — AFTER the consecutive-duplicate removal,
 * which would otherwise strip the second copy on sight.
 *
 * There is no A-64 cap downstream here as there is in the player, so the
 * ceiling in `resolvePhraseRepeatCount` is what guarantees "doubled" can never
 * read as tripled.
 *
 * A count of 1 returns the input array untouched, so Fast's Script View is
 * unchanged.
 *
 * Each copy past the first is marked `repeatOf` (the play number) so the view
 * can label a second hearing rather than look like a duplicated row.
 */
function repeatPhraseCycles(items, { count, types }) {
  const plays = Math.min(Math.floor(count), MAX_PHRASE_REPEAT_COUNT)
  if (!Number.isFinite(plays) || plays <= 1) return items

  const out = []
  for (const item of items) {
    out.push(item)
    if (!isRepeatedCycle(item, types)) continue
    for (let n = 2; n <= plays; n++) {
      out.push({ ...item, repeatOf: n })
    }
  }
  return out
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
 * THE one place a phrase's KNOWN-side syllable count is resolved.
 *
 * There is no stored known-side count anywhere in the schema, so this is the
 * canonical per-language counter or it is nothing. When the course's known
 * language has no counter it returns `countable: false` and the filter simply
 * does not apply — LOUDLY, via the caller's log line. It never throws and it
 * never guesses with another language's rules, because that is precisely how
 * the retired target-side ceiling failed: it produced a plausible number
 * nobody checked and silently did nothing.
 *
 * Mirrors makeKnownSyllableResolver in the learner app's useAlgorithmConfig.ts.
 *
 * @param {string} knownLang  courses.known_lang for this course
 */
function makeKnownSyllableResolver(knownLang) {
  const lang = syllableLangOf(knownLang)
  const countable = hasSyllableCounter(lang)
  return {
    lang,
    countable,
    /** Known-side syllables, or null when this course cannot be counted. */
    syllablesOf(phrase) {
      if (!countable) return null
      const text = phrase && phrase.known_text
      if (!text) return null
      return countSyllables(text, lang)
    },
  }
}

/**
 * The KNOWN-side pull filter for REVIEW and CONSOLIDATE slots (Tom,
 * 2026-08-07). THE one place this rule lives.
 *
 * Given a LEGO's basket of use phrases and the round being generated, return
 * the sub-basket the pull may draw from:
 *
 *   1. filter off, or past `maxRound` => the whole basket, untouched. Nothing
 *      is backlogged when it lifts and nothing cascades: the LEGO is what is
 *      being practised, so a phrase the learner has not met before is fine.
 *   2. otherwise keep phrases of at most `limit` KNOWN-language syllables. A
 *      phrase whose known side cannot be counted passes — that is the inert
 *      path, taken per phrase rather than per course.
 *   3. SHORTEST-IN-BASKET FALLBACK — if that leaves nothing, return the single
 *      shortest phrase in the basket. A LEGO is never skipped and a review
 *      slot is never left empty for want of a short phrase.
 *
 * A LEGO basket is that LEGO's own debut BUILD + USE phrases, so every phrase
 * in it contains its LEGO by definition; there is no containment check here
 * and there must not be one.
 *
 * @param {Array}  pool          the LEGO's basket, any order
 * @param {number} roundNumber   the round being generated
 * @param {object} filter        { limit, maxRound, syllablesOf } or null
 */
function filterReviewPool(pool, roundNumber, filter) {
  if (!Array.isArray(pool) || pool.length === 0) return pool || []
  if (!filter || !Number.isFinite(filter.limit) || filter.limit <= 0) return pool
  if (roundNumber > filter.maxRound) return pool

  const kept = pool.filter(p => {
    const n = filter.syllablesOf(p)
    if (typeof n !== 'number' || !Number.isFinite(n)) return true   // uncountable => passes
    return n <= filter.limit
  })
  if (kept.length > 0) return kept

  let shortest = pool[0]
  let shortestN = Infinity
  for (const p of pool) {
    const n = filter.syllablesOf(p)
    const value = typeof n === 'number' && Number.isFinite(n) ? n : Infinity
    if (value < shortestN) { shortestN = value; shortest = p }
  }
  return [shortest]
}

module.exports = {
  MODE_KEYS,
  MODE_FALLBACKS,
  DEFAULT_MODE,
  SCRIPT_SHAPE_KEYS,
  DEFAULT_MAX_PHRASE_LENGTH_FRACTION,
  DEFAULT_REVIEW_MAX_KNOWN_SYLLABLES,
  DEFAULT_REVIEW_FILTER_MAX_ROUND,
  DEFAULT_FILTER_BUILD_PHRASES,
  MAX_PHRASE_REPEAT_COUNT,
  DEFAULT_PHRASE_REPEAT_COUNT,
  DEFAULT_REPEATED_CYCLE_TYPES,
  CYCLE_TYPE_ALIASES,
  MIN_BUILD_PHRASES_AFTER_CAP,
  MIN_USE_PHRASES_AFTER_CAP,
  resolveScriptShape,
  resolveMaxPhraseLengthFraction,
  resolveReviewMaxKnownSyllables,
  resolveReviewFilterMaxRound,
  resolveFilterBuildPhrases,
  resolvePhraseRepeatCount,
  resolveRepeatedCycleTypes,
  isRepeatedCycle,
  repeatPhraseCycles,
  phraseLengthOf,
  courseMaxPhraseLength,
  applyPhraseLengthCap,
  makeKnownSyllableResolver,
  filterReviewPool,
}
