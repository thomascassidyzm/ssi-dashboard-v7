/**
 * envelope.cjs — the shared frame-energy view that tiers 2 and 3 both read.
 *
 * Tier 2 (tail shape) and tier 3 (VAD boundaries) are asking two different
 * questions of the SAME underlying measurement: how loud is this clip, frame by
 * frame. Computing that once and letting both tiers read it is the difference
 * between two passes over the samples and four.
 *
 * FRAME SIZE. 10 ms hop, 25 ms window — the standard speech-analysis frame, and
 * not an arbitrary one: 25 ms is long enough to hold a full pitch period for
 * any adult voice (so the RMS is stable rather than oscillating with the glottal
 * cycle) and short enough that a plosive burst does not get smeared into its
 * neighbours. At 16 kHz that is a 400-sample window on a 160-sample hop.
 */

const HOP_MS = 10
const WINDOW_MS = 25

/**
 * Frame-wise RMS, in dBFS.
 *
 * dB rather than linear because everything downstream is a RATIO — "how far
 * below the body is the tail" — and in dB a ratio is a subtraction, which keeps
 * the thresholds readable and voice-independent in the way a linear ratio is
 * not.
 *
 * @returns {{db: Float32Array, hopMs: number, windowMs: number,
 *            frameTimeSec: function(number): number}}
 */
function frames (samples, sampleRate) {
  const hop = Math.max(1, Math.round((HOP_MS / 1000) * sampleRate))
  const win = Math.max(hop, Math.round((WINDOW_MS / 1000) * sampleRate))
  const n = Math.max(0, Math.floor((samples.length - win) / hop) + 1)
  const db = new Float32Array(n)

  for (let i = 0; i < n; i++) {
    const start = i * hop
    let sum = 0
    for (let j = start; j < start + win; j++) sum += samples[j] * samples[j]
    const rms = Math.sqrt(sum / win)
    // -120 dB floor: log(0) is -Infinity and one digital-silence frame would
    // otherwise poison every mean and percentile computed over the array.
    db[i] = rms > 0 ? 20 * Math.log10(rms) : -120
  }

  return {
    db,
    hopMs: HOP_MS,
    windowMs: WINDOW_MS,
    frameTimeSec: (i) => (i * hop) / sampleRate,
  }
}

/** Percentile over a Float32Array, p in [0, 1]. Used for robust level estimates. */
function percentile (arr, p) {
  if (!arr.length) return null
  const sorted = Float32Array.from(arr).sort()
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round(p * (sorted.length - 1))))
  return sorted[idx]
}

/**
 * Overall loudness landmarks for a clip.
 *
 * `speechDb` uses the 90th percentile rather than the max because a single
 * click or a mastering overshoot sets the max and tells you nothing about how
 * loud the VOICE is. `noiseDb` uses the 10th percentile for the mirror reason.
 */
function levels (db) {
  return {
    peakDb: db.length ? Math.max(...db) : null,
    speechDb: percentile(db, 0.9),
    medianDb: percentile(db, 0.5),
    noiseDb: percentile(db, 0.1),
  }
}

module.exports = { frames, levels, percentile, HOP_MS, WINDOW_MS }
