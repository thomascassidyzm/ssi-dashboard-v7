/**
 * TIER 2 — energy and tail shape: did this clip STOP, or was it CUT?
 *
 * THE CASE THIS EXISTS FOR. Tom, 2026-08-06, on the clip both incumbent checks
 * certified clean: "ok for greater clarity - the first one clips with short and
 * then has no you at all / it sounds like / to speak German wi...". The cut is
 * MID-WORD. A check that diffs the last word against the script misses it, and
 * a check that measures how fast the clip fades misses it too if it only looks
 * at whether a fade happened.
 *
 * What a mid-phoneme cut leaves behind is unmistakable in the energy envelope:
 * speech running at full body level right up to the final sample. A natural
 * ending does the opposite — the voice releases, the energy decays over
 * 100-300 ms, and the last frames sit far below the body. So the measurement is
 * a RATIO, tail level against body level, and the sign of it separates the two.
 *
 * This lifts the measurement from tools/physical-tail-probe.cjs, whose own
 * header states the limitation we carry forward verbatim: it is a TAIL-SHAPE
 * test. It detects a clip that stops mid-signal. It does NOT detect a clip
 * missing a word that happens to end on a decayed boundary, and it says nothing
 * about pronunciation. That is not a flaw to be fixed here — it is why tier 4
 * exists.
 *
 * ⚠️ AND THE MEASURED REASON IT CANNOT GATE A REPAIR ALONE. From
 * tools/audio-word-loss-scan.cjs, measured on deu_for_eng 2026-08-06: clips the
 * tail predictor FLAGGED were missing their final word in a large minority, and
 * clips it PASSED were missing their final word in a substantial minority too.
 * It is a good ORDERING and the wrong SCOPE. In this engine it is a tier, and a
 * tier is allowed to be a good ordering — it escalates the ambiguous band to
 * tier 4 instead of pretending to be the verdict.
 *
 * PER-VOICE, because Tom named the confound himself: "the lernen one is harder,
 * because he's falling off in volume anyway". A voice that naturally trails off
 * has a different tail distribution from one that ends crisply, and a single
 * global CUT_DB line is exactly what let the incumbents misjudge both.
 */

const envelope = require('../envelope.cjs')

/**
 * The window at the very end of the clip that counts as "the tail".
 *
 * 50 ms, inherited from physical-tail-probe.cjs where it was fitted. Short
 * enough to sit inside the final phoneme rather than averaging over the whole
 * last word.
 */
const TAIL_MS = Number(process.env.AIE_TAIL_MS || 50)

/**
 * Fallback abruptness line in dB, used only when the voice has no calibration.
 *
 * -6 dB is physical-tail-probe.cjs's fitted CUT_DB. A calibrated voice uses its
 * own distribution instead (see calibration.cjs) — this is the floor for a
 * voice we have never measured, and the engine marks such verdicts as
 * uncalibrated so a caller can tell the difference.
 */
const DEFAULT_CUT_DB = Number(process.env.AIE_CUT_DB || -6)

/**
 * Measure the tail.
 *
 * `tailRatioDb` is the headline: 20*log10(tail / body), so 0 dB means the clip
 * is as loud at its last sample as it is on average — a hard cut — and strongly
 * negative means it released naturally.
 *
 * `decaySlopeDbPerSec` is the corroborating shape: how fast energy is falling
 * over the final 200 ms. A natural ending is steeply negative. A cut is flat.
 * It is reported separately because it disambiguates the case a single ratio
 * cannot: a clip that was ALREADY quiet when it got cut has a low tail ratio
 * (looks natural) but a flat slope (reveals the cut). That is the shape of
 * Tom's "lernen" case.
 *
 * @returns {{tailDb, bodyDb, tailRatioDb, decaySlopeDbPerSec, abrupt: boolean|null,
 *            cutDb: number, calibrated: boolean}}
 */
function analyse (samples, sampleRate, opts = {}) {
  const fr = opts.frames || envelope.frames(samples, sampleRate)
  const lv = opts.levels || envelope.levels(fr.db)
  const cutDb = opts.cutDb != null ? opts.cutDb : DEFAULT_CUT_DB

  if (!fr.db.length) {
    return {
      tailDb: null, bodyDb: null, tailRatioDb: null,
      decaySlopeDbPerSec: null, abrupt: null,
      cutDb, calibrated: !!opts.calibrated,
      reason: 'no frames',
    }
  }

  // Measure the tail at the SPEECH end, not the file end, when the VAD has told
  // us where that is. Otherwise trailing silence sets the tail level to the
  // noise floor and every clip looks like it ended beautifully — which is the
  // single easiest way to build a tail check that never fires.
  const endSec = opts.speechEndSec != null ? opts.speechEndSec : (samples.length / sampleRate)
  const startSec = opts.speechStartSec != null ? opts.speechStartSec : 0

  const frameOf = (sec) => Math.round((sec * 1000) / fr.hopMs)
  const endFrame = Math.min(fr.db.length - 1, Math.max(0, frameOf(endSec) - 1))
  const tailFrames = Math.max(1, Math.round(TAIL_MS / fr.hopMs))
  const tailStart = Math.max(0, endFrame - tailFrames + 1)

  const bodyStart = Math.max(0, frameOf(startSec))
  const bodySlice = fr.db.subarray(bodyStart, endFrame + 1)
  const tailSlice = fr.db.subarray(tailStart, endFrame + 1)

  const mean = (a) => a.length ? a.reduce((s, v) => s + v, 0) / a.length : null
  const tailDb = mean(tailSlice)

  // Body level = the 90th percentile of the speech span, not its mean. The mean
  // is dragged down by inter-word gaps, and a body estimate that moves with how
  // gappy the phrase is makes the ratio depend on the SCRIPT rather than on the
  // acoustics.
  const bodyDb = envelope.percentile(bodySlice, 0.9)

  const tailRatioDb = (tailDb != null && bodyDb != null) ? (tailDb - bodyDb) : null

  // Decay slope over the final 200 ms: least-squares fit of dB against time.
  const slopeFrames = Math.max(2, Math.round(200 / fr.hopMs))
  const slopeStart = Math.max(0, endFrame - slopeFrames + 1)
  const decaySlopeDbPerSec = leastSquaresSlope(
    fr.db.subarray(slopeStart, endFrame + 1),
    fr.hopMs / 1000,
  )

  return {
    tailDb,
    bodyDb,
    tailRatioDb,
    decaySlopeDbPerSec,
    abrupt: tailRatioDb == null ? null : tailRatioDb >= cutDb,
    cutDb,
    calibrated: !!opts.calibrated,
    tailMs: TAIL_MS,
  }
}

/** dB-per-second slope of a frame series. */
function leastSquaresSlope (db, dtSec) {
  const n = db.length
  if (n < 2) return null
  let sx = 0, sy = 0, sxx = 0, sxy = 0
  for (let i = 0; i < n; i++) {
    const x = i * dtSec
    sx += x; sy += db[i]; sxx += x * x; sxy += x * db[i]
  }
  const denom = n * sxx - sx * sx
  if (denom === 0) return null
  return (n * sxy - sx * sy) / denom
}

module.exports = { analyse, TAIL_MS, DEFAULT_CUT_DB, leastSquaresSlope }
