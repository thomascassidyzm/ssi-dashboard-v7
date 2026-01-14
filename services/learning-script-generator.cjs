/**
 * Learning Script Generator - Port from SSi Learning App
 *
 * Generates a complete learning journey with ROUNDs and spaced repetition
 * showing exactly what the learner will experience.
 *
 * ROUND Structure (per APML spec):
 * 1. INTRO - Introduction audio ("The Chinese for X is...")
 * 2. COMPONENTS - For M-type LEGOs only
 * 3. DEBUT - The LEGO phrase itself
 * 4. DEBUT PHRASES - Up to 7 shortest phrases by duration
 * 5. SPACED REP - Fibonacci-based reviews:
 *    - N-1 (first revisit) gets 3x eternal phrases
 *    - N-2, N-3, N-5, N-8, etc. get 1x each
 * 6. CONSOLIDATION - 2 eternal phrases for the new LEGO
 *
 * Ported from: ssi-learning-app/packages/player-vue/src/providers/CourseDataProvider.ts
 */

const createLogger = require('./shared/logger.cjs')
const logger = createLogger('LearningScriptGenerator')

// Fibonacci-based skip numbers for spaced repetition
const FIBONACCI = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89]

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
 * Returns debut (shortest 7) and eternal (longest 5) maps
 */
async function loadAllPracticePhrasesGrouped(supabase, courseCode) {
  const debutMap = new Map()  // lego_id -> phrases[]
  const eternalMap = new Map()

  if (!supabase) return { debutMap, eternalMap }

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
        .order('target1_duration_ms', { ascending: true, nullsFirst: false })
        .range(offset, offset + pageSize - 1)

      if (error) {
        logger.error('Query error:', error)
        return { debutMap, eternalMap }
      }

      if (!page || page.length === 0) break

      allData = allData.concat(page)
      if (page.length < pageSize) break
      offset += pageSize
    }

    if (allData.length === 0) return { debutMap, eternalMap }

    logger.info(`Loaded ${allData.length} practice phrases from practice_cycles`)

    // Group by lego_id
    const grouped = new Map()
    for (const row of allData) {
      const legoId = row.lego_id
      if (!grouped.has(legoId)) grouped.set(legoId, [])
      grouped.get(legoId).push(row)
    }

    // Transform and split into debut (first 7) and eternal (last 5)
    for (const [legoId, rows] of grouped) {
      const allPhrases = rows.map(row => ({
        id: row.id,
        known_text: row.known_text,
        target_text: row.target_text,
        position: row.position,
        known_audio_uuid: row.known_audio_uuid,
        target1_audio_uuid: row.target1_audio_uuid,
        target2_audio_uuid: row.target2_audio_uuid,
        known_duration_ms: row.known_duration_ms,
        target1_duration_ms: row.target1_duration_ms,
        target2_duration_ms: row.target2_duration_ms,
      }))

      // Debut = shortest 7 (already sorted by duration)
      const debutPhrases = allPhrases.slice(0, 7)
      if (debutPhrases.length > 0) {
        debutMap.set(legoId, debutPhrases)
      }

      // Eternal = longest 5 (take from end, reverse so longest first)
      const eternalPhrases = allPhrases.slice(-5).reverse()
      if (eternalPhrases.length > 0) {
        eternalMap.set(legoId, eternalPhrases)
      }
    }

    logger.info(`Grouped into ${debutMap.size} LEGOs with debut phrases, ${eternalMap.size} with eternal phrases`)
    return { debutMap, eternalMap }
  } catch (err) {
    logger.error('Error loading practice phrases:', err)
    return { debutMap, eternalMap }
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

  // Load ALL practice phrases split into debut and eternal
  const { debutMap, eternalMap } = await loadAllPracticePhrasesGrouped(supabase, courseCode)

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

  // Generate each ROUND
  for (let n = 1; n <= legos.length; n++) {
    const currentLego = legos[n - 1]
    const currentDebuts = debutMap.get(currentLego.lego.id) || []
    const currentEternals = eternalMap.get(currentLego.lego.id) || []
    const roundItems = []

    // Track phrases used in this round (no duplicates)
    const usedPhrasesInRound = new Set()

    const baseItem = {
      roundNumber: n,
      legoId: currentLego.lego.id,
      legoIndex: n,
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

    // Phase 2: COMPONENTS (for M-type LEGOs - skipped for now)

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

    // Phase 4: DEBUT PHRASES - up to 7 phrases, sorted by target text character count (shortest first)
    // This ensures simpler phrases come before more complex ones
    const sortedDebuts = [...currentDebuts].sort((a, b) =>
      (a.target_text?.length || 0) - (b.target_text?.length || 0)
    )
    for (let i = 0; i < Math.min(sortedDebuts.length, 7); i++) {
      const phrase = sortedDebuts[i]
      if (usedPhrasesInRound.has(normalizePhrase(phrase.target_text))) continue

      roundItems.push({
        ...baseItem,
        type: 'debut_phrase',
        phrasePosition: i + 1,
        known_text: phrase.known_text,
        target_text: phrase.target_text,
        known_audio_uuid: phrase.known_audio_uuid,
        target1_audio_uuid: phrase.target1_audio_uuid,
        target2_audio_uuid: phrase.target2_audio_uuid,
        hasAudio: !!(phrase.known_audio_uuid && phrase.target1_audio_uuid),
      })
      usedPhrasesInRound.add(normalizePhrase(phrase.target_text))
    }

    // Phase 5: SPACED REP - Interleaved reviews from eternal phrases
    const reviews = calculateSpacedRepReviews(n)
    const reviewIndices = []

    for (const review of reviews) {
      const reviewLego = legoMap.get(review.legoIndex)
      if (!reviewLego) continue

      reviewIndices.push(review.legoIndex)
      const reviewEternals = eternalMap.get(reviewLego.lego.id) || []

      // N-1 gets 3x phrases, others get 1x
      const isFirstRevisit = review.legoIndex === n - 1
      const targetPhraseCount = isFirstRevisit ? 3 : 1

      const availablePhrases = reviewEternals.filter(
        p => !usedPhrasesInRound.has(normalizePhrase(p.target_text))
      )

      const phrasesToAdd = Math.min(targetPhraseCount, availablePhrases.length)

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
      }
    }

    // Phase 6: CONSOLIDATION - 2 eternal phrases for the new LEGO
    const usedConsolidation = new Set()

    for (let c = 0; c < 2; c++) {
      const availableForConsolidation = currentEternals.filter(
        p => !usedPhrasesInRound.has(normalizePhrase(p.target_text)) &&
             !usedConsolidation.has(normalizePhrase(p.target_text))
      )

      if (availableForConsolidation.length === 0) {
        // Fall back to debut if no eternals
        const baseNormalized = normalizePhrase(currentLego.lego.target_text)
        if (!usedPhrasesInRound.has(baseNormalized) && !usedConsolidation.has(baseNormalized)) {
          roundItems.push({
            ...baseItem,
            type: 'consolidation',
            consolidationIndex: c + 1,
            known_text: currentLego.lego.known_text,
            target_text: currentLego.lego.target_text,
            known_audio_uuid: currentLego.lego.known_audio_uuid,
            target1_audio_uuid: currentLego.lego.target1_audio_uuid,
            target2_audio_uuid: currentLego.lego.target2_audio_uuid,
            hasAudio: !!(currentLego.lego.known_audio_uuid && currentLego.lego.target1_audio_uuid),
          })
          usedConsolidation.add(baseNormalized)
        }
        continue
      }

      const idx = Math.floor(Math.random() * availableForConsolidation.length)
      const consolidation = availableForConsolidation[idx]

      roundItems.push({
        ...baseItem,
        type: 'consolidation',
        consolidationIndex: c + 1,
        known_text: consolidation.known_text,
        target_text: consolidation.target_text,
        known_audio_uuid: consolidation.known_audio_uuid,
        target1_audio_uuid: consolidation.target1_audio_uuid,
        target2_audio_uuid: consolidation.target2_audio_uuid,
        hasAudio: !!(consolidation.known_audio_uuid && consolidation.target1_audio_uuid),
      })
      usedConsolidation.add(normalizePhrase(consolidation.target_text))
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
      debut_phrase: allItems.filter(i => i.type === 'debut_phrase').length,
      spaced_rep: allItems.filter(i => i.type === 'spaced_rep').length,
      consolidation: allItems.filter(i => i.type === 'consolidation').length,
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
