/**
 * POD AUDIO IS FIRST-CLASS POPTY AUDIO, AND IT IS NEVER A COURSE SLOT'S AUDIO (job #628, step 2 of Tom's
 * r-2026-11-07-ssi-pods-exactly-one-way-of; Tom on reading that the pod clips were stored as trial clips: "what trial
 * clips????").
 *
 * A Pod Drill piece (one sentence or phrase of a pod turn, recorded on its own) and a Talk Bollocks line are pod audio:
 * real course_audio rows, mastered/<UUID>.mp3 in both stores, word timings on the row, served by the app's one audio
 * proxy like every other clip. They were rendered as trial clips (trial/<UUID>.mp3, no row) only to keep them out of
 * ordinary course slots. This module keeps that property WITHOUT the trial store:
 *
 *   POD-ONLY ROLES. A pod clip carries role pod_atom (target side) or pod_fine_known (known side) — both already in
 *   course_audio_role_check, so no schema change. A row in a pod-only role is NEVER an answer to "which clip says these
 *   words?" for a seed, LEGO or practice phrase:
 *     - the DB's audio_autolink trigger fills slots only for known/target1/target2/presentation (ELSE false), so an
 *       insert in a pod-only role links nothing, by construction;
 *     - the library (clip-index resolveClip and indexEntryFor, clip-library usableClips/clipsInLanguage) drops pod-only
 *       rows before any pick, so library-first never links one and "already recorded in this language" never cites one;
 *     - link-clip refuses a pod-only clip for a seed, LEGO or phrase slot (POD_ONLY_CLIP).
 *   Each of those decision points calls isPodOnlyClip from here, so the rule has one spelling.
 *
 *   FILING. fileTrialClip copies an existing trial object's bytes, unchanged, to mastered/<the same UUID>.mp3 (through
 *   the dual-store client: R2 and S3), carries trial/<UUID>.timings.json onto the row's word_timings when it exists, and
 *   inserts the row. The trial original is left exactly where it is (make-before-break; deleting it is Tom's call). The
 *   mastered key reuses the trial UUID, so the copy names its own source and a repeat call is answered with the row it
 *   already filed. Nothing is rendered: no provider is called and no character is spent.
 */
const { normalizeForAudio } = require('./text-normalize.cjs')

/** The course_audio roles that hold pod-only clips. Never linked into a seed, LEGO or practice-phrase slot. */
const POD_ONLY_ROLES = Object.freeze(['pod_atom', 'pod_fine_known'])
const POD_ROLE_FOR_SIDE = Object.freeze({ target: 'pod_atom', known: 'pod_fine_known' })

const isPodOnlyRole = (role) => POD_ONLY_ROLES.includes(String(role || ''))
/** A course_audio row (or anything with .role) in a pod-only role. A row read without its role is NOT pod-only here: read it. */
const isPodOnlyClip = (row) => !!row && isPodOnlyRole(row.role)
/** Rows minus pod-only clips — the filter every library pick runs first. */
const withoutPodOnly = (rows) => (rows || []).filter((r) => !isPodOnlyClip(r))

const TRIAL_ID = /^trial_([0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}(?:_x\d{2,3})?)$/i

class PodAudioRefusal extends Error {
  constructor(code, message, extra = {}) { super(message); this.code = code; this.extra = extra }
}

/** trial_<UUID> → { trialKey, timingsKey, masteredKey }. */
function keysForTrial(trialId) {
  const m = TRIAL_ID.exec(String(trialId || ''))
  if (!m) throw new PodAudioRefusal('BAD_TRIAL_ID', `${trialId} is not a trial clip id (trial_<UUID>)`)
  const stem = m[1].toUpperCase().replace(/_X/, '_x')
  return { trialKey: `trial/${stem}.mp3`, timingsKey: `trial/${stem}.timings.json`, masteredKey: `mastered/${stem}.mp3` }
}

function validateClip(c, courseCode) {
  const missing = ['trialId', 'text', 'language', 'voiceId', 'side'].filter((k) => !c || c[k] == null || String(c[k]).trim() === '')
  if (missing.length) throw new PodAudioRefusal('MISSING', `missing ${missing.join(', ')} — a pod clip names its trial id, words, language, voice and side`)
  const role = POD_ROLE_FOR_SIDE[c.side]
  if (!role) throw new PodAudioRefusal('BAD_SIDE', `side must be target or known, not ${c.side}`)
  return { ...keysForTrial(c.trialId), courseCode, trialId: String(c.trialId), text: String(c.text), language: String(c.language), voiceId: String(c.voiceId), role }
}

/**
 * File one trial clip as a pod-only course_audio row. deps:
 *   findIdentity({ courseCode, textNormalized, language, role, voiceId }) → { id, s3_key, audio_revision } | null
 *   getObject(key) → Buffer | null          (null = no such object)
 *   putObject(key, buffer, contentType)     dual-store write
 *   headObject(key) → boolean               alive after the write
 *   durationMs(buffer) → number
 *   insertRow(row) → { id }
 * Answers { status: 'filed' | 'already' | 'would-file', audioId?, s3Key, ... } or throws PodAudioRefusal.
 */
async function fileTrialClip(input, deps, { dryRun = true } = {}) {
  const c = validateClip(input, input.courseCode)
  const textNormalized = normalizeForAudio(c.text)
  const existing = await deps.findIdentity({ courseCode: c.courseCode, textNormalized, language: c.language, role: c.role, voiceId: c.voiceId })
  if (existing) {
    // The same words, voice and role already have a row in this course (unique_course_audio_per_voice). If it is this
    // trial's own copy, that is the answer. Any other row is a DIFFERENT take: refused, never quietly substituted.
    if (existing.s3_key === c.masteredKey) return { status: 'already', trialId: c.trialId, audioId: existing.id, revision: existing.audio_revision || 1, s3Key: c.masteredKey, role: c.role }
    throw new PodAudioRefusal('IDENTITY_TAKEN', `${c.courseCode} already has a ${c.role} row for "${c.text.slice(0, 60)}" in ${c.voiceId} (${existing.id}, ${existing.s3_key}) — a different take; not substituted`, { existing: { audioId: existing.id, s3Key: existing.s3_key } })
  }
  const bytes = await deps.getObject(c.trialKey)
  if (!bytes || !bytes.length) throw new PodAudioRefusal('NO_TRIAL_OBJECT', `${c.trialKey} is not in the store`)
  const timingsRaw = await deps.getObject(c.timingsKey)
  let wordTimings = null
  if (timingsRaw && timingsRaw.length) {
    try { wordTimings = JSON.parse(String(timingsRaw)) } catch { throw new PodAudioRefusal('BAD_TIMINGS', `${c.timingsKey} is not JSON`) }
  }
  const durationMs = Math.round(await deps.durationMs(bytes))
  const base = { trialId: c.trialId, s3Key: c.masteredKey, fromKey: c.trialKey, role: c.role, durationMs, bytes: bytes.length, timings: !!wordTimings }
  if (dryRun) return { status: 'would-file', ...base }
  // MAKE BEFORE BREAK: the copy is written and seen alive before the row that names it exists. The trial object stays.
  await deps.putObject(c.masteredKey, bytes, 'audio/mpeg')
  if (!(await deps.headObject(c.masteredKey))) throw new PodAudioRefusal('COPY_NOT_ALIVE', `${c.masteredKey} was written but does not answer — no row filed`)
  const row = await deps.insertRow({
    course_code: c.courseCode, text: c.text, text_normalized: textNormalized, language: c.language, role: c.role,
    voice_id: c.voiceId, origin: 'tts', s3_key: c.masteredKey, duration_ms: durationMs, file_size_bytes: bytes.length,
    lego_id: null, word_timings: wordTimings,
  })
  return { status: 'filed', audioId: row.id, revision: 1, ...base }
}

/** A batch, one clip at a time; a refusal is reported per clip and never stops the rest. */
async function fileTrialClips({ courseCode, clips, dryRun = true }, deps) {
  if (!Array.isArray(clips) || !clips.length) throw new PodAudioRefusal('NO_CLIPS', 'clips: [] — nothing to file')
  if (clips.length > 200) throw new PodAudioRefusal('TOO_MANY', `${clips.length} clips — at most 200 per call`)
  const results = []
  for (const clip of clips) {
    try { results.push(await fileTrialClip({ ...clip, courseCode }, deps, { dryRun })) }
    catch (e) {
      if (!(e instanceof PodAudioRefusal)) throw e
      results.push({ status: 'refused', trialId: clip && clip.trialId, code: e.code, error: e.message, ...e.extra })
    }
  }
  const count = (s) => results.filter((r) => r.status === s).length
  return { ok: true, dryRun, courseCode, filed: count('filed'), already: count('already'), wouldFile: count('would-file'), refused: count('refused'), results }
}

/** The route's live I/O: Supabase (service client), the dual-store S3 client, ffmpeg for duration. */
function liveDeps({ sb, s3, bucket }) {
  const { GetObjectCommand, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3')
  const { AUDIO_CACHE_CONTROL } = require('./audio-cache-control.cjs')
  const { durationOf } = require('./ingest-cut.cjs')
  return {
    findIdentity: async ({ courseCode, textNormalized, language, role, voiceId }) => {
      const { data, error } = await sb.from('course_audio').select('id, s3_key, audio_revision')
        .eq('course_code', courseCode).eq('text_normalized', textNormalized).eq('language', language).eq('role', role).eq('voice_id', voiceId).maybeSingle()
      if (error) throw new Error(`course_audio unreadable: ${error.message}`)
      return data || null
    },
    getObject: async (key) => {
      try {
        const r = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
        return Buffer.from(await r.Body.transformToByteArray())
      } catch (e) {
        if (e && (e.name === 'NoSuchKey' || (e.$metadata && e.$metadata.httpStatusCode === 404))) return null
        throw e
      }
    },
    putObject: async (key, body, contentType) => {
      await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType, CacheControl: AUDIO_CACHE_CONTROL }))
    },
    headObject: async (key) => { try { await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key })); return true } catch { return false } },
    durationMs: async (bytes) => durationOf(bytes) * 1000,
    insertRow: async (row) => {
      const { data, error } = await sb.from('course_audio').insert(row).select('id').single()
      if (error) throw new Error(`course_audio insert failed: ${error.message} (object ${row.s3_key} is stored, no row)`)
      return data
    },
  }
}

module.exports = { POD_ONLY_ROLES, POD_ROLE_FOR_SIDE, isPodOnlyRole, isPodOnlyClip, withoutPodOnly, keysForTrial, fileTrialClip, fileTrialClips, liveDeps, PodAudioRefusal }
