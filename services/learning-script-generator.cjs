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
const FIBONACCI = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89]

// Constants (matching learning app)
const MAX_BUILD_PHRASES = 7
const CONSOLIDATE_COUNT = 2
const MAX_SPACED_REP_PHRASES = 12
const N1_PHRASE_COUNT = 3

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
    reviews.push({ legoIndex: reviewLego, fibPosition: i })
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
        .from('practice_cycles')
        .select('*')
        .eq('course_code', courseCode)
        .gte('position', 1)
        .order('lego_id', { ascending: true })
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
        phrase_role: row.phrase_role,
        target_syllable_count: row.target_syllable_count,
        known_audio_uuid: row.known_audio_uuid,
        target1_audio_uuid: row.target1_audio_uuid,
        target2_audio_uuid: row.target2_audio_uuid,
        known_duration_ms: row.known_duration_ms,
        target1_duration_ms: row.target1_duration_ms,
        target2_duration_ms: row.target2_duration_ms,
      }))

      const componentPhrases = allPhrases.filter(p => p.phrase_role === 'component')
      if (componentPhrases.length > 0) componentMap.set(legoId, componentPhrases)

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
 * - BUILD first, then USE fill (with 2 reserved for consolidation)
 * - Round-robin REVIEW selection
 * - legoState map for REVIEW lookups
 */
async function generateLearningScript(supabase, courseCode, maxLegos = 50, offset = 0) {
  if (!supabase) {
    logger.warn('No Supabase client available')
    return { rounds: [], allItems: [], stats: {} }
  }

  const startTime = Date.now()

  const legos = await loadAllUniqueLegos(supabase, courseCode, maxLegos, offset)
  if (legos.length === 0) {
    return { rounds: [], allItems: [], stats: { legosLoaded: 0 } }
  }

  const { buildMap, useMap, componentMap } = await loadAllPracticePhrasesGrouped(supabase, courseCode)

  const legoIds = legos.map(l => l.lego.id)
  const introAudioMap = await loadIntroductionAudio(supabase, courseCode, legoIds)

  const rounds = []
  const allItems = []

  // Normalization helpers (matching learning app)
  const normalizePhrase = (text) => text?.toLowerCase().trim().replace(/[.,!?;:¡¿'"]+/g, '') || ''
  const getPhraseId = (knownText, targetText) => `${normalizePhrase(knownText)}|${normalizePhrase(targetText)}`

  // legoState map: tracks lastRound and useIndex per LEGO for deterministic REVIEW
  const legoState = new Map()
  let roundCounter = 0

  for (let legoIdx = 0; legoIdx < legos.length; legoIdx++) {
    const currentLego = legos[legoIdx]

    // Skip duplicate LEGOs
    if (!currentLego.lego.new) {
      logger.debug(`Skipping duplicate LEGO: ${currentLego.lego.id}`)
      continue
    }

    roundCounter++
    const n = roundCounter

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

    // Phase 1: INTRO
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

    const reservedForConsolidation = new Set()
    let reservedCount = 0
    for (const phrase of sortedUsePhrases) {
      if (reservedCount >= CONSOLIDATE_COUNT) break
      const phraseId = getPhraseId(phrase.known_text, phrase.target_text)
      if (usedPhrasesInRound.has(phraseId)) continue
      reservedForConsolidation.add(phraseId)
      reservedCount++
    }

    // Step 3: Fill remaining BUILD slots with non-reserved USE phrases
    for (const phrase of sortedUsePhrases) {
      if (practiceCount >= MAX_BUILD_PHRASES) break
      const phraseId = getPhraseId(phrase.known_text, phrase.target_text)
      if (usedPhrasesInRound.has(phraseId)) continue
      if (reservedForConsolidation.has(phraseId)) continue

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

    // Phase 5: CONSOLIDATE ×2 - use the reserved phrases (deterministic)
    let consolidateCount = 0
    for (const phrase of sortedUsePhrases) {
      if (consolidateCount >= CONSOLIDATE_COUNT) break
      const phraseId = getPhraseId(phrase.known_text, phrase.target_text)
      if (!reservedForConsolidation.has(phraseId)) continue
      if (usedPhrasesInRound.has(phraseId)) continue
      consolidateCount++
      usedPhrasesInRound.add(phraseId)

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

  return { rounds, allItems, stats, legosLoaded: legos.length }
}

module.exports = {
  generateLearningScript,
  loadAllUniqueLegos,
  loadAllPracticePhrasesGrouped,
  loadIntroductionAudio,
  calculateSpacedRepReviews,
  FIBONACCI,
}
