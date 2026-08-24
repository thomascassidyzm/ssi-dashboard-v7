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

/**
 * Queue (or touch) the pending audio-pass request for a course.
 * Idempotent: one pending row per course; a repeat call updates reason/metadata.
 * Never throws — a content pass must not fail because the queue write did.
 */
async function queueAudioPass(supabase, { courseCode, reason, requestedBy = null, metadata = {} }) {
  // Human-voice courses never enter a render queue, and an audio_pass_request IS
  // a render queue entry — phase8 /generate fulfils it. This is the route by which
  // an ordinary Welsh text edit would have quietly proposed synthesis over Aran's
  // and Catrin's recordings (Tom 2026-08-13; the cym_* requests dismissed
  // 2026-07-25 arrived exactly this way). Refuse, loudly in the log, and do not
  // fail the caller's content pass — the edit itself is legitimate; only the
  // render request is not. A Welsh text change is a RECORDING task.
  if (isHumanVoiceCourse(courseCode)) {
    logger.warn(
      `Refused audio-pass request for ${courseCode} (${reason}) — human-voice course, ` +
      'no TTS is ever queued for it. If this content changed, it is a recording task for ' +
      'Aran and Catrin, not a render.'
    )
    return { queued: false, touched: false, refused: true, reason: 'human_voice_course' }
  }

  try {
    const { data: existing } = await supabase
      .from('audio_pass_requests')
      .select('id, metadata')
      .eq('course_code', courseCode)
      .eq('status', 'pending')
      .maybeSingle()

    if (existing) {
      const { error } = await supabase
        .from('audio_pass_requests')
        .update({
          reason,
          requested_by: requestedBy,
          metadata: { ...existing.metadata, ...metadata },
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
      if (error) throw error
      logger.info(`Touched pending audio-pass request for ${courseCode} (${reason})`)
      return { queued: false, touched: true, id: existing.id }
    }

    const { data, error } = await supabase
      .from('audio_pass_requests')
      .insert({ course_code: courseCode, reason, requested_by: requestedBy, metadata })
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

module.exports = { queueAudioPass, fulfillAudioPassRequests }
