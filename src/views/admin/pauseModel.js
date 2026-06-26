// ============================================================================
// Pause model — single source of truth for the learner "say-it-yourself" gap.
//
// MUST stay in lockstep with the learning app's
//   ssi-learning-app/packages/core/src/playback/computePauseDuration.ts
// (mirror, like L1_FIXED). This JS copy powers the Pause Lab preview so the
// dashboard shows EXACTLY what the player will do.
//
// Formula (enriched 2026-06-25 — adds a knee so long sentences stop scaling
// at the full multiplier, plus a reference selector so the pause can track the
// single phrase the learner says rather than both answer voices):
//
//   ref    = reference==='avg'     ? (t1+t2)/2
//          : reference==='target1' ?  t1
//          :                          t1 + t2          (legacy 'sum' default)
//   shaped = min(ref, knee)·multiplier + max(0, ref−knee)·tail_multiplier
//   pause  = clamp(min_pause_ms, max_pause_ms, base + shaped)
//
// Backward-compatible: knee absent ⇒ Infinity, tail absent ⇒ multiplier,
// reference absent ⇒ 'sum' ⇒ identical to the old linear clamp.
// ============================================================================

export function referenceMs(t1, t2, cfg) {
  const a = t1 || 0
  const b = t2 || 0
  switch (cfg.pause_reference || 'sum') {
    case 'target1': return a
    case 'avg': return (a + b) / 2
    default: return a + b
  }
}

/** Pause (ms) for a given reference duration under a ModeConfig. */
export function pauseFromRef(refMs, cfg) {
  const ref = Math.max(0, refMs || 0)
  const mult = cfg.pause_multiplier ?? 0
  const knee = cfg.pause_knee_ms == null ? Infinity : cfg.pause_knee_ms
  const tail = cfg.pause_tail_multiplier == null ? mult : cfg.pause_tail_multiplier
  const base = cfg.pause_base_ms ?? 0
  const shaped = Math.min(ref, knee) * mult + Math.max(0, ref - knee) * tail
  const calc = base + shaped
  return Math.round(Math.max(cfg.min_pause_ms ?? 0, Math.min(cfg.max_pause_ms ?? Infinity, calc)))
}

/** Pause (ms) from the two answer-voice durations — the runtime entry point. */
export function computePauseDuration(target1Ms, target2Ms, cfg) {
  return pauseFromRef(referenceMs(target1Ms, target2Ms, cfg), cfg)
}

// Belt-based target-voice speed ramp — MIRROR of beltSpeed() in
// ssi-learning-app/packages/player-vue/src/providers/toSimpleRounds.ts. Early
// belts play the target slower, so the SAME clip takes longer to hear:
//   actual play ms = raw clip ms / beltSpeed.
// The pause should scale with that actual play time, so it's longer for
// beginners (where it matters most). Assumes nativeSpeed courses, globalSpeed 1.
export function beltSpeed(seedNumber) {
  if (seedNumber < 8) return 0.8    // White  (seeds 1-7)
  if (seedNumber < 20) return 0.9   // Yellow (seeds 8-19)
  if (seedNumber < 40) return 0.95  // Orange (seeds 20-39)
  return 1.0                        // Green+ (seeds 40+)
}

export const BELTS = [
  { key: 'white', label: 'White', repSeed: 1, speed: 0.8 },
  { key: 'yellow', label: 'Yellow', repSeed: 10, speed: 0.9 },
  { key: 'orange', label: 'Orange', repSeed: 25, speed: 0.95 },
  { key: 'green', label: 'Green+', repSeed: 40, speed: 1.0 },
]

/** Pause from RAW clip durations at a given playback speed — sizes the gap on
 *  the actual time the learner hears, not the raw file length. */
export function computePauseForBelt(rawT1Ms, rawT2Ms, cfg, speed) {
  const s = speed || 1
  return computePauseDuration((rawT1Ms || 0) / s, (rawT2Ms || 0) / s, cfg)
}

// Syllable length buckets for the Lab — words are a poor proxy, syllables track
// spoken length far better.
export const SYLLABLE_BUCKETS = [
  { key: 'short', label: 'Short', range: '2–4 syll', samples: [2, 3, 4] },
  { key: 'medium', label: 'Medium', range: '5–8 syll', samples: [5, 6, 7, 8] },
  { key: 'long', label: 'Long', range: '9–12 syll', samples: [9, 10, 11, 12] },
  { key: 'vlong', label: 'Very long', range: '13+ syll', samples: [13, 16, 20] },
]
