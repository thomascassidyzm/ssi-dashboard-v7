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
 * THE BUILD is __RECORDER_BUILD__ (vite.config.js): a content hash of the capture and
 * upload code (useTapRecorder.js, useRecordistQueue.js). It changes when that code changes
 * and at no other deploy, so the gate fires on a recorder change, never on every session.
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

module.exports = { SAMPLE_SIZE, keyFor, needsSample, approve, createSampleGateStore }
