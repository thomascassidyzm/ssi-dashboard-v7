/**
 * TIER 2 — EDGE SHAPE: did this clip STOP, or was it CUT?
 *
 * This is the canonical implementation of the only damage detector on this estate that
 * has ever been validated against Tom's ear. Everything else that measures "the tail"
 * is either superseded by this file or reports to it.
 *
 * ── WHAT IT MEASURES ────────────────────────────────────────────────────────────────
 * A trim leaves two fingerprints that a render allowed to finish does not have, and the
 * verdict requires BOTH:
 *
 *   1. THE FALL IS TOO FAST. Speech decays; a cut does not. Measured at 1 ms resolution
 *      as the time from the last frame at (peak − 12 dB) down to speech end
 *      (peak − 40 dB), expressed in dB per ms.
 *   2. THE SILENCE AFTERWARDS IS DIGITALLY PURE. The trim re-pads with generated
 *      silence — exact zero samples. A clip that ended on its own carries the
 *      provider's noise floor.
 *
 * Neither works alone and that is the point. The zero-pad fingerprint by itself flags
 * 7 of 30 healthy controls: it tells you a clip went through the pad, not that the trim
 * ate anything. It earns its place only as the second half of an AND.
 *
 * The 1 ms resolution is not incidental. The detector this replaced measured at 5 ms and
 * reported 40-65 ms for clips whose fall actually takes 21-36 ms, which is most of why
 * the two disagreed on the clips Tom could hear were damaged.
 *
 * ── MEASURED PERFORMANCE — state it before using it ─────────────────────────────────
 * Against the ear-verified ground truth in docs/audio-intelligence/ground-truth-2026-08-06.json:
 *
 *   recall     16 / 16   every clip Tom has confirmed damaged by ear
 *   precision  80 %      on the 20 clips that have been listened to (4 false flags)
 *   specificity 0 / 168  never-trimmed provider renders — it does not fire on audio
 *               0 / 148  clips nobody flagged      that was never trimmed at all
 *
 * The four false flags were searched for and could not be excluded: 40 features per clip,
 * every single, pair (2,664 survive at full recall) and triple, and again per-voice
 * z-normalised. Nothing separates them without dropping a true positive. The reason is
 * physical rather than a missing feature: all twenty clips were trimmed by the SAME
 * mechanism, and the four Tom hears as fine lost only inaudible decay while the sixteen
 * he hears as damaged lost 51-401 ms. This detector records THAT A TRIM HAPPENED. It
 * cannot record HOW MUCH the trim took, because the audio that would answer that question
 * is the audio the trim removed. Full working: docs/audio-intelligence/edge-detector-tuning-2026-08-06.md.
 *
 * So read a flag as "this clip was trimmed, and 4 times in 5 that was audible" — which is
 * a triage verdict, never a delete verdict. A false positive costs one re-render of a clip
 * that did not need it. A false negative costs a learner hearing an amputated word forever.
 * Those are not symmetric and are not traded as if they were.
 *
 * ── THE CALIBRATION CAVEAT THAT MUST TRAVEL WITH EVERY RESULT ───────────────────────
 * The 0.70 dB/ms line is read off a measured gap between two populations on ONE course:
 * deu_for_eng seeds 1-5, three voices (eve/eng, ara/deu, leo/deu), one provider.
 *
 *     worst healthy of 39 never-trimmed renders   0.633 dB/ms
 *     best damaged of 9 ear-confirmed clips       0.741 dB/ms
 *                                    threshold    0.700
 *
 * That is a clean gap of 0.11 dB/ms on 48 clips, and 48 clips is 48 clips. Any other
 * provider or voice needs its own never-trimmed population measured before the number is
 * trusted there. When sweeping broadly, read the flag rate PER VOICE first and hand-verify
 * a sample from any voice that is an outlier: a voice whose renders naturally fall steeply
 * would light up wholesale, and that is a calibration finding, not 40,000 damaged clips.
 *
 * ── THIS MODULE NEVER WRITES, NEVER RENDERS, NEVER DECODES ──────────────────────────
 * It takes samples and returns numbers. Decoding lives with the caller so that this file
 * stays pure and its tests need no audio: one decode per clip is shared across tiers
 * rather than repeated per tier, which is also why the tiers disagreed before the engine
 * existed.
 */

/** The rate this tier's thresholds were calibrated at. Measure at a different one and the numbers move. */
const SAMPLE_RATE = 16000

/** Every threshold here is a measured boundary. See the header before changing one. */
const THRESHOLDS = {
  fallRateDbPerMs: 0.70, // steeper than this = a cut, not a decay
  zeroPadPct: 80,        // at least this much of the trailing silence is exact digital zero
  topDb: 12,             // the fall is measured from (peak - topDb) ...
  floorDb: 40,           // ... down to (peak - floorDb), which is "speech end"
  frameMs: 1,            // 1 ms. The 5 ms predecessor could not see these falls at all.
  silenceFloorDb: -70,   // a clip peaking below this has no speech to judge at all
}

/**
 * Per-frame RMS in dBFS, oldest first, at 1 ms frames.
 *
 * Deliberately NOT the engine's shared 10 ms/25 ms speech envelope: a 21 ms fall is two
 * frames there, and two frames cannot carry a slope. This tier needs the fine grid; the
 * tiers that ask about speech regions want the coarse one.
 *
 * @param {Int16Array} samples  mono PCM at SAMPLE_RATE
 * @param {number} [frameMs]
 * @returns {number[]}
 */
function envelopeDb (samples, frameMs = THRESHOLDS.frameMs) {
  const per = Math.max(1, Math.round(SAMPLE_RATE * frameMs / 1000))
  const out = []
  for (let i = 0; i + per <= samples.length; i += per) {
    let sum = 0
    for (let j = 0; j < per; j++) { const v = samples[i + j] / 32768; sum += v * v }
    out.push(10 * Math.log10(sum / per + 1e-12))
  }
  return out
}

/**
 * Measure one clip's edge shape. Pure: samples in, numbers out.
 *
 * @param {Int16Array} samples  mono PCM at SAMPLE_RATE
 * @param {object} [opts]       threshold overrides
 * @returns {object}  measurements, or {error} when the clip cannot be measured. A clip
 *                    that cannot be measured is NEVER silently a pass — callers get
 *                    flagged:null and must decide, the same three-outcome discipline the
 *                    veracity gate uses.
 */
function measure (samples, opts = {}) {
  const cfg = { ...THRESHOLDS, ...opts }
  if (!samples || !samples.length) return { error: 'clip too short to measure' }
  const env = envelopeDb(samples, cfg.frameMs)
  if (!env.length) return { error: 'clip too short to measure' }

  const peakDb = Math.max(...env)
  // Every threshold below is RELATIVE to the clip's own peak, which is what makes them
  // voice-independent — and which means a clip with no speech in it at all would have
  // its own digital noise treated as "the body" and judged on the shape of nothing.
  // A silent clip is a real defect; it is the SILENCE check's defect. Saying "I cannot
  // judge this" beats inventing a verdict, and a gate that cannot tell "passed" from
  // "never ran" is the bug that bit this estate three times on 2026-08-04.
  if (!Number.isFinite(peakDb) || peakDb < cfg.silenceFloorDb) {
    return { error: 'no audible content to judge a tail on', silent: true, peakDb: Number(peakDb.toFixed(1)) }
  }
  const speechFloor = peakDb - cfg.floorDb
  let first = -1, last = -1
  for (let i = 0; i < env.length; i++) if (env[i] > speechFloor) { if (first < 0) first = i; last = i }
  if (first < 0) return { error: 'no speech above the floor', silent: true }

  // The last moment the clip was still at speech level, and how long it took from there
  // to be gone.
  let top = last
  for (let i = last; i >= 0; i--) if (env[i] >= peakDb - cfg.topDb) { top = i; break }
  const fallMs = (last - top) * cfg.frameMs

  // `top === last` is the degenerate case, and reading it naively is a hole rather than
  // a pass: it means the clip was at FULL SPEECH LEVEL in its own final audible frame,
  // which is the most violent cut there is — and (env[top] − env[last]) / 1 is then zero,
  // scoring the worst possible ending as the gentlest. So the fall is measured into the
  // first frame that is actually gone. Everything else is untouched, so no clip that
  // scored above zero moves: verified against the ear-labelled ground truth, which is
  // unchanged at 16/16 recall and 4/4 clean-flagged (tools/verify-edge-shape-ground-truth.cjs).
  // In practice this case does not arise in shipped audio, because the mastering chain's
  // anti-click fade always leaves a few milliseconds of ramp — but a detector whose worst
  // input scores best is a trap for the next caller, and it costs one branch to close.
  const fallRate = fallMs > 0
    ? Number(((env[top] - env[last]) / fallMs).toFixed(3))
    : Number(((env[top] - (env[last + 1] ?? (peakDb - cfg.floorDb))) / cfg.frameMs).toFixed(3))

  // Everything after speech end: how much of it is EXACTLY zero. A provider's own noise
  // floor is never exactly zero; generated silence always is.
  const tailStart = (last + 1) * Math.round(SAMPLE_RATE * cfg.frameMs / 1000)
  let zeros = 0, cnt = 0
  for (let i = tailStart; i < samples.length; i++) { if (samples[i] === 0) zeros++; cnt++ }
  const zeroPadPct = cnt ? Number((100 * zeros / cnt).toFixed(1)) : 0

  return {
    durMs: Math.round(samples.length / SAMPLE_RATE * 1000),
    speechStartMs: first * cfg.frameMs,
    speechEndMs: (last + 1) * cfg.frameMs,
    speechMs: (last + 1 - first) * cfg.frameMs,
    peakDb: Number(peakDb.toFixed(1)),
    fallMs,
    fallRate,
    zeroPadPct,
    trailingMs: Math.round(cnt / SAMPLE_RATE * 1000),
  }
}

/**
 * The verdict for one set of measurements, with the reason a human can read.
 *
 * `flagged` is three-valued on purpose: true (trimmed), false (allowed to finish), and
 * null (could not be measured — a silent clip is a real defect, but it is the silence
 * check's defect, and inventing a verdict here is how gates start lying).
 *
 * @param {object} m       output of measure()
 * @param {object} [opts]  threshold overrides; must match the ones measure() used
 * @returns {{flagged: boolean|null, reason: string, score: number|null, category: string|null}}
 */
function verdict (m, opts = {}) {
  const cfg = { ...THRESHOLDS, ...opts }
  if (!m || m.error) {
    return { flagged: null, reason: m?.error || 'not measured', score: null, category: null }
  }
  const steep = m.fallRate >= cfg.fallRateDbPerMs
  const padded = m.zeroPadPct >= cfg.zeroPadPct
  const flagged = steep && padded

  const reason = flagged
    ? `the last ${(m.fallRate * (m.fallMs || cfg.frameMs)).toFixed(0)} dB of this clip fall in ` +
      `${m.fallMs} ms (${m.fallRate} dB/ms; a render allowed to finish measures under ` +
      `${cfg.fallRateDbPerMs}), and ${m.zeroPadPct}% of the silence after it is exact digital ` +
      'zero — the shape of a trim, not an ending'
    : steep
      ? `falls steeply (${m.fallRate} dB/ms) but the trailing silence is only ${m.zeroPadPct}% ` +
        'digital zero — not the trim signature'
      : padded
        ? `trailing silence is ${m.zeroPadPct}% digital zero but the fall takes ${m.fallMs} ms ` +
          `(${m.fallRate} dB/ms) — the shape of a clip allowed to finish`
        : `falls over ${m.fallMs} ms (${m.fallRate} dB/ms) into a live noise floor — the shape ` +
          'of a clip allowed to finish'

  return {
    flagged,
    reason,
    // Lower sorts worse, so a queue ordered by score puts the most violent cut first.
    // Negated fall rate rather than milliseconds: the rate is what was calibrated.
    score: Number((-m.fallRate).toFixed(3)),
    category: flagged ? 'tail-truncation' : null,
    steep,
    padded,
  }
}

/** Measure and judge in one call, for callers that hold samples and want an answer. */
function check (samples, opts = {}) {
  const measurements = measure(samples, opts)
  return { ...verdict(measurements, opts), measurements, thresholds: { ...THRESHOLDS, ...opts } }
}

/**
 * The provenance stamped next to every verdict this tier produces, so a number never
 * travels without the sentence that says how far to trust it.
 */
const DETECTOR = {
  name: 'edge-shape',
  tier: 2,
  version: '2026-08-06',
  rule: 'fallRate >= 0.70 dB/ms AND zeroPadPct >= 80',
  recall: '16/16 ear-confirmed damaged (Tom, deu_for_eng, 2026-08-05 and 2026-08-06)',
  precision: 0.80,
  precisionNote:
    '80% on the 20 clips that have been listened to; 0 flags on 168 never-trimmed provider ' +
    'renders and 0 on 148 clips nobody flagged. It detects that a clip was TRIMMED — on the ' +
    'labelled set 4 in 20 were trimmed harmlessly. Triage only: it orders clips for repair or ' +
    'for a human ear, and it never passes or deletes audio on its own authority. Calibrated on ' +
    'deu_for_eng seeds 1-5, three voices, one provider — read the flag rate per voice before ' +
    'trusting it on a voice that has never been measured.',
  calibration: 'docs/audio-truncation-detector-2026-08-06.md, docs/audio-intelligence/edge-detector-tuning-2026-08-06.md',
}

module.exports = { SAMPLE_RATE, THRESHOLDS, DETECTOR, envelopeDb, measure, verdict, check }
