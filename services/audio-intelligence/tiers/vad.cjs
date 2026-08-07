/**
 * TIER 3 — VAD: where does the speech actually start and stop?
 *
 * This tier does double duty, which is why it is in the engine rather than in
 * any one caller:
 *
 *  1. DETECTION INPUT. Tier 1 divides syllables by duration. If it divides by
 *     the FILE duration it is really measuring how much silence the mastering
 *     left on, and two voices with different padding get different thresholds
 *     for no acoustic reason. Dividing by the SPEECH span is the measurement
 *     Tom actually described. So tier 3 runs before tier 1 can be trusted.
 *
 *  2. THE LEARNING APP'S FOOD. Tom's own idea: the per-clip speech-start and
 *     speech-end offsets this produces are exactly what the learner-side
 *     voice-activity detection needs as ground truth. They are persisted and
 *     exported rather than thrown away after the verdict. See export.cjs.
 *
 * METHOD, and why not a neural VAD. This is an energy VAD with a per-clip
 * adaptive floor. A neural VAD (Silero et al.) is better at separating speech
 * from BACKGROUND NOISE — which is a problem we do not have. These are studio
 * TTS renders: the noise floor is near-digital-silence and the speech is 40+ dB
 * above it. The hard case in this estate is not "is that speech or a passing
 * lorry", it is "did the word finish", and an energy VAD answers that just as
 * well for zero dependencies and roughly a thousandth of the CPU. That is the
 * better × simpler × cheaper call; if we ever ingest recorded-in-the-wild audio
 * it should be revisited.
 *
 * ⚠️ A VAD CANNOT TELL YOU A WORD IS MISSING. It reports where sound is, not
 * whether the right sound is there. A cleanly-truncated clip has a perfectly
 * respectable speech span. Tier 3 exists to MEASURE the span, and it is tiers
 * 1, 2 and 4 that decide whether the span is the right one.
 */

const envelope = require('../envelope.cjs')

/**
 * How far above the clip's own noise floor a frame must sit to count as speech.
 *
 * Adaptive rather than absolute: an absolute dBFS gate would call a quietly
 * mastered clip entirely silent. 12 dB is a wide margin over a studio noise
 * floor and comfortably below the quietest voiced tail we have measured — it
 * has to be, because the whole point is to catch a voice trailing off without
 * declaring the trail-off itself to be silence.
 *
 * DEFAULT, not a ruling. Exposed for calibration.
 */
const SPEECH_MARGIN_DB = Number(process.env.AIE_VAD_MARGIN_DB || 12)

/**
 * Frames shorter than this on either side of a boundary are bridged rather than
 * treated as the end of speech. A stop consonant ("t", "k", "p") has a genuine
 * silent closure of up to ~80 ms before the burst — without this, "possible"
 * ends at the closure of the final "b" and every plosive-final clip looks
 * truncated. 120 ms clears the longest closures while staying well under the
 * shortest inter-word pause a TTS voice produces.
 */
const BRIDGE_MS = Number(process.env.AIE_VAD_BRIDGE_MS || 120)

/**
 * Locate the speech span.
 *
 * @returns {{speechStartSec, speechEndSec, speechDurationSec,
 *            leadingSilenceSec, trailingSilenceSec, thresholdDb, levels,
 *            segments, voiced: boolean}}
 */
function analyse (samples, sampleRate, opts = {}) {
  const marginDb = opts.marginDb != null ? opts.marginDb : SPEECH_MARGIN_DB
  const bridgeMs = opts.bridgeMs != null ? opts.bridgeMs : BRIDGE_MS

  const fr = opts.frames || envelope.frames(samples, sampleRate)
  const lv = envelope.levels(fr.db)
  const totalSec = samples.length / sampleRate

  // Nothing to find in an empty or digitally silent file.
  if (!fr.db.length || lv.speechDb == null || lv.speechDb <= -119) {
    return {
      voiced: false,
      speechStartSec: null,
      speechEndSec: null,
      speechDurationSec: 0,
      leadingSilenceSec: totalSec,
      trailingSilenceSec: totalSec,
      totalDurationSec: totalSec,
      thresholdDb: null,
      levels: lv,
      segments: [],
    }
  }

  const thresholdDb = lv.noiseDb + marginDb

  // If the "noise floor" is within the margin of the speech level the clip has
  // no dynamic range at all — a constant tone or a hard-limited render. Fall
  // back to a level relative to the speech itself so we still return a span.
  const gate = (lv.speechDb - thresholdDb) < 6
    ? lv.speechDb - 25
    : thresholdDb

  const bridgeFrames = Math.round(bridgeMs / fr.hopMs)

  // Build voiced segments, bridging short gaps (see BRIDGE_MS).
  const segments = []
  let segStart = null
  let gapRun = 0

  for (let i = 0; i < fr.db.length; i++) {
    const voiced = fr.db[i] >= gate
    if (voiced) {
      if (segStart == null) segStart = i
      gapRun = 0
    } else if (segStart != null) {
      gapRun++
      if (gapRun > bridgeFrames) {
        segments.push([segStart, i - gapRun])
        segStart = null
        gapRun = 0
      }
    }
  }
  if (segStart != null) segments.push([segStart, fr.db.length - 1])

  if (!segments.length) {
    return {
      voiced: false,
      speechStartSec: null,
      speechEndSec: null,
      speechDurationSec: 0,
      leadingSilenceSec: totalSec,
      trailingSilenceSec: totalSec,
      totalDurationSec: totalSec,
      thresholdDb: gate,
      levels: lv,
      segments: [],
    }
  }

  const startFrame = segments[0][0]
  const endFrame = segments[segments.length - 1][1]

  // End-of-frame, not start-of-frame: the last voiced frame's energy runs for a
  // full window. Using its start time under-reports speech end by 25 ms, which
  // on a one-second clip is a 2.5% error in the tier-1 rate.
  const speechStartSec = fr.frameTimeSec(startFrame)
  const speechEndSec = Math.min(totalSec, fr.frameTimeSec(endFrame) + fr.windowMs / 1000)

  return {
    voiced: true,
    speechStartSec,
    speechEndSec,
    speechDurationSec: speechEndSec - speechStartSec,
    leadingSilenceSec: speechStartSec,
    trailingSilenceSec: totalSec - speechEndSec,
    totalDurationSec: totalSec,
    thresholdDb: gate,
    levels: lv,
    segments: segments.map(([a, b]) => ({
      startSec: fr.frameTimeSec(a),
      endSec: Math.min(totalSec, fr.frameTimeSec(b) + fr.windowMs / 1000),
    })),
  }
}

module.exports = { analyse, SPEECH_MARGIN_DB, BRIDGE_MS }
