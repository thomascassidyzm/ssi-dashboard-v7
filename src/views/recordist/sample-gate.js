// THE SAMPLE GATE, booth side (Tom's ruling r-2026-10-31, job #428). OFF the recording chain.
//
// "When a very first time a new user gets on there, when there's any change in code of Popty ...
// check the sample of 10 ... before allowing it to do a thousand. But you can't have anything in
// the chain." So the booth only OBSERVES: it counts the takes it has already saved this session
// (readThisSession, which commit() keeps), and when a gated session reaches SAMPLE_SIZE it presses
// its own Stop — the same Stop the artist presses — and the done card shows those takes for a
// listen. Capture, take saving, auto-advance and the upload queue are never touched.
//
// Every failure opens the gate: a read that fails, a build the page cannot name, a store that is
// down on approve. An artist is never stranded — Approve is theirs to tap, always.
// Server half: services/voice-engine/sample-gate.cjs.

/* global __RECORDER_BUILD__ */
export const SAMPLE_SIZE = 10

// The recorder build: a content hash of the capture + upload code, made in vite.config.js. It
// changes when that code changes and at no other deploy.
export const RECORDER_BUILD = typeof __RECORDER_BUILD__ !== 'undefined' ? __RECORDER_BUILD__ : 'unknown'

/** A recording pack (the setup check, the clone source) is itself a sample: never gated. */
export function gateAppliesTo(voiceId) {
  return !!voiceId && !String(voiceId).startsWith('pack-')
}

/**
 * What the gate does now. Pure. 'stop' = a gated live session has saved its sample: press Stop.
 * 'show' = a gated session ended on its own (last line, or the artist's Stop) with takes saved:
 * show what it has — a batch shorter than the sample must not slip past the gate for ever.
 * null = nothing.
 */
export function sampleGateAction({ gated, held, phase, saved, size = SAMPLE_SIZE }) {
  if (!gated || held || !(saved > 0)) return null
  if (phase === 'recording') return saved >= size ? 'stop' : null
  if (phase === 'done') return 'show'
  return null
}

/** Is this session gated? Reads the voice's approved build; ANY failure answers false (open). */
export async function readSampleGate({ base, voiceId, build = RECORDER_BUILD, withKey = (u) => u, fetchImpl = fetch }) {
  if (!gateAppliesTo(voiceId) || !build || build === 'unknown') return { gated: false, size: SAMPLE_SIZE }
  try {
    const res = await fetchImpl(withKey(`${base}/api/recording/voice/${encodeURIComponent(voiceId)}/sample-gate?build=${encodeURIComponent(build)}`, voiceId))
    if (!res.ok) return { gated: false, size: SAMPLE_SIZE }
    const body = await res.json()
    return { gated: body.needsSample === true, size: Number(body.sampleSize) > 0 ? Number(body.sampleSize) : SAMPLE_SIZE }
  } catch {
    return { gated: false, size: SAMPLE_SIZE }
  }
}

/** Approve this build for this voice. Resolves true/false; the caller carries on either way. */
export async function approveSampleGate({ base, voiceId, build = RECORDER_BUILD, withKey = (u) => u, fetchImpl = fetch }) {
  try {
    const res = await fetchImpl(withKey(`${base}/api/recording/voice/${encodeURIComponent(voiceId)}/sample-gate/approve`, voiceId), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ build, by: 'artist' }),
    })
    return res.ok
  } catch { return false }
}

/**
 * The advisory sound check on ONE saved take (the bytes already on this device). Null when it
 * cannot say — an unmeasured take is shown unmeasured, never failed, and never blocks anything.
 */
export async function measureSampleTake({ base, voiceId, url, withKey = (u) => u, fetchImpl = fetch }) {
  if (!url) return null
  try {
    const blob = await (await fetchImpl(url)).blob()
    const form = new FormData()
    form.append('mimeType', blob.type || 'audio/webm')
    form.append('audio', blob, 'take')
    const res = await fetchImpl(withKey(`${base}/api/recording/voice/${encodeURIComponent(voiceId)}/sample-gate/measure`, voiceId), { method: 'POST', body: form })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}
