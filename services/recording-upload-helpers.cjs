// services/recording-upload-helpers.cjs
// Pure helpers for POST /api/production/:courseCode/recording/upload (production-api.cjs).
// Kept side-effect free so the upload seam's mode detection and provenance shaping
// are cheap to unit test.

/**
 * Detect a script-mode upload (new-course autocue flow).
 *
 * Script-mode takes come from the recording-optimizer script and have no
 * pre-existing course_audio identity — the server mints one. Newer clients
 * declare the mode explicitly (metadata.mode === 'script'); older clients
 * fabricated `script-N` ids client-side, which we still recognise so an open
 * tab on the old bundle keeps working.
 *
 * @param {string|null|undefined} uuid - client-sent uuid (null/absent in new script mode)
 * @param {Object} metadata - client-sent upload metadata
 * @returns {boolean}
 */
function isScriptModeUpload(uuid, metadata = {}) {
  if (metadata && metadata.mode === 'script') return true
  if (typeof uuid === 'string' && /^script-\d+$/.test(uuid)) return true
  return false
}

// recording_provenance fields: canonical camelCase name -> client snake_case name.
// Both recorder clients send snake_case; the old handler gated on camelCase and
// silently dropped every provenance record.
const PROVENANCE_FIELDS = [
  ['recordedBy', 'recorded_by'],
  ['recordedAt', 'recorded_at'],
  ['speakerNativeLanguage', 'speaker_native_language'],
  ['speakerProficiency', 'speaker_proficiency'],
  ['speakerAgeRange', 'speaker_age_range'],
  ['speakerDialect', 'speaker_dialect'],
  ['speakerRegion', 'speaker_region'],
  ['recordingLocation', 'recording_location'],
  ['recordingDevice', 'recording_device'],
  ['recordingEnvironment', 'recording_environment'],
  ['speakerConsent', 'speaker_consent'],
  ['consentFormRef', 'consent_form_ref'],
  ['usageRights', 'usage_rights'],
  ['qualityNotes', 'quality_notes'],
  ['retakeCount', 'retake_count'],
  ['sessionId', 'session_id'],
  ['mode', 'mode']
]

/**
 * Normalise a client provenance payload to camelCase keys, accepting both the
 * snake_case shape the recorders actually send and the camelCase shape the old
 * handler expected. snake_case wins when both are present.
 *
 * @param {Object} provenance - raw provenance object from the request body
 * @returns {Object} camelCase-keyed provenance (only keys that were present)
 */
function normalizeProvenance(provenance = {}) {
  const out = {}
  for (const [camel, snake] of PROVENANCE_FIELDS) {
    const value = provenance[snake] !== undefined ? provenance[snake] : provenance[camel]
    if (value !== undefined) out[camel] = value
  }
  return out
}

/**
 * Build the aligner-critical context persisted with each take.
 *
 * The live recording_provenance table has no dedicated columns for course,
 * seed/phrase identity or chunks_string (schema changes are out of scope), so
 * this object is JSON-serialised into quality_notes. chunks_string is the
 * pipe-delimited pause map align-audio.cjs --chunks consumes — without it a
 * slow-pass take cannot be aligned later.
 *
 * @param {Object} args
 * @param {string} args.courseCode
 * @param {boolean} args.isScriptMode
 * @param {Object} [args.metadata] - upload metadata (text, cadence, seedNumber, chunksString, ...)
 * @param {Object} [args.provenance] - normalised provenance (for sessionId/qualityNotes)
 * @param {string} args.s3Key - the canon key the take was stored at
 * @param {string|null} [args.courseAudioId] - regeneration mode: the course_audio row re-recorded
 * @param {string|null} [args.replacedS3Key] - regeneration mode: the row's previous s3_key (reversibility)
 * @param {string|null} [args.voiceId] - SERVER-resolved voice for the slot
 *   (voice_config.voices[role].voiceId; client metadata.voiceId is advisory only).
 *   The engine partitions the splice space by (voice_id, cadence); takes
 *   without it fall back to slot-role matching at read time.
 * @returns {Object}
 */
function buildProvenanceContext({ courseCode, isScriptMode, metadata = {}, provenance = {}, s3Key, courseAudioId = null, replacedS3Key = null, voiceId = null }) {
  return {
    course_code: courseCode,
    mode: isScriptMode ? 'script' : 'regeneration',
    role: metadata.role || null,
    voice_id: voiceId || null,
    cadence: metadata.cadence || null,
    text: metadata.text || null,
    seed_number: metadata.seedNumber ?? null,
    lego_id: metadata.legoId || null,
    phrase_index: metadata.phraseIndex ?? null,
    covers_legos: metadata.coversLegos || null,
    chunks_string: metadata.chunksString || null,
    script_session_id: metadata.scriptSessionId || provenance.sessionId || null,
    course_audio_id: courseAudioId,
    replaced_s3_key: replacedS3Key,
    s3_key: s3Key,
    quality_notes: provenance.qualityNotes || null
  }
}

module.exports = {
  isScriptModeUpload,
  normalizeProvenance,
  buildProvenanceContext
}
