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
export const SAMPLE_SIZE = 5 // was 10 (r-2026-10-31); 5 asked by Aran, approved by Tom 2026-11-03 (jobs #591, #599). Server half must match.

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

// THE PASS IS THE VOICE'S, ON THE SERVER (job #569). This tab also remembers it, keyed by voice
// and build, only so that an approval the store could not save (a network blip) is not asked
// again on the next reload in the same tab. The server record is what every other tab, device
// and incognito window reads; this memory is a fallback, never the record.
const PASSED_KEY = (voiceId, build) => `booth.samplePassed:${voiceId}:${build}`
export function rememberPassed(voiceId, build = RECORDER_BUILD, store = safeSession()) {
  try { store && store.setItem(PASSED_KEY(voiceId, build), '1') } catch { /* private mode */ }
}
export function passedInThisTab(voiceId, build = RECORDER_BUILD, store = safeSession()) {
  try { return !!(store && store.getItem(PASSED_KEY(voiceId, build))) } catch { return false }
}
function safeSession() {
  try { return typeof sessionStorage !== 'undefined' ? sessionStorage : null } catch { return null }
}

/** Is this session gated? Reads the voice's approved build; ANY failure answers false (open). */
export async function readSampleGate({ base, voiceId, build = RECORDER_BUILD, withKey = (u) => u, fetchImpl = fetch, session = safeSession() }) {
  if (!gateAppliesTo(voiceId) || !build || build === 'unknown') return { gated: false, size: SAMPLE_SIZE }
  if (passedInThisTab(voiceId, build, session)) return { gated: false, size: SAMPLE_SIZE }
  try {
    const res = await fetchImpl(withKey(`${base}/api/recording/voice/${encodeURIComponent(voiceId)}/sample-gate?build=${encodeURIComponent(build)}`, voiceId))
    if (!res.ok) return { gated: false, size: SAMPLE_SIZE }
    const body = await res.json()
    return { gated: body.needsSample === true, size: Number(body.sampleSize) > 0 ? Number(body.sampleSize) : SAMPLE_SIZE }
  } catch {
    return { gated: false, size: SAMPLE_SIZE }
  }
}

/**
 * Approve this build for this voice. Resolves true/false; the caller carries on either way.
 * Tries a few times (the store call is idempotent), and remembers the pass in this tab whatever
 * the store said, so a blip never re-asks on the next reload (job #569).
 */
export async function approveSampleGate({ base, voiceId, build = RECORDER_BUILD, withKey = (u) => u, fetchImpl = fetch, attempts = 3, waitMs = 800, session = safeSession() }) {
  rememberPassed(voiceId, build, session)
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetchImpl(withKey(`${base}/api/recording/voice/${encodeURIComponent(voiceId)}/sample-gate/approve`, voiceId), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ build, by: 'artist' }),
      })
      if (res.ok) return true
      if (res.status >= 400 && res.status < 500) return false // refused, not a blip: retrying cannot help
    } catch { /* network: try again */ }
    if (i < attempts - 1 && waitMs > 0) await new Promise((r) => setTimeout(r, waitMs * (i + 1)))
  }
  return false
}

/**
 * THE RELOAD WAITS FOR THE SAVE (job #574). Calls `release` once `save` has settled, or after
 * `capMs` if it never does, so a waiting new-build reload cannot cut the approval off mid-send
 * and a hung request cannot pin an old build for ever. Returns `save` unchanged.
 */
export function releaseWhenSettled(save, release, capMs = 15000, setTimeoutImpl = setTimeout) {
  let done = false
  const go = () => { if (!done) { done = true; release() } }
  Promise.resolve(save).then(go, go)
  setTimeoutImpl(go, capMs)
  return save
}

/**
 * LEAVING THE PAGE IS CARRYING ON TOO (Aran, 2026-11-03, job #574). A reload or a closed tab
 * while the check is showing used to save no answer, so the check came straight back. On
 * pagehide the booth sends the same approval with a request the browser finishes after the page
 * is gone: fetch keepalive (it keeps the JSON body the route reads), else sendBeacon. Synchronous,
 * fire and forget; it remembers the pass in this tab first, so a reload never asks again even if
 * the send is lost. Returns true when a send was queued.
 */
export function approveSampleGateOnUnload({ base, voiceId, build = RECORDER_BUILD, withKey = (u) => u, fetchImpl = typeof fetch !== 'undefined' ? fetch : null, beacon = typeof navigator !== 'undefined' && navigator.sendBeacon ? navigator.sendBeacon.bind(navigator) : null, session = safeSession() }) {
  rememberPassed(voiceId, build, session)
  const url = withKey(`${base}/api/recording/voice/${encodeURIComponent(voiceId)}/sample-gate/approve`, voiceId)
  const body = JSON.stringify({ build, by: 'artist' })
  try {
    if (fetchImpl) {
      fetchImpl(url, { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body }).catch(() => {})
      return true
    }
  } catch { /* keepalive refused: try the beacon */ }
  try {
    if (beacon) return !!beacon(url, new Blob([body], { type: 'application/json' }))
  } catch { /* nothing more a closing page can do */ }
  return false
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
