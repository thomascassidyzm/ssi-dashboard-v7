/**
 * Frontend Supabase Client
 *
 * Direct database access for read-only queries.
 * Uses anon key which is safe for browser exposure.
 */

import { createClient } from '@supabase/supabase-js'

// Support both VITE_ (local dev) and NEXT_PUBLIC_ (Vercel Supabase integration) prefixes
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

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
  const [seedsResult, legosResult, phrasesResult, audioResult, legoSeedsResult, translatedResult, genderResult] = await Promise.all([
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
      .eq('course_code', courseCode),
    // Count seeds with both known_text and target_text populated
    supabase
      .from('course_seeds')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)
      .neq('known_text', '')
      .neq('target_text', ''),
    // Count gender expansions
    supabase
      .from('course_gender_expansions')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)
  ])

  // Count unique seed_numbers that have LEGOs
  const completeSeeds = legoSeedsResult.data
    ? new Set(legoSeedsResult.data.map(l => l.seed_number)).size
    : 0

  return {
    seeds: seedsResult.count || 0,
    completeSeeds,
    seedsTranslated: translatedResult.count || 0,
    genderExpansions: genderResult.count || 0,
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
    .select('course_code, known_lang, target_lang, display_name, status, course_type, voice_config, seed_count, pricing_tier, is_community')
    .eq('course_code', courseCode)
    .single()

  if (error) {
    console.error('Failed to get course info:', error)
    return null
  }

  return data
}

/**
 * Get all courses directly from database
 * @returns {Promise<Array>}
 */
export async function getAllCourses() {
  if (!supabase) throw new Error('Supabase not configured')

  const { data, error } = await supabase
    .from('courses')
    .select('*')

  if (error) throw new Error('Failed to load courses: ' + error.message)
  return data || []
}

/**
 * Get all canonical seeds — the 668-row English SSoT — directly from Supabase.
 * Read is direct (no machine/tunnel needed to view); editing a seed saves via
 * the always-on SSi Machine API (see CanonicalSeeds.vue). Returns the shape the
 * view renders: { id, seed_number, seed_id, canonical_id, source }.
 * @returns {Promise<Array<{id:string, seed_number:number, seed_id:string, canonical_id:string, source:string}>>}
 */
export async function getCanonicalSeeds() {
  if (!supabase) throw new Error('Supabase not configured')

  const { data, error } = await supabase
    .from('canonical_seeds')
    .select('id, seed_number, seed_id, canonical_id, source_text')
    .order('seed_number', { ascending: true })

  if (error) throw new Error('Failed to load canonical seeds: ' + error.message)
  return (data || []).map(r => ({
    id: r.id,
    seed_number: r.seed_number,
    seed_id: r.seed_id,
    canonical_id: r.canonical_id,
    source: r.source_text,
  }))
}

/**
 * Get stats for all courses directly from database
 * @param {string[]} courseCodes
 * @returns {Promise<Object>} Map of course_code → { seeds, completedSeeds, legos, phrases, audio }
 */
export async function getAllCourseStats(courseCodes) {
  if (!supabase) throw new Error('Supabase not configured')

  // Single RPC call replaces 195 individual HEAD count queries
  const { data, error } = await supabase.rpc('get_all_course_stats')

  if (error) {
    console.warn('[Supabase] get_all_course_stats RPC failed, falling back to per-course queries:', error.message)
    return getAllCourseStatsFallback(courseCodes)
  }

  const statsMap = {}
  for (const row of (data || [])) {
    statsMap[row.course_code] = {
      seeds: row.seeds || 0,
      completedSeeds: row.completed_seeds || 0,
      legos: row.legos || 0,
      phrases: row.phrases || 0
    }
  }
  return statsMap
}

// Fallback: per-course queries (used if RPC not yet deployed)
async function getAllCourseStatsFallback(courseCodes) {
  const statsMap = {}
  const BATCH_SIZE = 5

  for (let i = 0; i < courseCodes.length; i += BATCH_SIZE) {
    const batch = courseCodes.slice(i, i + BATCH_SIZE)

    await Promise.all(batch.map(async (courseCode) => {
      const [seedsResult, legosResult, phrasesResult, legoSeedsResult] = await Promise.all([
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
          .from('course_legos')
          .select('seed_number')
          .eq('course_code', courseCode)
      ])

      const completedSeeds = legoSeedsResult.data
        ? new Set(legoSeedsResult.data.map(l => l.seed_number)).size
        : 0

      statsMap[courseCode] = {
        seeds: seedsResult.count || 0,
        completedSeeds,
        legos: legosResult.count || 0,
        phrases: phrasesResult.count || 0
      }
    }))
  }

  return statsMap
}

// =============================================================================
// Direct Supabase queries for dashboard reads
// Each function returns the same shape as the API endpoint it replaces.
// Pattern: useBuildMonitor.js already does this — these extend the pattern.
// =============================================================================

/**
 * Get course progress counts
 * Replaces: /api/production/:code/stats, /api/stats/:code
 */
export async function getCourseProgress(courseCode) {
  if (!supabase) throw new Error('Supabase not configured')

  const [seedsRes, legosRes, phrasesRes, decomposedRes] = await Promise.all([
    supabase.from('course_seeds').select('*', { count: 'exact', head: true }).eq('course_code', courseCode),
    supabase.from('course_legos').select('*', { count: 'exact', head: true }).eq('course_code', courseCode),
    supabase.from('course_practice_phrases').select('*', { count: 'exact', head: true }).eq('course_code', courseCode),
    supabase.from('course_seeds').select('*', { count: 'exact', head: true }).eq('course_code', courseCode).not('decomposed_at', 'is', null)
  ])

  return {
    seeds: seedsRes.count || 0,
    completedSeeds: decomposedRes.count || 0,
    legos: legosRes.count || 0,
    phrases: phrasesRes.count || 0
  }
}

/**
 * Get audio stats (counts by role from course_audio)
 * Replaces: /api/production/:code/audio-stats
 * Note: The full Phase 8 plan (deduped counts) stays on proxy — this is the fast approximation
 */
export async function getAudioStats(courseCode) {
  if (!supabase) throw new Error('Supabase not configured')

  const [audioRes, phraseRes, newLegoRes] = await Promise.all([
    supabase.from('course_audio').select('role').eq('course_code', courseCode),
    supabase.from('course_practice_phrases').select('*', { count: 'exact', head: true }).eq('course_code', courseCode),
    supabase.from('course_legos').select('*', { count: 'exact', head: true }).eq('course_code', courseCode).eq('is_new', true)
  ])

  const audioRows = audioRes.data || []
  const existing = audioRows.length
  // Approximate total: phrases need known + target1 + target2, new legos need presentation
  const phraseAudioNeeded = (phraseRes.count || 0) * 3
  const presentationNeeded = newLegoRes.count || 0
  const total = phraseAudioNeeded + presentationNeeded

  // Count by role
  const byRole = {}
  for (const row of audioRows) {
    byRole[row.role] = (byRole[row.role] || 0) + 1
  }

  return {
    success: true,
    total,
    existing,
    missing: Math.max(0, total - existing),
    breakdown: {
      phrases: phraseRes.count || 0,
      seeds: 0,
      uniquePhraseAudio: byRole.known || 0,
      newLegos: newLegoRes.count || 0,
      presentationsExisting: byRole.presentation || 0,
      sharedNeeded: 0,
      sharedExisting: 0,
      welcomeExists: false
    }
  }
}

/**
 * Get audio metadata from course_audio table
 * Replaces: /api/production/:code/audio-metadata
 */
export async function getAudioMetadata(courseCode) {
  if (!supabase) throw new Error('Supabase not configured')

  const { data, error } = await supabase
    .from('course_audio')
    .select('id, course_code, text, role, s3_key, origin, voice_id, created_at')
    .eq('course_code', courseCode)

  if (error) {
    console.warn('[Supabase] getAudioMetadata error:', error.message)
    return { audio: {} }
  }

  // Index by UUID for easy lookup
  const audio = {}
  for (const row of data || []) {
    audio[row.id] = row
  }
  return { audio }
}

/**
 * Recent human-voice course_audio rows for one (course, voice) — the
 * Synthesis Studio's "listen to a few" sampler after a stitch job completes.
 * Signed playback URLs still come from the production API; S3 auth stays
 * server-side (this only reads the same public metadata columns getAudioMetadata does).
 */
export async function getRecentHumanAudio(courseCode, voiceId, limit = 5) {
  if (!supabase) throw new Error('Supabase not configured')

  const { data, error } = await supabase
    .from('course_audio')
    .select('id, text, created_at')
    .eq('course_code', courseCode)
    .eq('voice_id', voiceId)
    .eq('origin', 'human')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.warn('[Supabase] getRecentHumanAudio error:', error.message)
    return []
  }
  return data || []
}

/**
 * Get audio flags for a course
 * Replaces: /api/production/:code/audio-flags
 */
export async function getAudioFlags(courseCode) {
  if (!supabase) throw new Error('Supabase not configured')

  const { data: flags, error: flagsErr } = await supabase
    .from('audio_flags')
    .select('audio_uuid, status, reason, flagged_by, created_at')
    .eq('course_code', courseCode)

  if (flagsErr) {
    console.warn('[Supabase] getAudioFlags error:', flagsErr.message)
    return { flags: [], stats: {} }
  }

  // Compute stats
  const stats = { total: 0, flagged: 0, resolved: 0 }
  for (const f of flags || []) {
    stats.total++
    if (f.status === 'flagged') stats.flagged++
    else if (f.status === 'resolved') stats.resolved++
  }

  return { flags: flags || [], stats }
}

/**
 * Get seed grid (seeds with decomposition status)
 * Replaces: /api/build/seed-grid/:code
 * Note: useBuildMonitor already has fetchSeedGrid — this is the standalone version
 */
export async function getSeedGrid(courseCode) {
  if (!supabase) throw new Error('Supabase not configured')

  const [seedsRes, legosRes, phrasesRes] = await Promise.all([
    supabase
      .from('course_seeds')
      .select('seed_number, decomposed_at, approved_at, flagged_at')
      .eq('course_code', courseCode)
      .order('seed_number', { ascending: true }),
    supabase
      .from('course_legos')
      .select('seed_number, lego_index, is_new')
      .eq('course_code', courseCode),
    supabase
      .from('course_practice_phrases')
      .select('seed_number, lego_index, phrase_role')
      .eq('course_code', courseCode)
  ])

  if (seedsRes.error || !seedsRes.data) return []

  const legosBySeed = {}
  for (const l of legosRes.data || []) legosBySeed[l.seed_number] = (legosBySeed[l.seed_number] || 0) + 1
  const phrasesBySeed = {}
  for (const p of phrasesRes.data || []) phrasesBySeed[p.seed_number] = (phrasesBySeed[p.seed_number] || 0) + 1

  // USE phrase threshold check (same as useBuildMonitor)
  const newLegos = new Set()
  for (const l of legosRes.data || []) {
    if (l.is_new) newLegos.add(l.seed_number + ':' + l.lego_index)
  }
  const useCounts = {}
  for (const p of phrasesRes.data || []) {
    if (p.phrase_role === 'use') {
      const key = p.seed_number + ':' + p.lego_index
      if (newLegos.has(key)) useCounts[key] = (useCounts[key] || 0) + 1
    }
  }
  const underThreshold = new Set()
  for (const key of newLegos) {
    const seedNum = parseInt(key.split(':')[0])
    if (seedNum > 3 && (useCounts[key] || 0) < 4) underThreshold.add(seedNum)
  }

  return seedsRes.data.map(s => {
    const legos = legosBySeed[s.seed_number] || 0
    const phrases = phrasesBySeed[s.seed_number] || 0
    let status
    if (s.flagged_at) status = 'flagged'
    else if (s.decomposed_at && underThreshold.has(s.seed_number)) status = 'under-threshold'
    else if (s.approved_at) status = 'complete'
    else if (s.decomposed_at) status = 'drafted'
    else if (legos > 0) status = 'building'
    else status = 'empty'
    return { seed: s.seed_number, status, legos, phrases }
  })
}

/**
 * Get the gender pairs for a course, both sides.
 *
 * A text can exist in two gendered wordings, and the two sides vary on
 * DIFFERENT AXES. A gendered known language (e.g. Hindi) marks WHO IS SPEAKING
 * — करता / करती. The target side marks WHO IS BEING TALKED ABOUT — him / her.
 * They are independent, so they are returned as two separate maps and the view
 * gives each its own control; one switch could only ever reach 2 of the 4
 * combinations of a row paired on both sides.
 *
 * Pairs live in `course_gender_expansions`, keyed on the exact `original_text`
 * (same match rule the TTS-time lookup uses in
 * services/gender-haiku-service.cjs `loadGenderMap`).
 *
 * One read per course, both sides at once, and no content tables are touched:
 * the maps are looked up against text the seed view has already loaded.
 *
 * Display only — nothing here touches audio, alternation or approval state.
 * Returns empty maps for a course with no expansion rows, which is the great
 * majority of the estate.
 *
 * @param {string} courseCode
 * @returns {Promise<{known: Map<string, {m: string, f: string}>, target: Map<string, {m: string, f: string}>}>}
 *   each map: text (original or either wording) -> both wordings
 */
export async function getGenderPairs(courseCode) {
  const empty = { known: new Map(), target: new Map() }
  if (!supabase || !courseCode) return empty

  // A course's whole expansion set in one read. PAGE_MAX is a ceiling, not a
  // page size — PostgREST returns the lot in a single response, so there is no
  // offset paging here and no ordering to keep stable.
  const PAGE_MAX = 99999
  const { data: expansions, error } = await supabase
    .from('course_gender_expansions')
    .select('original_text, expanded_f, expanded_m, text_side')
    .eq('course_code', courseCode)
    .range(0, PAGE_MAX)
  if (error) {
    console.warn('[Supabase] getGenderPairs error:', error.message)
    return empty
  }

  const out = { known: new Map(), target: new Map() }
  for (const r of expansions || []) {
    if (!r.expanded_f || !r.expanded_m || r.expanded_f === r.expanded_m) continue
    const map = out[r.text_side === 'target' ? 'target' : 'known']
    const pair = { m: r.expanded_m, f: r.expanded_f }
    // Key on both wordings so a lookup hits whichever one the row stores.
    map.set(r.original_text, pair)
    map.set(r.expanded_m, pair)
    map.set(r.expanded_f, pair)
  }
  return out
}

/**
 * Get QA summary (flagged seed counts)
 * Replaces: /api/production/:code/qa-summary
 * Note: Flags live on course_seeds, not course_practice_phrases
 */
export async function getQASummary(courseCode) {
  if (!supabase) throw new Error('Supabase not configured')

  const [flaggedRes, totalRes] = await Promise.all([
    supabase
      .from('course_seeds')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)
      .not('flagged_at', 'is', null),
    supabase
      .from('course_practice_phrases')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)
  ])

  return {
    total: totalRes.count || 0,
    flagged: flaggedRes.count || 0
  }
}

/**
 * Get QA flags (flagged seed rows)
 * Replaces: /api/production/:code/qa-flags
 * Note: Flags live on course_seeds, not course_practice_phrases
 */
export async function getQAFlags(courseCode, status = 'flagged') {
  if (!supabase) throw new Error('Supabase not configured')

  let query = supabase
    .from('course_seeds')
    .select('seed_number, known_text, target_text, flagged_at')
    .eq('course_code', courseCode)

  if (status === 'flagged') {
    query = query.not('flagged_at', 'is', null)
  }

  const { data, error } = await query.order('seed_number')

  if (error) {
    console.warn('[Supabase] getQAFlags error:', error.message)
    return []
  }
  return data || []
}

/**
 * Get golden review queue from courses.quality_rules
 * Replaces: /api/production/:code/golden-review
 */
export async function getGoldenReviewQueue(courseCode) {
  if (!supabase) throw new Error('Supabase not configured')

  const { data, error } = await supabase
    .from('courses')
    .select('quality_rules')
    .eq('course_code', courseCode)
    .single()

  if (error || !data) return { golden_decompositions: [], golden_seed_count: 10 }

  const qr = data.quality_rules || {}
  return {
    golden_decompositions: qr.golden_decompositions || [],
    golden_seed_count: qr.golden_seed_count || 10,
    build_log: qr.build_log || null
  }
}

/**
 * Get voice config for a course
 * Replaces: /api/production/:code/voice-config
 */
export async function getVoiceConfig(courseCode) {
  if (!supabase) throw new Error('Supabase not configured')

  const { data, error } = await supabase
    .from('courses')
    .select('voice_config')
    .eq('course_code', courseCode)
    .single()

  if (error || !data) return null
  return data.voice_config || null
}

/**
 * Get sample phrases for voice preview
 * Replaces: /api/production/:code/seed-phrases-preview
 */
export async function getSeedPhrasesPreview(courseCode, limit = 10) {
  if (!supabase) throw new Error('Supabase not configured')

  const { data, error } = await supabase
    .from('course_practice_phrases')
    .select('id, seed_number, lego_index, known_text, target_text, phrase_role')
    .eq('course_code', courseCode)
    .limit(limit)

  if (error) {
    console.warn('[Supabase] getSeedPhrasesPreview error:', error.message)
    return []
  }
  return data || []
}

/**
 * Get aggregated feedback above threshold
 * Replaces: /api/production/:code/feedback/aggregated
 */
export async function getFeedbackAggregated(courseCode, { threshold = 3, type = null, limit: maxItems = 50 } = {}) {
  if (!supabase) throw new Error('Supabase not configured')

  let query = supabase
    .from('content_feedback')
    .select('audio_id, feedback_type, comment, created_at, session_context')
    .eq('course_code', courseCode)
    .is('resolved_at', null)
    .order('created_at', { ascending: false })

  if (type) query = query.eq('feedback_type', type)

  const { data, error } = await query
  if (error) {
    console.warn('[Supabase] getFeedbackAggregated error:', error.message)
    return { items: [], total: 0 }
  }

  // Aggregate by audio_id + feedback_type (same logic as production-api)
  const buckets = {}
  for (const fb of data || []) {
    const key = `${fb.audio_id || 'general'}:${fb.feedback_type}`
    if (!buckets[key]) {
      buckets[key] = { audio_id: fb.audio_id, feedback_type: fb.feedback_type, count: 0, comments: [], latest: fb.created_at }
    }
    buckets[key].count++
    if (fb.comment) buckets[key].comments.push(fb.comment)
    if (fb.created_at > buckets[key].latest) buckets[key].latest = fb.created_at
  }

  const items = Object.values(buckets)
    .filter(b => b.count >= threshold)
    .sort((a, b) => b.count - a.count)
    .slice(0, maxItems)

  return { items, total: items.length }
}

/**
 * Get feedback stats for a course
 * Replaces: /api/production/:code/feedback/stats
 */
export async function getFeedbackStats(courseCode) {
  if (!supabase) throw new Error('Supabase not configured')

  const { data, error } = await supabase
    .from('content_feedback')
    .select('feedback_type, resolved_at')
    .eq('course_code', courseCode)

  if (error) {
    console.warn('[Supabase] getFeedbackStats error:', error.message)
    return { total: 0, unresolved: 0, resolved: 0, by_type: {} }
  }

  const stats = { total: 0, unresolved: 0, resolved: 0, by_type: {} }
  for (const fb of data || []) {
    stats.total++
    if (fb.resolved_at) stats.resolved++
    else stats.unresolved++
    stats.by_type[fb.feedback_type] = (stats.by_type[fb.feedback_type] || 0) + 1
  }
  return stats
}

/**
 * Get seed detail (seed + legos + phrases for one seed)
 * Replaces: /api/production/:code/seed/:num
 */
export async function getSeedDetail(courseCode, seedNum) {
  if (!supabase) throw new Error('Supabase not configured')

  const [seedRes, legosRes, phrasesRes] = await Promise.all([
    supabase
      .from('course_seeds')
      .select('*')
      .eq('course_code', courseCode)
      .eq('seed_number', seedNum)
      .single(),
    supabase
      .from('course_legos')
      .select('*')
      .eq('course_code', courseCode)
      .eq('seed_number', seedNum)
      .order('lego_index', { ascending: true }),
    supabase
      .from('course_practice_phrases')
      .select('*')
      .eq('course_code', courseCode)
      .eq('seed_number', seedNum)
      .order('lego_index', { ascending: true })
      .order('position', { ascending: true })
  ])

  return {
    seed: seedRes.data || null,
    legos: legosRes.data || [],
    phrases: phrasesRes.data || []
  }
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
      .from('course_practice_phrases')
      .select('seed_number, lego_index, known_text, target_text, phrase_role, known_audio_id, target1_audio_id, target2_audio_id')
      .eq('course_code', courseCode)
      .gte('seed_number', startSeed)
      .lte('seed_number', endSeed),
    supabase
      .from('course_legos')
      .select('seed_number, lego_index, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id')
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
      known_audio_uuid: cycle.known_audio_id,
      target1_audio_uuid: cycle.target1_audio_id,
      target2_audio_uuid: cycle.target2_audio_id
    })
  }

  const legoAudioMap = new Map()
  for (const lc of (legoCyclesResult.data || [])) {
    legoAudioMap.set(`${lc.seed_number}:${lc.lego_index}`, {
      known_audio_uuid: lc.known_audio_id,
      target1_audio_uuid: lc.target1_audio_id,
      target2_audio_uuid: lc.target2_audio_id
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

      // LEGO COMPLETENESS (Tom, 2026-08-06): completeness is per-ROLE, not
      // per-clip. A LEGO plays only with ALL THREE of intro + target voice 1 +
      // target voice 2. Short of that the player drops the LEGO, the round
      // disappears, and every later LEGO contingent on it breaks downstream —
      // so this is course-breaking, not a cosmetic gap. The known-side clip is
      // NOT part of the triple: `known && target1` was the old gate and it
      // flattered the course (it passed a LEGO with no intro and no voice 2).
      const legoComplete = !!(presentationAudioId
        && legoAudio.target1_audio_uuid && legoAudio.target2_audio_uuid)

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
        legoComplete,
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
        // Both voices, not prompt + voice 1 — a voice-2-only gap kills the round.
        hasAudio: !!(legoAudio.target1_audio_uuid && legoAudio.target2_audio_uuid),
        legoComplete,
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
