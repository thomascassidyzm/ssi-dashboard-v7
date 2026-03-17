/**
 * Learning Script Generator v4.0 - SSoT with Learning App
 *
 * Algorithm matches generateLearningScript.ts in ssi-learning-app exactly.
 * Both implementations produce identical, deterministic round sequences.
 *
 * ROUND Structure:
 * 1. INTRO - Introduction audio ("The Japanese for X is...")
 * 2. DEBUT - The LEGO itself (debut)
 * 3. BUILD ×7 - BUILD phrases first (sorted by syllable count),
 *    then fill remaining slots with USE phrases (excluding 2 reserved for CONSOLIDATE)
 * 4. REVIEW - Fibonacci-based reviews using USE phrases from older LEGOs
 *    Round-robin selection via useIndex (deterministic, no randomness)
 * 5. CONSOLIDATE ×2 - The 2 reserved USE phrases (deterministic)
 *
 * Key differences from v3.x:
 * - No Math.random() anywhere — fully deterministic
 * - BUILD sorted by syllable count, not text length
 * - 2 USE phrases reserved for CONSOLIDATE before BUILD fill
 * - REVIEW uses round-robin (useIndex % length), not random
 * - No Round 1 special-casing (runs normally, just no REVIEW)
 * - Legacy 'practice' role: if USE exists → build, else → use
 * - legoState map tracks lastRound + useIndex per LEGO for REVIEW
 */

const createLogger = require('./shared/logger.cjs')
const logger = createLogger('LearningScriptGenerator')

// Fibonacci-based skip numbers for spaced repetition
const FIBONACCI = [1, 2, 3, 5, 8, 13, 21, 34, 55]

// Constants (matching learning app)
const MAX_BUILD_PHRASES = 7
const CONSOLIDATE_COUNT = 2
const MAX_SPACED_REP_PHRASES = 12
const N1_PHRASE_COUNT = 3

// Listening configuration
const LISTENING_OFFSET = 56
const LISTENING_BATCH_SIZE = 20
const LISTENING_BATCH_COUNT = 4
const LISTENING_TOTAL_SEEDS = LISTENING_BATCH_SIZE * LISTENING_BATCH_COUNT // 80

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
 * Calculate which previous LEGOs to review during ROUND N
 * Based on formula: N - fibonacci[i] >= 1
 */
function calculateSpacedRepReviews(roundNumber) {
  const reviews = []
  const seenLegos = new Set()

  for (let i = 0; i < FIBONACCI.length; i++) {
    const skip = FIBONACCI[i]
    const reviewLego = roundNumber - skip
    if (reviewLego < 1) break
    if (seenLegos.has(reviewLego)) continue
    seenLegos.add(reviewLego)
    reviews.push({ legoIndex: reviewLego, fibPosition: i })
  }

  return reviews
}

/**
 * Get listening playback speeds for a seed based on its cumulative play count.
 * Returns array of speed strings: ['normal'], ['normal','double'], ['double','double'], or ['double']
 */
function getListeningSpeedsForPlayCount(playCount) {
  if (playCount <= 3) return ['normal']
  if (playCount <= 6) return ['normal', 'double']
  if (playCount <= 9) return ['double', 'double']
  return ['double']
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
 * Generate the complete learning script with ROUNDs and spaced repetition.
 *
 * Algorithm matches generateLearningScript.ts in ssi-learning-app exactly:
 * - Deterministic (no randomness)
 * - BUILD first, then USE fill (BUILD fills to 7, CONSOLIDATE reuses if needed)
 * - Round-robin REVIEW selection
 * - legoState map for REVIEW lookups
 */
async function generateLearningScript(supabase, courseCode, maxLegos = 50, offset = 0) {
  if (!supabase) {
    logger.warn('No Supabase client available')
    return { rounds: [], allItems: [], stats: {} }
  }

  const startTime = Date.now()

  // Pre-load extra LEGOs before offset for Fibonacci lookback (max skip = 55)
  const maxFibLookback = FIBONACCI[FIBONACCI.length - 1] // 55
  const lookbackStart = Math.max(0, offset - maxFibLookback)
  const lookbackCount = offset - lookbackStart  // how many extra LEGOs to pre-process
  const totalToLoad = lookbackCount + maxLegos

  const legos = await loadAllUniqueLegos(supabase, courseCode, totalToLoad, lookbackStart)
  if (legos.length === 0) {
    return { rounds: [], allItems: [], stats: { legosLoaded: 0 } }
  }

  const { buildMap, useMap, componentMap } = await loadAllPracticePhrasesGrouped(supabase, courseCode)

  const legoIds = legos.map(l => l.lego.id)
  const introAudioMap = await loadIntroductionAudio(supabase, courseCode, legoIds)

  // Load seed sentences for listening items
  const { data: seedRows } = await supabase
    .from('course_seeds')
    .select('seed_number, known_text, target_text')
    .eq('course_code', courseCode)
    .order('seed_number', { ascending: true })

  const seedMap = new Map() // seed_number → { known_text, target_text }
  const seedTargetTexts = []
  for (const row of (seedRows || [])) {
    seedMap.set(row.seed_number, { known_text: row.known_text, target_text: row.target_text })
    if (row.target_text) seedTargetTexts.push(row.target_text)
  }

  // Load audio UUIDs for seed sentences directly from course_audio
  // Use a text-set filter in JS to avoid Supabase .in() URL-length issues with CJK
  const seedAudioMap = new Map() // target_text → audio_uuid
  if (seedTargetTexts.length > 0) {
    const seedTextSet = new Set(seedTargetTexts)
    let offset = 0
    const pageSize = 1000
    while (true) {
      const { data: audioRows, error } = await supabase
        .from('course_audio')
        .select('text, id')
        .eq('course_code', courseCode)
        .eq('role', 'target1')
        .range(offset, offset + pageSize - 1)

      if (error) {
        logger.error('Failed to load seed audio:', error)
        break
      }
      if (!audioRows || audioRows.length === 0) break

      for (const row of audioRows) {
        if (seedTextSet.has(row.text)) {
          seedAudioMap.set(row.text, row.id)
        }
      }
      if (audioRows.length < pageSize) break
      offset += pageSize
    }
    logger.info(`Loaded ${seedAudioMap.size} seed audio UUIDs from course_audio (scanned ${seedTextSet.size} seed texts)`)
  }

  const rounds = []
  const allItems = []

  // Normalization helpers (matching learning app)
  const normalizePhrase = (text) => text?.toLowerCase().trim().replace(/[.,!?;:¡¿'"]+/g, '') || ''
  const getPhraseId = (knownText, targetText) => `${normalizePhrase(knownText)}|${normalizePhrase(targetText)}`

  // legoState map: tracks lastRound and useIndex per LEGO for deterministic REVIEW
  const legoState = new Map()
  let roundCounter = lookbackStart

  // Listening state tracking
  const seedLastRound = new Map()   // seed_number → last round where seed had a LEGO
  const graduatedSeeds = []         // ordered list of seed_numbers that have graduated
  const listeningBatches = [[], [], [], []]  // 4 batches of seed_numbers
  const seedPlayCount = new Map()   // seed_number → cumulative play count
  const graduatedLegoIds = new Set() // LEGO IDs whose seeds have graduated (excluded from REVIEW)
  let nextBatchToFill = 0           // which batch is currently being filled
  let rotationIndex = 0             // which batch to play next
  let activeBatchCount = 0          // how many batches have at least 1 seed

  for (let legoIdx = 0; legoIdx < legos.length; legoIdx++) {
    const currentLego = legos[legoIdx]

    // Skip duplicate LEGOs
    if (!currentLego.lego.new) {
      logger.debug(`Skipping duplicate LEGO: ${currentLego.lego.id}`)
      continue
    }

    roundCounter++
    const n = roundCounter

    // Track which seed this LEGO belongs to (for listening graduation)
    const seedNum = currentLego.seed.seed_number
    seedLastRound.set(seedNum, n)

    const currentBuildPhrases = buildMap.get(currentLego.lego.id) || []
    const currentUsePhrases = useMap.get(currentLego.lego.id) || []
    const roundItems = []
    const usedPhrasesInRound = new Set()

    const baseItem = {
      roundNumber: n,
      legoId: currentLego.lego.id,
      legoIndex: legoIdx + 1,
      seedId: currentLego.seed.seed_id,
      seedNumber: currentLego.seed.seed_number,
      legoType: currentLego.lego.type,
      isNew: currentLego.lego.new,
    }

    // Phase 1: INTRO or COMPONENT PRIMING
    // M-LEGOs with components: prime each component individually, then present
    //   the assembled M-LEGO so the learner hears the full unit.
    //   Overkill >> learner uncertainty at the onset of a new LEGO.
    // A-LEGOs / Welsh: standard intro with presentation audio.
    const isWelsh = courseCode.startsWith('cym_')
    const allCompPhrases = isWelsh ? [] : (componentMap.get(currentLego.lego.id) || [])
    // Only generate audio cycles for components meant to be introduced
    const compPhrases = allCompPhrases.filter(c => c.introduce !== false)
    if (compPhrases.length > 0) {
      const practiceReps = 2
      for (const comp of compPhrases) {
        // Component intro: presentation audio prompt → target audio confirmation
        roundItems.push({
          ...baseItem,
          type: 'component_intro',
          known_text: `${comp.known_text}, as in ${currentLego.lego.known_text}`,
          target_text: comp.target_text,
          presentation_audio: comp.presentation_audio_id ? { id: comp.presentation_audio_id, s3_key: null } : null,
          target1_audio_uuid: comp.target1_audio_uuid,
          target2_audio_uuid: comp.target2_audio_uuid,
          hasAudio: !!(comp.presentation_audio_id && comp.target1_audio_uuid),
        })

        // Component practice: standard 4-phase cycle (tapered by seed)
        for (let cp = 0; cp < practiceReps; cp++) {
          roundItems.push({
            ...baseItem,
            type: 'component_practice',
            known_text: comp.known_text,
            target_text: comp.target_text,
            known_audio_uuid: comp.known_audio_uuid,
            target1_audio_uuid: comp.target1_audio_uuid,
            target2_audio_uuid: comp.target2_audio_uuid,
            hasAudio: !!(comp.known_audio_uuid && comp.target1_audio_uuid),
          })
        }
      }

      // M-LEGO intro: after all components are primed, present the assembled
      // M-LEGO so the learner hears how the pieces snap together as a single unit.
      // Overkill >> learner uncertainty at the onset of a new LEGO.
      const introAudio = introAudioMap.get(currentLego.lego.id)
      roundItems.push({
        ...baseItem,
        type: 'intro',
        known_text: currentLego.lego.known_text,
        target_text: currentLego.lego.target_text,
        presentation_audio: introAudio || null,
        target1_audio_uuid: currentLego.lego.target1_audio_uuid,
        target2_audio_uuid: currentLego.lego.target2_audio_uuid,
        hasAudio: !!(introAudio && currentLego.lego.target1_audio_uuid),
      })
    } else {
      // A-LEGO or Welsh: standard intro with presentation audio
      const introAudio = introAudioMap.get(currentLego.lego.id)
      roundItems.push({
        ...baseItem,
        type: 'intro',
        known_text: currentLego.lego.known_text,
        target_text: currentLego.lego.target_text,
        presentation_audio: introAudio || null,
        target1_audio_uuid: currentLego.lego.target1_audio_uuid,
        target2_audio_uuid: currentLego.lego.target2_audio_uuid,
        hasAudio: !!(introAudio && currentLego.lego.target1_audio_uuid),
      })
    }

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

    // Phase 3: BUILD ×7
    // Step 1: BUILD phrases first, sorted by syllable count
    const legoTarget = currentLego.lego.target_text

    // Filter BUILD phrases for LEGO char validation
    const validBuildPhrases = currentBuildPhrases.filter(p =>
      phraseContainsLegoChars(p.target_text, legoTarget)
    )
    const sortedBuildPhrases = [...validBuildPhrases].sort((a, b) =>
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

    // Step 2: Reserve 2 USE phrases for consolidation BEFORE using them for BUILD padding
    const sortedUsePhrases = [...currentUsePhrases]
      .filter(p => phraseContainsLegoChars(p.target_text, legoTarget))
      .sort((a, b) =>
        (a.target_syllable_count || countTargetSyllables(a.target_text)) -
        (b.target_syllable_count || countTargetSyllables(b.target_text))
      )

    // Step 3: Fill remaining BUILD slots with USE phrases (BUILD priority > CONSOLIDATE)
    // CONSOLIDATE can repeat BUILD phrases if needed — filling 7 BUILD is non-negotiable
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

    // Phase 4: REVIEW - Fibonacci spaced repetition using legoState
    const reviews = calculateSpacedRepReviews(n)
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
      if (graduatedLegoIds.has(reviewLegoState.legoId)) continue
      if (seenReviewLegos.has(reviewLegoState.legoId)) continue
      seenReviewLegos.add(reviewLegoState.legoId)

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

    // Phase 5: CONSOLIDATE ×2 - prefer unused USE phrases, allow reuse if pool exhausted
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

    // Phase 6: LISTENING - graduation-triggered batch rotation
    // Check which seeds graduate THIS round
    const newGraduationsThisRound = []
    for (const [sNum, lastRound] of seedLastRound.entries()) {
      if (n - lastRound === LISTENING_OFFSET) {
        // This seed just graduated
        newGraduationsThisRound.push(sNum)
        graduatedSeeds.push(sNum)

        // Mark all LEGOs from this seed as graduated (exclude from future REVIEW)
        for (const [legoId, state] of legoState.entries()) {
          if (state.lego.seed.seed_number === sNum) {
            graduatedLegoIds.add(legoId)
          }
        }

        // Add to listening batch (first 80 seeds only)
        if (graduatedSeeds.length <= LISTENING_TOTAL_SEEDS) {
          listeningBatches[nextBatchToFill].push(sNum)
          if (listeningBatches[nextBatchToFill].length === 1 && nextBatchToFill >= activeBatchCount) {
            activeBatchCount = nextBatchToFill + 1
          }
          if (listeningBatches[nextBatchToFill].length >= LISTENING_BATCH_SIZE) {
            nextBatchToFill = Math.min(nextBatchToFill + 1, LISTENING_BATCH_COUNT - 1)
          }
        }
      }
    }

    // For each graduation trigger, play ONE batch (rotating)
    for (let g = 0; g < newGraduationsThisRound.length; g++) {
      if (activeBatchCount === 0) break
      const batchIdx = rotationIndex % activeBatchCount
      const batch = listeningBatches[batchIdx]
      rotationIndex++

      if (batch.length === 0) continue

      // Play all seeds in this batch
      for (const batchSeedNum of batch) {
        const count = (seedPlayCount.get(batchSeedNum) || 0) + 1
        seedPlayCount.set(batchSeedNum, count)
        const speeds = getListeningSpeedsForPlayCount(count)

        const seedData = seedMap.get(batchSeedNum)
        if (!seedData) continue

        // Look up audio directly from course_audio (pre-loaded)
        const seedAudioUuid = seedAudioMap.get(seedData.target_text) || null

        for (const speed of speeds) {
          roundItems.push({
            roundNumber: n,
            type: 'listening',
            seedNumber: batchSeedNum,
            known_text: seedData.known_text,
            target_text: seedData.target_text,
            listeningSpeed: speed,
            listeningBatch: batchIdx + 1,
            listeningPlayCount: count,
            target1_audio_uuid: seedAudioUuid,
            hasAudio: !!seedAudioUuid,
          })
        }
      }
    }

    // Remove consecutive duplicates
    const dedupedItems = []
    let lastItem = null

    for (const item of roundItems) {
      if (item.type === 'intro' || item.type === 'debut' || item.type === 'component_intro') {
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
      rounds.push({
        roundNumber: n,
        legoId: currentLego.lego.id,
        legoIndex: n,
        seedId: currentLego.seed.seed_id,
        legoType: currentLego.lego.type,
        isNew: currentLego.lego.new,
        items: dedupedItems,
        spacedRepReviews: reviewIndices,
        itemCount: dedupedItems.length,
      })

      allItems.push(...dedupedItems)
    }
  }

  const elapsed = Date.now() - startTime
  logger.info(`Generated ${rounds.length} rounds with ${allItems.length} total items in ${elapsed}ms`)

  const stats = {
    legosLoaded: legos.length,
    roundsGenerated: rounds.length,
    totalItems: allItems.length,
    itemsByType: {
      intro: allItems.filter(i => i.type === 'intro').length,
      component_intro: allItems.filter(i => i.type === 'component_intro').length,
      component_practice: allItems.filter(i => i.type === 'component_practice').length,
      debut: allItems.filter(i => i.type === 'debut').length,
      build: allItems.filter(i => i.type === 'build').length,
      review: allItems.filter(i => i.type === 'review').length,
      consolidate: allItems.filter(i => i.type === 'consolidate').length,
      listening: allItems.filter(i => i.type === 'listening').length,
    },
    itemsWithAudio: allItems.filter(i => i.hasAudio).length,
    itemsMissingAudio: allItems.filter(i => !i.hasAudio && i.type !== 'intro').length,
    graduatedSeeds: graduatedSeeds.length,
    listeningItems: allItems.filter(i => i.type === 'listening').length,
    generationTimeMs: elapsed,
  }

  return { rounds, allItems, stats, legosLoaded: rounds.length }
}

module.exports = {
  generateLearningScript,
  loadAllUniqueLegos,
  loadAllPracticePhrasesGrouped,
  loadIntroductionAudio,
  calculateSpacedRepReviews,
  FIBONACCI,
}
