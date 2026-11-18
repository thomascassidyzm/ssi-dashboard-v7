// services/shared/estate-map-view.cjs
//
// The pure half of GET /api/estate-map (production-api): deciding what a
// course is blocked on, and rendering the payload as skimmable text. No I/O,
// so the ordering and the wording are readable and testable here. The
// derivation that feeds these (totals, serving pod, audio summary) stays in
// production-api.cjs.

/**
 * Decide what a course is blocked on, from its already-derived row plus the live
 * voice-approval verdict on the pod it serves. Pure — no I/O — so the ordering is
 * readable and testable.
 *
 * Returns EVERY applicable blocker, not just the first. Reporting only the highest
 * would be the bug this endpoint exists to prevent: every one of the 67 courses with
 * a pod is awaiting voice approval, which would mask the fact that the Welsh pod's
 * English track is separately silent. `blocked_reason` is the one to act on;
 * `blocked_reasons` is the truth.
 *
 * READS `serving_pod`, NOT A SLUG. The reason strings are an API contract other
 * readers key on; `pod_*` names the served pod, whatever its slug.
 */
function estateMapBlockers(course, approval) {
  const servedPod = course.serving_pod || { exists: false }
  const out = []
  if ((course.audio?.clips || 0) === 0) {
    out.push({ reason: 'no_audio', detail: 'No audio rows exist for this course at all.' })
  }
  if (servedPod.exists && approval && !approval.ok) {
    out.push({
      reason: approval.reason === 'stale_approval' ? 'pod_stale_voice_approval' : 'pod_awaiting_voice_approval',
      detail: approval.message,
    })
  }
  if (servedPod.exists && (servedPod.known_empty > 0 || servedPod.known_dead_stubs > 0)) {
    out.push({
      reason: 'pod_known_track_incomplete',
      detail: `The ${servedPod.slug || 'serving'} known-language track has ${servedPod.known_empty} empty slots and `
        + `${servedPod.known_dead_stubs} linked-but-dead clips out of ${servedPod.slots}.`,
    })
  }
  if (servedPod.exists && servedPod.target_empty > 0) {
    out.push({
      reason: 'pod_target_track_incomplete',
      detail: `The ${servedPod.slug || 'serving'} target-language track has ${servedPod.target_empty} empty slots out of ${servedPod.slots}.`,
    })
  }
  return out
}

/** Skimmable text rendering, so a worker can eyeball the map without jq. */
function estateMapAsText(payload) {
  const t = payload.totals
  const lines = [
    `ESTATE MAP — computed ${payload.generated_at} (fresh per read, never cached)`,
    '',
    `courses ${t.courses} | released ${t.released} (live ${t.new_app_live} + beta ${t.new_app_beta}) | `
      + `unreleased ${t.courses - t.released} (drafts/never-shipped) | `
      + `tts ${t.voice_mode.tts} human ${t.voice_mode.human} mixed ${t.voice_mode.mixed} unknown ${t.voice_mode.unknown}`,
    `serving pod: ${t.with_serving_pod} courses have one (${t.serving_pod_slugs}) | blocked: ${t.blocked}`,
    ...Object.entries(t.blocked_by_reason).map(([r, n]) => `    ${n}  ${r}`),
    '',
    `pod lines, per-course counting ${t.serving_pod_lines.per_course_counting} -> per-LANGUAGE `
      + `${t.serving_pod_lines.distinct_per_language} distinct. Pods are per language, not per course.`,
    ...payload.pods_by_language.slice(0, 8).map(l =>
      `    ${l.lang.padEnd(5)} ${String(l.slots_per_course_counting).padStart(6)} slots -> `
      + `${String(l.distinct_lines).padStart(5)} lines  (${l.collapse_factor}x)  across `
      + `${l.courses_with_serving_pod} courses`),
    '',
    'COURSE                          REL  VOICE   CLIPS    SERVING POD (tgt/known of slots)  BLOCKED ON',
  ]
  for (const c of payload.courses) {
    // The slug is ON the line, because "which pod is this?" stopped having one
    // answer for the whole estate on 2026-08-22 and a column that hides it lies.
    const pod = c.serving_pod.exists
      ? `${c.serving_pod.slug} ${c.serving_pod.target_linked}/${c.serving_pod.known_linked} of ${c.serving_pod.slots}`.padEnd(32)
      : '—'.padEnd(32)
    lines.push(
      c.course_code.padEnd(32)
      + (c.released ? 'yes' : 'no ').padEnd(5)
      + c.audio.voice_mode.padEnd(8)
      + String(c.audio.clips).padEnd(9)
      + pod
      + c.blocked_reasons.join(', '),
    )
  }
  lines.push('', 'SEMANTICS — what these words mean here', '')
  for (const [k, v] of Object.entries(payload.semantics)) lines.push(`${k}:`, `  ${v}`, '')
  return lines.join('\n')
}

module.exports = { estateMapBlockers, estateMapAsText }
