/**
 * Supabase Client Service
 *
 * Centralized database client for audio pipeline operations.
 * Updated for new schema: course_audio + shared_audio tables.
 *
 * Features:
 * - Course-specific audio management (course_audio table)
 * - Shared audio for encouragements/instructions (shared_audio table)
 * - Course management with voice configuration
 * - Text normalization for matching
 *
 * @version 2.0.0 - New schema (Jan 2026)
 */

const { createClient } = require('@supabase/supabase-js')
const createLogger = require('./shared/logger.cjs')
const { generateSampleId, normalizeText: uuidNormalizeText } = require('./uuid-v11.cjs')

const logger = createLogger('Supabase')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseKey) {
  logger.warn('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
}

// Service role client - bypasses RLS for server-side admin operations
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    })
  : null

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generate deterministic UUID from audio parameters
 * Delegates to uuid-v11.cjs generateSampleId() - the single source of truth.
 *
 * @param {string} voiceId - Voice identifier
 * @param {string} text - The phrase text
 * @param {string} lang - ISO 639-3 language code
 * @param {string} role - Audio role (known, target1, target2, presentation)
 * @param {string} cadence - Speaking cadence (natural, slow)
 * @returns {string} UUID v5 in 8-4-4-4-12 format
 */
function generateAudioUUID(voiceId, text, lang, role, cadence) {
  return generateSampleId(voiceId, text, lang, role, cadence)
}

/**
 * Get the hash input string (for debugging/verification)
 */
function getHashInput(voiceId, text, lang, role, cadence) {
  return `${voiceId}:${lang}:${role}:${cadence}:${text}`
}

/**
 * Normalize text for consistent matching
 * Lowercases, trims, and collapses whitespace.
 */
function normalizeText(text) {
  return uuidNormalizeText(text)
}

/**
 * Check if Supabase is properly initialized
 */
function isInitialized() {
  return !!supabase
}

/**
 * Get the Supabase client instance
 */
function getClient() {
  return supabase
}

// =============================================================================
// COURSE MANAGEMENT
// =============================================================================

/**
 * Get course by code
 *
 * @param {string} courseCode
 * @returns {Promise<Object|null>}
 */
async function getCourse(courseCode) {
  if (!supabase) throw new Error('Supabase not initialized')

  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('code', courseCode)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw error
  }
  return data
}

/**
 * Get all courses
 *
 * @param {Object} filters - Optional filters
 * @param {string} filters.status - Filter by status (draft, beta, released)
 * @param {string} filters.courseType - Filter by course_type (official, community)
 * @returns {Promise<Array>}
 */
async function getCourses(filters = {}) {
  if (!supabase) throw new Error('Supabase not initialized')

  let query = supabase.from('courses').select('*')

  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  if (filters.courseType) {
    query = query.eq('course_type', filters.courseType)
  }

  const { data, error } = await query.order('display_name')

  if (error) throw error
  return data || []
}

/**
 * Get course voice configuration
 *
 * @param {string} courseCode
 * @returns {Promise<Object|null>} Voice config object or null
 */
async function getCourseVoices(courseCode) {
  if (!supabase) throw new Error('Supabase not initialized')

  const { data, error } = await supabase
    .from('courses')
    .select('voice_config')
    .eq('code', courseCode)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw error
  }

  return data?.voice_config || null
}

/**
 * Create or update course record
 *
 * @param {Object} course
 * @param {string} course.code - Course code (e.g., 'spa_for_eng')
 * @param {string} course.displayName - Display name
 * @param {string} course.knownLang - Known language code
 * @param {string} course.targetLang - Target language code
 * @param {Object} course.voiceConfig - Voice configuration per role
 * @param {string} course.status - draft, beta, released
 * @param {string} course.courseType - official, community
 * @param {string} course.creatorEmail - Creator email (optional)
 * @returns {Promise<Object>}
 */
async function upsertCourse({
  code,
  displayName,
  knownLang,
  targetLang,
  voiceConfig = {},
  status = 'draft',
  courseType = 'official',
  creatorEmail = null
}) {
  if (!supabase) throw new Error('Supabase not initialized')

  const { data, error } = await supabase
    .from('courses')
    .upsert({
      code,
      display_name: displayName,
      known_lang: knownLang,
      target_lang: targetLang,
      voice_config: voiceConfig,
      status,
      course_type: courseType,
      creator_email: creatorEmail
    }, {
      onConflict: 'code'
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update course voice configuration
 *
 * @param {string} courseCode
 * @param {Object} voiceConfig - { known: voiceId, target1: voiceId, target2: voiceId, presentation: voiceId }
 * @returns {Promise<Object>}
 */
async function updateCourseVoices(courseCode, voiceConfig) {
  if (!supabase) throw new Error('Supabase not initialized')

  const { data, error } = await supabase
    .from('courses')
    .update({ voice_config: voiceConfig })
    .eq('code', courseCode)
    .select()
    .single()

  if (error) throw error
  return data
}

// =============================================================================
// COURSE AUDIO (course-specific audio)
// =============================================================================

/**
 * Check if course audio exists by course, text, language, and role
 *
 * @param {string} courseCode
 * @param {string} text
 * @param {string} language
 * @param {string} role
 * @returns {Promise<boolean>}
 */
async function courseAudioExists(courseCode, text, language, role) {
  if (!supabase) throw new Error('Supabase not initialized')

  const textNormalized = normalizeText(text)

  const { data, error } = await supabase
    .from('course_audio')
    .select('id')
    .eq('course_code', courseCode)
    .eq('text_normalized', textNormalized)
    .eq('language', language)
    .eq('role', role)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw error
  }
  return !!data
}

/**
 * Get course audio by ID
 *
 * @param {string} id - UUID
 * @returns {Promise<Object|null>}
 */
async function getCourseAudio(id) {
  if (!supabase) throw new Error('Supabase not initialized')

  const { data, error } = await supabase
    .from('course_audio')
    .select('*')
    .eq('id', id)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw error
  }
  return data
}

/**
 * Find course audio by text, language, and role
 *
 * @param {string} courseCode
 * @param {string} text
 * @param {string} language
 * @param {string} role
 * @returns {Promise<Object|null>}
 */
async function findCourseAudio(courseCode, text, language, role) {
  if (!supabase) throw new Error('Supabase not initialized')

  const textNormalized = normalizeText(text)

  const { data, error } = await supabase
    .from('course_audio')
    .select('*')
    .eq('course_code', courseCode)
    .eq('text_normalized', textNormalized)
    .eq('language', language)
    .eq('role', role)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw error
  }
  return data
}

/**
 * Insert course audio
 *
 * @param {Object} params
 * @returns {Promise<Object>}
 */
async function insertCourseAudio({
  courseCode,
  text,
  language,
  role,
  voiceId,
  origin,
  s3Key,
  durationMs = null,
  fileSizeBytes = null
}) {
  if (!supabase) throw new Error('Supabase not initialized')

  const textNormalized = normalizeText(text)

  const { data, error } = await supabase
    .from('course_audio')
    .insert({
      course_code: courseCode,
      text,
      text_normalized: textNormalized,
      language,
      role,
      voice_id: voiceId,
      origin,
      s3_key: s3Key,
      duration_ms: durationMs,
      file_size_bytes: fileSizeBytes
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Upsert course audio (insert or update on conflict)
 *
 * @param {Object} params
 * @returns {Promise<Object>}
 */
async function upsertCourseAudio({
  courseCode,
  text,
  language,
  role,
  voiceId,
  origin,
  s3Key,
  durationMs = null,
  fileSizeBytes = null
}) {
  if (!supabase) throw new Error('Supabase not initialized')

  const textNormalized = normalizeText(text)

  // First try to find existing
  const existing = await findCourseAudio(courseCode, text, language, role)

  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from('course_audio')
      .update({
        voice_id: voiceId,
        origin,
        s3_key: s3Key,
        duration_ms: durationMs,
        file_size_bytes: fileSizeBytes
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    // Insert new
    return insertCourseAudio({
      courseCode,
      text,
      language,
      role,
      voiceId,
      origin,
      s3Key,
      durationMs,
      fileSizeBytes
    })
  }
}

/**
 * Get all audio for a course
 *
 * @param {string} courseCode
 * @param {Object} filters - Optional filters
 * @param {string} filters.role - Filter by role
 * @param {string} filters.language - Filter by language
 * @returns {Promise<Array>}
 */
async function getCourseAudioList(courseCode, filters = {}) {
  if (!supabase) throw new Error('Supabase not initialized')

  let query = supabase
    .from('course_audio')
    .select('*')
    .eq('course_code', courseCode)

  if (filters.role) {
    query = query.eq('role', filters.role)
  }
  if (filters.language) {
    query = query.eq('language', filters.language)
  }

  const { data, error } = await query.order('created_at')

  if (error) throw error
  return data || []
}

/**
 * Get audio inventory summary for a course
 *
 * @param {string} courseCode
 * @returns {Promise<Array>} Array of { role, origin, count, voice_count }
 */
async function getCourseAudioSummary(courseCode) {
  if (!supabase) throw new Error('Supabase not initialized')

  const { data, error } = await supabase
    .rpc('get_course_audio_summary', { p_course_code: courseCode })

  if (error) throw error
  return data || []
}

/**
 * Get missing audio for a course
 *
 * @param {string} courseCode
 * @param {Array} needed - Array of { text, language, role }
 * @returns {Promise<Array>} Array of missing { text, language, role }
 */
async function getMissingAudio(courseCode, needed) {
  if (!supabase) throw new Error('Supabase not initialized')

  const { data, error } = await supabase
    .rpc('get_missing_audio', {
      p_course_code: courseCode,
      p_needed: JSON.stringify(needed)
    })

  if (error) throw error
  return data || []
}

/**
 * Batch check which texts have audio for a course
 *
 * @param {string} courseCode
 * @param {Array} items - Array of { text, language, role }
 * @returns {Promise<Array>} Array of { text, language, role, exists }
 */
async function batchCheckCourseAudio(courseCode, items) {
  if (!supabase) throw new Error('Supabase not initialized')
  if (!items || items.length === 0) return []

  // Get all existing audio for this course
  const { data, error } = await supabase
    .from('course_audio')
    .select('text_normalized, language, role')
    .eq('course_code', courseCode)

  if (error) throw error

  // Create a lookup set
  const existingSet = new Set(
    (data || []).map(a => `${a.text_normalized}|${a.language}|${a.role}`)
  )

  // Check each item
  return items.map(item => ({
    ...item,
    exists: existingSet.has(`${normalizeText(item.text)}|${item.language}|${item.role}`)
  }))
}

// =============================================================================
// SHARED AUDIO (encouragements, instructions)
// =============================================================================

/**
 * Check if shared audio exists
 *
 * @param {string} text
 * @param {string} language
 * @param {string} audioType - encouragement, instruction
 * @returns {Promise<boolean>}
 */
async function sharedAudioExists(text, language, audioType) {
  if (!supabase) throw new Error('Supabase not initialized')

  const textNormalized = normalizeText(text)

  const { data, error } = await supabase
    .from('shared_audio')
    .select('id')
    .eq('text_normalized', textNormalized)
    .eq('language', language)
    .eq('audio_type', audioType)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw error
  }
  return !!data
}

/**
 * Get shared audio by ID
 *
 * @param {string} id - UUID
 * @returns {Promise<Object|null>}
 */
async function getSharedAudio(id) {
  if (!supabase) throw new Error('Supabase not initialized')

  const { data, error } = await supabase
    .from('shared_audio')
    .select('*')
    .eq('id', id)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw error
  }
  return data
}

/**
 * Find shared audio by text, language, and type
 *
 * @param {string} text
 * @param {string} language
 * @param {string} audioType
 * @returns {Promise<Object|null>}
 */
async function findSharedAudio(text, language, audioType) {
  if (!supabase) throw new Error('Supabase not initialized')

  const textNormalized = normalizeText(text)

  const { data, error } = await supabase
    .from('shared_audio')
    .select('*')
    .eq('text_normalized', textNormalized)
    .eq('language', language)
    .eq('audio_type', audioType)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw error
  }
  return data
}

/**
 * Insert shared audio
 *
 * @param {Object} params
 * @returns {Promise<Object>}
 */
async function insertSharedAudio({
  text,
  language,
  audioType,
  voiceId,
  origin,
  s3Key,
  durationMs = null
}) {
  if (!supabase) throw new Error('Supabase not initialized')

  const textNormalized = normalizeText(text)

  const { data, error } = await supabase
    .from('shared_audio')
    .insert({
      text,
      text_normalized: textNormalized,
      language,
      audio_type: audioType,
      voice_id: voiceId,
      origin,
      s3_key: s3Key,
      duration_ms: durationMs
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Upsert shared audio
 *
 * @param {Object} params
 * @returns {Promise<Object>}
 */
async function upsertSharedAudio({
  text,
  language,
  audioType,
  voiceId,
  origin,
  s3Key,
  durationMs = null
}) {
  if (!supabase) throw new Error('Supabase not initialized')

  const existing = await findSharedAudio(text, language, audioType)

  if (existing) {
    const { data, error } = await supabase
      .from('shared_audio')
      .update({
        voice_id: voiceId,
        origin,
        s3_key: s3Key,
        duration_ms: durationMs
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    return insertSharedAudio({
      text,
      language,
      audioType,
      voiceId,
      origin,
      s3Key,
      durationMs
    })
  }
}

/**
 * Get all shared audio for a language
 *
 * @param {string} language
 * @param {string} audioType - Optional filter by type
 * @returns {Promise<Array>}
 */
async function getSharedAudioList(language, audioType = null) {
  if (!supabase) throw new Error('Supabase not initialized')

  let query = supabase
    .from('shared_audio')
    .select('*')
    .eq('language', language)

  if (audioType) {
    query = query.eq('audio_type', audioType)
  }

  const { data, error } = await query.order('created_at')

  if (error) throw error
  return data || []
}

// =============================================================================
// CONTENT STATS
// =============================================================================

/**
 * Get content stats for a course
 *
 * @param {string} courseCode
 * @returns {Promise<Object>}
 */
async function getCourseContentStats(courseCode) {
  if (!supabase) throw new Error('Supabase not initialized')

  const stats = { seeds: 0, legos: 0, baskets: 0, introductions: 0, audio: 0 }

  // Count seeds
  const { count: seedCount } = await supabase
    .from('course_seeds')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)
  stats.seeds = seedCount || 0

  // Count legos
  const { count: legoCount } = await supabase
    .from('course_legos')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)
  stats.legos = legoCount || 0

  // Baskets = same as legos (1 basket per lego)
  stats.baskets = legoCount || 0

  // Count introductions
  const { count: introCount } = await supabase
    .from('lego_introductions')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)
  stats.introductions = introCount || 0

  // Count course audio
  const { count: audioCount } = await supabase
    .from('course_audio')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)
  stats.audio = audioCount || 0

  return stats
}

/**
 * Get content stats for all courses
 * Returns an object keyed by course code
 *
 * @returns {Promise<Object>} { courseCode: { seeds, legos, baskets }, ... }
 */
async function getAllCourseContentStats() {
  if (!supabase) throw new Error('Supabase not initialized')

  // Get all courses first
  const { data: courses, error: courseError } = await supabase
    .from('courses')
    .select('code')

  if (courseError) throw courseError

  const result = {}

  // Get counts per course in parallel
  await Promise.all((courses || []).map(async (course) => {
    const courseCode = course.code

    const [seedsResult, legosResult, audioResult] = await Promise.all([
      supabase.from('course_seeds').select('*', { count: 'exact', head: true }).eq('course_code', courseCode),
      supabase.from('course_legos').select('*', { count: 'exact', head: true }).eq('course_code', courseCode),
      supabase.from('course_audio').select('*', { count: 'exact', head: true }).eq('course_code', courseCode)
    ])

    result[courseCode] = {
      seeds: seedsResult.count || 0,
      legos: legosResult.count || 0,
      baskets: legosResult.count || 0,  // 1 basket per lego
      audio: audioResult.count || 0
    }
  }))

  return result
}

/**
 * Get introductions for a course
 *
 * @param {string} courseCode
 * @returns {Promise<Object>}
 */
async function getIntroductionsByCourse(courseCode) {
  if (!supabase) throw new Error('Supabase not initialized')

  const { data, error } = await supabase
    .from('lego_introductions')
    .select('lego_id, audio_uuid')
    .eq('course_code', courseCode)
    .order('lego_id', { ascending: true })

  if (error) throw error

  const legoIds = (data || []).map(intro => intro.lego_id)

  return {
    legoIds,
    course_code: courseCode,
    count: legoIds.length,
    hasAudioIntroductions: legoIds.length > 0
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Client
  supabase,
  isInitialized,
  getClient,

  // Utilities
  generateAudioUUID,
  getHashInput,
  normalizeText,

  // Course management
  getCourse,
  getCourses,
  getCourseVoices,
  upsertCourse,
  updateCourseVoices,

  // Course audio
  courseAudioExists,
  getCourseAudio,
  findCourseAudio,
  insertCourseAudio,
  upsertCourseAudio,
  getCourseAudioList,
  getCourseAudioSummary,
  getMissingAudio,
  batchCheckCourseAudio,

  // Shared audio
  sharedAudioExists,
  getSharedAudio,
  findSharedAudio,
  insertSharedAudio,
  upsertSharedAudio,
  getSharedAudioList,

  // Content stats
  getCourseContentStats,
  getAllCourseContentStats,
  getIntroductionsByCourse
}
