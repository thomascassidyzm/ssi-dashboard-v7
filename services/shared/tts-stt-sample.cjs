'use strict'
/**
 * THE ONE Whisper sampling counter for TTS audio (Tom, 2026-11-03,
 * r-2026-11-03-whisper-on-audio-a-1-in): one clip in a hundred is heard, never
 * every clip, never a Welsh one, and what is heard is only RECORDED — never a
 * re-roll, veto or fail-close (r-2026-09-28-no-automatic-whisper-stt-check-may).
 *
 * Two places listen: the TTS door's phonology sample (services/tts-service.cjs)
 * and phase8's veracity check (audio-veracity.renderChecked). A phase8 clip
 * passes through BOTH, so with two counters it was up to 2 in 100 (job #626).
 * Now both draw from this one counter, and renderChecked runs its render inside
 * a clip scope: the door sees the scope and does not draw, so a clip is drawn
 * exactly once, wherever it was rendered. Per process; each process is 1 in 100
 * of its own clips, so the estate is 1 in 100 overall.
 */
const { AsyncLocalStorage } = require('async_hooks')

const SAMPLE_EVERY = 100
let counter = 0
const scope = new AsyncLocalStorage()

/** One draw for one clip: true one time in SAMPLE_EVERY. */
function draw () { return (counter++ % SAMPLE_EVERY) === 0 }

/** Run a render inside a clip scope; the door will not draw for it (the caller draws once). */
function runInClipScope (fn) { return scope.run({ clip: true }, fn) }

/** True while inside a caller's clip scope. */
function inClipScope () { return scope.getStore()?.clip === true }

/** Welsh TTS is never sampled: a cym* course code, or a cy/cym language or locale. */
function isWelsh (courseCode, language) {
  const l = String(language || '').toLowerCase().split('-')[0]
  return l === 'cy' || l === 'cym' || String(courseCode || '').toLowerCase().startsWith('cym')
}

function _reset () { counter = 0 }

module.exports = { SAMPLE_EVERY, draw, runInClipScope, inClipScope, isWelsh, _reset }
