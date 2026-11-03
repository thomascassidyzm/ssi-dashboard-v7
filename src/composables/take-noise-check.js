// src/composables/take-noise-check.js
//
// THE ONE QUALITY CHECK A TAKE GETS: IS THERE HISS BEFORE OR AFTER THE VOICE?
//
// Tom, 2026-10-31 (r-2026-10-31-audio-quality-is-a-threshold-not): "audio is a
// threshold thing, and providing the audio sounds clear, it doesn't have any
// hiss before it actually comes in or after. That's the quality of the audio."
//
// Every take the booth captures carries room either side of the read by design
// (useTapRecorder: >= PRE_ROLL_MIN_MS of lead, TAIL_MS of tail), so the room
// tone is right there in the clip. This measures it against the voice:
//
//   1. Short-time RMS in FRAME_MS frames, in dBFS.
//   2. speech level = the SPEECH_PCT percentile frame (the body of the read,
//      robust to one plosive).
//   3. voice activity = frames above the HIGHER of (a) the midpoint (in dB)
//      between the quietest tenth of the clip and the speech level, and (b)
//      VOICE_DROP_DB under the speech level. (a) keeps a uniformly hissy take
//      judgeable — a fixed drop alone would call the hiss voice and see no room;
//      (b) keeps hiss on ONE side only (quiet lead, hissy tail) from being
//      mistaken for voice just because the clean side drags the midpoint down.
//   4. lead = everything before the first active frame, tail = everything after
//      the last, each shrunk by a guard so breath-in and decay are not counted.
//   5. floor = the median frame of the lead and of the tail, separately, and the
//      LOUDER of the two is the take's floor ("before it comes in OR after").
//      A median, so one click or chair creak does not count as hiss.
//   6. headroom = speech level - floor. Below HISS_HEADROOM_DB → flagged.
//
// THE THRESHOLD: 30 dB. A clean take — a phone on the voice chain, or a proper
// mic close up in a quiet room — measures 40-55 dB here; audiobook practice
// (ACX) asks for a room roughly 40 dB under the voice. We flag only well short
// of that, at the point the room is plainly audible in the pauses once the
// server lifts the take to -16 LUFS, so a merely ordinary room never draws the
// hint. It is a calm note on screen and never a blocker: the take is saved
// either way.
//
// A side with less than MIN_SIDE_MS of room is not judged; if neither side has
// enough, the take is "unjudged" rather than guessed at.

export const FRAME_MS = 20
export const SPEECH_PCT = 0.95
export const QUIET_PCT = 0.10
export const HISS_HEADROOM_DB = 30
export const VOICE_DROP_DB = 18
export const MIN_SIDE_MS = 150
export const LEAD_GUARD_MS = 100
export const TAIL_GUARD_MS = 200
// Below this a frame is digital silence, not a room.
const SILENT_DB = -100

function dbOf(rms) { return rms > 0 ? 20 * Math.log10(rms) : -Infinity }

function percentile(sorted, p) {
  if (!sorted.length) return -Infinity
  const i = Math.min(sorted.length - 1, Math.max(0, Math.round(p * (sorted.length - 1))))
  return sorted[i]
}

function median(arr) {
  if (!arr.length) return -Infinity
  const s = [...arr].sort((a, b) => a - b)
  return percentile(s, 0.5)
}

const round1 = (x) => (Number.isFinite(x) ? Math.round(x * 10) / 10 : null)

/**
 * @param {Float32Array|number[]} samples mono, -1..1
 * @param {number} sampleRate
 * @returns {{ verdict: 'clean'|'hiss'|'unjudged', speechDb, leadDb, tailDb, floorDb, headroomDb, reason }}
 */
export function measureTakeNoise(samples, sampleRate) {
  const out = (verdict, extra) => ({ verdict, speechDb: null, leadDb: null, tailDb: null, floorDb: null, headroomDb: null, ...extra })
  if (!samples || !samples.length || !sampleRate) return out('unjudged', { reason: 'no audio' })
  const frameLen = Math.max(1, Math.round(sampleRate * FRAME_MS / 1000))
  const frames = []
  for (let start = 0; start + frameLen <= samples.length; start += frameLen) {
    let sum = 0
    for (let i = start; i < start + frameLen; i++) sum += samples[i] * samples[i]
    frames.push(Math.max(SILENT_DB, dbOf(Math.sqrt(sum / frameLen))))
  }
  if (frames.length < 10) return out('unjudged', { reason: 'too short' })
  const sorted = [...frames].sort((a, b) => a - b)
  const speechDb = percentile(sorted, SPEECH_PCT)
  const quietDb = percentile(sorted, QUIET_PCT)
  if (speechDb <= SILENT_DB) return out('unjudged', { reason: 'silent take' })
  const gate = Math.max((speechDb + quietDb) / 2, speechDb - VOICE_DROP_DB)
  const first = frames.findIndex(f => f > gate)
  let last = -1
  for (let i = frames.length - 1; i >= 0; i--) if (frames[i] > gate) { last = i; break }
  if (first === -1) return out('unjudged', { reason: 'no voice found', speechDb: round1(speechDb) })

  const leadGuard = Math.ceil(LEAD_GUARD_MS / FRAME_MS)
  const tailGuard = Math.ceil(TAIL_GUARD_MS / FRAME_MS)
  const minSide = Math.ceil(MIN_SIDE_MS / FRAME_MS)
  const lead = frames.slice(0, Math.max(0, first - leadGuard))
  const tail = frames.slice(Math.min(frames.length, last + 1 + tailGuard))
  const leadDb = lead.length >= minSide ? median(lead) : null
  const tailDb = tail.length >= minSide ? median(tail) : null
  const sides = [leadDb, tailDb].filter(v => v !== null)
  if (!sides.length) {
    return out('unjudged', { reason: 'not enough room before or after the voice', speechDb: round1(speechDb) })
  }
  const floorDb = Math.max(...sides)
  const headroomDb = speechDb - floorDb
  const verdict = headroomDb < HISS_HEADROOM_DB ? 'hiss' : 'clean'
  return {
    verdict,
    speechDb: round1(speechDb),
    leadDb: round1(leadDb),
    tailDb: round1(tailDb),
    floorDb: round1(floorDb),
    headroomDb: round1(headroomDb),
    reason: verdict === 'hiss'
      ? `room is only ${Math.round(headroomDb)} dB under the voice (${tailDb !== null && floorDb === tailDb ? 'after' : 'before'} the read)`
      : `room ${Math.round(headroomDb)} dB under the voice`,
  }
}

/**
 * Decode a take blob in the browser and measure it. Resolves null if the
 * browser cannot decode it — the check is a hint, never a reason to fail.
 */
export async function checkTakeBlob(blob) {
  try {
    if (!blob || typeof window === 'undefined') return null
    const Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext
    if (!Ctx) return null
    const buf = await blob.arrayBuffer()
    const ctx = new Ctx(1, 1, 48000)
    const audio = await new Promise((resolve, reject) => {
      const p = ctx.decodeAudioData(buf, resolve, reject)
      if (p && typeof p.then === 'function') p.then(resolve, reject)
    })
    return measureTakeNoise(audio.getChannelData(0), audio.sampleRate)
  } catch {
    return null
  }
}
