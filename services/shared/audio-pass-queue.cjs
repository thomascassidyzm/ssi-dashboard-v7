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
const logger = createLogger('AudioPassQueue')

/**
 * Queue (or touch) the pending audio-pass request for a course.
 * Idempotent: one pending row per course; a repeat call APPENDS to reason and
 * merges metadata.
 * Never throws — a content pass must not fail because the queue write did.
 */
async function queueAudioPass(supabase, { courseCode, reason, requestedBy = null, metadata = {} }) {
  try {
    const { data: existing } = await supabase
      .from('audio_pass_requests')
      .select('id, metadata, reason')
      .eq('course_code', courseCode)
      .eq('status', 'pending')
      .maybeSingle()

    if (existing) {
      // Append rather than replace. There is one pending row per course, and every
      // content pass is supposed to end by queueing a request — so two passes on the
      // same course collide by construction, and this used to overwrite silently
      // (it did not even SELECT reason, so it could not know what it destroyed).
      // On 2026-08-17 a Deborah-findings pass wiped eng_for_por's pod-0 fresh-build
      // reason; it was only recovered because the agent happened to check.
      // The reason text is the sole record of WHY a course owes a pass, and whoever
      // approves it reads that text to decide scope.
      const merged = !existing.reason
        ? reason
        : existing.reason.includes(reason)
          ? existing.reason              // already recorded — don't duplicate on retry
          : `${existing.reason} || ${reason}`
      const { error } = await supabase
        .from('audio_pass_requests')
        .update({
          reason: merged,
          // requested_by is deliberately left as last-writer-wins: who to ask about
          // the most recent addition is at least as useful as who asked first, and
          // changing it is a behaviour choice rather than a bug fix.
          requested_by: requestedBy,
          metadata: { ...existing.metadata, ...metadata },
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
      if (error) throw error
      logger.info(`Touched pending audio-pass request for ${courseCode} (${merged})`)
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
