// src/composables/useStoredClip.js
//
// THE POINT OF THIS FILE. When a recordist plays a take back, they must hear
// the PROCESSED, STORED clip — the bytes that came back down off S3 after the
// server's trim/master chain — and not the raw local capture sitting in the
// browser. A raw-buffer preview sounds perfect while the stored clip is being
// butchered, which is exactly how the head-clipping bug went unheard for
// months (docs/audio-forensics-2026-08-14/). The first few takes of a
// re-record session are meant to self-verify the trim pipeline BY EAR, and
// they can only do that if the ear is pointed at the stored object.
//
// So: one route, one label vocabulary, one honest failure story, shared by
// every studio. Never resolve a playback URL by hand anywhere else.

import { getApiUrl } from '@/services/api'

// A marker a human can grep for in the served bundle to prove this shipped.
export const STORED_CLIP_FEATURE = 'stored-clip-playback-2026-08-14'

// What the recordist is about to hear. These strings are the feature: if the
// label and the bytes ever disagree, the feature is worse than not existing.
export const STORED_LABEL = 'Hear stored clip'
export const STORED_LABEL_PLAYING = 'Playing stored clip'
export const STORED_HINT = "You're hearing the processed clip stored on the server, not your raw local take."
export const LOCAL_LABEL = 'Hear raw local take'
export const LOCAL_LABEL_PLAYING = 'Playing raw local take'
export const LOCAL_HINT = 'Not saved yet — this is the raw recording in this browser, before the server trims and masters it.'
export const PENDING_LABEL = 'Saving… not playable yet'
export const PENDING_HINT = 'This take is still uploading. The stored clip can only be played once the server has it.'
export const FAILED_LABEL = 'Not saved — nothing to play'
export const FAILED_HINT = 'This take never reached the server, so there is no stored clip. Record the line again.'

function apiBase() {
  if (typeof localStorage !== 'undefined') {
    const pinned = localStorage.getItem('api_base_url')
    if (pinned) return pinned
  }
  return getApiUrl()
}

/**
 * The stored clip's URL: GET /api/production/audio/:uuid/stream, which reads
 * course_audio.s3_key and 302s to a signed S3 URL (services/production-api.cjs
 * :4701). Deliberately NOT built by the old `mastered/<id>.mp3` convention —
 * a versioned swap keeps the row id and writes a new s3_key, so convention
 * URLs serve the pre-swap object for ever.
 *
 * The route declares no :courseCode, so the app.param course-scope gate
 * (production-api.cjs:366) never fires on it: an <audio> element can take this
 * straight as `src` and follow the 302 itself, with no auth header and no
 * preflight. Verified live: an unknown uuid answers 404 JSON, not 401.
 */
export function storedClipUrl(uuid) {
  if (!uuid) return null
  return `${apiBase()}/api/production/audio/${encodeURIComponent(uuid)}/stream`
}

/**
 * The stored clip's URL on the ONE recordist surface (/r/:voiceId), which is
 * keyed by language + line rather than by a course_audio uuid the page has no
 * business knowing: GET /api/recording/voice/:voiceId/line/:lineId/clip, which
 * serves (or 302s to) the processed bytes.
 *
 * This is the URL the recordist's playback MUST use. The take upload also
 * returns a clipUrl, but that is what the page thinks it uploaded; this route
 * is what the server will actually hand a learner.
 */
export function recordistClipUrl(voiceId, lineId) {
  if (!voiceId || lineId === null || lineId === undefined || lineId === '') return null
  return `${apiBase()}/api/recording/voice/${encodeURIComponent(voiceId)}/line/${encodeURIComponent(lineId)}/clip`
}

/**
 * Same job as diagnoseStoredClip, pointed at the recordist route. Only paid
 * when playback has already failed — an <audio> error carries no status code.
 */
export async function diagnoseRecordistClip(voiceId, lineId) {
  const url = recordistClipUrl(voiceId, lineId)
  if (!url) return 'No stored clip for this line.'
  try {
    const res = await fetch(url, { headers: { 'ngrok-skip-browser-warning': 'true' } })
    if (res.status === 404) return 'The server has no stored clip for this line yet (404). It may not have finished saving.'
    if (res.status === 409) return 'The take is registered but has no processed audio yet (409). Try again in a moment.'
    if (!res.ok) return `The stored clip could not be fetched (${res.status}).`
    return 'The stored clip was found but could not be played in this browser.'
  } catch {
    return 'Could not reach the server to fetch the stored clip.'
  }
}

/**
 * Ask the route what actually went wrong, so the recordist reads something
 * true rather than a generic failure. An <audio> error event carries no status
 * code, so we only pay this fetch when playback has already failed.
 *
 * 404 = no course_audio row / no s3_key. 409 = the row exists but its key is
 * still `pending/` — no rendered audio yet.
 */
export async function diagnoseStoredClip(uuid) {
  const url = storedClipUrl(uuid)
  if (!url) return 'No stored clip for this take.'
  try {
    const res = await fetch(url, { headers: { 'ngrok-skip-browser-warning': 'true' } })
    if (res.status === 404) return 'The server has no stored clip for this take (404). It may not have finished saving.'
    if (res.status === 409) return 'The take is registered but has no rendered audio yet (409). Try again in a moment.'
    if (!res.ok) return `The stored clip could not be fetched (${res.status}).`
    return 'The stored clip was found but could not be played in this browser.'
  } catch {
    return 'Could not reach the server to fetch the stored clip.'
  }
}

/**
 * Which bytes a take should be played from, and what to call them.
 *
 * `uuid` present = the server has it: play the STORED clip, say so.
 * `storedUrl` is the same claim made by a caller whose stored clip is addressed
 * some other way (the recordist surface addresses it by voice + line, not by
 * uuid) — it wears exactly the same label, because it is the same promise.
 * Neither = pre-upload state. `allowLocal` decides whether the raw local blob
 * is offered at all; when it is, it is labelled as raw, never as stored.
 *
 * Returns { source, url, playable, label, playingLabel, hint }.
 */
export function resolveTakePlayback({ uuid = null, storedUrl = null, localUrl = null, pending = false, failed = false, allowLocal = true } = {}) {
  if (uuid || storedUrl) {
    return {
      source: 'stored',
      url: storedUrl || storedClipUrl(uuid),
      playable: true,
      label: STORED_LABEL,
      playingLabel: STORED_LABEL_PLAYING,
      hint: STORED_HINT
    }
  }
  if (failed) {
    return { source: 'failed', url: null, playable: false, label: FAILED_LABEL, playingLabel: FAILED_LABEL, hint: FAILED_HINT }
  }
  if (allowLocal && localUrl) {
    return {
      source: 'local',
      url: localUrl,
      playable: true,
      label: LOCAL_LABEL,
      playingLabel: LOCAL_LABEL_PLAYING,
      hint: LOCAL_HINT
    }
  }
  if (pending || localUrl) {
    return { source: 'pending', url: null, playable: false, label: PENDING_LABEL, playingLabel: PENDING_LABEL, hint: PENDING_HINT }
  }
  return { source: 'none', url: null, playable: false, label: 'Nothing recorded', playingLabel: '', hint: '' }
}
