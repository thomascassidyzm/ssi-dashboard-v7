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
 *   audio gates — LEGOs/phrases missing any of known/target1/target2 audio are
 *   dropped BEFORE the walk, so round numbers compress exactly as the
 *   learner's do (generateLearningScript.ts:816-823 / :726-768). Default
 *   (production view) keeps every row, flagged hasAudio:false — that is the
 *   review tool's job.
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
async function loadAlgorithmConfig(supabase) {
  let scriptShape = { ...DEFAULT_SCRIPT_SHAPE }
  let listening = { ...DEFAULT_LISTENING }
  let scriptShapeSource = 'fallback'

  try {
    const { data, error } = await supabase
      .from('algorithm_config')
      .select('key, config')
      .in('key', ['script_shape', 'listening'])

    if (error) {
      logger.warn(`algorithm_config fetch failed (${error.message}) — using built-in fallback shape [${FIBONACCI.join(',')}]. Script View may diverge from the learner.`)
      return { scriptShape, listening, scriptShapeSource }
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
  } catch (err) {
    logger.warn(`algorithm_config fetch threw (${err.message}) — using built-in fallback shape.`)
  }

  return { scriptShape, listening, scriptShapeSource }
}

/**
 * Count syllables in target text.
 * CJK characters count as 1 syllable each.
 * Latin text uses vowel cluster heuristic.
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
 * Mirrors ssi-learning-app generateLearningScript.ts:
 * - LEGOs: "a cycle must never present without all three audio IDs" (:820-822)
 * - Phrases: phraseHasFullAudio (:726-727)
 */
function legoHasFullAudio(lego) {
  return !!(lego.known_audio_uuid && lego.target1_audio_uuid && lego.target2_audio_uuid)
}

function phraseHasFullAudio(phrase) {
  return !!(phrase.known_audio_uuid && phrase.target1_audio_uuid && phrase.target2_audio_uuid)
}

/**
 * Apply the learner's audio gates to the loaded course content — PURE.
 * LEGOs missing any of known/target1/target2 audio are dropped BEFORE the
 * round walk (so survivors take consecutive round numbers — the learner's
 * round compression, generateLearningScript.ts:816-823). BUILD/USE pools are
 * filtered to fully-voiced phrases (:761-764). Original maps are not mutated.
 */
function applyLearnerAudioGate(legoRecords, buildMap, useMap) {
  const legos = legoRecords.filter(rec => legoHasFullAudio(rec.lego))

  const gateMap = (map) => {
    const out = new Map()
    for (const [key, phrases] of map.entries()) {
      const kept = phrases.filter(phraseHasFullAudio)
      if (kept.length > 0) out.set(key, kept)
    }
    return out
  }

  return {
    legos,
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
 * Mirrors the learner's four gates (generateLearningScript.ts):
 * - :764  LEGOs missing any of known/target1/target2 are filtered out BEFORE
 *         the walk → the WHOLE round vanishes and later rounds renumber.
 * - :706  phrases missing any of the three never enter the BUILD/USE pools →
 *         build / consolidate / use-phrase review rows vanish.
 * - :1277 a seed-phase review needs the seed's target1 audio, else the player
 *         falls back to a use-phrase — the seed row shown here never plays.
 * - a review of a LEGO the player dropped can never fire: that LEGO never
 *   entered its legoState.
 */
const AUDIO_ROLE_FIELDS = { known: 'known_audio_uuid', target1: 'target1_audio_uuid', target2: 'target2_audio_uuid' }
const ALL_AUDIO_ROLES = ['known', 'target1', 'target2']

function missingAudioRoles(record, roles = ALL_AUDIO_ROLES) {
  if (!record) return [...roles]
  return roles.filter(role => !record[AUDIO_ROLE_FIELDS[role]])
}

/**
 * Annotate one round's items — PURE. Returns NEW item objects; never mutates.
 *
 * @param {Array}  items
 * @param {object} ctx
 * @param {object} ctx.lego            the round's own LEGO record (audio uuids)
 * @param {Set}    ctx.droppedLegoIds  LEGO ids the player never introduces
 */
function annotatePlayerDelivery(items, ctx = {}) {
  const droppedLegoIds = ctx.droppedLegoIds || new Set()
  const legoMissing = missingAudioRoles(ctx.lego)
  const roundIsDropped = legoMissing.length > 0

  return (items || []).map(item => {
    // The round's LEGO is unvoiced → the player emits no round at all, so
    // every row in it is undeliverable regardless of its own audio.
    if (roundIsDropped) {
      return { ...item, playerCanDeliver: false, playerDropReason: 'lego-audio', missingAudioRoles: legoMissing }
    }

    if (item.type === 'intro' || item.type === 'debut') {
      return { ...item, playerCanDeliver: true }
    }

    if (item.type === 'review' && droppedLegoIds.has(item.legoId)) {
      return { ...item, playerCanDeliver: false, playerDropReason: 'reviewed-lego-dropped', missingAudioRoles: [] }
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
 * Run AFTER applyLearnerAudioGate and the numbering compresses exactly the
 * way the learner's does (dropped LEGOs leave no gap).
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
 * @param {boolean} options.learnerView  Apply the learner's audio gates: drop
 *   LEGOs/phrases missing any audio ID and compress round numbers the way the
 *   learner does. Default false = production view (gaps shown, flagged).
 */
async function generateLearningScript(supabase, courseCode, maxLegos = 50, offset = 0, options = {}) {
  if (!supabase) {
    logger.warn('No Supabase client available')
    return { rounds: [], allItems: [], stats: {} }
  }

  const learnerView = !!options.learnerView
  const startTime = Date.now()

  // Live round shape — same table/key the learner app reads.
  const { scriptShape, listening, scriptShapeSource } = await loadAlgorithmConfig(supabase)
  const SPACED_REP_OFFSETS = scriptShape.spacedRepOffsets
  const MAX_BUILD_PHRASES = scriptShape.maxBuildPhrases
  const CONSOLIDATE_COUNT = scriptShape.useConsolidationCount
  const MAX_SPACED_REP_PHRASES = scriptShape.maxSpacedRepPhrases
  const N1_PHRASE_COUNT = scriptShape.n1PhraseCount

  // Pre-load extra LEGOs before offset for spaced-rep lookback
  // (max offset = 89 with the live config, 55 with the fallback)
  const maxFibLookback = Math.max(...SPACED_REP_OFFSETS)
  const lookbackStart = Math.max(0, offset - maxFibLookback)
  const lookbackCount = offset - lookbackStart  // how many extra LEGOs to pre-process
  const totalToLoad = lookbackCount + maxLegos

  // Load the FULL unique-LEGO list, then window AFTER the (optional) audio
  // gate — gating must happen course-wide so learner-view round numbers match
  // the learner's full-course compressed numbering.
  let allLegoRecords = await loadAllUniqueLegos(supabase, courseCode, Number.MAX_SAFE_INTEGER, 0)
  if (allLegoRecords.length === 0) {
    return { rounds: [], allItems: [], stats: { legosLoaded: 0 } }
  }

  // Player-delivery annotation basis — computed course-wide BEFORE any gating,
  // so it is identical in both views and costs no extra query.
  //  - droppedLegoIds: LEGOs the live player never introduces (missing audio),
  //    which also kills every review of them.
  //  - playerRoundNumbers: the round number the LEARNER would see, after the
  //    player's dropped-LEGO renumbering (null for a LEGO it never plays).
  const droppedLegoIds = new Set(
    allLegoRecords.filter(rec => !legoHasFullAudio(rec.lego)).map(rec => rec.lego.id)
  )
  const playerRoundNumbers = new Map()
  for (const { record, roundNumber } of numberRounds(allLegoRecords.filter(rec => legoHasFullAudio(rec.lego)))) {
    playerRoundNumbers.set(record.lego.id, roundNumber)
  }

  let { buildMap, useMap } = await loadAllPracticePhrasesGrouped(supabase, courseCode)

  let legosDroppedForAudio = 0
  let phrasesDroppedForAudio = 0
  if (learnerView) {
    const legosBefore = allLegoRecords.length
    const countPhrases = (m) => { let c = 0; for (const arr of m.values()) c += arr.length; return c }
    const phrasesBefore = countPhrases(buildMap) + countPhrases(useMap)
    const gated = applyLearnerAudioGate(allLegoRecords, buildMap, useMap)
    allLegoRecords = gated.legos
    buildMap = gated.buildMap
    useMap = gated.useMap
    legosDroppedForAudio = legosBefore - allLegoRecords.length
    phrasesDroppedForAudio = phrasesBefore - (countPhrases(buildMap) + countPhrases(useMap))
    if (legosDroppedForAudio > 0 || phrasesDroppedForAudio > 0) {
      logger.info(`Learner view: dropped ${legosDroppedForAudio} LEGOs + ${phrasesDroppedForAudio} phrases awaiting audio (rounds renumbered)`)
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
    // NO component priming: the learner never plays component_intro /
    // component_practice cycles (components are visual ghost tiles on the
    // intro/debut cards only — generateLearningScript.ts:1208-1212).
    const introAudio = introAudioMap.get(currentLego.lego.id) || null
    // Learner view: mirror the learner's fallback — when presentation audio is
    // missing the intro still plays the LEGO via known audio (:1199-1202).
    const effectiveIntroAudio = (learnerView && !introAudio && currentLego.lego.known_audio_uuid)
      ? { id: currentLego.lego.known_audio_uuid, s3_key: null }
      : introAudio
    roundItems.push({
      ...baseItem,
      type: 'intro',
      known_text: currentLego.lego.known_text,
      target_text: currentLego.lego.target_text,
      presentation_audio: effectiveIntroAudio,
      target1_audio_uuid: currentLego.lego.target1_audio_uuid,
      target2_audio_uuid: currentLego.lego.target2_audio_uuid,
      hasAudio: !!(effectiveIntroAudio && currentLego.lego.target1_audio_uuid),
    })

    // Phase 2: DEBUT
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
    usedPhrasesInRound.add(getPhraseId(currentLego.lego.known_text, currentLego.lego.target_text))

    // Phase 3: BUILD — BUILD phrases first, sorted by syllable count
    // NO substring gate — learner-app parity. The learner (generateLearningScript.ts /
    // CourseDataProvider) selects phrases purely by seed_number+lego_index with NO
    // phraseContainsLegoChars filter. This .cjs is the dashboard MIRROR; gating here had
    // DIVERGED from the learner and hid legitimately word-order-inverted phrases (e.g.
    // Croatian clitic inversion: LEGO "sličan si" vs phrase "...si sličan..."), so they were
    // invisible/uneditable in Script View though the learner plays them. Do NOT re-add this
    // filter to "match the app" — the app has no such gate; removing it IS the parity fix.
    const sortedBuildPhrases = [...currentBuildPhrases].sort((a, b) =>
      (a.target_syllable_count || countTargetSyllables(a.target_text)) -
      (b.target_syllable_count || countTargetSyllables(b.target_text))
    )

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
    const sortedUsePhrases = [...currentUsePhrases]
      // No phraseContainsLegoChars gate — learner-app parity (see BUILD note above).
      .sort((a, b) =>
        (a.target_syllable_count || countTargetSyllables(a.target_text)) -
        (b.target_syllable_count || countTargetSyllables(b.target_text))
      )

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
      if (reviewItemIsSeed(reviewOffset)) {
        const seed = seedSentenceFor(reviewLegoState.legoId, seedSentenceMap)
        if (seed) {
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
        logger.warn(`Seed-phase review (offset ${reviewOffset}) for ${reviewLegoState.legoId} has no parent seed sentence (${reviewLegoState.legoId.slice(0, 5)}) — falling back to use-phrase.`)
      }

      if (reviewLegoState.usePhrases.length === 0) continue

      const isN1 = review.legoIndex === n - 1
      const targetPhraseCount = isN1 ? N1_PHRASE_COUNT : 1
      const phrasesToAdd = Math.min(
        targetPhraseCount,
        MAX_SPACED_REP_PHRASES - reviewCount,
        reviewLegoState.usePhrases.length
      )

      reviewIndices.push(review.legoIndex)

      for (let p = 0; p < phrasesToAdd; p++) {
        // Round-robin selection (deterministic)
        const phrase = reviewLegoState.usePhrases[reviewLegoState.useIndex % reviewLegoState.usePhrases.length]
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
    // First pass: unused USE phrases
    for (const phrase of sortedUsePhrases) {
      if (consolidateCount >= CONSOLIDATE_COUNT) break
      const phraseId = getPhraseId(phrase.known_text, phrase.target_text)
      if (usedPhrasesInRound.has(phraseId)) continue
      usedPhrasesInRound.add(phraseId)
      emitConsolidate(phrase)
    }
    // Second pass: reuse USE phrases already used in BUILD (pool was too small)
    if (consolidateCount < CONSOLIDATE_COUNT) {
      for (const phrase of sortedUsePhrases) {
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

    // Remove consecutive duplicates
    const dedupedItems = []
    let lastItem = null

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

    // Only emit rounds past the lookback range (i.e. at the requested offset)
    if (n > offset) {
      // Annotate reality on top of intent — never filters, only labels.
      const annotatedItems = annotatePlayerDelivery(dedupedItems, {
        lego: currentLego.lego,
        droppedLegoIds,
      })
      const legoMissing = missingAudioRoles(currentLego.lego)

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
        playerDelivers: legoMissing.length === 0,
        ...(legoMissing.length > 0
          ? { playerDropReason: 'lego-audio', missingAudioRoles: legoMissing }
          : {}),
        playerRoundNumber: playerRoundNumbers.get(currentLego.lego.id) ?? null,
        undeliverableItemCount: annotatedItems.filter(i => i.playerCanDeliver === false).length,
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
    itemsPlayerCannotDeliver: allItems.filter(i => i.playerCanDeliver === false).length,
    roundsPlayerDrops: rounds.filter(r => r.playerDelivers === false).length,
    graduatedSeeds: graduatedSeeds.size,
    spacedRepOffsets: SPACED_REP_OFFSETS,
    scriptShapeSource,
    learnerView,
    ...(learnerView ? { legosDroppedForAudio, phrasesDroppedForAudio } : {}),
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
  reviewItemIsSeed,
  legoHasFullAudio,
  phraseHasFullAudio,
  applyLearnerAudioGate,
  annotatePlayerDelivery,
  missingAudioRoles,
  numberRounds,
  FIBONACCI,
  SEED_PHASE_START_OFFSET,
  DEFAULT_SCRIPT_SHAPE,
  DEFAULT_LISTENING,
}
