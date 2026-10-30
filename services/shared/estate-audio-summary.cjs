'use strict'
/**
 * estate-audio-summary.cjs — keeps the course_audio aggregates behind estate_map() fresh.
 *
 * estate_map() used to group all of course_audio on every call and outgrew the 8 s DB statement
 * limit (Tom: do NOT raise it). It now reads small summary tables; this refreshes them ONE
 * COURSE PER rpc, so every statement is an index-only read of a single course and none can reach
 * the limit. A course that fails is reported and skipped — it keeps its previous totals and the
 * rest still refresh. Per-row triggers on course_audio are deliberately not used (26 indexes,
 * heavy writes). Totals that actually moved are logged in estate_audio_refresh_log by the SQL.
 */

async function refreshEstateAudioSummary({ rpc, listCourses, log = () => {} }) {
  const courses = await listCourses()
  const out = { ok: 0, failed: [], changed: [], deadStubs: null }
  for (const course of courses) {
    const { data, error } = await rpc('refresh_estate_audio_course', { p_course: course })
    if (error) { out.failed.push({ course, error: error.message }); continue }
    out.ok++
    if (data && data.changed) {
      out.changed.push({ course, clips: data.clips_after - data.clips_before, veracity: data.veracity_after - data.veracity_before })
    }
  }
  const stubs = await rpc('refresh_estate_audio_dead_stubs', {})
  if (stubs.error) out.failed.push({ course: '(dead_stubs)', error: stubs.error.message })
  else out.deadStubs = stubs.data
  log(`estate audio summary: ${out.ok}/${courses.length} courses refreshed, ${out.changed.length} changed`
    + (out.failed.length ? `, FAILED ${out.failed.map(f => `${f.course}: ${f.error}`).join('; ')}` : ''))
  return out
}

/** Run now (after delayMs), then every intervalMs. Never throws; timers do not hold the process open. */
function scheduleEstateAudioSummary({ run, intervalMs, delayMs = 20000, onError = () => {} }) {
  const tick = () => run().catch(onError)
  const first = setTimeout(tick, delayMs)
  const every = setInterval(tick, intervalMs)
  first.unref(); every.unref()
  return () => { clearTimeout(first); clearInterval(every) }
}

module.exports = { refreshEstateAudioSummary, scheduleEstateAudioSummary }
