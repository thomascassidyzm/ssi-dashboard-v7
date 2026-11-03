/**
 * sample-gate.cjs — the OFF-CHAIN sample gate (Tom's ruling r-2026-10-31, job #428).
 *
 * "When a very first time a new user gets on there, when there's any change in code of
 * Popty ... check the sample of 10 ... before allowing it to do a thousand. But you can't
 * have anything in the chain."
 *
 * So nothing here touches capture, take saving or upload. The booth reads ONE answer at
 * load — "which recorder build is this voice approved for?" — and, when the build it is
 * running is not that one, it watches its own saved-take count and presses its own Stop
 * after SAMPLE_SIZE takes, then shows those takes for a listen. Approve stores the build
 * here and the session carries on. Every failure path opens the gate: a read that fails,
 * a store that is down, a measure that cannot run — none of them ever stops recording.
 *
 * THE BUILD is __RECORDER_BUILD__ (vite.config.js): a content hash of the files that can change
 * the CAPTURED AUDIO — capture constraints, encoding, where a take ends, which takes are filed,
 * upload, and the server-side receive / trim / refusal of the take (the RECORDER_BUILD_FILES list
 * below, each with its reason). It changes when one of those files changes and at no other
 * deploy, so the gate fires on a recorder change, never on every session. The gate is for a
 * RECORDER change (Tom's Watson, r-2026-10-31, job #575): layout, buttons and routing are OUT,
 * which is why the booth screen and the recordist router are not in the list — the few rules
 * they held that decide a take were moved into boothTakePolicy.js and booth-take-upload.cjs.
 *
 * THE STORE is one small JSON object per voice in S3 (no schema change):
 *   booth-sample-gate/<voiceId>.json  { approvedBuild, approvedAt, approvedBy, history:[...] }
 * A voice with no object has never been approved: its next session is a first session.
 */

'use strict'

const SAMPLE_SIZE = 10
const BUILD_SHAPE = /^[A-Za-z0-9._-]{1,64}$/
const HISTORY_KEEP = 20

const keyFor = (voiceId) => `booth-sample-gate/${encodeURIComponent(voiceId)}.json`

/** Does a session on `build` need the sample first? Pure. Unknown build = never gated (fail open). */
function needsSample(record, build) {
  if (!build || build === 'unknown') return false
  return !(record && record.approvedBuild === build)
}

/** The record after an approval. Pure. */
function approve(record, { build, by, at = new Date().toISOString() }) {
  if (!BUILD_SHAPE.test(String(build || ''))) throw Object.assign(new Error('build must be a recorder build id'), { status: 400 })
  const prior = (record && Array.isArray(record.history)) ? record.history : []
  const entry = { build, by: by || 'unknown', at }
  return { approvedBuild: build, approvedAt: at, approvedBy: entry.by, history: [entry, ...prior].slice(0, HISTORY_KEEP) }
}

function createSampleGateStore({ s3 }) {
  return {
    async read(voiceId) {
      if (!s3 || typeof s3.getJsonObject !== 'function') return null
      return s3.getJsonObject(keyFor(voiceId))
    },
    async approve(voiceId, { build, by }) {
      const current = await this.read(voiceId).catch(() => null)
      const next = approve(current, { build, by })
      await s3.putJsonObject(keyFor(voiceId), next)
      return next
    },
  }
}

const fs = require('fs')
const path = require('path')
const { createHash } = require('crypto')

/**
 * EVERY FILE THAT CAN CHANGE THE CAPTURED AUDIO (Tom's Watson's test, job #575): anything that
 * sets getUserMedia constraints, sample rate, codec or bitrate, encoding, trimming or upload of
 * the take is IN; layout, buttons and routing are OUT. Editing any of these re-fires the 10-take
 * gate once per voice. Never add the gate itself, the booth screen, a router or a general utility,
 * or artists get stopped by deploys that changed nothing they record. If a rule in one of those
 * starts deciding a take, move it into a file here rather than adding the screen.
 * sample-gate.test.cjs fails if any of these is dropped from the list.
 */
const RECORDER_BUILD_FILES = [
  'src/composables/useTapRecorder.js', // microphone capture: getUserMedia constraints per profile, MediaRecorder mime/bitrate, pre-roll and tail
  'src/composables/boothTakePolicy.js', // where a take ends (auto-advance quiet) and which takes are filed or refused as silent
  'src/composables/useRecordistQueue.js', // upload queue: what the booth sends and when, retries, supersession
  'src/services/takeStore.js', // on-device store the take's bytes wait in until they upload
  'src/services/uploadConcurrency.js', // how many takes upload at once and which failures are retried
  'services/voice-engine/booth-take-upload.cjs', // receives the take: multipart parse, 60 MB ceiling, default mime it is processed as
  'services/recording-upload-helpers.cjs', // retains the raw take and runs processing (retainAndProcessTake)
  'services/audio-processor.cjs', // ffmpeg trim / convert of the take
  'services/recording-speech-gate.cjs', // speech, steady-noise and boundary checks that refuse a processed take
]

/** Content hash of RECORDER_BUILD_FILES under `root`. A missing file => 'unknown' (gate stays open). */
function computeRecorderBuild(root, files = RECORDER_BUILD_FILES) {
  try {
    const h = createHash('sha256')
    for (const f of files) h.update(fs.readFileSync(path.resolve(root, f)))
    return h.digest('hex').slice(0, 12)
  } catch { return 'unknown' }
}

module.exports = { RECORDER_BUILD_FILES, computeRecorderBuild, SAMPLE_SIZE, keyFor, needsSample, approve, createSampleGateStore }
