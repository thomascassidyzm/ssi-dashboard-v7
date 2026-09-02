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
 * @param {string|null} [args.rawS3Key] - the archived untouched original (raw/{UUID}.{ext}),
 *   null if the archive write failed. This is the pointer that makes a stored clip
 *   joinable back to the bytes the voice actor actually gave us.
 * @param {string|null} [args.courseAudioId] - regeneration mode: the course_audio row re-recorded
 * @param {string|null} [args.replacedS3Key] - regeneration mode: the row's previous s3_key (reversibility)
 * @param {string|null} [args.voiceId] - SERVER-resolved voice for the slot
 *   (voice_config.voices[role].voiceId; client metadata.voiceId is advisory only).
 *   The engine partitions the splice space by (voice_id, cadence); takes
 *   without it fall back to slot-role matching at read time.
 * @param {Object|null} [args.pod] - pod-mode identity (mode:'pod' uploads):
 *   { podId, sentenceId, kind: 'target'|'known'|'explainer', replacedAudioId }.
 *   replacedAudioId is the course_audio id the sentence FK pointed at before
 *   this take re-pointed it (re-records never overwrite — old row + object kept).
 *   When present, mode is 'pod' and the pod fields are added ADDITIVELY —
 *   every existing field keeps its exact name and shape.
 * @returns {Object}
 */
function buildProvenanceContext({ courseCode, isScriptMode, metadata = {}, provenance = {}, s3Key, rawS3Key = null, courseAudioId = null, replacedS3Key = null, voiceId = null, pod = null }) {
  const podFields = pod ? {
    pod_id: pod.podId || null,
    sentence_id: pod.sentenceId || null,
    kind: pod.kind || null,
    replaced_audio_id: pod.replacedAudioId || null
  } : null
  return {
    course_code: courseCode,
    mode: pod ? 'pod' : (isScriptMode ? 'script' : 'regeneration'),
    ...(podFields || {}),
    role: metadata.role || null,
    voice_id: voiceId || null,
    cadence: metadata.cadence || null,
    text: metadata.text || null,
    seed_number: metadata.seedNumber ?? null,
    lego_id: metadata.legoId || null,
    phrase_index: metadata.phraseIndex ?? null,
    covers_legos: metadata.coversLegos || null,
    chunks_string: metadata.chunksString || null,
    // The pauses the recorder's own VAD heard inside this take, in ms from its
    // start: [{ startMs, endMs }], endMs null for the final silence. The
    // speaker's own account of where the LEGO boundaries fell, kept beside the
    // chunk map the script asked for. align.cjs still measures the audio for
    // itself — this is a second, cheaper witness, not a replacement.
    chunk_boundaries_ms: Array.isArray(metadata.chunkBoundariesMs) && metadata.chunkBoundariesMs.length
      ? metadata.chunkBoundariesMs
      : null,
    script_session_id: metadata.scriptSessionId || provenance.sessionId || null,
    course_audio_id: courseAudioId,
    replaced_s3_key: replacedS3Key,
    s3_key: s3Key,
    // The untouched original this mastered clip was made from (raw/{UUID}.{ext}).
    // null when the archive write failed — an honest null, never a guessed key.
    raw_s3_key: rawS3Key,
    quality_notes: provenance.qualityNotes || null
  }
}

/**
 * Resolve the voice id a HUMAN take is stamped with, from the course's cast.
 *
 * The slot's voice is authoritative — but ONLY when a human holds it. A slot
 * still carrying its TTS voice (provider 'azure'/'xai'/...) must never lend
 * that id to a person's recording: doing so made the database claim
 * de-AT-IngridNeural sang lines a real recordist read on deu_at_for_eng, and
 * anything downstream that trusts voice_id then treats real takes as
 * machine-generated.
 *
 * Order: human slot voice > client-declared voice (advisory, used when the
 * recordist has a minted voice id but no slot assigned yet) > null.
 * A null is honest: slot-role matching still finds the take at read time.
 *
 * @param {object} args
 * @param {object|null} args.voiceConfig - courses.voice_config
 * @param {string|null} args.role - the slot being recorded ('target1' | 'target2' | ...)
 * @param {string|null} [args.clientVoiceId] - metadata.voiceId from the recorder
 * @returns {{voiceId: string|null, source: 'slot'|'client'|'none', warning: string|null}}
 */
function resolveTakeVoiceId({ voiceConfig, role, clientVoiceId = null }) {
  const slot = role ? voiceConfig?.voices?.[role] : null
  const slotIsHuman = slot?.provider === 'human' && !!slot.voiceId

  if (slotIsHuman) {
    const warning = clientVoiceId && clientVoiceId !== slot.voiceId
      ? `client voiceId ${clientVoiceId} disagrees with voice_config ${role}=${slot.voiceId} — server value wins`
      : null
    return { voiceId: slot.voiceId, source: 'slot', warning }
  }

  if (clientVoiceId) {
    return { voiceId: clientVoiceId, source: 'client', warning: null }
  }

  const warning = slot?.voiceId
    ? `slot ${role} still holds the ${slot.provider || 'tts'} voice ${slot.voiceId} — human take left unstamped rather than credited to a synthetic voice`
    : null
  return { voiceId: null, source: 'none', warning }
}

// The raw container the recorder actually sent, by MIME type: the ffmpeg input
// format (unchanged from the handler's old inline detection) plus the file
// extension and Content-Type the archived original is stored with. Unknown
// types fall back to webm — what every MediaRecorder client in the estate
// sends — rather than refusing a take over a header we don't recognise.
const RAW_FORMATS = {
  mp3: { inputFormat: 'mp3', extension: 'mp3', contentType: 'audio/mpeg' },
  wav: { inputFormat: 'wav', extension: 'wav', contentType: 'audio/wav' },
  m4a: { inputFormat: 'm4a', extension: 'm4a', contentType: 'audio/mp4' },
  ogg: { inputFormat: 'ogg', extension: 'ogg', contentType: 'audio/ogg' },
  webm: { inputFormat: 'webm', extension: 'webm', contentType: 'audio/webm' }
}

/**
 * Resolve the raw container's format from the client's mimeType.
 * @param {string} mimeType
 * @returns {{inputFormat: string, extension: string, contentType: string}}
 */
function resolveRawFormat(mimeType = 'audio/webm') {
  const mime = String(mimeType || '').toLowerCase()
  if (mime.includes('mp3') || mime.includes('mpeg')) return RAW_FORMATS.mp3
  if (mime.includes('wav')) return RAW_FORMATS.wav
  if (mime.includes('m4a') || mime.includes('mp4')) return RAW_FORMATS.m4a
  if (mime.includes('ogg')) return RAW_FORMATS.ogg
  return RAW_FORMATS.webm
}

/**
 * The archive key for a take's untouched original.
 *
 * Keyed by the SAME uuid as the mastered object (mastered/{UUID}.mp3), so the
 * join from a stored clip to its original is a string swap and needs no index:
 * raw/{UUID}.{ext}. The extension varies because the container does.
 *
 * @param {string} s3KeyUuid - the take's fresh object uuid
 * @param {string} extension
 * @returns {string}
 */
function buildRawTakeKey(s3KeyUuid, extension) {
  return `raw/${s3KeyUuid}.${extension}`
}

/**
 * Retain the raw take, THEN process it — in that order, deliberately.
 *
 * The handler refuses a take in two cases (processing failed; nothing audible
 * survived the trim) BEFORE the mastered PUT, so a bad take never orphans bytes
 * at the canon key. That ordering stays exactly as it was. What changes is that
 * the archive write happens first, because a refused take is precisely the one
 * someone will want to recover or diagnose: orphans under raw/ are wanted,
 * orphans under mastered/ are not.
 *
 * A failed archive write NEVER fails the take. It is logged loudly and the take
 * proceeds — losing a voice actor's irreplaceable read because the archive PUT
 * timed out would be worse than the problem this solves (T-20 post-mortem: the
 * originals of 107 butchered Welsh clips are gone because the raw bytes only
 * ever lived in a request-local buffer).
 *
 * @param {object} args
 * @param {Buffer} args.rawBuffer - the decoded client payload, untouched
 * @param {string} args.mimeType - client-declared container type
 * @param {string} args.s3KeyUuid - the take's fresh object uuid
 * @param {(args: {rawKey: string, buffer: Buffer, contentType: string}) => Promise<any>} args.retainRaw
 * @param {(buffer: Buffer, options: object) => Promise<{buffer: Buffer, metadata: object}>} args.processRecording
 * @param {number} [args.minTakeMs] - silent-take floor (MIN_TAKE_MS)
 * @param {'natural'|'gapped'} [args.readStyle] - 'gapped' protects a deliberately
 *   gapped read: its internal silence is the splice's cut points, never trimmed
 * @param {string} [args.audioId] - for log lines only
 * @param {object} [args.logger]
 * @returns {Promise<{rawKey: string|null, rawRetained: boolean, rawError: string|null,
 *   refused: {status: number, body: object}|null, processedBuffer: Buffer|null, audioMeta: object}>}
 */
async function retainAndProcessTake({
  rawBuffer,
  mimeType,
  s3KeyUuid,
  retainRaw,
  processRecording,
  minTakeMs = 100,
  audioId = null,
  // 'gapped' on a minimal-phrase-set take: the silence between the words is the
  // data, and the processor must not treat a short word as a click. Passed
  // straight through — this helper makes no decision about it.
  readStyle = 'natural',
  logger = console
}) {
  const { inputFormat, extension, contentType } = resolveRawFormat(mimeType)
  const candidateRawKey = buildRawTakeKey(s3KeyUuid, extension)

  // 1. Archive the original FIRST — before processing, before any refusal.
  let rawKey = null
  let rawError = null
  try {
    await retainRaw({ rawKey: candidateRawKey, buffer: rawBuffer, contentType })
    rawKey = candidateRawKey
    logger.log(`[Upload] Raw take retained at ${candidateRawKey} (${rawBuffer.length} bytes, ${contentType})`)
  } catch (err) {
    rawError = err?.message || String(err)
    logger.error(`[Upload] RAW RETENTION FAILED for ${audioId || s3KeyUuid} at ${candidateRawKey}: ${rawError} — take continues, but this original is NOT archived`)
  }

  // 2. Process: convert to MP3, normalise, trim silence.
  const { buffer: processedBuffer, metadata: audioMeta } = await processRecording(rawBuffer, {
    inputFormat,
    trimSilence: true,
    normalize: true,
    targetLUFS: -16,
    readStyle
  })

  // 3. The two pre-existing refusals, unchanged and still before the mastered PUT.
  if (!audioMeta.processed) {
    logger.error(`[Upload] REFUSED unprocessed audio for ${audioId || s3KeyUuid}: ${audioMeta.reason}`)
    return {
      rawKey, rawRetained: rawKey !== null, rawError, processedBuffer: null, audioMeta,
      refused: {
        status: 500,
        body: {
          error: `Audio processing failed on the server, so this take was not saved: ${audioMeta.reason || 'unknown reason'}`,
          processed: false,
          rawKey
        }
      }
    }
  }

  logger.log(`[Upload] Audio processed: ${audioMeta.inputSize} -> ${audioMeta.outputSize} bytes, duration: ${audioMeta.durationMs}ms`)

  // A PROCESSING STAGE MAY NOT BE ITS OWN JUDGE.
  //
  // This guard used to read one number — the duration AFTER processing — and
  // say one thing about it: your take had no audible speech in it. On
  // 2026-08-22 that sentence was returned seventeen times in a row to a
  // recordist reading into a live microphone, because the chain had reduced
  // every take to an 834-byte stub and the stub is what got measured.
  //
  // The processor now reports what ARRIVED as well as what left. "Silent" is
  // reserved for a take that was silent; a take that came in with audio and
  // went out without it is a server fault, and is reported as one, in the
  // recordist's own terms. Both still refuse before the mastered PUT, and the
  // raw original is already archived above either way — so nothing said into
  // the microphone is lost to either branch.
  if ((!audioMeta.durationMs || audioMeta.durationMs < minTakeMs) && audioMeta.inputAudible) {
    logger.error(`[Upload] PROCESSING DESTROYED an audible take ${audioId || s3KeyUuid}: arrived at ${audioMeta.inputPeakDb}dB, left as ${audioMeta.durationMs}ms / ${audioMeta.outputSize} bytes. Raw is safe at ${rawKey}`)
    return {
      rawKey, rawRetained: rawKey !== null, rawError, processedBuffer: null, audioMeta,
      refused: {
        status: 500,
        body: {
          error: `Your take recorded fine — the server could not process it. It arrived at ${audioMeta.inputPeakDb}dB and came out empty. The original is saved and this is a fault our end, not yours.`,
          processed: true,
          serverFault: true,
          inputPeakDb: audioMeta.inputPeakDb,
          durationMs: audioMeta.durationMs || 0,
          rawKey
        }
      }
    }
  }

  if (!audioMeta.durationMs || audioMeta.durationMs < minTakeMs) {
    logger.error(`[Upload] REFUSED silent/empty take for ${audioId || s3KeyUuid}: ${audioMeta.durationMs}ms after trim, ${audioMeta.outputSize} bytes, input peak ${audioMeta.inputPeakDb}dB`)
    return {
      rawKey, rawRetained: rawKey !== null, rawError, processedBuffer: null, audioMeta,
      refused: {
        status: 422,
        body: {
          error: `This take contains no audible speech (${audioMeta.durationMs || 0}ms after silence trimming, minimum ${minTakeMs}ms), so it was not saved. Check the microphone is live and record it again.`,
          processed: true,
          silent: true,
          durationMs: audioMeta.durationMs || 0,
          rawKey
        }
      }
    }
  }

  return { rawKey, rawRetained: rawKey !== null, rawError, refused: null, processedBuffer, audioMeta }
}

module.exports = {
  isScriptModeUpload,
  normalizeProvenance,
  buildProvenanceContext,
  resolveTakeVoiceId,
  resolveRawFormat,
  buildRawTakeKey,
  retainAndProcessTake
}
