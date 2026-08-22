/**
 * Learning Script Generator v5.0 — dashboard mirror of the learner app
 *
 * Parallel implementation of generateLearningScript.ts in ssi-learning-app
 * (no shared code — keep the two in sync by hand; see
 * docs/voice-engine/script-divergence-report.md for the verified mapping).
 *
 * CONVERGED 2026-06-10 — Script View shows what the learner actually gets:
 * - Spaced-rep offsets + round shape are read LIVE from algorithm_config
 *   key='script_shape' (the same table/key the learner app reads via
 *   useAlgorithmConfig.ts). The built-in constants below are a fallback used
 *   ONLY when the config row is missing, with a logged warning.
 * - NO component priming cycles. The learner renders M-LEGO components as
 *   visual ghost tiles on intro/debut only — it NEVER plays component_intro /
 *   component_practice audio cycles (generateLearningScript.ts:1208-1212).
 * - NO L1 listening clusters in main rounds. The learner removed L1 from the
 *   main flow on 2026-05-19 — it lives exclusively in Listening MODE.
 *   Seed graduation is still tracked here (catalogue-ordinal based, same as
 *   the learner) because graduated seeds drop out of spaced rep.
 * - NO pod (L2) emission. Live pods are runtime-scheduled PER-LEARNER by
 *   usePodLapScheduler.ts on a ratchet counter
 *   (course_enrollments.completed_pod_rounds) — a course-level projection
 *   cannot model them. PodsView owns pods.
 * - Optional learner audio view (options.learnerView): applies the learner's
 *   audio gates PER ITEM — a missing clip costs that item, never its round.
 *   An unvoiced intro or debut is skipped on its own; the round keeps its
 *   number and everything else it has (builds, reviews, consolidates), and
 *   only a round left with nothing playable disappears. Unvoiced phrases never
 *   enter the BUILD/USE pools. Default (production view) keeps every row,
 *   flagged hasAudio:false — that is the review tool's job.
 *   Learner parity: ssi-learning-app 269d2d19 (2026-08-06), "a missing clip
 *   costs that item, never the round or the course".
 * - ALWAYS-ON player-delivery annotation (annotatePlayerDelivery, below): every
 *   row and every round carries playerCanDeliver / playerDropReason /
 *   missingAudioRoles, and each round carries the round number the learner
 *   would actually see. Intent is never hidden; reality is annotated on top.
 *
 * ROUND structure (verified line-by-line against the learner):
 * 1. INTRO  - presentation audio ("The Japanese for X is...")
 * 2. DEBUT  - the LEGO itself
 * 3. BUILD  - up to maxBuildPhrases (syllable-sorted; USE fill after reserving)
 * 4. REVIEW - spaced rep at script_shape.spacedRepOffsets (max
 *             maxSpacedRepPhrases, N-1 gets n1PhraseCount, round-robin
 *             useIndex, one LEGO per offset via legoState.lastRound)
 * 5. CONSOLIDATE - useConsolidationCount reserved USE phrases
 * then consecutive-duplicate dedup. Fully deterministic, no randomness.
 */

const createLogger = require('./shared/logger.cjs')
const logger = createLogger('LearningScriptGenerator')
const {
  MODE_KEYS, MODE_FALLBACKS, DEFAULT_MODE,
  DEFAULT_MAX_PHRASE_LENGTH_FRACTION, DEFAULT_REVIEW_MAX_KNOWN_SYLLABLES,
  DEFAULT_REVIEW_FILTER_MAX_ROUND, DEFAULT_FILTER_BUILD_PHRASES,
  DEFAULT_PHRASE_REPEAT_COUNT, DEFAULT_REPEATED_CYCLE_TYPES, CYCLE_TYPE_ALIASES,
  MIN_BUILD_PHRASES_AFTER_CAP, MIN_USE_PHRASES_AFTER_CAP,
  resolveScriptShape, resolveMaxPhraseLengthFraction,
  resolveReviewMaxKnownSyllables, resolveReviewFilterMaxRound, resolveFilterBuildPhrases,
  resolvePhraseRepeatCount, resolveRepeatedCycleTypes, repeatPhraseCycles,
  phraseLengthOf, courseMaxPhraseLength, applyPhraseLengthCap,
  makeKnownSyllableResolver, filterReviewPool,
} = require('./learning-modes.cjs')

// FALLBACK spaced-rep offsets — used ONLY when algorithm_config.script_shape
// is missing. The live config row (which the learner app reads) is the truth;
// as of 2026-06-10 it was [1,2,3,5,8,13,21,34,55,89].
//
// EXTENDED 2026-06-30 past the historical tail (…,55,89) with 144,233,377 to
// carry spaced repetition into the SEED-SENTENCE phase: a review whose skip
// offset reaches SEED_PHASE_START_OFFSET (144) shows the full parent seed
// sentence instead of a use-phrase (the 89-step stays the last use-phrase).
//
// EXTENDED AGAIN 2026-06-30 to 610,987,1597,2584 so the series SPANS A FULL
// COURSE. The skip offset is "rounds since a LEGO debuted" ≈ "how many LEGOs
// ago", and full courses run ~1200–2000 LEGOs (≈668 seeds, lang-pair dependent).
// At 377 the memory horizon was only 377 rounds: a LEGO learned early stopped
// being reviewed ~1000+ rounds before the course ended, so the entire front of
// a course went cold. 2584 is the first Fibonacci term past 2000, so even the
// earliest LEGO keeps getting (seed-phase) reviews until the longest course ends.
//
// TERMINAL BEHAVIOUR — FINITE, NO clamp-and-repeat. The series ends at 2584 (its
// last term). Clamp-and-repeat was rejected because it would be a no-op here:
// calculateSpacedRepReviews keys reviews by target round and dedupes (seenLegos),
// so a repeated final offset collapses onto the same already-seen LEGO and emits
// nothing. To span even longer courses, append further Fibonacci terms (4181…).
const FIBONACCI = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584]

// First skip offset (rounds since a LEGO debuted) at which the spaced-rep review
// item switches from a use-phrase to the FULL PARENT SEED SENTENCE. 144 is the
// first Fibonacci term past the historical tail, so the 89-step remains the last
// use-phrase. One-line tunable — the whole seed-phase boundary lives here.
const SEED_PHASE_START_OFFSET = 144

/**
 * Is a review at this skip offset in the seed-sentence phase? — PURE.
 * The skip offset is `roundNumber - reviewedRound` (how many rounds since the
 * reviewed LEGO debuted). At/after SEED_PHASE_START_OFFSET the review renders
 * the parent seed sentence; before it, a use-phrase.
 */
function reviewItemIsSeed(reviewOffset) {
  return reviewOffset >= SEED_PHASE_START_OFFSET
}

// Fallback round shape (mirrors the learner's behaviour when its own config
// fetch fails). Only consulted when the script_shape config row is missing.
const DEFAULT_SCRIPT_SHAPE = {
  spacedRepOffsets: FIBONACCI,
  maxBuildPhrases: 7,
  useConsolidationCount: 2,
  maxSpacedRepPhrases: 12,
  n1PhraseCount: 3,
}

// Fallback listening config — graduation only (offset rounds after a seed's
// last LEGO before the seed drops out of spaced rep). Mirrors the learner's
// DEFAULT_LISTENING_CONFIG (generateLearningScript.ts:171-179). L1 clusters
// themselves are NOT emitted here — Listening MODE owns them.
const DEFAULT_LISTENING = {
  enabled: true,
  offset: 90,
}

/**
 * Load the live algorithm config rows the learner app reads
 * (useAlgorithmConfig.ts). Field-level merge over defaults, same as the
 * learner. Falls back to the built-in constants ONLY when the row is missing.
 */
async function loadAlgorithmConfig(supabase, mode = DEFAULT_MODE) {
  let scriptShape = { ...DEFAULT_SCRIPT_SHAPE }
  let listening = { ...DEFAULT_LISTENING }
  let scriptShapeSource = 'fallback'
  let maxPhraseLengthFraction = DEFAULT_MAX_PHRASE_LENGTH_FRACTION
  let reviewMaxKnownSyllables = DEFAULT_REVIEW_MAX_KNOWN_SYLLABLES
  let reviewFilterMaxRound = DEFAULT_REVIEW_FILTER_MAX_ROUND
  let filterBuildPhrases = DEFAULT_FILTER_BUILD_PHRASES
  let phraseRepeatCount = DEFAULT_PHRASE_REPEAT_COUNT
  let repeatedCycleTypes = new Set(DEFAULT_REPEATED_CYCLE_TYPES.map(t => CYCLE_TYPE_ALIASES[t] || t))

  // Mode rows are fetched alongside the global shape so the per-mode override
  // layers in one round-trip. The fallback chain lets fast_mode degrade to
  // normal_mode while the learner app is mid-promotion.
  const modeKey = MODE_KEYS[mode] || MODE_KEYS[DEFAULT_MODE]
  const fallbackChain = MODE_FALLBACKS[modeKey] || [modeKey]

  try {
    const { data, error } = await supabase
      .from('algorithm_config')
      .select('key, config')
      .in('key', ['script_shape', 'listening', ...fallbackChain])

    if (error) {
      logger.warn(`algorithm_config fetch failed (${error.message}) — using built-in fallback shape [${FIBONACCI.join(',')}]. Script View may diverge from the learner.`)
      return { scriptShape, listening, scriptShapeSource, maxPhraseLengthFraction, reviewMaxKnownSyllables, reviewFilterMaxRound, filterBuildPhrases, phraseRepeatCount, repeatedCycleTypes, mode }
    }

    const byKey = new Map((data || []).map(r => [r.key, r.config || {}]))

    if (byKey.has('script_shape')) {
      scriptShape = { ...DEFAULT_SCRIPT_SHAPE, ...byKey.get('script_shape') }
      scriptShapeSource = 'algorithm_config'
    } else {
      logger.warn(`algorithm_config.script_shape row MISSING — falling back to built-in offsets [${FIBONACCI.join(',')}]. The learner app would use its own defaults; fix the config row.`)
    }

    if (byKey.has('listening')) {
      listening = { ...DEFAULT_LISTENING, ...byKey.get('listening') }
    }

    // Layer the mode's scriptShape override on the global row, then read its
    // phrase-length preference. First key in the chain that exists wins.
    const resolvedKey = fallbackChain.find(k => byKey.has(k))
    if (resolvedKey) {
      const modeConfig = byKey.get(resolvedKey)
      scriptShape = resolveScriptShape(scriptShape, modeConfig)
      maxPhraseLengthFraction = resolveMaxPhraseLengthFraction(modeConfig)
      reviewMaxKnownSyllables = resolveReviewMaxKnownSyllables(modeConfig)
      reviewFilterMaxRound = resolveReviewFilterMaxRound(modeConfig)
      filterBuildPhrases = resolveFilterBuildPhrases(modeConfig)
      phraseRepeatCount = resolvePhraseRepeatCount(modeConfig)
      repeatedCycleTypes = resolveRepeatedCycleTypes(modeConfig)
      if (resolvedKey !== modeKey) {
        logger.warn(`algorithm_config.${modeKey} row MISSING — fell back to ${resolvedKey}. Expected during the learning-app promotion window; fix the row once it ships.`)
      }
    } else {
      logger.warn(`No mode row found for '${mode}' (tried ${fallbackChain.join(', ')}) — using the global script shape unmodified.`)
    }
  } catch (err) {
    logger.warn(`algorithm_config fetch threw (${err.message}) — using built-in fallback shape.`)
  }

  return { scriptShape, listening, scriptShapeSource, maxPhraseLengthFraction, reviewMaxKnownSyllables, reviewFilterMaxRound, filterBuildPhrases, phraseRepeatCount, repeatedCycleTypes, mode }
}

/**
 * Count syllables in TARGET text — the shortest-first SORT key, and nothing
 * else since 2026-08-07.
 *
 * CJK characters count as 1 syllable each; Latin text uses a vowel-cluster
 * heuristic; every other script measures 1 per phrase. That is fine for a sort
 * (a coarse key still orders a pool sensibly and has ordered it this way
 * forever) and was NOT fine as a ceiling, which is why the target-side
 * `maxPhraseSyllables` ceiling this used to feed is gone. Any FILTER on
 * syllables now counts the KNOWN side with the per-language registry —
 * see filterReviewPool / makeKnownSyllableResolver in learning-modes.cjs.
 * Do not re-attach this counter to a filter.
 */
function countTargetSyllables(targetText) {
  if (!targetText) return 0
  const cjkRegex = /[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g
  const cjkChars = targetText.match(cjkRegex)
  if (cjkChars && cjkChars.length > 0) return cjkChars.length
  const vowelClusters = targetText.toLowerCase().match(/[aeiouyáéíóúàèìòùâêîôûäëïöü]+/gi)
  return vowelClusters ? vowelClusters.length : 1
}

/**
 * Check if a phrase contains the LEGO target as a contiguous substring.
 * Case-insensitive, punctuation-stripped comparison.
 *
 * UNUSED by design — kept only as documentation of the removed gate.
 * Do NOT re-add this filter to phrase selection: the learner app has no such
 * gate (selection is purely seed_number+lego_index+role) and gating here hid
 * legitimately word-order-inverted phrases (e.g. Croatian clitic inversion:
 * LEGO "sličan si" vs phrase "...si sličan...") from Script View.
 */
function phraseContainsLegoChars(phraseTarget, legoTarget) {
  if (!phraseTarget || !legoTarget) return false
  const normalize = (t) => t.toLowerCase()
    .replace(/[\u064B-\u0652]/g, '')  // Strip Arabic tashkeel (diacritics)
    .replace(/[.,!?;:¡¿'"()\-–—«»""''。，！？؟،؛、：；]/g, '')
    .replace(/\s+/g, ' ').trim()
  return normalize(phraseTarget).includes(normalize(legoTarget))
}

/**
 * Calculate which previous LEGOs to review during ROUND N.
 * Based on formula: N - offsets[i] >= 1, one review slot per offset.
 * Offsets come from algorithm_config.script_shape.spacedRepOffsets
 * (ascending); FIBONACCI is the fallback. PURE — unit tested.
 */
function calculateSpacedRepReviews(roundNumber, offsets = FIBONACCI) {
  const reviews = []
  const seenLegos = new Set()

  for (let i = 0; i < offsets.length; i++) {
    const skip = offsets[i]
    const reviewLego = roundNumber - skip
    if (reviewLego < 1) break
    if (seenLegos.has(reviewLego)) continue
    seenLegos.add(reviewLego)
    reviews.push({ legoIndex: reviewLego, fibPosition: i })
  }

  return reviews
}

/**
 * The literal gloss alignment a row can SHOW — PURE.
 *
 * Tom's ruling, 2026-08-12: "word order of target must be preserved and known
 * language will look wrong when the orders differ (cosa azul = blue thing maps
 * literally to thing blue)." So the target's own words are fixed columns, left
 * to right, and the known-language gloss is cut into chunks that sit UNDER
 * them. Basque `hitz bat` reads `word` `a`. Nothing is ever reordered to make
 * the known side read naturally — reading wrong is the point.
 *
 * A chunk may span several target words (many-to-one) and may be empty beside a
 * wide neighbour (one-to-many). Both fall out of where the breaks are; neither
 * is a special case, and the two sides' word counts need not match.
 *
 * Storage is `known_gloss_segments`, and it is deliberately NOT `decomposition`:
 * decomposition is chunked by LEGO, not by word (`hitz bat esan nahi dut` is 3
 * blocks over 5 words), and the learner's player renders those blocks as tiles
 * that require the salient LEGO to stay whole. See the migration for the full
 * reasoning. When no human has segmented a row yet, we DERIVE a faithful start
 * from decomposition/components — each block's gloss spanning exactly that
 * block's own target words — rather than guessing a per-word split, because
 * guessing a split is precisely the drift bug this tool exists to fix.
 *
 * "When appropriate" (Tom): a row with fewer than two target words has no
 * alignment to look at, so it returns null and shows no glyph rather than a
 * dead one.
 *
 * And ONLY an M-LEGO intro can be mapped at all (Tom, 2026-08-13): "A-LEGOs
 * can't be mappable by definition — an A-LEGO has only one word in at least one
 * language, and therefore cannot be split and mapped." So the refusal on `a
 * word = hitz bat` was right all along. `type` is the authored declaration of
 * exactly that splittability, so it is what gates the glyph — NOT the absence
 * of components, which only looks equivalent: 72 A-LEGOs estate-wide carry
 * components anyway and 16 of those have a multi-word target, so a
 * components-only test hands a glyph to rows that must never have one
 * (afr S0113L01 "why can't I", ita S0288L01 "to most people", …).
 */

/** Target words are the columns. Split on whitespace; nothing else is a word. */
function targetWordsOf(targetText) {
  return String(targetText || '').trim().split(/\s+/).filter(Boolean)
}

/** Do these chunks exactly cover `wordCount` columns? */
function segmentsCoverWords(segments, wordCount) {
  if (!Array.isArray(segments) || segments.length === 0) return false
  let total = 0
  for (const seg of segments) {
    if (!seg || !Number.isInteger(seg.span) || seg.span < 1) return false
    if (typeof seg.known !== 'string') return false
    total += seg.span
  }
  return total === wordCount
}

/**
 * Compare two target strings as the SAME words, ignoring case and the
 * punctuation that rides along with a word. Nothing else is normalised — a
 * component either is the row's own words or it is not.
 */
function sameTargetWords(a, b) {
  const flat = s => String(s || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, '')
    .trim()
    .replace(/\s+/g, ' ')
  return flat(a) === flat(b) && flat(a) !== ''
}

/**
 * Where does this block's own target text sit in the target's word list?
 * Returns the start column of the first UNCLAIMED contiguous run that reads as
 * exactly this block's target, or -1 when it is not there at all.
 */
function locateBlock(words, blockTarget, claimedBy) {
  const span = targetWordsOf(blockTarget).length
  if (span < 1) return -1
  for (let start = 0; start + span <= words.length; start++) {
    let free = true
    for (let i = start; i < start + span; i++) if (claimedBy[i] !== -1) { free = false; break }
    if (!free) continue
    if (sameTargetWords(words.slice(start, start + span).join(' '), blockTarget)) return start
  }
  return -1
}

/**
 * Derive a starting segmentation from LEGO-chunked blocks — PURE.
 *
 * Tom's amendment, 2026-08-14: "the DEFAULT mapping is auto-generated from the
 * existing LEGO components - no human effort to create the initial alignment";
 * the drag tool exists only to fix what this gets wrong. So this is not
 * scaffolding, it is the feature, and it is worth being careful here.
 *
 * The old rule claimed columns SEQUENTIALLY: block 1 took the first N columns,
 * block 2 the next, and so on. That silently assumes the components are stored
 * in the TARGET's word order, and estate-wide they very often are not — they
 * are stored in the KNOWN language's order. `eng_for_pan S0178L01` is
 * "didn't have time" with components [time, didn't have], so sequential
 * claiming put the gloss for "time" underneath "didn't". Measured across 92
 * courses, 8,542 of 35,166 derivable rows opened visibly wrong that way.
 *
 * So each block is now LOCATED by its own target text: it claims the columns
 * that actually read as its words, wherever they are. Longest blocks go first,
 * so a one-word block cannot steal a column out of the middle of a longer one.
 * A block placed this way is correct by construction — the columns under its
 * gloss ARE its target words.
 *
 * The refusal to guess is untouched (7892dce5). Locating uses only what the
 * component already says; a block whose target does not occur in the row's own
 * target text is not invented into place — it falls back to the leftover
 * columns in its given order, exactly where the old rule would have put it, and
 * a row with nothing to derive still opens blank for a human to author.
 *
 * `words` may be passed as the target-word ARRAY (locating possible) or as a
 * plain count (sequential only — no words to match against).
 */
function segmentsFromBlocks(blocks, words) {
  const wordList = Array.isArray(words) ? words : null
  const wordCount = wordList ? wordList.length : words

  const usable = (Array.isArray(blocks) ? blocks : [])
    .map((b, order) => ({
      order,
      span: targetWordsOf(b && b.target).length,
      target: b && b.target,
      known: typeof (b && b.known) === 'string' ? b.known : '',
    }))
    .filter(b => b.span >= 1)

  // Fill the columns left to right from a list of blocks, ignoring where their
  // words actually are — the old rule, kept for the blocks that cannot be
  // located and for callers that pass only a count.
  const sequential = (list, limit) => {
    const segments = []
    let claimed = 0
    for (const b of list) {
      if (claimed + b.span > limit) break
      segments.push({ span: b.span, known: b.known })
      claimed += b.span
    }
    for (let i = claimed; i < limit; i++) segments.push({ span: 1, known: '' })
    return segments
  }

  if (!wordList) return sequential(usable, wordCount)

  const claimedBy = new Array(wordCount).fill(-1)
  const placed = new Map()   // start column -> { span, known }
  const unplaced = []

  // Longest first: a block spanning three columns must take them before a
  // one-word block can claim a column from inside it.
  for (const b of [...usable].sort((x, y) => y.span - x.span || x.order - y.order)) {
    const start = locateBlock(wordList, b.target, claimedBy)
    if (start === -1) { unplaced.push(b); continue }
    for (let i = start; i < start + b.span; i++) claimedBy[i] = b.order
    placed.set(start, { span: b.span, known: b.known })
  }

  // Nothing located — the components describe something other than this row's
  // own target text (a LEGO glossed from its components rather than tiled by
  // them). The old sequential start is then the only honest one available.
  if (placed.size === 0) return sequential(usable, wordCount)

  // Walk the columns in target order. A located block emits its own segment;
  // each maximal run of leftover columns emits one segment, and the blocks that
  // could not be located fill those runs in their given order.
  const segments = []
  const leftovers = unplaced.sort((x, y) => x.order - y.order)
  let li = 0
  for (let col = 0; col < wordCount;) {
    const hit = placed.get(col)
    if (hit) { segments.push({ span: hit.span, known: hit.known }); col += hit.span; continue }
    let run = 0
    while (col + run < wordCount && !placed.has(col + run) && claimedBy[col + run] === -1) run++
    if (li < leftovers.length) {
      // An unlocatable block still has a gloss and it has to go somewhere; this
      // run is where the old rule would have put it.
      segments.push({ span: run, known: leftovers[li++].known })
    } else {
      // No gloss for these columns. One column each, never one wide empty
      // chunk: a target word with no gloss must stay visible AND must be able
      // to receive a tile of its own.
      for (let i = 0; i < run; i++) segments.push({ span: 1, known: '' })
    }
    col += run
  }
  return segments
}

/**
 * @returns {{source:'phrase'|'lego', words:string[], segments:Array<{span:number,known:string}>, segmented:boolean}|null}
 */
function glossAlignment(source, targetText, blocks, storedSegments) {
  const words = targetWordsOf(targetText)
  if (words.length < 2) return null

  if (segmentsCoverWords(storedSegments, words.length)) {
    return {
      source,
      words,
      segments: storedSegments.map(s => ({ span: s.span, known: s.known })),
      segmented: true,
    }
  }

  const usable = Array.isArray(blocks) ? blocks : []
  const segments = segmentsFromBlocks(usable, words)
  // Nothing to look at if no column carries any gloss at all.
  if (!segments.some(s => s.known.trim())) return null
  return { source, words, segments, segmented: false }
}

/** An A-LEGO is one word in at least one language, so it cannot be split and
 *  mapped — the declared type IS the splittability test (Tom, 2026-08-13). */
function legoIsMappable(lego) {
  return !!lego && lego.type === 'M'
}

/**
 * Candidacy, not derivation (Tom, 2026-08-13: "it's just classification that
 * feeds the mapping"). A declared M-LEGO with no components has nothing
 * FAITHFUL to derive — but it is splittable by declaration, so the editor must
 * still open on it with empty columns for a human to author. The refusal to
 * guess a split stays exactly where it was: every column starts blank, and
 * nothing here invents a gloss. Returns null when there is no grid to show.
 */
function blankAlignment(source, targetText) {
  const words = targetWordsOf(targetText)
  if (words.length < 2) return null
  return { source, words, segments: words.map(() => ({ span: 1, known: '' })), segmented: false }
}

function mappingFromLego(lego) {
  if (!legoIsMappable(lego)) return null
  return glossAlignment(
    'lego', lego.target_text, lego.components, lego.known_gloss_segments)
    || blankAlignment('lego', lego.target_text)
}

/**
 * Resolve the FULL PARENT SEED SENTENCE for a LEGO id — PURE, unit tested.
 *
 * Parent seed id = first 5 chars of the LEGO id (`S` + 4-digit seed number),
 * per the canonical UID format `^(S\d{4})(?:L|F)\d{2}$`. The seed sentence text
 * lives on the breakdown/seed record as original_target / original_known; pass
 * those in via seedSentenceMap (seedId → record), built by loadSeedSentences.
 *
 * GUARD (edge 3 in SEED_REVIEW_EXTENSION_PLAN): a missing/empty record returns
 * null — callers MUST fall back to a use-phrase, never render an empty seed card.
 */
function seedSentenceFor(legoId, seedSentenceMap) {
  const m = typeof legoId === 'string' ? legoId.match(/^(S\d{4})/) : null
  if (!m) return null
  const seedId = m[1]
  const record = (seedSentenceMap && typeof seedSentenceMap.get === 'function')
    ? seedSentenceMap.get(seedId)
    : null
  if (!record || (!record.original_target && !record.original_known)) return null
  return {
    seedId,
    known_text: record.original_known,
    target_text: record.original_target,
    known_audio_uuid: record.known_audio_uuid || null,
    target1_audio_uuid: record.target1_audio_uuid || null,
    target2_audio_uuid: record.target2_audio_uuid || null,
  }
}

/**
 * Learner audio-completeness gates — PURE, unit tested.
 *
 * The invariant is unchanged from day one: never SCHEDULE an unplayable cycle.
 * What changed on 2026-08-06 (ssi-learning-app 269d2d19, Tom's ruling "always
 * play what it HAS") is the GRANULARITY — these are now per-ITEM tests, not a
 * whole-LEGO filter. A LEGO short of one clip keeps its round and its round
 * NUMBER; only the specific unplayable cycle is skipped.
 *
 * - INTRO plays prompt → target1 → target2 with no pause, so it needs a prompt
 *   clip (presentation audio, or known audio as the documented fallback) and
 *   the first target voice. A missing second voice is a phase the player skips
 *   gracefully (generateLearningScript.ts:1139).
 * - DEBUT asks the learner to produce, so it needs all three (:1140).
 * - Phrases still need all three to enter the BUILD/USE pools (:670-671).
 */
function legoIntroIsPlayable(lego, presentationAudioId) {
  return !!((presentationAudioId || lego.known_audio_uuid) && lego.target1_audio_uuid)
}

function legoDebutIsPlayable(lego) {
  return !!(lego.known_audio_uuid && lego.target1_audio_uuid && lego.target2_audio_uuid)
}

function phraseHasFullAudio(phrase) {
  return !!(phrase.known_audio_uuid && phrase.target1_audio_uuid && phrase.target2_audio_uuid)
}

/**
 * Apply the learner's PHRASE audio gate to the loaded pools — PURE.
 * Phrases missing any of known/target1/target2 never enter the BUILD/USE pools
 * (generateLearningScript.ts:706-711), so they consume no build slot and no
 * review round-robin turn. Original maps are not mutated.
 *
 * There is deliberately no LEGO half any more: the whole-LEGO pre-filter that
 * used to live here dropped a round BEFORE round numbers were assigned, so one
 * audio gap slid every later round down by one and re-paired the entire
 * Fibonacci review schedule. Intro/debut playability is now decided per item at
 * emit time (legoIntroIsPlayable / legoDebutIsPlayable).
 */
function applyLearnerPhraseAudioGate(buildMap, useMap) {
  const gateMap = (map) => {
    const out = new Map()
    for (const [key, phrases] of map.entries()) {
      const kept = phrases.filter(phraseHasFullAudio)
      if (kept.length > 0) out.set(key, kept)
    }
    return out
  }

  return {
    buildMap: gateMap(buildMap),
    useMap: gateMap(useMap),
  }
}

/**
 * ---------------------------------------------------------------------------
 * Player-delivery annotation — PURE, unit tested.
 * ---------------------------------------------------------------------------
 * The Script Viewer always shows the FULL intended course. These helpers say,
 * per row and per round, whether the live player can actually deliver it today,
 * so a reviewer sees the gap without the row disappearing.
 *
 * Mirrors the learner's per-ITEM gates (generateLearningScript.ts, as of
 * 269d2d19 2026-08-06):
 * - :1139 an INTRO needs a prompt clip (presentation, or known as the
 *         documented fallback) plus target1, else that intro alone is skipped.
 * - :1140 a DEBUT needs all three voices, else that debut alone is skipped.
 * - :706  phrases missing any of the three never enter the BUILD/USE pools →
 *         build / consolidate / use-phrase review rows vanish.
 * - :1277 a seed-phase review needs the seed's target1 audio, else the player
 *         falls back to a use-phrase — the seed row shown here never plays.
 *
 * NOTE what is deliberately absent: there is no whole-round drop and no
 * "reviewed LEGO was dropped" case. Every is_new LEGO now keeps its round, its
 * round NUMBER and its place in legoState, so its later reviews still fire on
 * their own audio.
 */
const AUDIO_ROLE_FIELDS = { known: 'known_audio_uuid', target1: 'target1_audio_uuid', target2: 'target2_audio_uuid' }
const ALL_AUDIO_ROLES = ['known', 'target1', 'target2']

function missingAudioRoles(record, roles = ALL_AUDIO_ROLES) {
  if (!record) return [...roles]
  return roles.filter(role => !record[AUDIO_ROLE_FIELDS[role]])
}

/**
 * Which voices an INTRO is missing — PURE. The prompt clip is presentation
 * audio with known audio as the documented fallback, so 'known' is only
 * reported absent when BOTH are; target2 is not required (the player skips
 * that phase gracefully).
 */
function missingIntroAudioRoles(lego, presentationAudioId) {
  const missing = []
  if (!(presentationAudioId || (lego && lego.known_audio_uuid))) missing.push('known')
  if (!(lego && lego.target1_audio_uuid)) missing.push('target1')
  return missing
}

/**
 * Annotate one round's items — PURE. Returns NEW item objects; never mutates.
 *
 * @param {Array}  items
 * @param {object} ctx
 * @param {object} ctx.lego                 the round's own LEGO record (audio uuids)
 * @param {string} ctx.presentationAudioId  the intro's prompt clip, if any
 */
function annotatePlayerDelivery(items, ctx = {}) {
  const lego = ctx.lego
  const introMissing = missingIntroAudioRoles(lego, ctx.presentationAudioId)
  const debutMissing = missingAudioRoles(lego)

  return (items || []).map(item => {
    // Intro and debut each stand or fall on their own clips — a gap in one
    // costs that cycle only, never the round.
    if (item.type === 'intro') {
      if (introMissing.length === 0) return { ...item, playerCanDeliver: true }
      return { ...item, playerCanDeliver: false, playerDropReason: 'intro-audio', missingAudioRoles: introMissing }
    }

    if (item.type === 'debut') {
      if (debutMissing.length === 0) return { ...item, playerCanDeliver: true }
      return { ...item, playerCanDeliver: false, playerDropReason: 'debut-audio', missingAudioRoles: debutMissing }
    }

    // Seed-sentence reviews need only the seed's target1; without it the
    // player silently substitutes a use-phrase, so this row never plays.
    const roles = (item.type === 'review' && item.reviewItemKind === 'seed') ? ['target1'] : ALL_AUDIO_ROLES
    const missing = missingAudioRoles(item, roles)
    if (missing.length === 0) return { ...item, playerCanDeliver: true }

    return {
      ...item,
      playerCanDeliver: false,
      playerDropReason: (item.type === 'review' && item.reviewItemKind === 'seed') ? 'seed-audio' : 'phrase-audio',
      missingAudioRoles: missing,
    }
  })
}

/**
 * Assign round numbers to a LEGO walk — PURE, unit tested.
 * Mirrors the generator walk's numbering: every is_new LEGO takes the next
 * consecutive round; non-new LEGOs are skipped without consuming a number.
 * Audio never enters this: a LEGO short of a clip still takes its number, in
 * both views, exactly as the player does since 2026-08-06. Never pre-filter
 * the walk by audio again — that is what slid every later round down by one.
 */
function numberRounds(legoRecords, startRound = 0) {
  let n = startRound
  const numbered = []
  for (let i = 0; i < legoRecords.length; i++) {
    const rec = legoRecords[i]
    if (!rec.lego.new) continue
    n++
    numbered.push({ record: rec, roundNumber: n, sourceIndex: i })
  }
  return numbered
}

/**
 * Load ALL unique LEGOs for a course
 * Returns deduplicated LEGOs in seed/lego order
 */
async function loadAllUniqueLegos(supabase, courseCode, maxLegos = 1000, offset = 0) {
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('course_legos')
      .select('*')
      .eq('course_code', courseCode)
      .order('seed_number', { ascending: true })
      .order('lego_index', { ascending: true })

    if (error) {
      logger.error('Query error:', error)
      return []
    }

    if (!data || data.length === 0) {
      logger.warn(`No LEGOs found for course: ${courseCode}`)
      return []
    }

    // Deduplicate by lego_id - keep only first occurrence
    // Also filter out is_new=false LEGOs since they generate no rounds
    const seenLegos = new Set()
    const uniqueRecords = data.filter(record => {
      if (seenLegos.has(record.lego_id)) return false
      seenLegos.add(record.lego_id)
      return record.is_new !== false
    })

    logger.info(`Loaded ${uniqueRecords.length} unique LEGOs for ${courseCode}`)

    return uniqueRecords.slice(offset, offset + maxLegos).map(record => {
      const seedId = `S${String(record.seed_number).padStart(4, '0')}`
      return {
        lego: {
          id: record.lego_id,
          type: record.type || 'A',
          new: record.is_new || false,
          known_text: record.known_text,
          target_text: record.target_text,
          known_audio_uuid: record.known_audio_id,
          target1_audio_uuid: record.target1_audio_id,
          target2_audio_uuid: record.target2_audio_id,
          known_duration_ms: null,
          target1_duration_ms: record.target1_duration_ms,
          target2_duration_ms: record.target2_duration_ms,
          // M-LEGO internal tiling — carried so intro/debut rows can derive a
          // starting gloss alignment. NULL on every A-LEGO.
          components: record.components || null,
          known_gloss_segments: record.known_gloss_segments || null,
        },
        seed: {
          seed_id: seedId,
          seed_number: record.seed_number,
        },
        lego_index: record.lego_index,
      }
    })
  } catch (err) {
    logger.error('Failed to load unique LEGOs:', err)
    return []
  }
}

/**
 * Load ALL practice phrases grouped by LEGO
 * Returns buildMap, useMap, and componentMap
 * (componentMap is informational only — component cycles are NEVER emitted;
 * the learner shows components as visual tiles, not audio cycles.)
 */
async function loadAllPracticePhrasesGrouped(supabase, courseCode) {
  const buildMap = new Map()
  const useMap = new Map()
  const componentMap = new Map()

  if (!supabase) return { buildMap, useMap, componentMap }

  try {
    let allData = []
    let offset = 0
    const pageSize = 1000

    while (true) {
      const { data: page, error } = await supabase
        .from('course_practice_phrases')
        .select('*')
        .eq('course_code', courseCode)
        .gte('position', 1)
        .order('seed_number', { ascending: true })
        .order('lego_index', { ascending: true })
        .order('position', { ascending: true })
        .range(offset, offset + pageSize - 1)

      if (error) {
        logger.error('Query error:', error)
        return { buildMap, useMap, componentMap }
      }

      if (!page || page.length === 0) break
      allData = allData.concat(page)
      if (page.length < pageSize) break
      offset += pageSize
    }

    if (allData.length === 0) return { buildMap, useMap, componentMap }

    logger.info(`Loaded ${allData.length} practice phrases from course_practice_phrases`)

    // Group by lego_id (constructed from seed_number + lego_index)
    const grouped = new Map()
    for (const row of allData) {
      const legoId = 'S' + String(row.seed_number).padStart(4, '0') + 'L' + String(row.lego_index).padStart(2, '0')
      if (!grouped.has(legoId)) grouped.set(legoId, [])
      grouped.get(legoId).push(row)
    }

    // Transform and split by phrase_role
    for (const [legoId, rows] of grouped) {
      const allPhrases = rows.map(row => ({
        id: row.id,
        known_text: row.known_text,
        target_text: row.target_text,
        position: row.position,
        phrase_role: row.phrase_role,
        introduce: row.introduce,
        target_syllable_count: row.target_syllable_count,
        known_audio_uuid: row.known_audio_id,
        target1_audio_uuid: row.target1_audio_id,
        target2_audio_uuid: row.target2_audio_id,
        presentation_audio_id: row.presentation_audio_id || null,
        known_duration_ms: null,
        target1_duration_ms: row.target1_duration_ms,
        target2_duration_ms: row.target2_duration_ms,
        // The stored per-chunk known/target breakdown — the LEGO-chunked tiling
        // the player renders. This projection is a fixed shape, not a
        // passthrough: leaving a column out here is exactly why the mapping was
        // absent from every phrase row on the first pass.
        decomposition: row.decomposition || null,
        // The human-made per-target-word gloss alignment, when one exists.
        // Falls back to deriving from decomposition when NULL.
        known_gloss_segments: row.known_gloss_segments || null,
      }))

      const componentPhrases = allPhrases.filter(p => p.phrase_role === 'component')
      if (componentPhrases.length > 0) {
        componentMap.set(legoId, componentPhrases)
      }

      // Separate build, use, and practice (legacy)
      const rawBuild = allPhrases.filter(p => p.phrase_role === 'build')
      const rawUse = allPhrases.filter(p => p.phrase_role === 'use')
      const rawPractice = allPhrases.filter(p => p.phrase_role === 'practice')

      // Reclassify legacy 'practice' phrases (matching learning app logic):
      // If USE exists → practice becomes BUILD (fragments, drill once)
      // If no USE → practice becomes USE (spaced rep material)
      if (rawPractice.length > 0) {
        if (rawUse.length > 0) {
          rawBuild.push(...rawPractice)
        } else {
          rawUse.push(...rawPractice)
        }
      }

      if (rawBuild.length > 0) buildMap.set(legoId, rawBuild)
      if (rawUse.length > 0) useMap.set(legoId, rawUse)
    }

    logger.info(`Grouped into ${buildMap.size} LEGOs with BUILD phrases, ${useMap.size} with USE phrases, ${componentMap.size} with components`)
    return { buildMap, useMap, componentMap }
  } catch (err) {
    logger.error('Error loading practice phrases:', err)
    return { buildMap, useMap, componentMap }
  }
}

/**
 * Load introduction/presentation audio for all LEGOs
 */
async function loadIntroductionAudio(supabase, courseCode, legoIds) {
  const introAudioMap = new Map()
  if (!supabase || legoIds.length === 0) return introAudioMap

  try {
    const BATCH_SIZE = 100

    // Primary: read presentation_audio_id from course_legos
    let allLegoData = []
    for (let i = 0; i < legoIds.length; i += BATCH_SIZE) {
      const batchLegoIds = legoIds.slice(i, i + BATCH_SIZE)
      const { data } = await supabase
        .from('course_legos')
        .select('lego_id, presentation_audio_id')
        .eq('course_code', courseCode)
        .in('lego_id', batchLegoIds)
        .not('presentation_audio_id', 'is', null)

      if (data) allLegoData = allLegoData.concat(data)
    }

    if (allLegoData.length > 0) {
      for (const lego of allLegoData) {
        introAudioMap.set(lego.lego_id, {
          id: lego.presentation_audio_id,
          s3_key: null
        })
      }
      logger.info(`Loaded ${introAudioMap.size} intro audio from course_legos`)
    }

    // Fallback: lego_introductions table (legacy courses like Welsh)
    if (introAudioMap.size === 0) {
      let allIntroData = []
      for (let i = 0; i < legoIds.length; i += BATCH_SIZE) {
        const batchLegoIds = legoIds.slice(i, i + BATCH_SIZE)
        const { data: batchIntroData } = await supabase
          .from('lego_introductions')
          .select('lego_id, audio_uuid, presentation_audio_id')
          .eq('course_code', courseCode)
          .in('lego_id', batchLegoIds)

        if (batchIntroData) allIntroData = allIntroData.concat(batchIntroData)
      }

      if (allIntroData.length > 0) {
        const v13Entries = allIntroData.filter(i => i.presentation_audio_id)
        const legacyEntries = allIntroData.filter(i => !i.presentation_audio_id && i.audio_uuid)

        for (const intro of v13Entries) {
          introAudioMap.set(intro.lego_id, {
            id: intro.presentation_audio_id,
            s3_key: null
          })
        }

        for (const intro of legacyEntries) {
          introAudioMap.set(intro.lego_id, {
            id: intro.audio_uuid,
            s3_key: `mastered/${intro.audio_uuid.toUpperCase()}.mp3`
          })
        }

        logger.info(`Loaded ${introAudioMap.size} intro audio from lego_introductions (legacy)`)
      }
    }
  } catch (err) {
    logger.warn('Failed to load intro audio:', err)
  }

  return introAudioMap
}

/**
 * Load parent SEED SENTENCES for a course, keyed by seed id (S + 4-digit
 * seed_number). The seed sentence text is course_seeds.{known_text,target_text}
 * — surfaced here under the original_known / original_target names the seed
 * helper expects (the breakdown record fields in SEED_REVIEW_EXTENSION_PLAN A1).
 * Used by the seed-sentence review phase (skip offset >= SEED_PHASE_START_OFFSET).
 */
async function loadSeedSentences(supabase, courseCode) {
  const map = new Map()
  if (!supabase) return map

  try {
    const { data, error } = await supabase
      .from('course_seeds')
      .select('seed_number, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id')
      .eq('course_code', courseCode)
      .order('seed_number', { ascending: true })

    if (error) {
      logger.warn(`Failed to load seed sentences for ${courseCode}: ${error.message} — seed-phase reviews will fall back to use-phrases.`)
      return map
    }

    for (const row of (data || [])) {
      const seedId = 'S' + String(row.seed_number).padStart(4, '0')
      map.set(seedId, {
        original_known: row.known_text,
        original_target: row.target_text,
        known_audio_uuid: row.known_audio_id,
        target1_audio_uuid: row.target1_audio_id,
        target2_audio_uuid: row.target2_audio_id,
      })
    }
    logger.info(`Loaded ${map.size} seed sentences for ${courseCode}`)
  } catch (err) {
    logger.warn(`loadSeedSentences threw: ${err.message} — seed-phase reviews will fall back to use-phrases.`)
  }

  return map
}

/**
 * The course's KNOWN language — the side the known-side review filter counts.
 *
 * Same read the learner app makes (courses.known_lang). Any failure returns
 * null, which makes the filter declare itself inert and warn rather than guess
 * a language; a wrong-language syllable count is worse than no count, because
 * it produces a plausible number nobody checks.
 */
async function loadCourseKnownLang(supabase, courseCode) {
  if (!supabase) return null
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('known_lang')
      .eq('course_code', courseCode)
      .limit(1)
    if (error) {
      logger.warn(`Could not read courses.known_lang for ${courseCode} (${error.message}) — the known-side review filter will be inert.`)
      return null
    }
    return (data && data[0] && data[0].known_lang) || null
  } catch (err) {
    logger.warn(`loadCourseKnownLang threw for ${courseCode} (${err.message}) — the known-side review filter will be inert.`)
    return null
  }
}

/**
 * Generate the complete learning script with ROUNDs and spaced repetition.
 *
 * Mirrors generateLearningScript.ts in ssi-learning-app:
 * - Deterministic (no randomness)
 * - Round shape + spaced-rep offsets from algorithm_config.script_shape
 * - BUILD first, then USE fill (BUILD fills the quota, CONSOLIDATE reuses if needed)
 * - Round-robin REVIEW selection; graduated seeds excluded from REVIEW
 * - No component priming / listening clusters / pod laps (see header)
 *
 * @param {object} options
 * @param {boolean} options.learnerView  Apply the learner's audio gates PER
 *   ITEM: skip the specific unplayable intro/debut cycle and any unvoiced
 *   phrase, keeping every round's number and everything else it has — exactly
 *   what the player does since 2026-08-06. Default false = production view
 *   (gaps shown, flagged).
 */
async function generateLearningScript(supabase, courseCode, maxLegos = 50, offset = 0, options = {}) {
  if (!supabase) {
    logger.warn('No Supabase client available')
    return { rounds: [], allItems: [], stats: {} }
  }

  const learnerView = !!options.learnerView
  const startTime = Date.now()

  // Live round shape — same table/key the learner app reads. `mode` selects
  // which mode row layers its scriptShape override on top of the global one;
  // defaults to fast, which is the old normal_mode behaviour unchanged.
  const mode = options.mode || DEFAULT_MODE
  const {
    scriptShape, listening, scriptShapeSource, maxPhraseLengthFraction,
    reviewMaxKnownSyllables, reviewFilterMaxRound, filterBuildPhrases,
    phraseRepeatCount, repeatedCycleTypes,
  } = await loadAlgorithmConfig(supabase, mode)
  const SPACED_REP_OFFSETS = scriptShape.spacedRepOffsets
  const MAX_BUILD_PHRASES = scriptShape.maxBuildPhrases
  const CONSOLIDATE_COUNT = scriptShape.useConsolidationCount
  const MAX_SPACED_REP_PHRASES = scriptShape.maxSpacedRepPhrases
  const N1_PHRASE_COUNT = scriptShape.n1PhraseCount
  // Phrase length: sorting is shortest-first, always, exactly as it has always
  // been. A mode shortens its phrases with the CAP (maxPhraseLengthFraction),
  // not by reordering. Fast ships 1.0 = uncapped = untouched.
  const syllablesOf = p => p.target_syllable_count || countTargetSyllables(p.target_text)
  const byPhraseLength = (a, b) => syllablesOf(a) - syllablesOf(b)

  // Pre-load extra LEGOs before offset for spaced-rep lookback
  // (max offset = 89 with the live config, 55 with the fallback)
  const maxFibLookback = Math.max(...SPACED_REP_OFFSETS)
  const lookbackStart = Math.max(0, offset - maxFibLookback)
  const lookbackCount = offset - lookbackStart  // how many extra LEGOs to pre-process
  const totalToLoad = lookbackCount + maxLegos

  // Load the FULL unique-LEGO list, then window it. The list is never gated by
  // audio: every is_new LEGO takes a round and a round NUMBER whatever its
  // clips, in both views, exactly as the player now does.
  const allLegoRecords = await loadAllUniqueLegos(supabase, courseCode, Number.MAX_SAFE_INTEGER, 0)
  if (allLegoRecords.length === 0) {
    return { rounds: [], allItems: [], stats: { legosLoaded: 0 } }
  }

  // The round number the LEARNER sees. Since 2026-08-06 an audio gap costs no
  // round number, so this is simply the course-wide walk — kept as an explicit
  // course-wide computation (rather than reusing the windowed `n`) so it stays
  // correct for paginated windows and so any future divergence has one home.
  const playerRoundNumbers = new Map()
  for (const { record, roundNumber } of numberRounds(allLegoRecords)) {
    playerRoundNumbers.set(record.lego.id, roundNumber)
  }

  let { buildMap, useMap } = await loadAllPracticePhrasesGrouped(supabase, courseCode)

  let phrasesDroppedForAudio = 0
  if (learnerView) {
    const countPhrases = (m) => { let c = 0; for (const arr of m.values()) c += arr.length; return c }
    const phrasesBefore = countPhrases(buildMap) + countPhrases(useMap)
    const gated = applyLearnerPhraseAudioGate(buildMap, useMap)
    buildMap = gated.buildMap
    useMap = gated.useMap
    phrasesDroppedForAudio = phrasesBefore - (countPhrases(buildMap) + countPhrases(useMap))
    if (phrasesDroppedForAudio > 0) {
      logger.info(`Learner view: skipped ${phrasesDroppedForAudio} phrases awaiting audio (their rounds still play)`)
    }
  }

  // Absolute syllable ceiling for this run: a fraction of the longest phrase in
  // the WHOLE course. Fast ships fraction 1.0 -> Infinity -> the historic
  // uncapped path, untouched. Computed once, after the learner-view audio gate
  // so a gated run measures the pool the learner actually sees.
  const phraseLengthLimit = maxPhraseLengthFraction >= 1
    ? Infinity
    : courseMaxPhraseLength([...buildMap.values(), ...useMap.values()]) * maxPhraseLengthFraction
  if (Number.isFinite(phraseLengthLimit)) {
    logger.info(`Mode '${mode}': phrase length capped at ${phraseLengthLimit.toFixed(0)} chars of target text (${Math.round(maxPhraseLengthFraction * 100)}% of the course's longest phrase)`)
  }
  if (phraseRepeatCount > 1) {
    logger.info(`Mode '${mode}': every ${[...repeatedCycleTypes].sort().join('/')} cycle plays ${phraseRepeatCount}x back to back, so a round is about ${phraseRepeatCount} times its single-play length.`)
  }
  // "No filtering on BLD phrases" (Tom, 2026-08-07). Easy passes
  // filterBuildPhrases:false and keeps its whole BUILD pool; passing Infinity
  // rather than branching keeps the sort in one place, because
  // applyPhraseLengthCap with no finite limit IS the plain historic pool.
  const buildLengthLimit = filterBuildPhrases ? phraseLengthLimit : Infinity
  if (!filterBuildPhrases && Number.isFinite(phraseLengthLimit)) {
    logger.info(`Mode '${mode}': BUILD phrases are NOT length-filtered — the cap above applies to USE pools only.`)
  }

  // The KNOWN-side pull filter on REVIEW and CONSOLIDATE slots (Tom,
  // 2026-08-07: "the syllable cap, as measured in the known language"). It
  // counts the learner's own language with the per-language registry, applies
  // to the pull rather than the whole script, and lifts after
  // reviewFilterMaxRound. The target-side ceiling it replaced is gone; do not
  // bring it back.
  let reviewPullFilter = null
  if (Number.isFinite(reviewMaxKnownSyllables)) {
    const knownLang = await loadCourseKnownLang(supabase, courseCode)
    const resolver = makeKnownSyllableResolver(knownLang)
    if (resolver.countable) {
      reviewPullFilter = {
        limit: reviewMaxKnownSyllables,
        maxRound: reviewFilterMaxRound,
        syllablesOf: p => resolver.syllablesOf(p),
      }
      logger.info(`Mode '${mode}': review and consolidate pulls prefer phrases of <=${reviewMaxKnownSyllables} known-language syllables (${resolver.lang}) up to round ${reviewFilterMaxRound}, then the filter lifts.`)
    } else {
      // Loud inertness. The retired target-side ceiling failed silently on most
      // of the estate; this one says so instead.
      logger.warn(`Mode '${mode}': the known-side syllable filter is INERT for ${courseCode} — no syllable counter registered for known language '${resolver.lang || '(unknown)'}'. Review and consolidate pulls are NOT filtered; maxPhraseLengthFraction is the only length control in force. Add a counter to tools/lib/syllable-counters.cjs and mirror it into the learning app's packages/core/src/text/syllables.ts.`)
    }
  }

  const legos = allLegoRecords.slice(lookbackStart, lookbackStart + totalToLoad)
  if (legos.length === 0) {
    return { rounds: [], allItems: [], stats: { legosLoaded: 0 } }
  }

  const legoIds = legos.map(l => l.lego.id)
  const introAudioMap = await loadIntroductionAudio(supabase, courseCode, legoIds)

  // Parent seed sentences for the extended (post-89) spaced-rep phase: a review
  // whose skip offset reaches SEED_PHASE_START_OFFSET shows the seed sentence
  // instead of a use-phrase. Loaded once, keyed by seed id.
  const seedSentenceMap = await loadSeedSentences(supabase, courseCode)

  // Graduation tracking (spaced-rep exclusion only — NO listening emission).
  // Mirrors the learner: graduation is anchored to absolute LEGO position in
  // the course catalogue (ALL course_legos rows, duplicates included), not to
  // chunk-local round numbers (generateLearningScript.ts:899-922,1433-1441).
  const seedLastLegoOrdinal = new Map()  // seedNum → ordinal of its highest-index LEGO
  const legoOrdinalMap = new Map()       // legoId → ordinal
  if (listening.enabled) {
    const { data: catRows, error: catErr } = await supabase
      .from('course_legos')
      .select('seed_number, lego_index')
      .eq('course_code', courseCode)
      .order('seed_number', { ascending: true })
      .order('lego_index', { ascending: true })
      .limit(10000)
    if (catErr) {
      logger.warn('Failed to load LEGO catalogue for graduation tracking:', catErr.message)
    }
    let ord = 0
    for (const row of (catRows || [])) {
      ord++
      const k = 'S' + String(row.seed_number).padStart(4, '0') + 'L' + String(row.lego_index).padStart(2, '0')
      legoOrdinalMap.set(k, ord)
      // Final write per seed wins → the seed's last-LEGO ordinal
      seedLastLegoOrdinal.set(row.seed_number, ord)
    }
  }
  let currentLegoOrdinal = 0
  const graduatedSeeds = new Set()

  const rounds = []
  const allItems = []

  // Normalization helpers (matching learning app)
  const normalizePhrase = (text) => text?.toLowerCase().trim().replace(/[.,!?;:¡¿'"]+/g, '') || ''
  const getPhraseId = (knownText, targetText) => `${normalizePhrase(knownText)}|${normalizePhrase(targetText)}`

  // legoState map: tracks lastRound and useIndex per LEGO for deterministic REVIEW
  const legoState = new Map()

  // Walk numbering — every is_new LEGO takes the next consecutive round.
  // numberRounds is the pure helper that owns the compression behaviour.
  const numbered = numberRounds(legos, lookbackStart)

  // Carries the last deduped row ACROSS rounds — learner view only (see the
  // dedup block below for why the two views differ here).
  let lastDedupItem = null

  for (const { record: currentLego, roundNumber: n, sourceIndex } of numbered) {
    const currentBuildPhrases = buildMap.get(currentLego.lego.id) || []
    const currentUsePhrases = useMap.get(currentLego.lego.id) || []
    const roundItems = []
    const usedPhrasesInRound = new Set()

    const baseItem = {
      roundNumber: n,
      legoId: currentLego.lego.id,
      legoIndex: sourceIndex + 1,
      seedId: currentLego.seed.seed_id,
      seedNumber: currentLego.seed.seed_number,
      legoType: currentLego.lego.type,
      isNew: currentLego.lego.new,
    }

    // Phase 1: INTRO — standard presentation for ALL LEGOs.
    // NO component priming: COMPONENTS ARE NEVER INTRODUCED (Tom, 2026-08-06 —
    // "Components do NOT get introduced"). The learner never plays
    // component_intro / component_practice cycles; components are visual ghost
    // tiles on the intro/debut cards only. The cycles API in ssi-learning-app
    // diverged from this between 2026-08-04 and 2026-08-06 and was corrected.
    const introAudio = introAudioMap.get(currentLego.lego.id) || null
    // Learner view: mirror the learner's fallback — when presentation audio is
    // missing the intro still plays the LEGO via known audio (:1199-1202).
    const effectiveIntroAudio = (learnerView && !introAudio && currentLego.lego.known_audio_uuid)
      ? { id: currentLego.lego.known_audio_uuid, s3_key: null }
      : introAudio

    // Per-ITEM audio gate in learner view: an unplayable intro or debut is
    // skipped ON ITS OWN. The round keeps its number and its other cycles.
    const introPlayable = legoIntroIsPlayable(currentLego.lego, introAudio && introAudio.id)
    const debutPlayable = legoDebutIsPlayable(currentLego.lego)

    if (!learnerView || introPlayable) {
      roundItems.push({
        ...baseItem,
        type: 'intro',
        known_text: currentLego.lego.known_text,
        target_text: currentLego.lego.target_text,
        presentation_audio: effectiveIntroAudio,
        target1_audio_uuid: currentLego.lego.target1_audio_uuid,
        target2_audio_uuid: currentLego.lego.target2_audio_uuid,
        hasAudio: !!(effectiveIntroAudio && currentLego.lego.target1_audio_uuid),
        // The ONLY row that carries a mapping (Tom, 2026-08-13: "it's only the
        // INTROS that need mapping - no regular phrases need the mapping"), and
        // only an M-LEGO's intro at that — an A-LEGO cannot be split, so it can
        // never be mapped. The intro's mapping is the feed for the learner's
        // tile assembler, so it is the one place authoring it changes what a
        // learner sees. The debut renders the same LEGO from the same row, so
        // authoring here covers it too without a second glyph saying the same
        // thing twice.
        mapping: mappingFromLego(currentLego.lego),
      })
    }

    // Phase 2: DEBUT
    if (!learnerView || debutPlayable) {
      roundItems.push({
        ...baseItem,
        type: 'debut',
        known_text: currentLego.lego.known_text,
        target_text: currentLego.lego.target_text,
        known_audio_uuid: currentLego.lego.known_audio_uuid,
        target1_audio_uuid: currentLego.lego.target1_audio_uuid,
        target2_audio_uuid: currentLego.lego.target2_audio_uuid,
        hasAudio: !!(currentLego.lego.known_audio_uuid && currentLego.lego.target1_audio_uuid),
      })
    }
    // The debut IS the bare LEGO — claim it whether or not it was emitted, so
    // no later phase replays it (learner parity, :1191).
    usedPhrasesInRound.add(getPhraseId(currentLego.lego.known_text, currentLego.lego.target_text))

    // Phase 3: BUILD — BUILD phrases first, sorted by syllable count
    // NO substring gate — learner-app parity. The learner (generateLearningScript.ts /
    // CourseDataProvider) selects phrases purely by seed_number+lego_index with NO
    // phraseContainsLegoChars filter. This .cjs is the dashboard MIRROR; gating here had
    // DIVERGED from the learner and hid legitimately word-order-inverted phrases (e.g.
    // Croatian clitic inversion: LEGO "sličan si" vs phrase "...si sličan..."), so they were
    // invisible/uneditable in Script View though the learner plays them. Do NOT re-add this
    // filter to "match the app" — the app has no such gate; removing it IS the parity fix.
    // Length cap first (Easy halves the longest phrase available for this
    // LEGO; Fast is uncapped), then the historic shortest-first sort. The cap
    // yields to the phrase floor rather than starving the round. Easy sets
    // filterBuildPhrases:false, which makes buildLengthLimit Infinity and
    // hands the whole BUILD pool through untouched.
    const sortedBuildPhrases = applyPhraseLengthCap(
      currentBuildPhrases, buildLengthLimit, phraseLengthOf, MIN_BUILD_PHRASES_AFTER_CAP
    ).slice().sort(byPhraseLength)

    let practiceCount = 0

    for (const phrase of sortedBuildPhrases) {
      if (practiceCount >= MAX_BUILD_PHRASES) break
      const phraseId = getPhraseId(phrase.known_text, phrase.target_text)
      if (usedPhrasesInRound.has(phraseId)) continue

      roundItems.push({
        ...baseItem,
        type: 'build',
        phrasePosition: practiceCount + 1,
        phrase_id: phrase.id,
        known_text: phrase.known_text,
        target_text: phrase.target_text,
        known_audio_uuid: phrase.known_audio_uuid,
        target1_audio_uuid: phrase.target1_audio_uuid,
        target2_audio_uuid: phrase.target2_audio_uuid,
        hasAudio: !!(phrase.known_audio_uuid && phrase.target1_audio_uuid),
      })
      usedPhrasesInRound.add(phraseId)
      practiceCount++
    }

    // Step 2: Reserve USE phrases for consolidation BEFORE using them for BUILD padding
    // Same cap + historic sort, at the USE floor.
    const sortedUsePhrases = applyPhraseLengthCap(
      currentUsePhrases, phraseLengthLimit, phraseLengthOf, MIN_USE_PHRASES_AFTER_CAP
    ).slice().sort(byPhraseLength)

    // Step 3: Fill remaining BUILD slots with USE phrases (BUILD priority > CONSOLIDATE)
    // CONSOLIDATE can repeat BUILD phrases if needed — filling the BUILD quota is non-negotiable
    for (const phrase of sortedUsePhrases) {
      if (practiceCount >= MAX_BUILD_PHRASES) break
      const phraseId = getPhraseId(phrase.known_text, phrase.target_text)
      if (usedPhrasesInRound.has(phraseId)) continue

      roundItems.push({
        ...baseItem,
        type: 'build',
        phrasePosition: practiceCount + 1,
        phrase_id: phrase.id,
        known_text: phrase.known_text,
        target_text: phrase.target_text,
        known_audio_uuid: phrase.known_audio_uuid,
        target1_audio_uuid: phrase.target1_audio_uuid,
        target2_audio_uuid: phrase.target2_audio_uuid,
        hasAudio: !!(phrase.known_audio_uuid && phrase.target1_audio_uuid),
      })
      usedPhrasesInRound.add(phraseId)
      practiceCount++
    }

    // Initialize legoState for this LEGO (before REVIEW so it's available for future rounds)
    legoState.set(currentLego.lego.id, {
      lastRound: n,
      usePhrases: [...currentUsePhrases],
      useIndex: 0,
      legoId: currentLego.lego.id,
      lego: currentLego,
    })

    // Update absolute LEGO ordinal for graduation tracking (catalogue lookup,
    // NOT round number — mirrors generateLearningScript.ts:1326)
    currentLegoOrdinal = legoOrdinalMap.get(currentLego.lego.id) ?? currentLegoOrdinal

    // Phase 4: REVIEW — spaced repetition at the live config offsets
    const reviews = calculateSpacedRepReviews(n, SPACED_REP_OFFSETS)
    const reviewIndices = []
    let reviewCount = 0
    const seenReviewLegos = new Set()

    for (const review of reviews) {
      if (reviewCount >= MAX_SPACED_REP_PHRASES) break

      const reviewRound = review.legoIndex

      // Find which LEGO was introduced at that round via legoState
      let reviewLegoState = null
      for (const [, state] of legoState.entries()) {
        if (state.lastRound === reviewRound) {
          reviewLegoState = state
          break
        }
      }

      if (!reviewLegoState) continue
      const reviewOffset = n - review.legoIndex
      // Graduated seeds drop out of USE-PHRASE review but stay eligible for
      // SEED-PHASE production review (offset >= SEED_PHASE_START_OFFSET) —
      // nothing truly retires (generateLearningScript.ts:1251,1439).
      if (graduatedSeeds.has(reviewLegoState.lego.seed.seed_number) && !reviewItemIsSeed(reviewOffset)) continue
      if (seenReviewLegos.has(reviewLegoState.legoId)) continue
      seenReviewLegos.add(reviewLegoState.legoId)

      // Seed-sentence phase: once the skip offset reaches SEED_PHASE_START_OFFSET
      // (144+), the review item switches from a use-phrase to the FULL PARENT
      // SEED SENTENCE. The 89-step stays a use-phrase. Clustering (successive
      // LEGOs crossing the threshold => same seed a few rounds running) is
      // DESIRED — no de-clustering/dedup here. Falls back to the use-phrase path
      // if the seed record is missing (never render an empty seed card).
      //
      // Learner view also honours the player's seed-audio gate
      // (generateLearningScript.ts:1316): without the seed's first target voice
      // the player falls back to a use-phrase, so the preview must too — else
      // it shows a review cycle the learner never hears, and counts a round as
      // playable that the player finds empty.
      if (reviewItemIsSeed(reviewOffset)) {
        const seed = seedSentenceFor(reviewLegoState.legoId, seedSentenceMap)
        if (seed && (!learnerView || seed.target1_audio_uuid)) {
          const seedPhraseId = getPhraseId(seed.known_text, seed.target_text)
          reviewIndices.push(review.legoIndex)
          if (!usedPhrasesInRound.has(seedPhraseId)) {
            usedPhrasesInRound.add(seedPhraseId)
            roundItems.push({
              roundNumber: n,
              legoId: reviewLegoState.legoId,
              legoIndex: review.legoIndex,
              seedId: seed.seedId,
              seedNumber: reviewLegoState.lego.seed.seed_number,
              type: 'review',
              reviewItemKind: 'seed',
              reviewOf: review.legoIndex,
              fibonacciPosition: review.fibPosition,
              reviewOffset,
              isFirstRevisit: false,
              known_text: seed.known_text,
              target_text: seed.target_text,
              known_audio_uuid: seed.known_audio_uuid,
              target1_audio_uuid: seed.target1_audio_uuid,
              target2_audio_uuid: seed.target2_audio_uuid,
              hasAudio: !!(seed.known_audio_uuid && seed.target1_audio_uuid),
            })
            reviewCount++
          }
          continue
        }
        if (!seed) {
          logger.warn(`Seed-phase review (offset ${reviewOffset}) for ${reviewLegoState.legoId} has no parent seed sentence (${reviewLegoState.legoId.slice(0, 5)}) — falling back to use-phrase.`)
        }
      }

      if (reviewLegoState.usePhrases.length === 0) continue

      // The known-side pull filter (Tom, 2026-08-07): early rounds draw from
      // the short end of the basket, measured in the LEARNER'S language. Past
      // the configured round the whole basket is back in play. The filter can
      // never empty the pool — it falls back to the basket's shortest phrase —
      // so no LEGO loses a review to it.
      const reviewPool = filterReviewPool(reviewLegoState.usePhrases, n, reviewPullFilter)

      const isN1 = review.legoIndex === n - 1
      const targetPhraseCount = isN1 ? N1_PHRASE_COUNT : 1
      const phrasesToAdd = Math.min(
        targetPhraseCount,
        MAX_SPACED_REP_PHRASES - reviewCount,
        reviewPool.length
      )

      reviewIndices.push(review.legoIndex)

      for (let p = 0; p < phrasesToAdd; p++) {
        // Round-robin selection (deterministic)
        const phrase = reviewPool[reviewLegoState.useIndex % reviewPool.length]
        reviewLegoState.useIndex++

        const phraseId = getPhraseId(phrase.known_text, phrase.target_text)
        if (usedPhrasesInRound.has(phraseId)) continue
        usedPhrasesInRound.add(phraseId)

        const reviewLego = reviewLegoState.lego
        roundItems.push({
          roundNumber: n,
          legoId: reviewLegoState.legoId,
          legoIndex: review.legoIndex,
          seedId: reviewLego.seed.seed_id,
          seedNumber: reviewLego.seed.seed_number,
          type: 'review',
          reviewOf: review.legoIndex,
          fibonacciPosition: review.fibPosition,
          isFirstRevisit: isN1,
          phrase_id: phrase.id,
          known_text: phrase.known_text,
          target_text: phrase.target_text,
          known_audio_uuid: phrase.known_audio_uuid,
          target1_audio_uuid: phrase.target1_audio_uuid,
          target2_audio_uuid: phrase.target2_audio_uuid,
          hasAudio: !!(phrase.known_audio_uuid && phrase.target1_audio_uuid),
        })
        reviewCount++
      }
    }

    // Phase 5: CONSOLIDATE — prefer unused USE phrases, allow reuse if pool exhausted
    let consolidateCount = 0
    const emitConsolidate = (phrase) => {
      consolidateCount++
      roundItems.push({
        ...baseItem,
        type: 'consolidate',
        consolidateIndex: consolidateCount,
        phrase_id: phrase.id,
        known_text: phrase.known_text,
        target_text: phrase.target_text,
        known_audio_uuid: phrase.known_audio_uuid,
        target1_audio_uuid: phrase.target1_audio_uuid,
        target2_audio_uuid: phrase.target2_audio_uuid,
        hasAudio: !!(phrase.known_audio_uuid && phrase.target1_audio_uuid),
      })
    }
    // Consolidate is a REVIEW-class pull, so it takes the same known-side
    // filter as the spaced-rep block above.
    const consolidatePool = filterReviewPool(sortedUsePhrases, n, reviewPullFilter)
    // First pass: unused USE phrases
    for (const phrase of consolidatePool) {
      if (consolidateCount >= CONSOLIDATE_COUNT) break
      const phraseId = getPhraseId(phrase.known_text, phrase.target_text)
      if (usedPhrasesInRound.has(phraseId)) continue
      usedPhrasesInRound.add(phraseId)
      emitConsolidate(phrase)
    }
    // Second pass: reuse USE phrases already used in BUILD (pool was too small)
    if (consolidateCount < CONSOLIDATE_COUNT) {
      for (const phrase of consolidatePool) {
        if (consolidateCount >= CONSOLIDATE_COUNT) break
        emitConsolidate(phrase)
      }
    }

    // Graduation check AFTER the round's content (mirrors learner ordering,
    // generateLearningScript.ts:1433-1441 — the final in-window review at the
    // max offset fires BEFORE its seed graduates). NO listening emission here:
    // L1 lives in Listening MODE, pods are runtime-scheduled per-learner.
    if (listening.enabled) {
      for (const [sNum, lastOrd] of seedLastLegoOrdinal) {
        if (graduatedSeeds.has(sNum)) continue
        if (currentLegoOrdinal === 0) continue
        if (currentLegoOrdinal - lastOrd < listening.offset) continue
        graduatedSeeds.add(sNum)
      }
    }

    // Remove consecutive duplicates.
    //
    // SCOPE differs by view, deliberately. The learner's dedup runs over the
    // WHOLE item stream (generateLearningScript.ts:1642-1660), so a sentence
    // repeated across a round boundary — a seed-phase review of the same seed
    // in successive rounds, which the clustering rule makes common — is
    // dropped, and a round left with only that duplicate never plays. Learner
    // view carries lastItem across rounds to match exactly. The production
    // view keeps the per-round scope: it shows the intended course, and a row
    // a reviewer may need to edit must not vanish because the previous round
    // happened to end with the same sentence.
    const dedupedItems = []
    let lastItem = learnerView ? lastDedupItem : null

    for (const item of roundItems) {
      if (item.type === 'intro' || item.type === 'debut') {
        dedupedItems.push(item)
        continue
      }

      if (lastItem) {
        const sameKnown = normalizePhrase(item.known_text) === normalizePhrase(lastItem.known_text)
        const sameTarget = normalizePhrase(item.target_text) === normalizePhrase(lastItem.target_text)
        if (sameKnown && sameTarget) continue
      }

      dedupedItems.push(item)
      lastItem = item
    }
    lastDedupItem = lastItem

    // ── EASY doubling (Tom, 2026-08-07) ──────────────────────────────────────
    // "in EASY mode, double up every phrase, every BLD, every USE, every
    // REVIEW, every CONSOLIDATE". Script View must show the round the learner
    // actually hears, so it repeats the same cycles, by the same rule, at the
    // same point in the pipeline as the learner's repeatPhraseCycles: AFTER the
    // consecutive-duplicate pass above, which would otherwise strip the second
    // copy on sight. Both the count and the eligible types come off the mode
    // row; Fast's count of 1 returns the list untouched.
    //
    // Cross-round dedup state (`lastDedupItem`) is deliberately taken from the
    // list BEFORE doubling: a repeat is byte-identical to the item it follows,
    // so either choice compares the same, and reading it pre-doubling keeps the
    // learner-parity carry-over exactly as it was.
    const playedItems = repeatPhraseCycles(dedupedItems, {
      count: phraseRepeatCount,
      types: repeatedCycleTypes,
    })

    // Only emit rounds past the lookback range (i.e. at the requested offset)
    if (n > offset) {
      // Annotate reality on top of intent — never filters, only labels.
      const annotatedItems = annotatePlayerDelivery(playedItems, {
        lego: currentLego.lego,
        presentationAudioId: introAudio && introAudio.id,
      })
      const undeliverableItemCount = annotatedItems.filter(i => i.playerCanDeliver === false).length
      // The player emits this round unless it has nothing playable at all — the
      // learner's `cycles.length === 0` guard in toSimpleRounds. A round with
      // SOME gaps still plays, keeping its number.
      const playerDelivers = annotatedItems.length > undeliverableItemCount

      // Learner view mirrors that guard literally: a round with nothing
      // playable is not shown, and its absence renumbers nothing.
      if (learnerView && annotatedItems.length === 0) continue

      rounds.push({
        roundNumber: n,
        legoId: currentLego.lego.id,
        legoIndex: n,
        seedId: currentLego.seed.seed_id,
        legoType: currentLego.lego.type,
        isNew: currentLego.lego.new,
        items: annotatedItems,
        spacedRepReviews: reviewIndices,
        itemCount: annotatedItems.length,
        playerDelivers,
        ...(playerDelivers ? {} : { playerDropReason: 'round-empty', missingAudioRoles: missingAudioRoles(currentLego.lego) }),
        playerRoundNumber: playerRoundNumbers.get(currentLego.lego.id) ?? null,
        undeliverableItemCount,
      })

      allItems.push(...annotatedItems)
    }
  }

  const elapsed = Date.now() - startTime
  logger.info(`Generated ${rounds.length} rounds with ${allItems.length} total items in ${elapsed}ms (shape: ${scriptShapeSource}, offsets [${SPACED_REP_OFFSETS.join(',')}]${learnerView ? ', learner view' : ''})`)

  const stats = {
    legosLoaded: legos.length,
    roundsGenerated: rounds.length,
    totalItems: allItems.length,
    itemsByType: {
      intro: allItems.filter(i => i.type === 'intro').length,
      debut: allItems.filter(i => i.type === 'debut').length,
      build: allItems.filter(i => i.type === 'build').length,
      review: allItems.filter(i => i.type === 'review').length,
      consolidate: allItems.filter(i => i.type === 'consolidate').length,
    },
    itemsWithAudio: allItems.filter(i => i.hasAudio).length,
    itemsMissingAudio: allItems.filter(i => !i.hasAudio && i.type !== 'intro').length,
    // Player-delivery annotation totals (always on, both views).
    // roundsPlayerDrops now counts only rounds with NOTHING playable — a round
    // with an audio gap still plays, so it is not a dropped round.
    itemsPlayerCannotDeliver: allItems.filter(i => i.playerCanDeliver === false).length,
    roundsPlayerDrops: rounds.filter(r => r.playerDelivers === false).length,
    graduatedSeeds: graduatedSeeds.size,
    spacedRepOffsets: SPACED_REP_OFFSETS,
    scriptShapeSource,
    learnerView,
    ...(learnerView ? { phrasesDroppedForAudio } : {}),
    generationTimeMs: elapsed,
  }

  return { rounds, allItems, stats, legosLoaded: rounds.length }
}

module.exports = {
  generateLearningScript,
  loadAllUniqueLegos,
  loadAllPracticePhrasesGrouped,
  loadIntroductionAudio,
  loadSeedSentences,
  loadAlgorithmConfig,
  calculateSpacedRepReviews,
  seedSentenceFor,
  glossAlignment,
  blankAlignment,
  targetWordsOf,
  segmentsCoverWords,
  segmentsFromBlocks,
  sameTargetWords,
  locateBlock,
  mappingFromLego,
  legoIsMappable,
  reviewItemIsSeed,
  legoIntroIsPlayable,
  legoDebutIsPlayable,
  phraseHasFullAudio,
  applyLearnerPhraseAudioGate,
  annotatePlayerDelivery,
  missingAudioRoles,
  missingIntroAudioRoles,
  numberRounds,
  FIBONACCI,
  SEED_PHASE_START_OFFSET,
  DEFAULT_SCRIPT_SHAPE,
  DEFAULT_LISTENING,
}
