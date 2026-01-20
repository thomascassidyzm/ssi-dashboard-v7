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
    .select('course_code, known_lang, target_lang, display_name, status, course_type, voice_config')
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
 * v2.0: NO components, gentle ramping, Fibonacci spaced rep
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
  const FIBONACCI = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89]
  const INTRO_PHRASES = 7

  // Ramping functions
  const getN1PhraseCount = (roundNumber) => {
    if (roundNumber <= 3) return 1
    if (roundNumber <= 5) return 2
    return 3
  }

  const getConsolidationEternalCount = (roundNumber) => {
    if (roundNumber <= 4) return 0
    if (roundNumber <= 7) return 1
    return 2
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

  // Group phrases by LEGO
  const phrasesByLego = new Map()
  for (const phrase of (phrasesResult.data || [])) {
    const key = `${phrase.seed_number}:${phrase.lego_index}`
    if (!phrasesByLego.has(key)) phrasesByLego.set(key, { practice: [], eternal: [] })
    const group = phrasesByLego.get(key)
    if (phrase.phrase_role === 'component') continue  // v2.0: NO COMPONENTS
    if (phrase.phrase_role === 'practice') group.practice.push(phrase)
    else if (phrase.phrase_role === 'eternal_eligible') group.eternal.push(phrase)
  }

  // Sort practice phrases by syllable count
  for (const [, group] of phrasesByLego.entries()) {
    group.practice.sort((a, b) =>
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
      const phrases = phrasesByLego.get(phraseKey) || { practice: [], eternal: [] }
      const legoAudio = legoAudioMap.get(phraseKey) || {}
      const presentationAudioId = introAudioMap.get(legoKey)

      // Phase 1: Intro
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

      // Phase 2: LEGO Debut
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

      // Phase 3: Up to 7 debut phrases
      const debutPractice = phrases.practice.slice(0, INTRO_PHRASES)
      for (const phrase of debutPractice) {
        cycleNum++
        const audio = getAudioForPhrase(seedNum, lego.lego_index, phrase.known_text, phrase.target_text)
        items.push({
          uuid: `${legoKey}_debut_phrase_${cycleNum}`,
          cycleNum, roundNumber, seedId, legoKey,
          seedCode: seedId, legoCode: legoNum,
          type: 'debut_phrase',
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

      // Initialize LEGO state
      const eternalPool = [...phrases.eternal, ...phrases.practice.slice(INTRO_PHRASES)]
      legoState.set(legoKey, {
        fibPosition: 0, lastRound: roundNumber, reviewCount: 0,
        eternalPhrases: eternalPool, allPhrases: phrases.practice,
        seedNum, legoIndex: lego.lego_index, lego
      })

      // Phase 4: Spaced rep
      const dueForReview = []
      const seenLegos = new Set()
      for (let i = 0; i < FIBONACCI.length; i++) {
        const reviewRound = roundNumber - FIBONACCI[i]
        if (reviewRound < 1) break
        for (const [prevKey, state] of legoState.entries()) {
          if (prevKey === legoKey || seenLegos.has(prevKey)) continue
          if (state.lastRound === reviewRound || (i === 0 && state.lastRound === roundNumber - 1)) {
            const isN1 = state.lastRound === roundNumber - 1
            dueForReview.push({ key: prevKey, state, fibPosition: i, phraseCount: isN1 ? getN1PhraseCount(roundNumber) : 1 })
            seenLegos.add(prevKey)
          }
        }
      }

      for (const { key: reviewKey, state, fibPosition, phraseCount } of dueForReview) {
        const availablePhrases = state.eternalPhrases.length > 0 ? state.eternalPhrases : state.allPhrases
        const reviewPhrases = availablePhrases.slice(0, phraseCount)
        const reviewLegoNum = reviewKey.match(/L(\d+)/)?.[1] || ''
        const reviewSeedId = reviewKey.match(/S\d+/)?.[0] || ''

        for (const phrase of reviewPhrases) {
          cycleNum++
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
        if (state.eternalPhrases.length > 0) {
          const used = state.eternalPhrases.splice(0, phraseCount)
          state.eternalPhrases.push(...used)
        }
        state.reviewCount++
      }

      // Phase 5: Consolidation
      const consolidationCount = getConsolidationEternalCount(roundNumber)
      const currentState = legoState.get(legoKey)
      if (consolidationCount > 0 && currentState) {
        const consolidationPool = currentState.eternalPhrases.length > 0 ? currentState.eternalPhrases : currentState.allPhrases.slice(INTRO_PHRASES)
        const consolidationPhrases = consolidationPool.slice(0, consolidationCount)
        for (const phrase of consolidationPhrases) {
          cycleNum++
          const audio = getAudioForPhrase(seedNum, lego.lego_index, phrase.known_text, phrase.target_text)
          items.push({
            uuid: `${legoKey}_consolidation_${cycleNum}`,
            cycleNum, roundNumber, seedId, legoKey,
            seedCode: seedId, legoCode: legoNum,
            type: 'consolidation',
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
  }

  console.log(`[generateLearningScript] Generated ${items.length} items for ${courseCode} seeds ${startSeed}-${endSeed}`)
  return { items, cycleCount: cycleNum, roundCount: roundNumber }
}
