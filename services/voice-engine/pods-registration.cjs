/**
 * voice-engine/pods-registration.cjs — registration of human POD recordings.
 *
 * Keystone: docs/voice-engine/design/pods-recording-model.md §4 (REGISTRATION)
 * Facts:    docs/voice-engine/design/pods-recon-facts.md §1 (roles), §2 (linking).
 *
 * The upload seam (POST /api/production/:courseCode/recording/upload in
 * services/production-api.cjs) calls this module when metadata.mode === 'pod':
 *
 *   prepare (BEFORE the S3 PUT — a bad sentenceId must never orphan bytes)
 *     → validate identity { podId, sentenceId, kind }
 *     → load sentence + pod, verify course ownership
 *     → resolve voice SERVER-side from courses.voice_config.podCast
 *       (client metadata.voiceId is advisory — same trust model as the
 *        voice_config.voices[role] slots)
 *   commit (AFTER the mastered take is at its fresh S3 key)
 *     → upsert course_audio  origin='human', role per kind (recon §1:
 *       target→'target1', known→'known', explainer→'pod_explainer' — never
 *       invented), conflict on the live 5-column unique key
 *     → set listening_pod_sentences.{target|known|explainer}_audio_id
 *       EXPLICITLY (recon §2: the audio_autolink trigger never touches
 *       listening_pod_sentences — phase8 links explicitly too, we mirror it)
 *
 * Re-record contract: every take gets a FRESH S3 object (never PUT over);
 * the sentence FK re-points; the previously linked audio id is recorded in
 * provenance (replaced_audio_id) so old takes stay recoverable. When the
 * re-record collides on the 5-column key (same text/voice/role/language),
 * the upsert repoints THAT row's s3_key — the old object stays at its old
 * key and is recorded as replaced_s3_key (same reversibility contract as
 * regeneration mode).
 *
 * Known side-effect (recon §2, pre-existing, same as TTS pod inserts):
 * inserting role 'target1'/'known' fires the audio_autolink trigger, which
 * may opportunistically claim a NULL-audio lego/phrase with identical
 * normalized text. 'pod_explainer' falls through the trigger (no-op).
 *
 * No DDL. No TTS. Writes: course_audio upsert + one sentence FK update.
 */

const { normalizeForAudio } = require('../shared/text-normalize.cjs')
const { canonicalLanguage, canonicalVoiceId } = require('../shared/clip-identity.cjs')
const { voiceSpellings } = require('../shared/clip-identity-lookup.cjs')

// recon §1: the EXACT role strings phase8's pod generator writes. Do not invent.
const POD_KIND_ROLES = Object.freeze({
  target: 'target1',
  known: 'known',
  explainer: 'pod_explainer',
})

const POD_KIND_LINK_COLUMNS = Object.freeze({
  target: 'target_audio_id',
  known: 'known_audio_id',
  explainer: 'explainer_audio_id',
})

const POD_KIND_TEXT_COLUMNS = Object.freeze({
  target: 'target_text',
  known: 'known_text',
  explainer: 'explainer_text',
})

// The explainer voice's cast key (keystone §1) — known-language lines and
// explainer narration are recorded by this cast entry, not a character.
const EXPLAINER_CAST_KEY = '__explainer__'

/** Pod-mode upload detection — explicit metadata.mode only (no legacy shapes). */
function isPodModeUpload(metadata = {}) {
  return !!metadata && metadata.mode === 'pod'
}

/** role string for a pod kind, or null for an unknown kind (pure). */
function podRoleForKind(kind) {
  return POD_KIND_ROLES[kind] || null
}

/** listening_pod_sentences audio FK column for a pod kind (pure). */
function podLinkColumnForKind(kind) {
  return POD_KIND_LINK_COLUMNS[kind] || null
}

/** listening_pod_sentences text column for a pod kind (pure). */
function podTextColumnForKind(kind) {
  return POD_KIND_TEXT_COLUMNS[kind] || null
}

/**
 * Canonical speaker name = parens stripped. Mirrors phase8-audio-v13.cjs /
 * tools/pod-sync.cjs so "Neighbour (8 am)" and "Neighbour" share one cast key.
 * (Reimplemented here — requiring phase8 boots a service module.)
 */
function canonicalSpeakerName(speaker) {
  return (speaker || '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Resolve which human voice records a pod line — SERVER-side, from
 * courses.voice_config.podCast (keystone §1 shape:
 * { "<speakerName>": { voiceId, name, email }, "__explainer__": {...} }).
 *
 * target lines    → podCast[canonical speaker] (raw key fallback for safety)
 * known/explainer → podCast["__explainer__"] (the explainer voice owns all
 *                   known-language lines + explainer narration)
 *
 * The client's metadata.voiceId is ADVISORY: used only when the cast has no
 * entry yet (recording ahead of casting — same trust model as the
 * voice_config.voices[role] slot fallback in the upload seam).
 *
 * A forcedVoiceId outranks BOTH. It exists for the recordist surface, where the
 * voice is decided per LANGUAGE (language_recording_policy.voices) rather than
 * per course: whoever holds the recording link IS that voice, and a course cast
 * naming a per-course spelling of the same person (human_aran_cym_s beside
 * human_aran_cym_n) must not re-fragment one person's clips across courses —
 * that fragmentation is what the by-language queue exists to end.
 *
 * @returns {{ voiceId: string|null, source: 'forced'|'cast'|'client'|null, disagreement: boolean }}
 */
function resolvePodCastVoiceId({ voiceConfig = {}, speaker = '', kind, clientVoiceId = null, forcedVoiceId = null }) {
  const podCast = (voiceConfig && voiceConfig.podCast) || {}
  if (forcedVoiceId) {
    return { voiceId: forcedVoiceId, source: 'forced', disagreement: false }
  }
  let entry = null
  if (kind === 'target') {
    entry = podCast[canonicalSpeakerName(speaker)] || podCast[speaker] || null
  } else {
    entry = podCast[EXPLAINER_CAST_KEY] || null
  }
  const castVoiceId = entry && entry.voiceId ? entry.voiceId : null
  if (castVoiceId) {
    return {
      voiceId: castVoiceId,
      source: 'cast',
      disagreement: !!(clientVoiceId && clientVoiceId !== castVoiceId),
    }
  }
  if (clientVoiceId) return { voiceId: clientVoiceId, source: 'client', disagreement: false }
  return { voiceId: null, source: null, disagreement: false }
}

/**
 * Validate pod-mode upload metadata (pure). Returns { ok } or { ok:false, error }.
 */
function validatePodUploadMetadata(metadata = {}) {
  if (!metadata || metadata.mode !== 'pod') return { ok: false, error: 'metadata.mode must be "pod"' }
  if (!metadata.podId || typeof metadata.podId !== 'string') return { ok: false, error: 'metadata.podId required' }
  if (!metadata.sentenceId || typeof metadata.sentenceId !== 'string') return { ok: false, error: 'metadata.sentenceId required' }
  if (!podRoleForKind(metadata.kind)) {
    return { ok: false, error: `metadata.kind must be one of ${Object.keys(POD_KIND_ROLES).join('|')} (got ${JSON.stringify(metadata.kind ?? null)})` }
  }
  return { ok: true }
}

/**
 * PREPARE (read-only — run BEFORE the S3 PUT).
 * Validates identity, loads the sentence + pod + course, resolves the voice.
 *
 * @returns {Promise<{ context: object }|{ error: string, status: number }>}
 */
async function preparePodRegistration({ supabase, courseCode, metadata = {}, logger = console, forcedVoiceId = null }) {
  const valid = validatePodUploadMetadata(metadata)
  if (!valid.ok) return { error: valid.error, status: 400 }

  const kind = metadata.kind
  const role = podRoleForKind(kind)
  const linkColumn = podLinkColumnForKind(kind)
  const textColumn = podTextColumnForKind(kind)

  const { data: sentence, error: sentErr } = await supabase
    .from('listening_pod_sentences')
    .select('id, pod_id, speaker, target_text, known_text, explainer_text, rerecord_wanted, target_audio_id, known_audio_id, explainer_audio_id')
    .eq('id', metadata.sentenceId)
    .maybeSingle()
  if (sentErr) return { error: `sentence lookup failed: ${sentErr.message}`, status: 500 }
  if (!sentence) return { error: `No pod sentence ${metadata.sentenceId}`, status: 404 }
  if (sentence.pod_id !== metadata.podId) {
    return { error: `sentence ${metadata.sentenceId} belongs to ${sentence.pod_id}, not ${metadata.podId}`, status: 400 }
  }

  const { data: pod, error: podErr } = await supabase
    .from('listening_pods')
    .select('id, course_code')
    .eq('id', metadata.podId)
    .maybeSingle()
  if (podErr) return { error: `pod lookup failed: ${podErr.message}`, status: 500 }
  if (!pod) return { error: `No pod ${metadata.podId}`, status: 404 }
  if (pod.course_code !== courseCode) {
    return { error: `Pod ${metadata.podId} belongs to ${pod.course_code}, not ${courseCode}`, status: 400 }
  }

  const text = (sentence[textColumn] || '').trim()
  if (!text) {
    // explainer_text='' is the deliberate "no explainer" stamp (recon §5) —
    // a take for it has no registerable text.
    return { error: `Sentence ${sentence.id} has no ${textColumn} — nothing to register for kind '${kind}'`, status: 400 }
  }

  const { data: course, error: courseErr } = await supabase
    .from('courses')
    .select('course_code, target_lang, known_lang, voice_config')
    .eq('course_code', courseCode)
    .maybeSingle()
  if (courseErr) return { error: `course lookup failed: ${courseErr.message}`, status: 500 }
  if (!course) return { error: `Course not found: ${courseCode}`, status: 404 }

  const resolved = resolvePodCastVoiceId({
    voiceConfig: course.voice_config || {},
    speaker: sentence.speaker,
    kind,
    clientVoiceId: metadata.voiceId || null,
    forcedVoiceId,
  })
  if (resolved.disagreement) {
    logger.warn(`[PodRecording] client voiceId ${metadata.voiceId} disagrees with podCast → ${resolved.voiceId} — server value wins`)
  }
  if (!resolved.voiceId) {
    return { error: `No voice resolvable for ${kind} line ${sentence.id}: no podCast entry and no client voiceId`, status: 400 }
  }

  // ASSUMPTION (flagged): human known/explainer takes carry the course's
  // known_lang as course_audio.language (TTS explainer rows carry the xAI
  // resolved cue instead, e.g. 'ar-EG' — a human take has no cue to record).
  const language = kind === 'target' ? course.target_lang : course.known_lang

  return {
    context: {
      kind,
      role,
      linkColumn,
      text,
      language,
      voiceId: resolved.voiceId,
      voiceSource: resolved.source,
      sentenceId: sentence.id,
      podId: pod.id,
      speaker: sentence.speaker,
      replacedAudioId: sentence[linkColumn] || null,
    },
  }
}

/**
 * COMMIT (writes — run AFTER the mastered take is uploaded to its fresh key).
 * Upserts the human course_audio row and re-points the sentence FK.
 *
 * @returns {Promise<{ audioRow: object, replacedAudioId: string|null, replacedS3Key: string|null, repointedExistingRow: boolean }>}
 */
async function commitPodRegistration({ supabase, courseCode, context, s3Key, durationMs = null, fileSizeBytes = null, logger = console }) {
  const textNormalized = normalizeForAudio(context.text)
  const language = canonicalLanguage(context.language)
  const voiceId = canonicalVoiceId(context.voiceId, { provider: context.provider })

  // Reversibility: if a row already occupies this exact 5-column key, the
  // upsert below repoints it — capture its current s3_key first so provenance
  // can record where the previous take lives.
  //
  // The lookup is deliberately WIDER than the write. The write now stores the
  // canonical voice spelling, but a take recorded before this change is sitting
  // under the raw one; asking only for the canonical form would find nothing,
  // report "no prior take", and lose the replaced s3_key — which is exactly the
  // reversibility leg of make-before-break going quietly missing. So the read
  // reaches both spellings and the write still narrows to one.
  const { data: priorRows, error: priorErr } = await supabase
    .from('course_audio')
    .select('id, s3_key, origin')
    .eq('course_code', courseCode)
    .eq('text_normalized', textNormalized)
    .eq('language', language)
    .eq('role', context.role)
    .in('voice_id', voiceSpellings(context.voiceId, { provider: context.provider }))
    .limit(1)
  if (priorErr) throw new Error(`pod registration prior-row lookup failed: ${priorErr.message}`)
  const priorRow = priorRows && priorRows[0] ? priorRows[0] : null

  const row = {
    course_code: courseCode,
    text: context.text,
    text_normalized: textNormalized,
    language,
    role: context.role,
    voice_id: voiceId,
    origin: 'human',
    s3_key: s3Key,
  }
  if (durationMs) row.duration_ms = durationMs
  if (fileSizeBytes) row.file_size_bytes = fileSizeBytes

  const { data: audioRow, error: upsertErr } = await supabase
    .from('course_audio')
    .upsert(row, { onConflict: 'course_code,text_normalized,language,role,voice_id' })
    .select()
    .single()
  if (upsertErr) throw new Error(`pod course_audio upsert failed: ${upsertErr.message}`)

  // FULFILMENT. This take IS the re-record that was wanted for this track, so
  // the want is cleared in the same write that re-points the FK — one statement,
  // so the line can never be left both freshly recorded and still queued.
  // Only this kind's key goes: a want for the OTHER track is a different job.
  const patch = { [context.linkColumn]: audioRow.id }
  const { data: wantRow, error: wantErr } = await supabase
    .from('listening_pod_sentences')
    .select('rerecord_wanted')
    .eq('id', context.sentenceId)
    .maybeSingle()
  if (wantErr) throw new Error(`pod rerecord_wanted lookup failed: ${wantErr.message}`)
  const wanted = wantRow && wantRow.rerecord_wanted
  if (wanted && typeof wanted === 'object' && wanted[context.kind] != null) {
    const rest = { ...wanted }
    delete rest[context.kind]
    patch.rerecord_wanted = Object.keys(rest).length ? rest : null
  }

  // Link explicitly — recon §2: the autolink trigger NEVER touches
  // listening_pod_sentences (mirrors phase8's update at generate-pods).
  const { error: linkErr } = await supabase
    .from('listening_pod_sentences')
    .update(patch)
    .eq('id', context.sentenceId)
  if (linkErr) throw new Error(`pod sentence link failed: ${linkErr.message}`)

  const repointedExistingRow = !!(priorRow && priorRow.id === audioRow.id)

  // A prior take found under the OTHER voice spelling cannot be repointed by
  // the upsert — its conflict key differs, so the new take lands as a fresh
  // row. That is the make-before-break-safe outcome (the old take still exists
  // at its own s3_key, nothing was overwritten) but the sentence FK has moved
  // off it, so say so rather than let it become a silent orphan.
  if (priorRow && !repointedExistingRow) {
    logger.log(
      `[PodRecording] WARNING: prior take ${priorRow.id} (${priorRow.s3_key}) matched on a ` +
      `different voice spelling than the canonical ${voiceId} now written, so it was NOT ` +
      `repointed — the new take is row ${audioRow.id} and the old row survives, unlinked.`
    )
  }

  logger.log(
    `[PodRecording] ${context.sentenceId} ${context.kind} → course_audio ${audioRow.id} ` +
    `(role=${context.role}, voice=${voiceId}, origin=human` +
    `${repointedExistingRow ? `, repointed ${priorRow.s3_key} -> ${s3Key}` : ''}` +
    `${context.replacedAudioId && context.replacedAudioId !== audioRow.id ? `, replaces ${context.replacedAudioId}` : ''})`
  )

  return {
    audioRow,
    // What the sentence FK used to point at (null when first recording, or when
    // the re-record landed on the SAME row — that case is replacedS3Key instead).
    replacedAudioId: context.replacedAudioId === audioRow.id ? null : context.replacedAudioId,
    replacedS3Key: repointedExistingRow && priorRow.s3_key !== s3Key ? priorRow.s3_key : null,
    repointedExistingRow,
  }
}

module.exports = {
  POD_KIND_ROLES,
  POD_KIND_LINK_COLUMNS,
  POD_KIND_TEXT_COLUMNS,
  EXPLAINER_CAST_KEY,
  isPodModeUpload,
  podRoleForKind,
  podLinkColumnForKind,
  podTextColumnForKind,
  canonicalSpeakerName,
  resolvePodCastVoiceId,
  validatePodUploadMetadata,
  preparePodRegistration,
  commitPodRegistration,
}
