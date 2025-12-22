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
const createLogger = require('./shared/logger.cjs')
const { generateSampleId, normalizeText: uuidNormalizeText } = require('./uuid-v11.cjs')

const logger = createLogger('Supabase')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseKey) {
  logger.warn('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
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
 *
 * Delegates to uuid-v11.cjs generateSampleId() - the single source of truth.
 *
 * Hash input order: voiceId:lang:role:cadence:text
 * (Ordered from least to most variable - gives most "space" to text)
 *
 * Output format: 8-4-4-4-12 (RFC 4122 UUID v5 format)
 * Example: A7B3C9D2-E4F6-5890-9234-567890123456
 *
 * @param {string} voiceId - Voice identifier (e.g., 'azure_es-ES-ElviraNeural')
 * @param {string} text - The phrase text
 * @param {string} lang - ISO 639-3 language code (e.g., 'spa', 'eng')
 * @param {string} role - Audio role (source, target1, target2, presentation)
 * @param {string} cadence - Speaking cadence (natural, slow)
 * @returns {string} UUID v5 in 8-4-4-4-12 format
 */
function generateAudioUUID(voiceId, text, lang, role, cadence) {
  // Delegate to uuid-v11.cjs - the single source of truth
  return generateSampleId(voiceId, text, lang, role, cadence)
}

/**
 * Get the hash input string (for debugging/verification)
 * Order: voiceId:lang:role:cadence:text
 *
 * @param {string} voiceId
 * @param {string} text
 * @param {string} lang
 * @param {string} role
 * @param {string} cadence
 * @returns {string} The raw input string used for hashing
 */
function getHashInput(voiceId, text, lang, role, cadence) {
  return `${voiceId}:${lang}:${role}:${cadence}:${text}`
}

/**
 * Normalize text for consistent matching
 * Delegates to uuid-v11.cjs normalizeText() for consistency.
 * Lowercases, trims, and collapses whitespace.
 *
 * @param {string} text
 * @returns {string}
 */
function normalizeText(text) {
  return uuidNormalizeText(text)
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
    .select('known_voice, target1_voice, target2_voice, presentation_voice')
    .eq('course_code', courseCode)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw error
  }

  if (!data) return null

  // Map to simpler keys
  return {
    known: data.known_voice,
    target1: data.target1_voice,
    target2: data.target2_voice,
    presentation: data.presentation_voice
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
      known_voice: voices.known,
      target1_voice: voices.target1,
      target2_voice: voices.target2,
      presentation_voice: voices.presentation
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
 * Check which sample UUIDs already exist in Supabase
 * Returns array of UUIDs that exist
 *
 * @param {Array<string>} uuids - UUIDs to check
 * @returns {Promise<Array<string>>} UUIDs that exist
 */
async function checkSamplesExist(uuids) {
  if (!supabase) throw new Error('Supabase not initialized')
  if (!uuids || uuids.length === 0) return []

  const { data, error } = await supabase
    .from('audio_samples')
    .select('uuid')
    .in('uuid', uuids)

  if (error) throw error
  return (data || []).map(d => d.uuid)
}

/**
 * Register a new audio sample in Supabase
 * Used by Phase 8 after generating TTS audio
 *
 * @param {Object} params
 * @param {string} params.uuid - Deterministic UUID
 * @param {string} params.text - Original text
 * @param {string} params.tts_text - Text sent to TTS (after gender expansion)
 * @param {string} params.lang - Language code
 * @param {string} params.role - source, target1, target2
 * @param {string} params.voice_id - Voice identifier
 * @param {string} params.cadence - natural or slow
 * @param {string} params.s3_key - S3 key where audio is stored
 * @param {string} params.s3_bucket - S3 bucket name (default: ssi-audio-stage)
 * @param {string} params.course_code - Course that generated this
 * @returns {Promise<Object>}
 */
async function registerSample({
  uuid,
  text,
  tts_text,
  lang,
  role,
  voice_id,
  cadence,
  s3_key,
  s3_bucket = process.env.S3_BUCKET || 'ssi-audio-stage',
  course_code
}) {
  if (!supabase) throw new Error('Supabase not initialized')

  const { data, error } = await supabase
    .from('audio_samples')
    .upsert({
      uuid,
      text,
      text_normalized: normalizeText(text),
      tts_text,
      lang,
      role,
      voice_id,
      cadence,
      s3_key,
      s3_bucket,
      source: 'tts',
      created_at: new Date().toISOString()
    }, {
      onConflict: 'uuid'
    })
    .select()
    .single()

  if (error) throw error

  // Also record usage for this course
  await recordCourseUsage(course_code, uuid, 'basket')

  return data
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
 * Get the Supabase client instance
 * @returns {Object|null} The Supabase client
 */
function getClient() {
  return supabase
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

/**
 * Insert recording provenance metadata for human recordings
 *
 * @param {Object} params
 * @param {string} params.audioUuid - Audio sample UUID
 * @param {string} params.recordedBy - Speaker name/identifier
 * @param {string|null} params.speakerNativeLanguage - Speaker's L1
 * @param {string|null} params.speakerProficiency - native, fluent_l2, heritage_speaker
 * @param {string|null} params.speakerAgeRange - 18-25, 26-35, 36-45, 46-55, 56-65, 65+
 * @param {string|null} params.speakerDialect - North Welsh, Castilian Spanish, etc.
 * @param {string|null} params.speakerRegion - Geographic region
 * @param {Date|string} params.recordedAt - Recording timestamp
 * @param {string|null} params.recordingLocation - Where recorded
 * @param {string|null} params.recordingDevice - Microphone/setup used
 * @param {string|null} params.recordingEnvironment - studio, home, outdoor
 * @param {boolean} params.speakerConsent - Consent given
 * @param {string|null} params.consentFormRef - Reference to consent documentation
 * @param {string|null} params.usageRights - CC-BY, internal-only, etc.
 * @param {string|null} params.qualityNotes - Quality observations
 * @param {number} params.retakeCount - Number of retakes
 * @returns {Promise<Object>}
 */
async function insertRecordingProvenance({
  audioUuid,
  recordedBy,
  speakerNativeLanguage = null,
  speakerProficiency = null,
  speakerAgeRange = null,
  speakerDialect = null,
  speakerRegion = null,
  recordedAt,
  recordingLocation = null,
  recordingDevice = null,
  recordingEnvironment = null,
  speakerConsent = true,
  consentFormRef = null,
  usageRights = null,
  qualityNotes = null,
  retakeCount = 0
}) {
  if (!supabase) throw new Error('Supabase not initialized')

  const { data, error } = await supabase
    .from('recording_provenance')
    .insert({
      audio_uuid: audioUuid,
      recorded_by: recordedBy,
      speaker_native_language: speakerNativeLanguage,
      speaker_proficiency: speakerProficiency,
      speaker_age_range: speakerAgeRange,
      speaker_dialect: speakerDialect,
      speaker_region: speakerRegion,
      recorded_at: recordedAt,
      recording_location: recordingLocation,
      recording_device: recordingDevice,
      recording_environment: recordingEnvironment,
      speaker_consent: speakerConsent,
      consent_form_ref: consentFormRef,
      usage_rights: usageRights,
      quality_notes: qualityNotes,
      retake_count: retakeCount
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Register a new human voice
 *
 * @param {Object} params
 * @param {string} params.voiceId - Voice identifier (e.g., 'human_maria_spa')
 * @param {string} params.humanName - Human name (e.g., 'Maria Garcia')
 * @param {string|null} params.humanEmail - Human email (optional)
 * @param {Array<string>} params.languages - Array of ISO 639-3 language codes
 * @param {Object|null} params.metadata - Additional metadata (optional)
 * @returns {Promise<Object>}
 */
async function registerHumanVoice({ voiceId, humanName, humanEmail = null, languages, metadata = {} }) {
  if (!supabase) throw new Error('Supabase not initialized')

  // Validation
  if (!voiceId || !voiceId.startsWith('human_')) {
    throw new Error('voiceId must start with "human_"')
  }
  if (!humanName) {
    throw new Error('humanName is required')
  }
  if (!languages || !Array.isArray(languages) || languages.length === 0) {
    throw new Error('languages array must have at least one entry')
  }

  // Check for duplicate
  const existing = await getVoice(voiceId)
  if (existing) {
    throw new Error(`Voice with ID '${voiceId}' already exists`)
  }

  // Insert new human voice
  const { data, error } = await supabase
    .from('voices')
    .insert({
      voice_id: voiceId,
      type: 'human',
      human_name: humanName,
      human_email: humanEmail,
      languages,
      is_active: true,
      ...metadata
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * List all voices with optional filters
 *
 * @param {Object} filters
 * @param {string|null} filters.type - Filter by type ('tts' or 'human')
 * @param {string|null} filters.language - Filter by language code
 * @param {boolean|null} filters.isActive - Filter by active status
 * @returns {Promise<Array>}
 */
async function listVoices({ type = null, language = null, isActive = null } = {}) {
  if (!supabase) throw new Error('Supabase not initialized')

  let query = supabase.from('voices').select('*')

  if (type) {
    query = query.eq('type', type)
  }

  if (language) {
    query = query.contains('languages', [language])
  }

  if (isActive !== null) {
    query = query.eq('is_active', isActive)
  }

  const { data, error } = await query.order('voice_id')

  if (error) throw error
  return data || []
}

/**
 * Update voice status (activate/deactivate)
 *
 * @param {string} voiceId
 * @param {boolean} isActive
 * @returns {Promise<Object>}
 */
async function updateVoiceStatus(voiceId, isActive) {
  if (!supabase) throw new Error('Supabase not initialized')

  if (typeof isActive !== 'boolean') {
    throw new Error('isActive must be a boolean')
  }

  const { data, error } = await supabase
    .from('voices')
    .update({ is_active: isActive })
    .eq('voice_id', voiceId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get samples flagged for regeneration
 * Returns samples with status 'flagged_regen_tts' or 'flagged_text_edit'
 * Includes the audio_sample details (text, lang, role, voice_id, cadence)
 *
 * @param {string} courseCode
 * @returns {Promise<Array>}
 */
async function getFlaggedForRegeneration(courseCode) {
  if (!supabase) throw new Error('Supabase not initialized')

  const { data, error } = await supabase
    .from('sample_flags')
    .select(`
      *,
      audio_samples (
        uuid,
        text,
        lang,
        role,
        voice_id,
        cadence
      )
    `)
    .eq('course_code', courseCode)
    .in('status', ['flagged_regen_tts', 'flagged_text_edit'])

  if (error) throw error
  return data || []
}

/**
 * Bulk update flag status for multiple samples
 * Updates status and appends to history
 *
 * @param {Array<string>} uuids - Array of audio UUIDs
 * @param {string} courseCode
 * @param {string} newStatus
 * @param {string|null} note
 * @returns {Promise<Array>}
 */
async function bulkUpdateFlagStatus(uuids, courseCode, newStatus, note = null) {
  if (!supabase) throw new Error('Supabase not initialized')

  const results = []

  for (const uuid of uuids) {
    // Get existing flag to append to history
    const { data: existing } = await supabase
      .from('sample_flags')
      .select('id, history')
      .eq('audio_uuid', uuid)
      .eq('course_code', courseCode)
      .single()

    const historyEntry = {
      status: newStatus,
      timestamp: new Date().toISOString(),
      note
    }

    const history = existing?.history || []
    history.push(historyEntry)

    const { data, error } = await supabase
      .from('sample_flags')
      .upsert({
        id: existing?.id,
        audio_uuid: uuid,
        course_code: courseCode,
        status: newStatus,
        notes: note,
        flagged_at: new Date().toISOString(),
        history
      }, {
        onConflict: 'audio_uuid,course_code'
      })
      .select()
      .single()

    if (error) throw error
    results.push(data)
  }

  return results
}

/**
 * Get recording queue - samples that need human recording
 * Returns paginated list of samples with status 'flagged_human_needed' or 'in_recording'
 *
 * @param {string} courseCode
 * @param {number} page - Page number (1-indexed)
 * @param {number} pageSize - Items per page
 * @returns {Promise<Object>} { items, total, page, pageSize }
 */
async function getRecordingQueue(courseCode, page = 1, pageSize = 20) {
  if (!supabase) throw new Error('Supabase not initialized')

  // Calculate offset for pagination
  const offset = (page - 1) * pageSize

  // Query sample_flags with status 'flagged_human_needed' or 'in_recording'
  // Join with audio_samples to get the text, lang, role info
  const { data, error, count } = await supabase
    .from('sample_flags')
    .select(`
      *,
      audio_samples!inner(
        uuid,
        text,
        lang,
        role,
        cadence,
        voice_id,
        s3_key
      )
    `, { count: 'exact' })
    .eq('course_code', courseCode)
    .in('status', ['flagged_human_needed', 'in_recording'])
    .order('status', { ascending: false }) // 'in_recording' comes before 'flagged_human_needed'
    .order('flagged_at', { ascending: true }) // Oldest first within each status
    .range(offset, offset + pageSize - 1)

  if (error) throw error

  // Transform the data to flatten the audio_samples join
  const items = (data || []).map(flag => ({
    uuid: flag.audio_samples.uuid,
    text: flag.audio_samples.text,
    lang: flag.audio_samples.lang,
    role: flag.audio_samples.role,
    cadence: flag.audio_samples.cadence,
    voice_id: flag.audio_samples.voice_id,
    status: flag.status,
    notes: flag.notes,
    flagged_by: flag.flagged_by,
    flagged_at: flag.flagged_at,
    context: flag.context,
    history: flag.history
  }))

  return {
    items,
    total: count || 0,
    page,
    pageSize
  }
}

/**
 * Update recording status - transitions sample between recording workflow states
 * Valid transitions:
 * - flagged_human_needed -> in_recording (someone started recording)
 * - in_recording -> recorded (recording uploaded)
 * - recorded -> needs_review (automatic after upload)
 *
 * @param {string} audioUuid
 * @param {string} courseCode
 * @param {string} newStatus
 * @param {string|null} notes - Optional notes about the status change
 * @param {string|null} updatedBy - User who made the change
 * @returns {Promise<Object>}
 */
async function updateRecordingStatus(audioUuid, courseCode, newStatus, notes = null, updatedBy = null) {
  if (!supabase) throw new Error('Supabase not initialized')

  // Get existing flag to validate transition and preserve history
  const { data: existing, error: fetchError } = await supabase
    .from('sample_flags')
    .select('id, status, history, flagged_by')
    .eq('audio_uuid', audioUuid)
    .eq('course_code', courseCode)
    .single()

  if (fetchError) throw fetchError

  if (!existing) {
    throw new Error(`No flag found for audio ${audioUuid} in course ${courseCode}`)
  }

  // Validate state transitions
  const validTransitions = {
    'flagged_human_needed': ['in_recording'],
    'in_recording': ['recorded', 'flagged_human_needed'], // Can unclaim
    'recorded': ['needs_review', 'in_recording'] // Can re-record
  }

  const allowedNextStates = validTransitions[existing.status] || []
  if (!allowedNextStates.includes(newStatus)) {
    throw new Error(
      `Invalid transition from ${existing.status} to ${newStatus}. ` +
      `Allowed: ${allowedNextStates.join(', ')}`
    )
  }

  // Add to history
  const historyEntry = {
    status: newStatus,
    timestamp: new Date().toISOString(),
    by: updatedBy,
    notes
  }

  const history = existing.history || []
  history.push(historyEntry)

  // Update the flag
  const { data, error } = await supabase
    .from('sample_flags')
    .update({
      status: newStatus,
      notes,
      flagged_by: updatedBy || existing.flagged_by,
      flagged_at: new Date().toISOString(),
      history
    })
    .eq('id', existing.id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get content stats for all courses (seeds, legos, baskets counts)
 * Used by dashboard course listings to show real counts
 *
 * @returns {Promise<Object>} Map of course_code -> { seeds, legos, baskets }
 */
async function getAllCourseContentStats() {
  if (!supabase) throw new Error('Supabase not initialized')

  // Get seed counts per course
  const { data: seedCounts, error: seedError } = await supabase
    .from('course_seeds')
    .select('course_code')

  if (seedError) throw seedError

  // Get lego counts per course
  const { data: legoCounts, error: legoError } = await supabase
    .from('course_legos')
    .select('course_code')

  if (legoError) throw legoError

  // Get basket phrase counts per course (grouped by seed for basket count)
  const { data: basketCounts, error: basketError } = await supabase
    .from('course_practice_phrases')
    .select('course_code, seed_number, lego_index')

  if (basketError) throw basketError

  // Aggregate counts
  const stats = {}

  // Count seeds
  for (const row of seedCounts || []) {
    if (!stats[row.course_code]) {
      stats[row.course_code] = { seeds: 0, legos: 0, baskets: 0 }
    }
    stats[row.course_code].seeds++
  }

  // Count legos
  for (const row of legoCounts || []) {
    if (!stats[row.course_code]) {
      stats[row.course_code] = { seeds: 0, legos: 0, baskets: 0 }
    }
    stats[row.course_code].legos++
  }

  // Count unique baskets (seed_number + lego_index combinations)
  const basketKeys = new Set()
  for (const row of basketCounts || []) {
    if (!stats[row.course_code]) {
      stats[row.course_code] = { seeds: 0, legos: 0, baskets: 0 }
    }
    const key = `${row.course_code}:${row.seed_number}:${row.lego_index}`
    if (!basketKeys.has(key)) {
      basketKeys.add(key)
      stats[row.course_code].baskets++
    }
  }

  return stats
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
  checkSamplesExist,
  registerSample,
  updateSampleFlag,
  getCourseFlags,
  getFlagsByStatus,
  getFlaggedForRegeneration,
  bulkUpdateFlagStatus,
  getRecordingQueue,
  updateRecordingStatus,
  isInitialized,
  getClient,
  getCourseStats,
  getAllCourseContentStats,
  insertRecordingProvenance,
  registerHumanVoice,
  listVoices,
  updateVoiceStatus
}
