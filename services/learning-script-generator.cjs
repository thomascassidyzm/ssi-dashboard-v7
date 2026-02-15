/**
 * Learning Script Generator v3.2 - Learner Experience View
 *
 * Generates exactly what the learner will experience on their journey.
 * Components are NOT shown (they're internal build-up, not played).
 *
 * ROUND Structure (v3.2):
 * 1. INTRO - Introduction audio ("The Japanese for X is...")
 * 2. LEGO - The LEGO itself (debut)
 * 3. BUILD ×7 - Up to 7 practice phrases from CURRENT LEGO
 *    - Draws from BOTH build AND use roles (both are practice for current LEGO)
 *    - Must contain ALL LEGO characters
 *    - Sorted by length (shortest first)
 * 4. REVIEW - Fibonacci-based reviews using USE phrases from OLDER LEGOs
 *    - N-1 gets 3× phrases, others get 1×
 *    - Maximum 12 review phrases per round
 *    - Each REVIEW item shows R## badge for which round being reviewed
 * 5. CONSOLIDATE ×2 - 2 USE phrases for CURRENT LEGO (not used in BUILD)
 *
 * Display labels (for QA view):
 * - 'build' → BUILD-1, BUILD-2... (practice phrases)
 * - 'review' → REVIEW + R## badge (spaced rep from older LEGOs)
 * - 'consolidate' → CONSOLIDATE-1, CONSOLIDATE-2
 *
 * Validation:
 * - All practice phrases MUST contain all characters from LEGO target
 * - Phrases missing LEGO characters are filtered out
 */

const createLogger = require('./shared/logger.cjs')
const logger = createLogger('LearningScriptGenerator')

// Fibonacci-based skip numbers for spaced repetition
const FIBONACCI = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89]

// v3.1 Constants
const MAX_BUILD_PHRASES = 7       // Maximum BUILD phrases per round
const CONSOLIDATE_COUNT = 2       // Exactly 2 CONSOLIDATE phrases at end
const MAX_SPACED_REP_PHRASES = 12 // Cap spaced rep at 12 total
const N1_PHRASE_COUNT = 3         // N-1 gets 3 phrases in review

/**
 * Check if a phrase contains the LEGO target as a contiguous substring.
 * Case-insensitive, punctuation-stripped comparison.
 *
 * @param {string} phraseTarget - The phrase's target text
 * @param {string} legoTarget - The LEGO's target text
 * @returns {boolean} - True if phrase contains LEGO as substring
 */
function phraseContainsLegoChars(phraseTarget, legoTarget) {
  if (!phraseTarget || !legoTarget) return false

  const normalize = (t) => t.toLowerCase().replace(/[.,!?;:¡¿'"()\-–—]/g, '').replace(/\s+/g, ' ').trim()
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
    reviews.push({
      legoIndex: reviewLego,
      fibPosition: i
    })
  }

  return reviews
}

/**
 * Load ALL unique LEGOs for a course
 * Returns deduplicated LEGOs in seed/lego order
 */
async function loadAllUniqueLegos(supabase, courseCode, maxLegos = 1000, offset = 0) {
  if (!supabase) return []

  try {
    // Query lego_cycles view - has audio UUIDs joined
    const { data, error } = await supabase
      .from('lego_cycles')
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
    const seenLegos = new Set()
    const uniqueRecords = data.filter(record => {
      if (seenLegos.has(record.lego_id)) return false
      seenLegos.add(record.lego_id)
      return true
    })

    logger.info(`Loaded ${uniqueRecords.length} unique LEGOs for ${courseCode}`)

    // Transform to LearningItem format with pagination
    return uniqueRecords.slice(offset, offset + maxLegos).map(record => {
      const seedId = `S${String(record.seed_number).padStart(4, '0')}`

      return {
        lego: {
          id: record.lego_id,
          type: record.type || 'A',
          new: record.is_new || false,
          known_text: record.known_text,
          target_text: record.target_text,
          known_audio_uuid: record.known_audio_uuid,
          target1_audio_uuid: record.target1_audio_uuid,
          target2_audio_uuid: record.target2_audio_uuid,
          known_duration_ms: record.known_duration_ms,
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
 * Returns buildMap (phrase_role='build'), useMap (phrase_role='use'), and componentMap
 *
 * v3.0: Uses phrase_role column instead of position-based logic
 */
async function loadAllPracticePhrasesGrouped(supabase, courseCode) {
  const buildMap = new Map()      // lego_id -> BUILD phrases (drilling)
  const useMap = new Map()        // lego_id -> USE phrases (spaced rep eligible)
  const componentMap = new Map()  // lego_id -> component phrases (M-LEGO build-up)

  if (!supabase) return { buildMap, useMap, componentMap }

  try {
    // Paginate to handle large courses
    let allData = []
    let offset = 0
    const pageSize = 1000

    while (true) {
      const { data: page, error } = await supabase
        .from('practice_cycles')
        .select('*')
        .eq('course_code', courseCode)
        .gte('position', 1)
        .order('lego_id', { ascending: true })
        .order('position', { ascending: true })  // Sort by position for consistent ordering
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

    logger.info(`Loaded ${allData.length} practice phrases from practice_cycles`)

    // Group by lego_id
    const grouped = new Map()
    for (const row of allData) {
      const legoId = row.lego_id
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
        phrase_role: row.phrase_role,  // v3.0: use phrase_role
        known_audio_uuid: row.known_audio_uuid,
        target1_audio_uuid: row.target1_audio_uuid,
        target2_audio_uuid: row.target2_audio_uuid,
        known_duration_ms: row.known_duration_ms,
        target1_duration_ms: row.target1_duration_ms,
        target2_duration_ms: row.target2_duration_ms,
      }))

      // Components = phrase_role 'component' (for M-type LEGO build-up)
      const componentPhrases = allPhrases.filter(p => p.phrase_role === 'component')
      if (componentPhrases.length > 0) {
        componentMap.set(legoId, componentPhrases)
      }

      // BUILD phrases = phrase_role 'build' or 'practice' (drilling, up to 7 used)
      // Note: Legacy courses use 'practice', newer courses use 'build'
      const buildPhrases = allPhrases.filter(p => p.phrase_role === 'build' || p.phrase_role === 'practice')
      if (buildPhrases.length > 0) {
        buildMap.set(legoId, buildPhrases)
      }

      // USE phrases = phrase_role 'use' (spaced rep & consolidation)
      const usePhrases = allPhrases.filter(p => p.phrase_role === 'use')
      if (usePhrases.length > 0) {
        useMap.set(legoId, usePhrases)
      }
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
 * Primary source: course_legos.presentation_audio_id (v13+)
 * Fallback: lego_introductions table (legacy, Welsh only)
 */
async function loadIntroductionAudio(supabase, courseCode, legoIds) {
  const introAudioMap = new Map()

  if (!supabase || legoIds.length === 0) return introAudioMap

  try {
    const BATCH_SIZE = 100

    // Primary: read presentation_audio_id directly from course_legos
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
      // Map presentation_audio_id directly (used by /audio/:uuid/url endpoint)
      for (const lego of allLegoData) {
        introAudioMap.set(lego.lego_id, {
          id: lego.presentation_audio_id,
          s3_key: null // signed URL resolved at playback time
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
 * Generate the complete learning script with ROUNDs and spaced repetition
 *
 * @param {SupabaseClient} supabase - Supabase client
 * @param {string} courseCode - Course code (e.g., 'spa_for_eng')
 * @param {number} maxLegos - Maximum LEGOs to include
 * @param {number} offset - Start offset for pagination
 * @returns {Promise<{rounds: RoundData[], allItems: ScriptItem[], stats: object}>}
 */
async function generateLearningScript(supabase, courseCode, maxLegos = 50, offset = 0) {
  if (!supabase) {
    logger.warn('No Supabase client available')
    return { rounds: [], allItems: [], stats: {} }
  }

  const startTime = Date.now()

  // Load unique LEGOs with pagination
  const legos = await loadAllUniqueLegos(supabase, courseCode, maxLegos, offset)

  if (legos.length === 0) {
    return { rounds: [], allItems: [], stats: { legosLoaded: 0 } }
  }

  // Load ALL practice phrases split by phrase_role: build, use, component
  const { buildMap, useMap, componentMap } = await loadAllPracticePhrasesGrouped(supabase, courseCode)

  // Load introduction audio for all LEGOs
  const legoIds = legos.map(l => l.lego.id)
  const introAudioMap = await loadIntroductionAudio(supabase, courseCode, legoIds)

  const rounds = []
  const allItems = []

  // Create lookup map for LEGOs by index (1-based)
  const legoMap = new Map()
  legos.forEach((lego, idx) => {
    legoMap.set(idx + 1, lego)
  })

  // Normalization helpers
  const normalizePhrase = (text) => text?.toLowerCase().trim().replace(/[.,!?;:¡¿'"]+/g, '') || ''

  // Build a map from round number to LEGO for spaced rep lookups
  // Only NEW LEGOs get rounds - duplicates are skipped entirely
  const roundToLegoMap = new Map()
  let roundCounter = 0

  // Generate each ROUND (only for NEW LEGOs)
  for (let legoIdx = 0; legoIdx < legos.length; legoIdx++) {
    const currentLego = legos[legoIdx]

    // Skip duplicate LEGOs - they don't need their own round
    if (!currentLego.lego.new) {
      logger.debug(`Skipping duplicate LEGO: ${currentLego.lego.id}`)
      continue
    }

    roundCounter++
    const n = roundCounter  // Current round number

    // Map this round to its LEGO for spaced rep
    roundToLegoMap.set(n, currentLego)

    const currentBuildPhrases = buildMap.get(currentLego.lego.id) || []
    const currentUsePhrases = useMap.get(currentLego.lego.id) || []
    const roundItems = []

    // Track phrases used in this round (no duplicates)
    const usedPhrasesInRound = new Set()

    const baseItem = {
      roundNumber: n,
      legoId: currentLego.lego.id,
      legoIndex: legoIdx + 1,  // Original LEGO index (1-based)
      seedId: currentLego.seed.seed_id,
      seedNumber: currentLego.seed.seed_number,
      legoType: currentLego.lego.type,
      isNew: currentLego.lego.new,
    }

    // Phase 1: INTRO - Presentation audio + LEGO target audio
    // Cycle: presentation ("The X for 'Y' is:") → pause → target1 → target2
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

    // v3.1: Components removed - they're internal build-up, not played to learner

    // Phase 2: LEGO (debut)
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
    usedPhrasesInRound.add(normalizePhrase(currentLego.lego.target_text))

    // Phase 3: BUILD ×7 - up to 7 practice phrases for current LEGO
    // v3.2: Combine BOTH build AND use phrases (both are practice for current LEGO)
    // Must contain ALL LEGO characters, sorted by length (shortest first)
    // v3.3: Skip BUILD for Round 1 — no prior vocabulary to recombine with
    const legoTarget = currentLego.lego.target_text

    // Combine build + use phrases, filter for LEGO char validation
    const allCurrentPhrases = n === 1 ? [] : [...currentBuildPhrases, ...currentUsePhrases]
    const validPracticePhrases = allCurrentPhrases.filter(p =>
      phraseContainsLegoChars(p.target_text, legoTarget)
    )
    const sortedPracticePhrases = [...validPracticePhrases].sort((a, b) =>
      (a.target_text?.length || 0) - (b.target_text?.length || 0)
    )

    let buildCount = 0
    const usedInBuildPhase = new Set()  // Track phrases used in BUILD to exclude from CONSOLIDATE

    for (let i = 0; i < sortedPracticePhrases.length && buildCount < MAX_BUILD_PHRASES; i++) {
      const phrase = sortedPracticePhrases[i]
      if (usedPhrasesInRound.has(normalizePhrase(phrase.target_text))) continue

      roundItems.push({
        ...baseItem,
        type: 'build',
        phrasePosition: buildCount + 1,
        known_text: phrase.known_text,
        target_text: phrase.target_text,
        known_audio_uuid: phrase.known_audio_uuid,
        target1_audio_uuid: phrase.target1_audio_uuid,
        target2_audio_uuid: phrase.target2_audio_uuid,
        hasAudio: !!(phrase.known_audio_uuid && phrase.target1_audio_uuid),
      })
      usedPhrasesInRound.add(normalizePhrase(phrase.target_text))
      usedInBuildPhase.add(normalizePhrase(phrase.target_text))
      buildCount++
    }

    // Phase 4: REVIEW - Spaced repetition using USE phrases from older LEGOs
    // v3.1: Display as "REVIEW", max 12 total, N-1 gets 3×, others get 1×
    // v3.1: Must contain all characters from the LEGO being reviewed
    const reviews = calculateSpacedRepReviews(n)
    const reviewIndices = []
    let reviewCount = 0

    for (const review of reviews) {
      if (reviewCount >= MAX_SPACED_REP_PHRASES) break

      const reviewLego = roundToLegoMap.get(review.legoIndex)
      if (!reviewLego) continue

      const reviewLegoTarget = reviewLego.lego.target_text
      const reviewUsePhrases = useMap.get(reviewLego.lego.id) || []

      // Filter to phrases that contain all LEGO characters
      const validReviewPhrases = reviewUsePhrases.filter(p =>
        phraseContainsLegoChars(p.target_text, reviewLegoTarget)
      )

      // N-1 gets 3× phrases, others get 1×
      const isFirstRevisit = review.legoIndex === n - 1
      const targetPhraseCount = isFirstRevisit ? N1_PHRASE_COUNT : 1
      const remainingSlots = MAX_SPACED_REP_PHRASES - reviewCount

      const availablePhrases = validReviewPhrases.filter(
        p => !usedPhrasesInRound.has(normalizePhrase(p.target_text))
      )

      if (availablePhrases.length === 0) continue
      reviewIndices.push(review.legoIndex)

      const phrasesToAdd = Math.min(targetPhraseCount, availablePhrases.length, remainingSlots)

      for (let p = 0; p < phrasesToAdd; p++) {
        const remainingAvailable = availablePhrases.filter(
          ph => !usedPhrasesInRound.has(normalizePhrase(ph.target_text))
        )
        if (remainingAvailable.length === 0) break

        const idx = Math.floor(Math.random() * remainingAvailable.length)
        const selectedPhrase = remainingAvailable[idx]

        roundItems.push({
          roundNumber: n,
          legoId: reviewLego.lego.id,
          legoIndex: review.legoIndex,
          seedId: reviewLego.seed.seed_id,
          seedNumber: reviewLego.seed.seed_number,
          type: 'review',  // v3.1: Changed from 'spaced_rep' for display clarity
          reviewOf: review.legoIndex,
          fibonacciPosition: review.fibPosition,
          isFirstRevisit,
          known_text: selectedPhrase.known_text,
          target_text: selectedPhrase.target_text,
          known_audio_uuid: selectedPhrase.known_audio_uuid,
          target1_audio_uuid: selectedPhrase.target1_audio_uuid,
          target2_audio_uuid: selectedPhrase.target2_audio_uuid,
          hasAudio: !!(selectedPhrase.known_audio_uuid && selectedPhrase.target1_audio_uuid),
        })
        usedPhrasesInRound.add(normalizePhrase(selectedPhrase.target_text))
        reviewCount++
      }
    }

    // Phase 5: CONSOLIDATE ×2 - Practice phrases for current LEGO
    // v3.2: CAN reuse BUILD phrases (REVIEW gap makes this OK)
    // Only avoid duplicates within CONSOLIDATE itself and avoid the LEGO debut
    // v3.3: Skip CONSOLIDATE for Round 1 — no prior vocabulary to recombine with
    const usedInConsolidation = new Set()
    const legoNormalized = normalizePhrase(currentLego.lego.target_text)

    for (let c = 0; c < (n === 1 ? 0 : CONSOLIDATE_COUNT); c++) {
      // Can reuse BUILD phrases, just avoid: CONSOLIDATE duplicates, LEGO itself
      const availableForConsolidation = validPracticePhrases.filter(
        p => normalizePhrase(p.target_text) !== legoNormalized &&
             !usedInConsolidation.has(normalizePhrase(p.target_text))
      )

      if (availableForConsolidation.length === 0) {
        // Fall back to LEGO if no phrases available
        if (!usedInConsolidation.has(legoNormalized)) {
          roundItems.push({
            ...baseItem,
            type: 'consolidate',
            consolidateIndex: c + 1,
            known_text: currentLego.lego.known_text,
            target_text: currentLego.lego.target_text,
            known_audio_uuid: currentLego.lego.known_audio_uuid,
            target1_audio_uuid: currentLego.lego.target1_audio_uuid,
            target2_audio_uuid: currentLego.lego.target2_audio_uuid,
            hasAudio: !!(currentLego.lego.known_audio_uuid && currentLego.lego.target1_audio_uuid),
          })
          usedInConsolidation.add(legoNormalized)
        }
        continue
      }

      const idx = Math.floor(Math.random() * availableForConsolidation.length)
      const consolidatePhrase = availableForConsolidation[idx]

      roundItems.push({
        ...baseItem,
        type: 'consolidate',
        consolidateIndex: c + 1,
        known_text: consolidatePhrase.known_text,
        target_text: consolidatePhrase.target_text,
        known_audio_uuid: consolidatePhrase.known_audio_uuid,
        target1_audio_uuid: consolidatePhrase.target1_audio_uuid,
        target2_audio_uuid: consolidatePhrase.target2_audio_uuid,
        hasAudio: !!(consolidatePhrase.known_audio_uuid && consolidatePhrase.target1_audio_uuid),
      })
      usedInConsolidation.add(normalizePhrase(consolidatePhrase.target_text))
    }

    // Remove consecutive duplicates
    const dedupedItems = []
    let lastItem = null

    for (const item of roundItems) {
      if (item.type === 'intro') {
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

  const elapsed = Date.now() - startTime
  logger.info(`Generated ${rounds.length} rounds with ${allItems.length} total items in ${elapsed}ms`)

  // Calculate stats
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
    generationTimeMs: elapsed,
  }

  return { rounds, allItems, stats }
}

module.exports = {
  generateLearningScript,
  loadAllUniqueLegos,
  loadAllPracticePhrasesGrouped,
  loadIntroductionAudio,
  calculateSpacedRepReviews,
  FIBONACCI,
}
