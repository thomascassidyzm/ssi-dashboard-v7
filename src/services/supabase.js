/**
 * Frontend Supabase Client
 *
 * Direct database access for read-only queries.
 * Uses anon key which is safe for browser exposure.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create client only if configured
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export const isConfigured = () => !!supabase

/**
 * Get course stats directly from database
 * @param {string} courseCode
 * @returns {Promise<{seeds: number, completeSeeds: number, legos: number, practicePhrases: number, audio: number}>}
 */
export async function getCourseStats(courseCode) {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  // Run all count queries in parallel
  const [seedsResult, legosResult, phrasesResult, audioResult, legoSeedsResult] = await Promise.all([
    supabase
      .from('course_seeds')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode),
    supabase
      .from('course_legos')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode),
    supabase
      .from('course_practice_phrases')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode),
    supabase
      .from('course_audio')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode),
    // Get distinct seed_numbers that have LEGOs (complete seeds)
    supabase
      .from('course_legos')
      .select('seed_number')
      .eq('course_code', courseCode)
  ])

  // Count unique seed_numbers that have LEGOs
  const completeSeeds = legoSeedsResult.data
    ? new Set(legoSeedsResult.data.map(l => l.seed_number)).size
    : 0

  return {
    seeds: seedsResult.count || 0,
    completeSeeds,
    legos: legosResult.count || 0,
    practicePhrases: phrasesResult.count || 0,
    audio: audioResult.count || 0
  }
}

/**
 * Get course info from database
 * @param {string} courseCode
 * @returns {Promise<Object>}
 */
export async function getCourseInfo(courseCode) {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  const { data, error } = await supabase
    .from('courses')
    .select('course_code, known_lang, target_lang, display_name, status, course_type, voice_config, seed_count')
    .eq('course_code', courseCode)
    .single()

  if (error) {
    console.error('Failed to get course info:', error)
    return null
  }

  return data
}

/**
 * Generate learning script directly from database
 * v3.0: BUILD/USE phrase roles, Fibonacci spaced rep with 12-phrase cap
 *
 * ROUND structure:
 * 1. INTRO      - presentation audio (future)
 * 2. DEBUT      - the LEGO itself
 * 3. BUILD ×7   - up to 7 BUILD phrases (drilling)
 * 4. SPACED REP - USE phrases from older LEGOs (max 12, Fibonacci timing)
 * 5. USE ×2     - exactly 2 USE phrases (consolidation)
 *
 * @param {string} courseCode
 * @param {number} startSeed
 * @param {number} endSeed
 * @returns {Promise<{items: Array, cycleCount: number, roundCount: number}>}
 */
export async function generateLearningScript(courseCode, startSeed, endSeed) {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  // Constants
  // Spaced rep sequence: N-1 gets 3 phrases, then N-2, N-3, N-5, N-8... (Fibonacci-like)
  const SPACED_REP_OFFSETS = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89]
  const MAX_BUILD_PHRASES = 7
  const USE_CONSOLIDATION_COUNT = 2
  const MAX_SPACED_REP_PHRASES = 12
  const N1_PHRASE_COUNT = 3  // Most recent LEGO (N-1) gets 3 phrases in spaced rep

  // Normalize text for duplicate detection (same audio file = same normalized text)
  // Strips case, whitespace, and trailing punctuation that TTS ignores
  const normalizeText = (text) => {
    if (!text) return ''
    return text
      .toLowerCase()
      .trim()
      .replace(/[.!?。！？]+$/g, '')  // Remove trailing punctuation (EN + JP)
  }

  // Create a unique phrase ID using normalized text
  const getPhraseId = (knownText, targetText) => {
    return `${normalizeText(knownText)}|${normalizeText(targetText)}`
  }

  const countTargetSyllables = (targetText) => {
    if (!targetText) return 0
    const cjkRegex = /[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g
    const cjkChars = targetText.match(cjkRegex)
    if (cjkChars && cjkChars.length > 0) return cjkChars.length
    const vowelClusters = targetText.toLowerCase().match(/[aeiouyáéíóúàèìòùâêîôûäëïöü]+/gi)
    return vowelClusters ? vowelClusters.length : 1
  }

  // Query all data in parallel
  const [legosResult, phrasesResult, cyclesResult, legoCyclesResult, introsResult] = await Promise.all([
    supabase
      .from('course_legos')
      .select('seed_number, lego_index, known_text, target_text, type, is_new')
      .eq('course_code', courseCode)
      .gte('seed_number', startSeed)
      .lte('seed_number', endSeed)
      .order('seed_number', { ascending: true })
      .order('lego_index', { ascending: true }),
    supabase
      .from('course_practice_phrases')
      .select('seed_number, lego_index, known_text, target_text, phrase_role, target_syllable_count, position')
      .eq('course_code', courseCode)
      .gte('seed_number', startSeed)
      .lte('seed_number', endSeed)
      .order('seed_number', { ascending: true })
      .order('lego_index', { ascending: true })
      .order('position', { ascending: true }),
    supabase
      .from('practice_cycles')
      .select('seed_number, lego_index, known_text, target_text, phrase_role, known_audio_uuid, target1_audio_uuid, target2_audio_uuid')
      .eq('course_code', courseCode)
      .gte('seed_number', startSeed)
      .lte('seed_number', endSeed),
    supabase
      .from('lego_cycles')
      .select('seed_number, lego_index, known_text, target_text, known_audio_uuid, target1_audio_uuid, target2_audio_uuid')
      .eq('course_code', courseCode)
      .gte('seed_number', startSeed)
      .lte('seed_number', endSeed),
    supabase
      .from('course_audio')
      .select('lego_id, s3_key')
      .eq('course_code', courseCode)
      .eq('role', 'presentation')
      .not('lego_id', 'is', null)
  ])

  if (legosResult.error) throw new Error('Failed to query LEGOs: ' + legosResult.error.message)
  if (phrasesResult.error) throw new Error('Failed to query phrases: ' + phrasesResult.error.message)

  // Build lookup maps
  const audioMap = new Map()
  for (const cycle of (cyclesResult.data || [])) {
    const key = `${cycle.seed_number}:${cycle.lego_index}:${(cycle.known_text || '').toLowerCase()}:${(cycle.target_text || '').toLowerCase()}`
    audioMap.set(key, {
      known_audio_uuid: cycle.known_audio_uuid,
      target1_audio_uuid: cycle.target1_audio_uuid,
      target2_audio_uuid: cycle.target2_audio_uuid
    })
  }

  const legoAudioMap = new Map()
  for (const lc of (legoCyclesResult.data || [])) {
    legoAudioMap.set(`${lc.seed_number}:${lc.lego_index}`, {
      known_audio_uuid: lc.known_audio_uuid,
      target1_audio_uuid: lc.target1_audio_uuid,
      target2_audio_uuid: lc.target2_audio_uuid
    })
  }

  const introAudioMap = new Map()
  for (const intro of (introsResult.data || [])) {
    // s3_key is "{uuid}.mp3" - extract just the UUID
    const uuid = intro.s3_key?.replace('.mp3', '') || null
    if (uuid) introAudioMap.set(intro.lego_id, uuid)
  }

  // Group phrases by LEGO into BUILD and USE pools
  const phrasesByLego = new Map()
  for (const phrase of (phrasesResult.data || [])) {
    const key = `${phrase.seed_number}:${phrase.lego_index}`
    if (!phrasesByLego.has(key)) phrasesByLego.set(key, { build: [], use: [] })
    const group = phrasesByLego.get(key)
    // Skip components - they are never played
    if (phrase.phrase_role === 'component') continue
    // BUILD = drilling phrases (SHORT→MEDIUM), USE = spaced rep eligible (MEDIUM→LONG)
    if (phrase.phrase_role === 'build') group.build.push(phrase)
    else if (phrase.phrase_role === 'use') group.use.push(phrase)
  }

  // Sort BUILD phrases by syllable count (shortest first for drilling progression)
  for (const [, group] of phrasesByLego.entries()) {
    group.build.sort((a, b) =>
      (a.target_syllable_count || countTargetSyllables(a.target_text)) -
      (b.target_syllable_count || countTargetSyllables(b.target_text))
    )
  }

  const getAudioForPhrase = (seedNum, legoIdx, knownText, targetText) => {
    const key = `${seedNum}:${legoIdx}:${(knownText || '').toLowerCase()}:${(targetText || '').toLowerCase()}`
    return audioMap.get(key) || {}
  }

  // Organize LEGOs by seed
  const legosBySeed = new Map()
  for (const lego of (legosResult.data || [])) {
    if (!legosBySeed.has(lego.seed_number)) legosBySeed.set(lego.seed_number, [])
    legosBySeed.get(lego.seed_number).push(lego)
  }

  const sortedSeedNums = Array.from(legosBySeed.keys()).sort((a, b) => a - b)
  const legoState = new Map()
  const items = []
  let cycleNum = 0
  let roundNumber = 0

  // Process each seed
  for (const seedNum of sortedSeedNums) {
    const seedLegos = legosBySeed.get(seedNum).sort((a, b) => a.lego_index - b.lego_index)

    for (const lego of seedLegos) {
      roundNumber++
      const legoKey = `S${String(seedNum).padStart(4, '0')}L${String(lego.lego_index).padStart(2, '0')}`
      const seedId = `S${String(seedNum).padStart(4, '0')}`
      const legoNum = String(lego.lego_index).padStart(2, '0')
      const phraseKey = `${seedNum}:${lego.lego_index}`
      const phrases = phrasesByLego.get(phraseKey) || { build: [], use: [] }
      const legoAudio = legoAudioMap.get(phraseKey) || {}
      const presentationAudioId = introAudioMap.get(legoKey)

      // Track phrases used in this ROUND to prevent repeats
      const usedPhrasesThisRound = new Set()

      // Phase 1: INTRO (presentation audio - future)
      cycleNum++
      items.push({
        uuid: `${legoKey}_intro_${cycleNum}`,
        cycleNum, roundNumber, seedId, legoKey,
        seedCode: seedId, legoCode: legoNum,
        type: 'intro',
        knownText: lego.known_text,
        targetText: lego.target_text,
        presentationAudioId,
        hasAudio: !!presentationAudioId,
        isNew: true
      })

      // Phase 2: DEBUT (the LEGO itself)
      cycleNum++
      items.push({
        uuid: `${legoKey}_debut_${cycleNum}`,
        cycleNum, roundNumber, seedId, legoKey,
        seedCode: seedId, legoCode: legoNum,
        type: 'debut',
        knownText: lego.known_text,
        targetText: lego.target_text,
        sourceId: legoAudio.known_audio_uuid,
        target1Id: legoAudio.target1_audio_uuid,
        target2Id: legoAudio.target2_audio_uuid,
        hasAudio: !!(legoAudio.known_audio_uuid && legoAudio.target1_audio_uuid),
        isNew: true
      })

      // Phase 3: PRACTICE PHRASES up to 7 (all BUILD + fill with USE)
      // Take ALL build phrases first, then fill remaining slots with USE phrases
      let practiceCount = 0
      const usedForPractice = new Set()  // Track USE phrases used in practice (exclude from consolidate)

      // First: Add ALL BUILD phrases (up to max)
      for (const phrase of phrases.build) {
        if (practiceCount >= MAX_BUILD_PHRASES) break
        cycleNum++
        practiceCount++
        const phraseId = getPhraseId(phrase.known_text, phrase.target_text)
        usedPhrasesThisRound.add(phraseId)
        const audio = getAudioForPhrase(seedNum, lego.lego_index, phrase.known_text, phrase.target_text)
        items.push({
          uuid: `${legoKey}_build_${cycleNum}`,
          cycleNum, roundNumber, seedId, legoKey,
          seedCode: seedId, legoCode: legoNum,
          type: 'build',
          knownText: phrase.known_text,
          targetText: phrase.target_text,
          sourceId: audio.known_audio_uuid,
          target1Id: audio.target1_audio_uuid,
          target2Id: audio.target2_audio_uuid,
          hasAudio: !!(audio.known_audio_uuid && audio.target1_audio_uuid),
          isNew: true,
          syllableCount: phrase.target_syllable_count || countTargetSyllables(phrase.target_text)
        })
      }

      // Second: Fill remaining practice slots with USE phrases (sorted by syllable count)
      const sortedUsePhrases = [...phrases.use].sort((a, b) =>
        (a.target_syllable_count || countTargetSyllables(a.target_text)) -
        (b.target_syllable_count || countTargetSyllables(b.target_text))
      )
      for (const phrase of sortedUsePhrases) {
        if (practiceCount >= MAX_BUILD_PHRASES) break
        const phraseId = getPhraseId(phrase.known_text, phrase.target_text)
        if (usedPhrasesThisRound.has(phraseId)) continue  // Skip duplicates

        cycleNum++
        practiceCount++
        usedPhrasesThisRound.add(phraseId)
        usedForPractice.add(phraseId)  // Track so we don't use in consolidate
        const audio = getAudioForPhrase(seedNum, lego.lego_index, phrase.known_text, phrase.target_text)
        items.push({
          uuid: `${legoKey}_build_${cycleNum}`,
          cycleNum, roundNumber, seedId, legoKey,
          seedCode: seedId, legoCode: legoNum,
          type: 'build',  // Still labeled as build for UI consistency
          knownText: phrase.known_text,
          targetText: phrase.target_text,
          sourceId: audio.known_audio_uuid,
          target1Id: audio.target1_audio_uuid,
          target2Id: audio.target2_audio_uuid,
          hasAudio: !!(audio.known_audio_uuid && audio.target1_audio_uuid),
          isNew: true,
          syllableCount: phrase.target_syllable_count || countTargetSyllables(phrase.target_text)
        })
      }

      // Initialize LEGO state with USE phrases for spaced rep
      legoState.set(legoKey, {
        lastRound: roundNumber,
        usePhrases: [...phrases.use],  // Copy for rotation
        useIndex: 0,
        seedNum, legoIndex: lego.lego_index, lego
      })

      // Phase 4: SPACED REP - USE phrases from older LEGOs (max 12 total)
      // Sequence: N-1 (3 phrases), N-2 (1), N-3 (1), N-5 (1), N-8 (1), N-13 (1)...
      const dueForReview = []
      const seenLegos = new Set()

      // Find LEGOs due for review based on spaced rep offsets
      for (let offsetIdx = 0; offsetIdx < SPACED_REP_OFFSETS.length; offsetIdx++) {
        const offset = SPACED_REP_OFFSETS[offsetIdx]
        const reviewRound = roundNumber - offset
        if (reviewRound < 1) break

        for (const [prevKey, state] of legoState.entries()) {
          if (prevKey === legoKey || seenLegos.has(prevKey)) continue
          if (state.lastRound === reviewRound) {
            // N-1 (offset=1, most recent) gets 3 phrases, all others get 1
            const isN1 = offset === 1
            const phraseCount = isN1 ? N1_PHRASE_COUNT : 1
            dueForReview.push({ key: prevKey, state, fibPosition: offsetIdx, phraseCount })
            seenLegos.add(prevKey)
          }
        }
      }

      // Cap total spaced rep at MAX_SPACED_REP_PHRASES (12)
      let spacedRepCount = 0
      for (const { key: reviewKey, state, fibPosition, phraseCount } of dueForReview) {
        if (spacedRepCount >= MAX_SPACED_REP_PHRASES) break

        // Only use USE phrases for spaced rep (never BUILD)
        if (state.usePhrases.length === 0) continue

        const reviewLegoNum = reviewKey.match(/L(\d+)/)?.[1] || ''
        const reviewSeedId = reviewKey.match(/S\d+/)?.[0] || ''

        // Take phrases from rotating USE pool
        const phrasesToUse = Math.min(phraseCount, MAX_SPACED_REP_PHRASES - spacedRepCount, state.usePhrases.length)
        for (let i = 0; i < phrasesToUse; i++) {
          const phrase = state.usePhrases[state.useIndex % state.usePhrases.length]
          state.useIndex++

          const phraseId = getPhraseId(phrase.known_text, phrase.target_text)
          if (usedPhrasesThisRound.has(phraseId)) continue  // No repeats in same ROUND (normalized)
          usedPhrasesThisRound.add(phraseId)

          cycleNum++
          spacedRepCount++
          const audio = getAudioForPhrase(state.seedNum, state.legoIndex, phrase.known_text, phrase.target_text)
          items.push({
            uuid: `${reviewKey}_spaced_rep_${cycleNum}`,
            cycleNum, roundNumber, seedId: reviewSeedId, legoKey: reviewKey,
            seedCode: reviewSeedId, legoCode: reviewLegoNum,
            type: 'spaced_rep',
            knownText: phrase.known_text,
            targetText: phrase.target_text,
            sourceId: audio.known_audio_uuid,
            target1Id: audio.target1_audio_uuid,
            target2Id: audio.target2_audio_uuid,
            hasAudio: !!(audio.known_audio_uuid && audio.target1_audio_uuid),
            isNew: false,
            fibPosition,
            reviewOf: state.lastRound
          })
        }
      }

      // Phase 5: CONSOLIDATE × 2 (USE phrases not already used in practice)
      let consolidateCount = 0
      for (const phrase of phrases.use) {
        if (consolidateCount >= USE_CONSOLIDATION_COUNT) break
        const phraseId = getPhraseId(phrase.known_text, phrase.target_text)
        if (usedPhrasesThisRound.has(phraseId)) continue  // No repeats in same ROUND (normalized)
        if (usedForPractice.has(phraseId)) continue  // Skip phrases already used in practice
        consolidateCount++
        usedPhrasesThisRound.add(phraseId)

        cycleNum++
        const audio = getAudioForPhrase(seedNum, lego.lego_index, phrase.known_text, phrase.target_text)
        items.push({
          uuid: `${legoKey}_use_${cycleNum}`,
          cycleNum, roundNumber, seedId, legoKey,
          seedCode: seedId, legoCode: legoNum,
          type: 'use',
          knownText: phrase.known_text,
          targetText: phrase.target_text,
          sourceId: audio.known_audio_uuid,
          target1Id: audio.target1_audio_uuid,
          target2Id: audio.target2_audio_uuid,
          hasAudio: !!(audio.known_audio_uuid && audio.target1_audio_uuid),
          isNew: true
        })
      }
    }
  }

  console.log(`[generateLearningScript] Generated ${items.length} items for ${courseCode} seeds ${startSeed}-${endSeed}`)
  return { items, cycleCount: cycleNum, roundCount: roundNumber }
}
