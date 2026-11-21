/**
 * Audio pass request queue — the standing policy that CONTENT-PASS TOOLING
 * ENDS BY QUEUEING an audio pass request (never by running TTS, which is
 * approval-gated). Queue rows live in audio_pass_requests
 * (database/migrations/20260711_audio_pass_requests.sql); phase8's /generate
 * fulfils a course's pending request when a pass completes.
 *
 * Usage from a content pass (after its APPLY phase touched learner-facing text):
 *   const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs')
 *   await queueAudioPass(supabase, { courseCode, reason: 'tu-default pass', requestedBy: '@agent', metadata: { rowsTouched } })
 *
 * Ad-hoc scripts can shell out instead:
 *   node tools/course-optimization/queue-audio-pass.cjs <course_code> --reason "<pass name>"
 */

const createLogger = require('./logger.cjs')
const { isHumanVoiceCourse } = require('./human-voice-courses.cjs')
const logger = createLogger('AudioPassQueue')

function refuseHumanVoice(courseCode, reason) {
  if (!isHumanVoiceCourse(courseCode)) return null
  logger.warn(
    `Refused audio-pass request for ${courseCode} (${reason}) — human-voice course, ` +
    'no TTS is ever queued for it. If this content changed, it is a recording task for ' +
    'Aran and Catrin, not a render.'
  )
  return { queued: false, touched: false, refused: true, reason: 'human_voice_course' }
}

/** The patch that joins an open (pending/held) request — shared by the REST and pg paths. */
function joinPatch(existing, { reason, requestedBy, metadata, append, metadataKey }) {
  return append
    ? {
        reason: !existing.reason ? reason
          : existing.reason.includes(reason) ? existing.reason
          : `${existing.reason}; ${reason}`,
        requested_by: existing.requested_by || requestedBy,
        metadata: { ...(existing.metadata || {}), [metadataKey || 'passes']: metadata },
      }
    : { reason, requested_by: requestedBy, metadata: { ...existing.metadata, ...metadata } }
}

function newMetadata({ metadata, append, metadataKey }) {
  return append ? { [metadataKey || 'passes']: metadata } : metadata
}

/**
 * Queue (or touch) the pending audio-pass request for a course.
 * Idempotent: one pending row per course; a repeat call updates reason/metadata.
 * Never throws — a content pass must not fail because the queue write did.
 */
async function queueAudioPass(supabase, { courseCode, reason, requestedBy = null, metadata = {}, append = false, metadataKey = null }) {
  // Human-voice courses never enter a render queue, and an audio_pass_request IS
  // a render queue entry — phase8 /generate fulfils it. This is the route by which
  // an ordinary Welsh text edit would have quietly proposed synthesis over Aran's
  // and Catrin's recordings (Tom 2026-08-13; the cym_* requests dismissed
  // 2026-07-25 arrived exactly this way). Refuse, loudly in the log, and do not
  // fail the caller's content pass — the edit itself is legitimate; only the
  // render request is not. A Welsh text change is a RECORDING task.
  const refusal = refuseHumanVoice(courseCode, reason)
  if (refusal) return refusal

  try {
    const { data: existing } = await supabase
      .from('audio_pass_requests')
      .select('id, metadata, status, reason, requested_by')
      .eq('course_code', courseCode)
      // A HELD request (Tom 2026-09-28, job #569: "no big audio jobs going at
      // all") is still the course's open request: a new text edit joins it and
      // it STAYS held. Opening a fresh pending row beside it would quietly undo
      // the hold. Releasing a hold is setting status back to 'pending' by hand.
      .in('status', ['pending', 'held'])
      .order('created_at')
      .limit(1)
      .maybeSingle()

    if (existing) {
      // ASYMMETRY WORTH KNOWING BEFORE YOU CALL THIS: `metadata` MERGES, but `reason`
      // and `requested_by` are REPLACED. There is one pending row per course, and
      // courses accumulate several unrelated passes between renders — so a second
      // caller silently erases the first caller's account of what changed and why,
      // leaving a render request whose stated reason covers only the latest edit.
      // (Job #407, 2026-09-08: ara_for_eng's pending row already carried the
      // over-long-label repair; the Arabic dialect-contamination reason had to be
      // concatenated onto it by hand to avoid destroying that record.)
      // If your pass is adding to a row that may already exist, read the current
      // reason first and append to it rather than passing your own text alone.
      // `append: true` is the safe way to join a request someone else opened: the
      // open request's reason gains this pass's reason (not replaced), its requester
      // is kept, and this pass's metadata goes under its own `metadataKey` instead
      // of overwriting shared keys. Default behaviour is unchanged for old callers.
      const patch = joinPatch(existing, { reason, requestedBy, metadata, append, metadataKey })
      const { error } = await supabase
        .from('audio_pass_requests')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
      if (error) throw error
      logger.info(`Touched ${existing.status} audio-pass request for ${courseCode} (${reason})`)
      return { queued: false, touched: true, id: existing.id, held: existing.status === 'held' }
    }

    const { data, error } = await supabase
      .from('audio_pass_requests')
      .insert({ course_code: courseCode, reason, requested_by: requestedBy, metadata: newMetadata({ metadata, append, metadataKey }) })
      .select('id')
      .single()
    if (error) throw error
    logger.info(`Queued audio-pass request for ${courseCode} (${reason})`)
    return { queued: true, touched: false, id: data.id }
  } catch (e) {
    logger.warn(`Failed to queue audio pass for ${courseCode}: ${e.message}`)
    return { queued: false, touched: false, error: e.message }
  }
}

/**
 * Mark a course's pending requests fulfilled (called by the audio pass itself
 * after a successful generate+link). Never throws.
 */
async function fulfillAudioPassRequests(supabase, courseCode, fulfilledBy = 'phase8 /generate') {
  try {
    const { data, error } = await supabase
      .from('audio_pass_requests')
      .update({ status: 'fulfilled', fulfilled_at: new Date().toISOString(), fulfilled_by: fulfilledBy, updated_at: new Date().toISOString() })
      .eq('course_code', courseCode)
      .eq('status', 'pending')
      .select('id')
    if (error) throw error
    if (data?.length) logger.info(`Fulfilled ${data.length} audio-pass request(s) for ${courseCode}`)
    return { fulfilled: data?.length || 0 }
  } catch (e) {
    logger.warn(`Failed to fulfil audio-pass requests for ${courseCode}: ${e.message}`)
    return { fulfilled: 0, error: e.message }
  }
}

/**
 * queueAudioPass over a pg client (services/shared/agent-db.cjs connect()) —
 * the same decisions as queueAudioPass: human-voice refusal, join the OLDEST
 * open pending/held row (a held row stays held), append mode, metadata merge.
 * The calling file must carry an `@db-live-write:` marker, or a worker's
 * connection is redirected to the read-only nightly copy and nothing is queued.
 * The open row is locked for the read-modify-write. Never throws.
 */
async function queueAudioPassPg(pg, { courseCode, reason, requestedBy = null, metadata = {}, append = false, metadataKey = null }) {
  const refusal = refuseHumanVoice(courseCode, reason)
  if (refusal) return refusal
  try {
    await pg.query('begin')
    try {
      const { rows } = await pg.query(
        `select id, metadata, status, reason, requested_by from audio_pass_requests
          where course_code = $1 and status = any($2::text[])
          order by created_at limit 1 for update`,
        [courseCode, ['pending', 'held']]
      )
      const existing = rows[0]
      let result
      if (existing) {
        const patch = joinPatch(existing, { reason, requestedBy, metadata, append, metadataKey })
        await pg.query(
          `update audio_pass_requests set reason = $2, requested_by = $3, metadata = $4::jsonb, updated_at = now()
            where id = $1::uuid`,
          [existing.id, patch.reason, patch.requested_by, JSON.stringify(patch.metadata)]
        )
        logger.info(`Touched ${existing.status} audio-pass request for ${courseCode} (${reason})`)
        result = { queued: false, touched: true, id: existing.id, held: existing.status === 'held' }
      } else {
        const ins = await pg.query(
          `insert into audio_pass_requests (course_code, reason, requested_by, metadata)
           values ($1, $2, $3, $4::jsonb) returning id`,
          [courseCode, reason, requestedBy, JSON.stringify(newMetadata({ metadata, append, metadataKey }))]
        )
        logger.info(`Queued audio-pass request for ${courseCode} (${reason})`)
        result = { queued: true, touched: false, id: ins.rows[0].id }
      }
      await pg.query('commit')
      return result
    } catch (e) {
      await pg.query('rollback').catch(() => {})
      throw e
    }
  } catch (e) {
    logger.warn(`Failed to queue audio pass for ${courseCode}: ${e.message}`)
    return { queued: false, touched: false, error: e.message }
  }
}

module.exports = { queueAudioPass, queueAudioPassPg, fulfillAudioPassRequests }
