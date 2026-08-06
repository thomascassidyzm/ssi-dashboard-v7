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
const { normalizeForAudio } = require('./shared/text-normalize.cjs')
const { canonicalLanguage, canonicalVoiceId } = require('./shared/clip-identity.cjs')
const { pickPreferredAudioRow } = require('./shared/audio-link-preference.cjs')

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

// Canonical text normalization — see services/shared/text-normalize.cjs
function normalizeText(text) {
  return normalizeForAudio(text)
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
    .eq('course_code', courseCode)
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
    .eq('course_code', courseCode)
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
  creatorEmail = null,
  seedCount = 260  // Default release target for MVP
}) {
  if (!supabase) throw new Error('Supabase not initialized')

  const { data, error } = await supabase
    .from('courses')
    .upsert({
      course_code: code,
      display_name: displayName,
      known_lang: knownLang,
      target_lang: targetLang,
      voice_config: voiceConfig,
      status,
      course_type: courseType,
      creator_email: creatorEmail,
      seed_count: seedCount
    }, {
      onConflict: 'course_code'
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
    .eq('course_code', courseCode)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update course status
 *
 * Updates both `status` (internal) and `new_app_status` (for learning app visibility).
 * Learning app filters by new_app_status IN ('released', 'beta') to show courses.
 *
 * @param {string} courseCode
 * @param {string} status - 'draft', 'beta', or 'released'
 * @param {string} [newAppStatus] - Optional override for new_app_status (defaults to same as status)
 * @returns {Promise<Object>}
 */
async function updateCourseStatus(courseCode, status, newAppStatus = null) {
  if (!supabase) throw new Error('Supabase not initialized')

  // Validate status
  const validStatuses = ['draft', 'beta', 'released']
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`)
  }

  // Build update object
  const updateData = {
    status,
    new_app_status: newAppStatus || status
  }

  const { data, error } = await supabase
    .from('courses')
    .update(updateData)
    .eq('course_code', courseCode)
    .select()
    .single()

  if (error) throw error
  return data
}

// =============================================================================
// COURSE AUDIO (course-specific audio)
// =============================================================================

/**
 * Why these lookups no longer use `.single()`.
 *
 * PostgREST returns the SAME error code — PGRST116 — for "zero rows" and for
 * "more than one row". This file used to write `if (error.code !== 'PGRST116')
 * throw` and then treat the row as absent, which reads the second case as the
 * first: where spelling drift has put two rows on one identity, the lookup
 * reported the clip MISSING and the caller went and paid to render it again.
 * Exactly the wrong answer, in the expensive direction, and silent.
 *
 * So: select up to two rows and decide explicitly. Zero is absent. One is the
 * answer. Two or more is a real, reportable condition — the row is present, it
 * is logged with the colliding ids, and the preferred row (human beats TTS,
 * then newest) is returned rather than the arbitrary first.
 */
const MULTIPLICITY_PROBE = 2

function logMultiplicity(fn, rows, filters) {
  logger.warn(
    `${fn}: ${rows.length}+ rows share one identity ${JSON.stringify(filters)} — ` +
    `ids ${rows.map(r => r.id).join(', ')}. Reporting PRESENT and returning the preferred row; ` +
    `previously this reported ABSENT and caused a repeat render.`
  )
}

/**
 * Check if course audio exists by course, text, language, role and voice.
 *
 * @param {string} courseCode
 * @param {string} text
 * @param {string} language canonicalised before the query
 * @param {string} role
 * @param {string} [voiceId] canonicalised; when given, scopes the check to one voice
 * @returns {Promise<boolean>}
 */
async function courseAudioExists(courseCode, text, language, role, voiceId) {
  if (!supabase) throw new Error('Supabase not initialized')

  // Named explicitly because there IS a caller doing this: phase9-manifest-
  // compiler.cjs (:274, :302, :434, :450) passes a single UUID against this
  // four-argument signature, so `language` and `role` arrive undefined and the
  // query becomes `language=eq.undefined` — an existence check that can never
  // return true. It has been silently answering "missing" for every clip. Now
  // it says so instead of lying.
  if (language == null) {
    throw new Error(
      'courseAudioExists(courseCode, text, language, role, voiceId): language is required. ' +
      'A single-argument call (see phase9-manifest-compiler.cjs) has never worked — ' +
      'it queried language=eq.undefined and always reported the clip missing.'
    )
  }

  const textNormalized = normalizeText(text)
  const lang = canonicalLanguage(language)

  let query = supabase
    .from('course_audio')
    .select('id')
    .eq('course_code', courseCode)
    .eq('text_normalized', textNormalized)
    .eq('language', lang)
    .eq('role', role)
  if (voiceId != null) query = query.eq('voice_id', canonicalVoiceId(voiceId))

  const { data, error } = await query.limit(MULTIPLICITY_PROBE)
  if (error) throw error

  const rows = data || []
  if (rows.length >= MULTIPLICITY_PROBE) {
    logMultiplicity('courseAudioExists', rows, { courseCode, textNormalized, language: lang, role, voiceId })
  }
  return rows.length > 0
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
 * Find course audio by text, language, role and voice.
 *
 * `voiceId` is part of a clip's identity, and leaving it out of this lookup was
 * a live defect: upsertCourseAudio uses this as its pre-check, so a row found
 * without regard to voice was then UPDATEd — rewriting an existing clip's
 * voice_id and s3_key in place instead of creating the sibling row a different
 * voice deserves. The row for voice A silently became a row for voice B, and
 * anything already linked to it started playing the wrong voice.
 *
 * Pass `voiceId` whenever you have it. It stays optional only because this is
 * an exported helper with callers outside this repo's view; omitting it means
 * the result is NOT identity-scoped and must not be used as an upsert target.
 *
 * @param {string} courseCode
 * @param {string} text
 * @param {string} language canonicalised before the query
 * @param {string} role
 * @param {string} [voiceId] canonicalised; scopes the lookup to one voice
 * @returns {Promise<Object|null>}
 */
async function findCourseAudio(courseCode, text, language, role, voiceId) {
  if (!supabase) throw new Error('Supabase not initialized')

  const textNormalized = normalizeText(text)
  const lang = canonicalLanguage(language)

  let query = supabase
    .from('course_audio')
    .select('*')
    .eq('course_code', courseCode)
    .eq('text_normalized', textNormalized)
    .eq('language', lang)
    .eq('role', role)
  if (voiceId != null) query = query.eq('voice_id', canonicalVoiceId(voiceId))

  const { data, error } = await query.limit(MULTIPLICITY_PROBE)
  if (error) throw error

  const rows = data || []
  if (!rows.length) return null
  if (rows.length >= MULTIPLICITY_PROBE) {
    logMultiplicity('findCourseAudio', rows, { courseCode, textNormalized, language: lang, role, voiceId })
    return rows.reduce((a, b) => pickPreferredAudioRow(a, b), null)
  }
  return rows[0]
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
  provider,
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
      language: canonicalLanguage(language),
      role,
      voice_id: canonicalVoiceId(voiceId, { provider }),
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
 * Upsert course audio (insert or update on conflict).
 *
 * The pre-check is VOICE-SCOPED. It did not used to be, and that made this
 * function a clip-clobberer: it found the row for whatever voice happened to
 * hold the (course, text, language, role) slot and UPDATEd its voice_id and
 * s3_key to the new voice's, instead of inserting the sibling row a second
 * voice needs. Scoping the lookup means a different voice now finds nothing and
 * inserts — one row per voice, which is what the identity key says.
 *
 * @param {Object} params
 * @param {string} [params.provider] provider for an unprefixed voice id
 * @returns {Promise<Object>}
 */
async function upsertCourseAudio({
  courseCode,
  text,
  language,
  role,
  voiceId,
  provider,
  origin,
  s3Key,
  durationMs = null,
  fileSizeBytes = null
}) {
  if (!supabase) throw new Error('Supabase not initialized')

  const canonicalVoice = canonicalVoiceId(voiceId, { provider })

  // First try to find existing — same voice only (see the note above).
  const existing = await findCourseAudio(courseCode, text, language, role, canonicalVoice)

  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from('course_audio')
      .update({
        voice_id: canonicalVoice,
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
      provider,
      origin,
      s3Key,
      durationMs,
      fileSizeBytes
    })
  }
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
// SAMPLE FLAGS (QA workflow)
// =============================================================================

/**
 * Get all flags for audio in a course
 *
 * @param {string} courseCode
 * @returns {Promise<Array>} Array of flag objects with audio_uuid, status, notes, etc.
 */
async function getCourseFlags(courseCode) {
  if (!supabase) throw new Error('Supabase not initialized')

  // Query sample_flags directly by course_code (much simpler and faster)
  const { data: flagsData, error: flagsError } = await supabase
    .from('sample_flags')
    .select('*')
    .eq('course_code', courseCode)

  if (flagsError) throw flagsError

  return flagsData || []
}

/**
 * Update a sample flag
 *
 * @param {string} audioUuid - The audio UUID
 * @param {Object} updates - { courseCode, status, notes, flaggedBy }
 * @returns {Promise<Object>}
 */
async function updateSampleFlag(audioUuid, { courseCode, status, notes, flaggedBy }) {
  if (!supabase) throw new Error('Supabase not initialized')

  // Check if flag exists
  const { data: existing, error: checkError } = await supabase
    .from('sample_flags')
    .select('*')
    .eq('audio_uuid', audioUuid)
    .single()

  if (checkError && checkError.code !== 'PGRST116') {
    throw checkError
  }

  const now = new Date().toISOString()
  const historyEntry = {
    status,
    notes,
    flaggedBy,
    timestamp: now
  }

  if (existing) {
    // Update existing flag
    const newHistory = [...(existing.history || []), historyEntry]
    const { data, error } = await supabase
      .from('sample_flags')
      .update({
        status,
        notes,
        flagged_by: flaggedBy,
        flagged_at: now,
        history: newHistory
      })
      .eq('audio_uuid', audioUuid)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    // Insert new flag - course_code is required
    const { data, error } = await supabase
      .from('sample_flags')
      .insert({
        audio_uuid: audioUuid,
        course_code: courseCode,
        status,
        notes,
        flagged_by: flaggedBy,
        flagged_at: now,
        history: [historyEntry]
      })
      .select()
      .single()

    if (error) throw error
    return data
  }
}

/**
 * Delete a sample flag (when item is done, no longer needs regen)
 *
 * @param {string} audioUuid - The audio UUID
 * @returns {Promise<void>}
 */
async function deleteSampleFlag(audioUuid) {
  if (!supabase) throw new Error('Supabase not initialized')

  const { error } = await supabase
    .from('sample_flags')
    .delete()
    .eq('audio_uuid', audioUuid)

  if (error) throw error
}

/**
 * Get regeneration attempt count for a sample from its flag history
 *
 * Counts how many times the sample has been through regeneration
 * (status went to 'in_pipeline' or 'regenerating').
 *
 * Used to vary TTS input for Azure determinism workaround.
 *
 * @param {string} audioUuid - Audio UUID
 * @returns {Promise<number>} Regeneration attempt count (0 if never regenerated)
 */
async function getRegenerationCount(audioUuid) {
  if (!supabase) return 0

  const { data, error } = await supabase
    .from('sample_flags')
    .select('history')
    .eq('audio_uuid', audioUuid)
    .single()

  if (error || !data?.history) return 0

  // Count times status was set to 'in_pipeline' (start of regeneration)
  const regenCount = data.history.filter(h =>
    h.status === 'in_pipeline' || h.status === 'regenerating'
  ).length

  return regenCount
}

/**
 * Bulk get regeneration counts for multiple samples
 *
 * @param {Array<string>} audioUuids - Array of audio UUIDs
 * @returns {Promise<Object>} Map of uuid → regeneration count
 */
async function bulkGetRegenerationCounts(audioUuids) {
  if (!supabase) return {}

  const { data, error } = await supabase
    .from('sample_flags')
    .select('audio_uuid, history')
    .in('audio_uuid', audioUuids)

  if (error || !data) return {}

  const counts = {}
  for (const row of data) {
    const regenCount = (row.history || []).filter(h =>
      h.status === 'in_pipeline' || h.status === 'regenerating'
    ).length
    counts[row.audio_uuid] = regenCount
  }

  return counts
}

/**
 * Bulk update sample flags
 *
 * @param {Array} updates - Array of { audioUuid, status, notes, flaggedBy }
 * @returns {Promise<Array>}
 */
async function bulkUpdateSampleFlags(updates) {
  if (!supabase) throw new Error('Supabase not initialized')

  const results = []
  for (const update of updates) {
    const result = await updateSampleFlag(update.audioUuid, {
      status: update.status,
      notes: update.notes,
      flaggedBy: update.flaggedBy
    })
    results.push(result)
  }

  return results
}

/**
 * Get samples flagged for regeneration
 * Returns flags with statuses like 'flagged_regen_tts', 'pending_regen'
 *
 * @param {string} courseCode
 * @returns {Promise<Array>} Array of flag objects with joined audio info
 */
async function getFlaggedForRegeneration(courseCode) {
  if (!supabase) throw new Error('Supabase not initialized')

  // Get flags that need regeneration, with audio info
  const { data, error } = await supabase
    .from('sample_flags')
    .select(`
      audio_uuid,
      status,
      notes,
      flagged_by,
      flagged_at,
      history,
      course_audio (
        id,
        text,
        language,
        role,
        duration_ms
      )
    `)
    .eq('course_code', courseCode)
    .in('status', ['flagged_regen_tts', 'pending_regen', 'in_pipeline'])

  if (error) throw error
  return data || []
}

/**
 * Bulk update flag status for multiple UUIDs
 *
 * @param {Array<string>} uuids - Array of audio UUIDs
 * @param {string} courseCode - Course code
 * @param {string} status - New status
 * @param {string} notes - Optional notes
 * @returns {Promise<number>} Number of updated records
 */
async function bulkUpdateFlagStatus(uuids, courseCode, status, notes = '') {
  if (!supabase) throw new Error('Supabase not initialized')
  if (!uuids || uuids.length === 0) return 0

  const now = new Date().toISOString()

  // Update all matching flags
  const { data, error } = await supabase
    .from('sample_flags')
    .update({
      status,
      notes,
      flagged_at: now
    })
    .in('audio_uuid', uuids)
    .eq('course_code', courseCode)
    .select()

  if (error) throw error
  return data?.length || 0
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

  const [seedsResult, completedSeedsResult, legosResult, phrasesResult, introsResult, audioResult] = await Promise.all([
    supabase.from('course_seeds').select('*', { count: 'exact', head: true }).eq('course_code', courseCode),
    supabase.from('course_seeds').select('*', { count: 'exact', head: true }).eq('course_code', courseCode).neq('target_text', ''),
    supabase.from('course_legos').select('*', { count: 'exact', head: true }).eq('course_code', courseCode),
    supabase.from('course_practice_phrases').select('*', { count: 'exact', head: true }).eq('course_code', courseCode),
    supabase.from('lego_introductions').select('*', { count: 'exact', head: true }).eq('course_code', courseCode),
    supabase.from('course_audio').select('*', { count: 'exact', head: true }).eq('course_code', courseCode)
  ])

  const legos = legosResult.count || 0
  return {
    seeds: seedsResult.count || 0,
    completedSeeds: completedSeedsResult.count || 0,
    legos,
    baskets: legos,
    phrases: phrasesResult.count || 0,
    introductions: introsResult.count || 0,
    audio: audioResult.count || 0
  }
}

/**
 * Get content stats for all courses
 * Returns an object keyed by course code
 *
 * @returns {Promise<Object>} { courseCode: { seeds, completedSeeds, legos, baskets }, ... }
 */
async function getAllCourseContentStats() {
  if (!supabase) throw new Error('Supabase not initialized')

  // Get all courses with seed_count (release target)
  const { data: courses, error: courseError } = await supabase
    .from('courses')
    .select('course_code, seed_count')

  if (courseError) throw courseError

  const result = {}

  // Get counts per course in parallel
  await Promise.all((courses || []).map(async (course) => {
    const courseCode = course.course_code

    const [seedsResult, legosResult, phrasesResult, audioResult, seedsWithLegosResult] = await Promise.all([
      supabase.from('course_seeds').select('*', { count: 'exact', head: true }).eq('course_code', courseCode),
      supabase.from('course_legos').select('*', { count: 'exact', head: true }).eq('course_code', courseCode),
      supabase.from('course_practice_phrases').select('*', { count: 'exact', head: true }).eq('course_code', courseCode),
      supabase.from('course_audio').select('*', { count: 'exact', head: true }).eq('course_code', courseCode),
      // Count distinct seed_numbers that have LEGOs (= fully decomposed seeds)
      supabase.from('course_legos').select('seed_number').eq('course_code', courseCode)
    ])

    // Count unique seed numbers that have LEGOs
    const seedsWithLegos = new Set((seedsWithLegosResult.data || []).map(l => l.seed_number))

    result[courseCode] = {
      seeds: seedsResult.count || 0,
      completedSeeds: seedsWithLegos.size,  // Seeds with LEGOs = fully decomposed
      legos: legosResult.count || 0,
      baskets: legosResult.count || 0,  // 1 basket per lego
      phrases: phrasesResult.count || 0,
      audio: audioResult.count || 0,
      seed_count: course.seed_count || null  // Release target from courses table
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
// DOCUMENTATION CONTENT
// =============================================================================

/**
 * Get documentation by slug with all sections
 *
 * @param {string} slug - Document slug (e.g., 'pedagogy', 'apml-spec')
 * @returns {Promise<Object|null>} Document with sections or null
 */
async function getDocumentation(slug) {
  if (!supabase) throw new Error('Supabase not initialized')

  // Use the RPC function for efficient fetching with sections
  const { data, error } = await supabase
    .rpc('get_documentation', { p_slug: slug })

  if (error) {
    // If RPC doesn't exist yet, fall back to manual query
    if (error.code === 'PGRST202') {
      return getDocumentationFallback(slug)
    }
    throw error
  }

  return data && data.length > 0 ? data[0] : null
}

/**
 * Fallback for getting documentation without RPC function
 * (useful during migration before RPC is deployed)
 */
async function getDocumentationFallback(slug) {
  if (!supabase) throw new Error('Supabase not initialized')

  // Get document
  const { data: doc, error: docError } = await supabase
    .from('documentation_content')
    .select('*')
    .eq('slug', slug)
    .single()

  if (docError && docError.code !== 'PGRST116') {
    throw docError
  }

  if (!doc) return null

  // Get sections
  const { data: sections, error: secError } = await supabase
    .from('documentation_sections')
    .select('*')
    .eq('document_id', doc.id)
    .order('display_order')

  if (secError) throw secError

  return {
    ...doc,
    sections: sections || []
  }
}

/**
 * Get documentation list for navigation
 *
 * @param {string|null} category - Optional category filter
 * @returns {Promise<Array>} Array of document summaries
 */
async function getDocumentationList(category = null) {
  if (!supabase) throw new Error('Supabase not initialized')

  // Try RPC first
  const { data, error } = await supabase
    .rpc('get_documentation_list', { p_category: category })

  if (error) {
    // If RPC doesn't exist yet, fall back to manual query
    if (error.code === 'PGRST202') {
      return getDocumentationListFallback(category)
    }
    throw error
  }

  return data || []
}

/**
 * Fallback for getting documentation list without RPC function
 */
async function getDocumentationListFallback(category = null) {
  if (!supabase) throw new Error('Supabase not initialized')

  let query = supabase
    .from('documentation_content')
    .select('id, slug, title, subtitle, category, display_order, badge_text, badge_color, icon_name, is_featured, updated_at')
    .eq('is_published', true)

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query.order('display_order').order('title')

  if (error) throw error
  return data || []
}

/**
 * Upsert documentation content
 *
 * @param {Object} doc - Document data
 * @returns {Promise<Object>} Created/updated document
 */
async function upsertDocumentation(doc) {
  if (!supabase) throw new Error('Supabase not initialized')

  const { data, error } = await supabase
    .from('documentation_content')
    .upsert({
      slug: doc.slug,
      title: doc.title,
      subtitle: doc.subtitle,
      category: doc.category || 'reference',
      display_order: doc.display_order || 0,
      content_type: doc.content_type || 'structured',
      content: doc.content,
      markdown_content: doc.markdown_content,
      version: doc.version || '1.0',
      badge_text: doc.badge_text,
      badge_color: doc.badge_color,
      icon_name: doc.icon_name,
      is_published: doc.is_published !== false,
      is_featured: doc.is_featured || false
    }, {
      onConflict: 'slug'
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Upsert documentation section
 *
 * @param {string} documentSlug - Parent document slug
 * @param {Object} section - Section data
 * @returns {Promise<Object>} Created/updated section
 */
async function upsertDocumentationSection(documentSlug, section) {
  if (!supabase) throw new Error('Supabase not initialized')

  // Get document ID
  const { data: doc, error: docError } = await supabase
    .from('documentation_content')
    .select('id')
    .eq('slug', documentSlug)
    .single()

  if (docError) throw docError
  if (!doc) throw new Error(`Document not found: ${documentSlug}`)

  const { data, error } = await supabase
    .from('documentation_sections')
    .upsert({
      document_id: doc.id,
      section_key: section.section_key,
      title: section.title,
      anchor: section.anchor || section.section_key,
      content: section.content,
      content_html: section.content_html,
      display_order: section.display_order || 0,
      style_variant: section.style_variant || 'default',
      border_color: section.border_color,
      is_collapsible: section.is_collapsible || false,
      default_collapsed: section.default_collapsed || false
    }, {
      onConflict: 'document_id,section_key'
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// =============================================================================
// AUDIO FLAGS (Simple QA workflow - replaces complex sample_flags)
// =============================================================================

/**
 * Get all flags for a course
 * @param {string} courseCode
 * @returns {Promise<Array>}
 */
async function getAudioFlags(courseCode) {
  if (!supabase) throw new Error('Supabase not initialized')

  const { data, error } = await supabase
    .from('audio_flags')
    .select('*')
    .eq('course_code', courseCode)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Create or update an audio flag
 * @param {string} audioUuid
 * @param {string} courseCode
 * @param {Object} flagData - { status, reason, flagged_by }
 * @returns {Promise<Object>}
 */
async function upsertAudioFlag(audioUuid, courseCode, flagData) {
  if (!supabase) throw new Error('Supabase not initialized')

  const { data, error } = await supabase
    .from('audio_flags')
    .upsert({
      audio_uuid: audioUuid,
      course_code: courseCode,
      status: flagData.status || 'flagged',
      reason: flagData.reason || null,
      flagged_by: flagData.flagged_by || 'qa',
      created_at: new Date().toISOString()
    }, {
      onConflict: 'audio_uuid,course_code'
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Resolve a flag (mark as fixed)
 * @param {string} audioUuid
 * @param {string} courseCode
 * @returns {Promise<Object>}
 */
async function resolveAudioFlag(audioUuid, courseCode) {
  if (!supabase) throw new Error('Supabase not initialized')

  const { data, error } = await supabase
    .from('audio_flags')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString()
    })
    .eq('audio_uuid', audioUuid)
    .eq('course_code', courseCode)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete a flag
 * @param {string} audioUuid
 * @param {string} courseCode
 */
async function deleteAudioFlag(audioUuid, courseCode) {
  if (!supabase) throw new Error('Supabase not initialized')

  const { error } = await supabase
    .from('audio_flags')
    .delete()
    .eq('audio_uuid', audioUuid)
    .eq('course_code', courseCode)

  if (error) throw error
}

/**
 * Bulk resolve audio flags (mark as resolved after regeneration)
 * @param {Array<string>} audioUuids - Array of audio UUIDs
 * @param {string} courseCode - Course code
 * @returns {Promise<number>} Number of resolved records
 */
async function bulkResolveAudioFlags(audioUuids, courseCode) {
  if (!supabase) throw new Error('Supabase not initialized')
  if (!audioUuids || audioUuids.length === 0) return 0

  const { data, error } = await supabase
    .from('audio_flags')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString()
    })
    .eq('course_code', courseCode)
    .in('audio_uuid', audioUuids)
    .select()

  if (error) throw error
  return data?.length || 0
}

/**
 * Get flagged audio with full audio details from course_audio
 * Used for regeneration queue preview
 * @param {string} courseCode
 * @returns {Promise<Array>}
 */
async function getAudioFlagsWithDetails(courseCode) {
  if (!supabase) throw new Error('Supabase not initialized')

  // Get all flagged items
  const { data: flags, error: flagsError } = await supabase
    .from('audio_flags')
    .select('audio_uuid, status, reason, flagged_by, created_at, regen_count')
    .eq('course_code', courseCode)
    .eq('status', 'flagged')

  if (flagsError) throw flagsError
  if (!flags || flags.length === 0) return []

  // Get audio details for flagged items (batch to avoid header overflow with many UUIDs)
  const audioUuids = flags.map(f => f.audio_uuid)
  const BATCH_SIZE = 100
  let audioDetails = []
  for (let i = 0; i < audioUuids.length; i += BATCH_SIZE) {
    const batch = audioUuids.slice(i, i + BATCH_SIZE)
    const { data, error: audioError } = await supabase
      .from('course_audio')
      .select('id, text, language, role, duration_ms, voice_id')
      .in('id', batch)
    if (audioError) throw audioError
    if (data) audioDetails = audioDetails.concat(data)
  }

  // Build lookup map
  const audioMap = {}
  for (const audio of (audioDetails || [])) {
    audioMap[audio.id] = audio
  }

  // Combine flags with audio details
  return flags.map(flag => ({
    ...flag,
    audio: audioMap[flag.audio_uuid] || null
  }))
}

/**
 * Get flagged audio count by status
 * @param {string} courseCode
 * @returns {Promise<Object>}
 */
async function getAudioFlagStats(courseCode) {
  if (!supabase) throw new Error('Supabase not initialized')

  const { data, error } = await supabase
    .from('audio_flags')
    .select('status')
    .eq('course_code', courseCode)

  if (error) throw error

  const stats = { flagged: 0, regenerating: 0, resolved: 0, total: 0 }
  for (const row of (data || [])) {
    stats[row.status] = (stats[row.status] || 0) + 1
    stats.total++
  }
  return stats
}

// =============================================================================
// RECORDING QUEUE (Human Recording Workflow)
// =============================================================================

/**
 * Get recording queue - audio samples flagged for human recording
 * Returns samples with status 'flagged_human_needed' or 'in_recording'
 *
 * @param {string} courseCode - Course code
 * @param {number} page - Page number (1-indexed)
 * @param {number} pageSize - Items per page
 * @returns {Promise<{items: Array, total: number, page: number, pageSize: number}>}
 */
async function getRecordingQueue(courseCode, page = 1, pageSize = 20) {
  if (!supabase) throw new Error('Supabase not initialized')

  // First, get the total count for pagination
  const { count, error: countError } = await supabase
    .from('sample_flags')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)
    .in('status', ['flagged_human_needed', 'in_recording', 'needs_review'])

  if (countError) throw countError

  // Calculate offset for pagination
  const offset = (page - 1) * pageSize

  // Get flags with pagination
  const { data: flags, error: flagsError } = await supabase
    .from('sample_flags')
    .select('audio_uuid, status, notes, flagged_by, flagged_at, history')
    .eq('course_code', courseCode)
    .in('status', ['flagged_human_needed', 'in_recording', 'needs_review'])
    .order('flagged_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (flagsError) throw flagsError
  if (!flags || flags.length === 0) {
    return { items: [], total: count || 0, page, pageSize }
  }

  // Get audio details for flagged items
  const audioUuids = flags.map(f => f.audio_uuid)
  const { data: audioDetails, error: audioError } = await supabase
    .from('course_audio')
    .select('id, text, language, role, duration_ms, voice_id')
    .in('id', audioUuids)

  if (audioError) throw audioError

  // Build a map for quick lookup
  const audioMap = {}
  for (const audio of (audioDetails || [])) {
    audioMap[audio.id] = audio
  }

  // Combine flags with audio details
  const items = flags.map(flag => {
    const audio = audioMap[flag.audio_uuid]
    return {
      uuid: flag.audio_uuid,
      status: flag.status,
      notes: flag.notes,
      flaggedBy: flag.flagged_by,
      flaggedAt: flag.flagged_at,
      // Audio details
      text: audio?.text || '',
      language: audio?.language || '',
      role: audio?.role || '',
      durationMs: audio?.duration_ms || null,
      voiceId: audio?.voice_id || ''
    }
  })

  return {
    items,
    total: count || 0,
    page,
    pageSize
  }
}

/**
 * Update recording status for a sample
 * Used when claiming a sample for recording or marking recording complete
 *
 * @param {string} audioUuid - The audio UUID
 * @param {string} courseCode - Course code
 * @param {string} status - New status (e.g., 'in_recording', 'needs_review')
 * @param {string} notes - Status notes
 * @param {string} claimedBy - Who is recording/claiming this sample
 * @returns {Promise<Object>}
 */
async function updateRecordingStatus(audioUuid, courseCode, status, notes, claimedBy) {
  if (!supabase) throw new Error('Supabase not initialized')

  const now = new Date().toISOString()

  // Check if flag exists
  const { data: existing, error: checkError } = await supabase
    .from('sample_flags')
    .select('*')
    .eq('audio_uuid', audioUuid)
    .single()

  if (checkError && checkError.code !== 'PGRST116') throw checkError

  const historyEntry = {
    status,
    notes,
    flaggedBy: claimedBy,
    timestamp: now
  }

  if (existing) {
    // Update existing flag
    const newHistory = [...(existing.history || []), historyEntry]
    const { data, error } = await supabase
      .from('sample_flags')
      .update({
        status,
        notes,
        flagged_by: claimedBy,
        flagged_at: now,
        history: newHistory
      })
      .eq('audio_uuid', audioUuid)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    // Insert new flag
    const { data, error } = await supabase
      .from('sample_flags')
      .insert({
        audio_uuid: audioUuid,
        course_code: courseCode,
        status,
        notes,
        flagged_by: claimedBy,
        flagged_at: now,
        history: [historyEntry]
      })
      .select()
      .single()

    if (error) throw error
    return data
  }
}

/**
 * Insert recording provenance metadata
 * Tracks who recorded what, when, and with what equipment
 *
 * @param {Object} provenance - Provenance metadata
 * @returns {Promise<Object>}
 */
async function insertRecordingProvenance(provenance) {
  if (!supabase) throw new Error('Supabase not initialized')

  const { data, error } = await supabase
    .from('recording_provenance')
    .insert({
      audio_uuid: provenance.audioUuid,
      recorded_by: provenance.recordedBy,
      speaker_native_language: provenance.speakerNativeLanguage,
      speaker_proficiency: provenance.speakerProficiency,
      speaker_age_range: provenance.speakerAgeRange,
      speaker_dialect: provenance.speakerDialect,
      speaker_region: provenance.speakerRegion,
      recorded_at: provenance.recordedAt,
      recording_location: provenance.recordingLocation,
      recording_device: provenance.recordingDevice,
      recording_environment: provenance.recordingEnvironment,
      speaker_consent: provenance.speakerConsent,
      consent_form_ref: provenance.consentFormRef,
      usage_rights: provenance.usageRights,
      quality_notes: provenance.qualityNotes,
      retake_count: provenance.retakeCount
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// =============================================================================
// COURSE QA FLAGS (Phrase Monitor)
// =============================================================================

/**
 * Get QA flags for a course
 * @param {string} courseCode
 * @param {Object} filters - Optional filters
 * @param {string} filters.status - Filter by status (open, resolved, ignored)
 * @param {string} filters.severity - Filter by severity (error, warning, info)
 * @param {string} filters.checkType - Filter by check type
 * @returns {Promise<Array>}
 */
async function getQAFlags(courseCode, filters = {}) {
  if (!supabase) throw new Error('Supabase not initialized')

  let query = supabase
    .from('course_qa_flags')
    .select('*')
    .eq('course_code', courseCode)
    .order('flagged_at', { ascending: false })

  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  if (filters.severity) {
    query = query.eq('severity', filters.severity)
  }
  if (filters.checkType) {
    query = query.eq('check_type', filters.checkType)
  }

  const { data, error } = await query

  if (error) {
    if (error.code === '42P01') {
      // Table doesn't exist yet
      return []
    }
    throw error
  }
  return data || []
}

/**
 * Insert a QA flag
 * @param {Object} flag
 * @returns {Promise<Object>}
 */
async function insertQAFlag(flag) {
  if (!supabase) throw new Error('Supabase not initialized')

  const { data, error } = await supabase
    .from('course_qa_flags')
    .insert({
      course_code: flag.courseCode,
      phrase_id: flag.phraseId || null,
      seed_number: flag.seedNumber || null,
      lego_id: flag.legoId || null,
      check_type: flag.checkType,
      severity: flag.severity || 'warning',
      issue: flag.issue,
      details: flag.details || {}
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Resolve a QA flag
 * @param {string} flagId
 * @param {string} resolvedBy
 * @param {string} notes
 * @returns {Promise<Object>}
 */
async function resolveQAFlag(flagId, resolvedBy, notes = '') {
  if (!supabase) throw new Error('Supabase not initialized')

  const { data, error } = await supabase
    .from('course_qa_flags')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolved_by: resolvedBy,
      resolution_notes: notes
    })
    .eq('id', flagId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Mark a QA flag as false positive
 * @param {string} flagId
 * @param {string} resolvedBy
 * @param {string} notes
 * @returns {Promise<Object>}
 */
async function markQAFlagFalsePositive(flagId, resolvedBy, notes = '') {
  if (!supabase) throw new Error('Supabase not initialized')

  const { data, error } = await supabase
    .from('course_qa_flags')
    .update({
      status: 'false_positive',
      resolved_at: new Date().toISOString(),
      resolved_by: resolvedBy,
      resolution_notes: notes
    })
    .eq('id', flagId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get QA summary for a course
 * @param {string} courseCode
 * @returns {Promise<Object>}
 */
async function getQASummary(courseCode) {
  if (!supabase) throw new Error('Supabase not initialized')

  const { data, error } = await supabase
    .rpc('get_qa_summary', { p_course_code: courseCode })

  if (error) {
    if (error.code === '42883') {
      // Function doesn't exist - return empty summary
      return { total_flags: 0, error_count: 0, warning_count: 0, info_count: 0, open_count: 0, resolved_count: 0 }
    }
    throw error
  }

  return data?.[0] || { total_flags: 0, error_count: 0, warning_count: 0, info_count: 0, open_count: 0, resolved_count: 0 }
}

/**
 * Get QA flags grouped by type
 * @param {string} courseCode
 * @returns {Promise<Array>}
 */
async function getQAFlagsByType(courseCode) {
  if (!supabase) throw new Error('Supabase not initialized')

  const { data, error } = await supabase
    .rpc('get_qa_flags_by_type', { p_course_code: courseCode })

  if (error) {
    if (error.code === '42883') {
      // Function doesn't exist
      return []
    }
    throw error
  }

  return data || []
}

/**
 * Bulk resolve QA flags
 * @param {Array<string>} flagIds
 * @param {string} resolvedBy
 * @returns {Promise<number>}
 */
async function bulkResolveQAFlags(flagIds, resolvedBy) {
  if (!supabase) throw new Error('Supabase not initialized')
  if (!flagIds || flagIds.length === 0) return 0

  const { data, error } = await supabase
    .from('course_qa_flags')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolved_by: resolvedBy
    })
    .in('id', flagIds)
    .select()

  if (error) throw error
  return data?.length || 0
}

/**
 * Get unchecked phrases for monitor
 * @param {string} courseCode
 * @param {number} limit
 * @returns {Promise<Array>}
 */
async function getUncheckedPhrases(courseCode, limit = 50) {
  if (!supabase) throw new Error('Supabase not initialized')

  const { data, error } = await supabase
    .from('course_practice_phrases')
    .select('id, course_code, seed_number, lego_id, known_text, target_text, phrase_role, created_at')
    .eq('course_code', courseCode)
    .is('qa_checked', null)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) {
    // qa_checked column might not exist
    if (error.code === '42703') {
      return []
    }
    throw error
  }
  return data || []
}

/**
 * Mark phrases as QA checked
 * @param {Array<string>} phraseIds
 * @returns {Promise<void>}
 */
async function markPhrasesChecked(phraseIds) {
  if (!supabase) throw new Error('Supabase not initialized')
  if (!phraseIds || phraseIds.length === 0) return

  const { error } = await supabase
    .from('course_practice_phrases')
    .update({ qa_checked: new Date().toISOString() })
    .in('id', phraseIds)

  if (error) {
    // qa_checked column might not exist
    if (error.code === '42703') {
      return
    }
    throw error
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
  updateCourseStatus,

  // Course audio
  courseAudioExists,
  getCourseAudio,
  findCourseAudio,
  insertCourseAudio,
  upsertCourseAudio,
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

  // Sample flags (QA workflow) - LEGACY
  getCourseFlags,
  updateSampleFlag,
  deleteSampleFlag,
  bulkUpdateSampleFlags,
  getRegenerationCount,
  bulkGetRegenerationCounts,
  getFlaggedForRegeneration,
  bulkUpdateFlagStatus,

  // Audio flags (NEW simple QA workflow)
  getAudioFlags,
  upsertAudioFlag,
  resolveAudioFlag,
  deleteAudioFlag,
  bulkResolveAudioFlags,
  getAudioFlagStats,
  getAudioFlagsWithDetails,

  // Recording queue (Human Recording Workflow)
  getRecordingQueue,
  updateRecordingStatus,
  insertRecordingProvenance,

  // Content stats
  getCourseContentStats,
  getAllCourseContentStats,
  getIntroductionsByCourse,

  // Documentation content
  getDocumentation,
  getDocumentationList,
  upsertDocumentation,
  upsertDocumentationSection,

  // Course QA flags (Phrase Monitor)
  getQAFlags,
  insertQAFlag,
  resolveQAFlag,
  markQAFlagFalsePositive,
  getQASummary,
  getQAFlagsByType,
  bulkResolveQAFlags,
  getUncheckedPhrases,
  markPhrasesChecked
}
