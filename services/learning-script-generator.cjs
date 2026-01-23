/**
 * Learning Script Generator v3.0 - BUILD/USE Phrase Roles
 *
 * Generates a complete learning journey with ROUNDs and spaced repetition
 * showing exactly what the learner will experience.
 *
 * ROUND Structure (v3.0):
 * 1. INTRO - Introduction audio ("The Japanese for X is...")
 * 2. COMPONENTS - For M-type LEGOs only (build-up before LEGO)
 * 3. DEBUT - The LEGO itself
 * 4. BUILD ×7 - Up to 7 BUILD phrases (phrase_role='build'), drilling
 * 5. SPACED REP - Fibonacci-based reviews using USE phrases only:
 *    - N-1 (first revisit) gets 3× USE phrases
 *    - N-2, N-3, N-5, N-8, etc. get 1× each
 *    - Maximum 12 spaced rep phrases per round
 * 6. USE ×2 - Exactly 2 USE phrases for consolidation
 *
 * For A-type LEGOs: INTRO -> DEBUT -> BUILD×7 -> SPACED REP -> USE×2
 * For M-type LEGOs: INTRO -> COMPONENTS -> DEBUT -> BUILD×7 -> SPACED REP -> USE×2
 *
 * Phrase roles (from phrase_role column):
 * - 'build' = drilling phrases, played during BUILD phase
 * - 'use' = consolidation phrases, used for spaced rep & final USE phase
 * - 'component' = M-LEGO build-up phrases
 */

const createLogger = require('./shared/logger.cjs')
const logger = createLogger('LearningScriptGenerator')

// Fibonacci-based skip numbers for spaced repetition
const FIBONACCI = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89]

// v3.0 Constants
const MAX_BUILD_PHRASES = 7       // Maximum BUILD phrases per round
const USE_CONSOLIDATION_COUNT = 2 // Exactly 2 USE phrases at end
const MAX_SPACED_REP_PHRASES = 12 // Cap spaced rep at 12 total
const N1_PHRASE_COUNT = 3         // N-1 gets 3 USE phrases

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

      // BUILD phrases = phrase_role 'build' (drilling, up to 7 used)
      const buildPhrases = allPhrases.filter(p => p.phrase_role === 'build')
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
 */
async function loadIntroductionAudio(supabase, courseCode, legoIds) {
  const introAudioMap = new Map()

  if (!supabase || legoIds.length === 0) return introAudioMap

  try {
    // Batch queries in chunks of 100
    const BATCH_SIZE = 100
    let allIntroData = []

    for (let i = 0; i < legoIds.length; i += BATCH_SIZE) {
      const batchLegoIds = legoIds.slice(i, i + BATCH_SIZE)
      const { data: batchIntroData } = await supabase
        .from('lego_introductions')
        .select('lego_id, audio_uuid, presentation_audio_id')
        .eq('course_code', courseCode)
        .in('lego_id', batchLegoIds)

      if (batchIntroData) {
        allIntroData = allIntroData.concat(batchIntroData)
      }
    }

    if (allIntroData.length > 0) {
      // Separate v13 (presentation_audio_id) from legacy (audio_uuid)
      const v13Entries = allIntroData.filter(i => i.presentation_audio_id)
      const legacyEntries = allIntroData.filter(i => !i.presentation_audio_id && i.audio_uuid)

      // v13: lookup s3_keys from course_audio
      if (v13Entries.length > 0) {
        const audioIds = v13Entries.map(i => i.presentation_audio_id)
        const s3KeyMap = new Map()

        for (let i = 0; i < audioIds.length; i += BATCH_SIZE) {
          const batchIds = audioIds.slice(i, i + BATCH_SIZE)
          const { data: audioData } = await supabase
            .from('course_audio')
            .select('id, s3_key')
            .in('id', batchIds)

          for (const audio of (audioData || [])) {
            if (audio.id && audio.s3_key) {
              s3KeyMap.set(audio.id, audio.s3_key)
            }
          }
        }

        for (const intro of v13Entries) {
          const s3Key = s3KeyMap.get(intro.presentation_audio_id)
          if (s3Key) {
            introAudioMap.set(intro.lego_id, {
              id: intro.presentation_audio_id,
              s3_key: s3Key
            })
          }
        }
      }

      // Legacy: use audio_uuid directly
      for (const intro of legacyEntries) {
        introAudioMap.set(intro.lego_id, {
          id: intro.audio_uuid,
          s3_key: `mastered/${intro.audio_uuid.toUpperCase()}.mp3`
        })
      }

      logger.info(`Loaded ${introAudioMap.size} intro audio entries`)
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

    // Phase 1: INTRO - Introduction Audio
    const introAudio = introAudioMap.get(currentLego.lego.id)
    roundItems.push({
      ...baseItem,
      type: 'intro',
      known_text: currentLego.lego.known_text,
      target_text: currentLego.lego.target_text,
      presentation_audio: introAudio || null,
      hasAudio: !!introAudio,
    })

    // Phase 2: COMPONENTS (for M-type LEGOs - build-up before the LEGO)
    if (currentLego.lego.type === 'M') {
      const components = componentMap.get(currentLego.lego.id) || []
      for (const component of components) {
        roundItems.push({
          ...baseItem,
          type: 'component',
          known_text: component.known_text,
          target_text: component.target_text,
          known_audio_uuid: component.known_audio_uuid,
          target1_audio_uuid: component.target1_audio_uuid,
          target2_audio_uuid: component.target2_audio_uuid,
          hasAudio: !!(component.known_audio_uuid && component.target1_audio_uuid),
        })
        usedPhrasesInRound.add(normalizePhrase(component.target_text))
      }
    }

    // Phase 3: LEGO DEBUT
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

    // Phase 4: BUILD ×7 - up to 7 BUILD phrases, sorted by target text character count (shortest first)
    // This ensures simpler phrases come before more complex ones
    const sortedBuildPhrases = [...currentBuildPhrases].sort((a, b) =>
      (a.target_text?.length || 0) - (b.target_text?.length || 0)
    )
    let buildCount = 0
    for (let i = 0; i < sortedBuildPhrases.length && buildCount < MAX_BUILD_PHRASES; i++) {
      const phrase = sortedBuildPhrases[i]
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
      buildCount++
    }

    // Phase 5: SPACED REP - Interleaved reviews using USE phrases only
    // Reviews are based on round numbers, which now only include NEW LEGOs
    // v3.0: Only USE phrases, max 12 total, N-1 gets 3, others get 1
    const reviews = calculateSpacedRepReviews(n)
    const reviewIndices = []
    let spacedRepCount = 0

    for (const review of reviews) {
      if (spacedRepCount >= MAX_SPACED_REP_PHRASES) break

      const reviewLego = roundToLegoMap.get(review.legoIndex)
      if (!reviewLego) continue

      reviewIndices.push(review.legoIndex)
      const reviewUsePhrases = useMap.get(reviewLego.lego.id) || []

      // N-1 gets 3× USE phrases, others get 1×
      const isFirstRevisit = review.legoIndex === n - 1
      const targetPhraseCount = isFirstRevisit ? N1_PHRASE_COUNT : 1
      const remainingSlots = MAX_SPACED_REP_PHRASES - spacedRepCount

      const availablePhrases = reviewUsePhrases.filter(
        p => !usedPhrasesInRound.has(normalizePhrase(p.target_text))
      )

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
          type: 'spaced_rep',
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
        spacedRepCount++
      }
    }

    // Phase 6: USE ×2 - Exactly 2 USE phrases for consolidation
    const usedInConsolidation = new Set()

    for (let c = 0; c < USE_CONSOLIDATION_COUNT; c++) {
      const availableForConsolidation = currentUsePhrases.filter(
        p => !usedPhrasesInRound.has(normalizePhrase(p.target_text)) &&
             !usedInConsolidation.has(normalizePhrase(p.target_text))
      )

      if (availableForConsolidation.length === 0) {
        // Fall back to LEGO if no USE phrases available
        const baseNormalized = normalizePhrase(currentLego.lego.target_text)
        if (!usedPhrasesInRound.has(baseNormalized) && !usedInConsolidation.has(baseNormalized)) {
          roundItems.push({
            ...baseItem,
            type: 'use',
            useIndex: c + 1,
            known_text: currentLego.lego.known_text,
            target_text: currentLego.lego.target_text,
            known_audio_uuid: currentLego.lego.known_audio_uuid,
            target1_audio_uuid: currentLego.lego.target1_audio_uuid,
            target2_audio_uuid: currentLego.lego.target2_audio_uuid,
            hasAudio: !!(currentLego.lego.known_audio_uuid && currentLego.lego.target1_audio_uuid),
          })
          usedInConsolidation.add(baseNormalized)
        }
        continue
      }

      const idx = Math.floor(Math.random() * availableForConsolidation.length)
      const usePhrase = availableForConsolidation[idx]

      roundItems.push({
        ...baseItem,
        type: 'use',
        useIndex: c + 1,
        known_text: usePhrase.known_text,
        target_text: usePhrase.target_text,
        known_audio_uuid: usePhrase.known_audio_uuid,
        target1_audio_uuid: usePhrase.target1_audio_uuid,
        target2_audio_uuid: usePhrase.target2_audio_uuid,
        hasAudio: !!(usePhrase.known_audio_uuid && usePhrase.target1_audio_uuid),
      })
      usedInConsolidation.add(normalizePhrase(usePhrase.target_text))
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
      component: allItems.filter(i => i.type === 'component').length,
      debut: allItems.filter(i => i.type === 'debut').length,
      build: allItems.filter(i => i.type === 'build').length,
      spaced_rep: allItems.filter(i => i.type === 'spaced_rep').length,
      use: allItems.filter(i => i.type === 'use').length,
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
