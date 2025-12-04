/**
 * Supabase Client Service
 *
 * Centralized database client for audio pipeline operations.
 * This is the interface between the audio generation system and Supabase.
 *
 * Features:
 * - Deterministic UUID generation from audio parameters
 * - Audio sample CRUD operations
 * - Course audio usage tracking
 * - Voice management
 * - Sample flagging for QA workflow
 *
 * @version 1.0.0
 */

const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn('[Supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
}

// Service role client - bypasses RLS for server-side admin operations
// Must disable session handling for server-side usage
// See: https://supabase.com/docs/guides/troubleshooting/performing-administration-tasks-on-the-server-side-with-the-servicerole-secret-BYM4Fa
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    })
  : null

/**
 * Generate deterministic UUID from audio parameters
 * UUID = SHA256(voice_id|text|lang|role|cadence) truncated to 32 chars
 *
 * @param {string} voiceId - Voice identifier (e.g., 'azure_es-ES-ElviraNeural')
 * @param {string} text - The phrase text
 * @param {string} lang - ISO 639-3 language code (e.g., 'spa', 'eng')
 * @param {string} role - Audio role (source, target1, target2, presentation)
 * @param {string} cadence - Speaking cadence (natural, slow)
 * @returns {string} 32-character deterministic UUID
 */
function generateAudioUUID(voiceId, text, lang, role, cadence) {
  const hashInput = `${voiceId}|${text}|${lang}|${role}|${cadence}`
  const hash = crypto.createHash('sha256').update(hashInput).digest('hex')
  return hash.substring(0, 32) // 32 char UUID
}

/**
 * Get the hash input string (for debugging/verification)
 *
 * @param {string} voiceId
 * @param {string} text
 * @param {string} lang
 * @param {string} role
 * @param {string} cadence
 * @returns {string} The raw input string used for hashing
 */
function getHashInput(voiceId, text, lang, role, cadence) {
  return `${voiceId}|${text}|${lang}|${role}|${cadence}`
}

/**
 * Normalize text for consistent matching
 * Lowercases, trims, and collapses whitespace
 *
 * @param {string} text
 * @returns {string}
 */
function normalizeText(text) {
  return text.toLowerCase().trim().replace(/\s+/g, ' ')
}

/**
 * Check if audio sample exists by UUID
 *
 * @param {string} uuid
 * @returns {Promise<boolean>}
 */
async function audioExists(uuid) {
  if (!supabase) throw new Error('Supabase not initialized')

  const { data, error } = await supabase
    .from('audio_samples')
    .select('uuid')
    .eq('uuid', uuid)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    throw error
  }
  return !!data
}

/**
 * Get audio sample by UUID
 *
 * @param {string} uuid
 * @returns {Promise<Object|null>}
 */
async function getAudioSample(uuid) {
  if (!supabase) throw new Error('Supabase not initialized')

  const { data, error } = await supabase
    .from('audio_samples')
    .select('*')
    .eq('uuid', uuid)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw error
  }
  return data
}

/**
 * Find audio by text and parameters
 *
 * @param {string} text
 * @param {string} lang
 * @param {string} role
 * @param {string} voiceId
 * @param {string} cadence
 * @returns {Promise<Object|null>}
 */
async function findAudio(text, lang, role, voiceId, cadence) {
  if (!supabase) throw new Error('Supabase not initialized')

  const textNormalized = normalizeText(text)

  const { data, error } = await supabase
    .from('audio_samples')
    .select('*')
    .eq('text_normalized', textNormalized)
    .eq('lang', lang)
    .eq('role', role)
    .eq('voice_id', voiceId)
    .eq('cadence', cadence)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw error
  }
  return data
}

/**
 * Insert new audio sample
 *
 * @param {Object} params
 * @returns {Promise<Object>}
 */
async function insertAudioSample({
  uuid,
  voiceId,
  text,
  lang,
  role,
  cadence,
  s3Bucket,
  s3Key,
  durationMs,
  fileSizeBytes,
  checksumMd5,
  source,
  ttsEngine,
  ttsVoiceVariant,
  hashInput
}) {
  if (!supabase) throw new Error('Supabase not initialized')

  const { data, error } = await supabase
    .from('audio_samples')
    .insert({
      uuid,
      voice_id: voiceId,
      text,
      text_normalized: normalizeText(text),
      lang,
      role,
      cadence,
      s3_bucket: s3Bucket,
      s3_key: s3Key,
      duration_ms: durationMs,
      file_size_bytes: fileSizeBytes,
      checksum_md5: checksumMd5,
      source,
      tts_engine: ttsEngine,
      tts_voice_variant: ttsVoiceVariant,
      hash_input: hashInput
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Record course audio usage (for tracking which courses use which audio)
 *
 * @param {string} courseCode
 * @param {string} audioUuid
 * @param {string} usedIn - basket, encouragement, welcome, introduction
 * @param {string|null} seedId
 * @param {string|null} legoId
 * @returns {Promise<Object>}
 */
async function recordCourseUsage(courseCode, audioUuid, usedIn, seedId = null, legoId = null) {
  if (!supabase) throw new Error('Supabase not initialized')

  const { data, error } = await supabase
    .from('course_audio_usage')
    .upsert({
      course_code: courseCode,
      audio_uuid: audioUuid,
      used_in: usedIn,
      seed_id: seedId,
      lego_id: legoId
    }, {
      onConflict: 'course_code,audio_uuid'
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get all audio UUIDs for a course
 *
 * @param {string} courseCode
 * @returns {Promise<Array>}
 */
async function getCourseAudioUuids(courseCode) {
  if (!supabase) throw new Error('Supabase not initialized')

  const { data, error } = await supabase
    .from('course_audio_usage')
    .select('audio_uuid, used_in, seed_id, lego_id')
    .eq('course_code', courseCode)

  if (error) throw error
  return data || []
}

/**
 * Get course voice configuration
 *
 * @param {string} courseCode
 * @returns {Promise<Object|null>}
 */
async function getCourseVoices(courseCode) {
  if (!supabase) throw new Error('Supabase not initialized')

  const { data, error } = await supabase
    .from('courses')
    .select('source_voice_id, target1_voice_id, target2_voice_id, presentation_voice_id')
    .eq('course_code', courseCode)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw error
  }

  if (!data) return null

  // Map to simpler keys
  return {
    source: data.source_voice_id,
    target1: data.target1_voice_id,
    target2: data.target2_voice_id,
    presentation: data.presentation_voice_id
  }
}

/**
 * Create or update course record
 *
 * @param {string} courseCode
 * @param {string} knownLang
 * @param {string} targetLang
 * @param {Object} voices
 * @returns {Promise<Object>}
 */
async function upsertCourse(courseCode, knownLang, targetLang, voices = {}) {
  if (!supabase) throw new Error('Supabase not initialized')

  const { data, error } = await supabase
    .from('courses')
    .upsert({
      course_code: courseCode,
      known_lang: knownLang,
      target_lang: targetLang,
      source_voice_id: voices.source,
      target1_voice_id: voices.target1,
      target2_voice_id: voices.target2,
      presentation_voice_id: voices.presentation
    }, {
      onConflict: 'course_code'
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get voice by ID
 *
 * @param {string} voiceId
 * @returns {Promise<Object|null>}
 */
async function getVoice(voiceId) {
  if (!supabase) throw new Error('Supabase not initialized')

  const { data, error } = await supabase
    .from('voices')
    .select('*')
    .eq('voice_id', voiceId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw error
  }
  return data
}

/**
 * Get all voices for a language
 *
 * @param {string} lang
 * @returns {Promise<Array>}
 */
async function getVoicesForLanguage(lang) {
  if (!supabase) throw new Error('Supabase not initialized')

  const { data, error } = await supabase
    .from('voices')
    .select('*')
    .contains('languages', [lang])
    .eq('is_active', true)

  if (error) throw error
  return data || []
}

/**
 * Batch check which UUIDs exist
 *
 * @param {Array<string>} uuids
 * @returns {Promise<Array<{uuid: string, exists: boolean}>>}
 */
async function batchCheckExists(uuids) {
  if (!supabase) throw new Error('Supabase not initialized')

  const { data, error } = await supabase
    .from('audio_samples')
    .select('uuid')
    .in('uuid', uuids)

  if (error) throw error

  const existingSet = new Set((data || []).map(d => d.uuid))
  return uuids.map(uuid => ({ uuid, exists: existingSet.has(uuid) }))
}

/**
 * Update sample flag (QA workflow)
 *
 * @param {string} audioUuid
 * @param {string} courseCode
 * @param {string} status
 * @param {string|null} notes
 * @param {string|null} flaggedBy
 * @returns {Promise<Object>}
 */
async function updateSampleFlag(audioUuid, courseCode, status, notes = null, flaggedBy = null) {
  if (!supabase) throw new Error('Supabase not initialized')

  const { data: existing } = await supabase
    .from('sample_flags')
    .select('id, history')
    .eq('audio_uuid', audioUuid)
    .eq('course_code', courseCode)
    .single()

  const historyEntry = {
    status,
    timestamp: new Date().toISOString(),
    by: flaggedBy
  }

  const history = existing?.history || []
  history.push(historyEntry)

  const { data, error } = await supabase
    .from('sample_flags')
    .upsert({
      id: existing?.id,
      audio_uuid: audioUuid,
      course_code: courseCode,
      status,
      notes,
      flagged_by: flaggedBy,
      flagged_at: new Date().toISOString(),
      history
    }, {
      onConflict: 'audio_uuid,course_code'
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get flags for a course
 *
 * @param {string} courseCode
 * @returns {Promise<Array>}
 */
async function getCourseFlags(courseCode) {
  if (!supabase) throw new Error('Supabase not initialized')

  const { data, error } = await supabase
    .from('sample_flags')
    .select('*')
    .eq('course_code', courseCode)

  if (error) throw error
  return data || []
}

/**
 * Get flags by status for a course
 *
 * @param {string} courseCode
 * @param {string} status
 * @returns {Promise<Array>}
 */
async function getFlagsByStatus(courseCode, status) {
  if (!supabase) throw new Error('Supabase not initialized')

  const { data, error } = await supabase
    .from('sample_flags')
    .select('*')
    .eq('course_code', courseCode)
    .eq('status', status)

  if (error) throw error
  return data || []
}

/**
 * Check if Supabase is properly initialized
 *
 * @returns {boolean}
 */
function isInitialized() {
  return !!supabase
}

/**
 * Get course statistics
 *
 * @param {string} courseCode
 * @returns {Promise<Object>}
 */
async function getCourseStats(courseCode) {
  if (!supabase) throw new Error('Supabase not initialized')

  // Get total audio usage count
  const { count: totalSamples, error: usageError } = await supabase
    .from('course_audio_usage')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)

  if (usageError) throw usageError

  // Get flag status counts
  const { data: flagData, error: flagError } = await supabase
    .from('sample_flags')
    .select('status')
    .eq('course_code', courseCode)

  if (flagError) throw flagError

  const statusCounts = {}
  for (const flag of flagData || []) {
    statusCounts[flag.status] = (statusCounts[flag.status] || 0) + 1
  }

  return {
    courseCode,
    totalSamples: totalSamples || 0,
    flagged: flagData?.length || 0,
    statusCounts,
    approved: statusCounts['approved'] || 0,
    pending: statusCounts['pending'] || 0,
    complete: statusCounts['complete'] || 0
  }
}

module.exports = {
  supabase,
  generateAudioUUID,
  getHashInput,
  normalizeText,
  audioExists,
  getAudioSample,
  findAudio,
  insertAudioSample,
  recordCourseUsage,
  getCourseAudioUuids,
  getCourseVoices,
  upsertCourse,
  getVoice,
  getVoicesForLanguage,
  batchCheckExists,
  updateSampleFlag,
  getCourseFlags,
  getFlagsByStatus,
  isInitialized,
  getCourseStats
}
