// ============================================================================
// Pause model — single source of truth for the learner "say-it-yourself" gap.
//
// MUST stay in lockstep with the learning app's
//   ssi-learning-app/packages/player-vue/src/playback/computePauseDuration.ts
// (mirror, like L1_FIXED). This JS copy powers the Pause Lab preview so the
// dashboard shows EXACTLY what the player will do.
//
// MODEL (boot + assembly, 2026-06-30 — replaces the boot/knee/two-rate curve):
//   • BOOT     — fixed reaction / spin-up, length-independent. Short phrases are
//                almost all boot. Shrinks a LOT with belt.
//   • ASSEMBLY — piecing the parts together; grows faster-than-linearly with
//                length. Shrinks only a LITTLE with belt.
//
//   ref      = reference==='avg'?(t1+t2)/2 : reference==='target1'?t1 : t1+t2
//              (NATIVE clip ms — belt is explicit below, not baked via speed)
//   over     = max(0, ref − assembly_threshold_ms)
//   assembly = assembly_lin·over + assembly_quad·(over/1000)²
//   p        = belt progress 0(White)→1(Green) from the target playback speed
//   pause    = clamp(min, max,
//                    boot·lerp(1,belt_boot,p) + assembly·lerp(1,belt_assembly,p))
//
// belt_boot shrinks short phrases hard, belt_assembly shrinks long phrases
// gently — the gap shortens MORE for short than long as the learner climbs.
// Backward-compatible: assembly knobs absent ⇒ legacy knee/two-rate curve
// (knee absent ⇒ Infinity, tail ⇒ multiplier, reference ⇒ 'sum').
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

/** Belt progress 0(White)→1(Green) from the target playback speed (0.8…1.0). */
export function beltProgress(speed) {
  const p = ((speed || 1) - 0.8) / (1.0 - 0.8)
  return p < 0 ? 0 : p > 1 ? 1 : p
}

/** Pause (ms) for a native reference duration under a ModeConfig at a belt
 *  (given by the target playback speed). */
export function pauseFromRef(refMs, cfg, speed = 1) {
  const ref = Math.max(0, refMs || 0)
  const min = cfg.min_pause_ms ?? 0
  const max = cfg.max_pause_ms ?? Infinity

  // New boot + assembly model.
  if (cfg.pause_assembly_lin != null || cfg.pause_boot_ms != null) {
    const boot = cfg.pause_boot_ms ?? 0
    const thr = cfg.pause_assembly_threshold_ms ?? 0
    const lin = cfg.pause_assembly_lin ?? 0
    const quad = cfg.pause_assembly_quad ?? 0
    const over = Math.max(0, ref - thr)
    const overSec = over / 1000
    const assembly = lin * over + quad * overSec * overSec
    const p = beltProgress(speed)
    const bBoot = 1 + p * ((cfg.pause_belt_boot ?? 1) - 1)
    const bAsm = 1 + p * ((cfg.pause_belt_assembly ?? 1) - 1)
    const calc = boot * bBoot + assembly * bAsm
    return Math.round(Math.max(min, Math.min(max, calc)))
  }

  // Legacy knee / two-rate model.
  const mult = cfg.pause_multiplier ?? 0
  const knee = cfg.pause_knee_ms == null ? Infinity : cfg.pause_knee_ms
  const tail = cfg.pause_tail_multiplier == null ? mult : cfg.pause_tail_multiplier
  const base = cfg.pause_base_ms ?? 0
  const shaped = Math.min(ref, knee) * mult + Math.max(0, ref - knee) * tail
  return Math.round(Math.max(min, Math.min(max, base + shaped)))
}

/** Pause (ms) from the two answer-voice durations — the runtime entry point. */
export function computePauseDuration(target1Ms, target2Ms, cfg, speed = 1) {
  return pauseFromRef(referenceMs(target1Ms, target2Ms, cfg), cfg, speed)
}

// Belt-based target-voice speed ramp — MIRROR of beltSpeed() in
// ssi-learning-app/packages/player-vue/src/providers/toSimpleRounds.ts. Early
// belts play the target slower; the boot+assembly model reads the belt off this
// speed (White 0.8× → Green 1.0×) and applies the boot/assembly belt taper.
// Assumes nativeSpeed courses, globalSpeed 1.
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

/** Pause from RAW clip durations at a given belt (target playback speed). The
 *  boot+assembly model sizes the gap off the NATIVE clip length and applies the
 *  belt taper from the speed; the legacy model rides the reference (clip/speed). */
export function computePauseForBelt(rawT1Ms, rawT2Ms, cfg, speed) {
  const s = speed || 1
  if (cfg.pause_assembly_lin != null || cfg.pause_boot_ms != null) {
    return computePauseDuration(rawT1Ms || 0, rawT2Ms || 0, cfg, s)
  }
  return computePauseDuration((rawT1Ms || 0) / s, (rawT2Ms || 0) / s, cfg, s)
}

// Syllable length buckets for the Lab — words are a poor proxy, syllables track
// spoken length far better.
export const SYLLABLE_BUCKETS = [
  { key: 'short', label: 'Short', range: '2–4 syll', samples: [2, 3, 4] },
  { key: 'medium', label: 'Medium', range: '5–8 syll', samples: [5, 6, 7, 8] },
  { key: 'long', label: 'Long', range: '9–12 syll', samples: [9, 10, 11, 12] },
  { key: 'vlong', label: 'Very long', range: '13+ syll', samples: [13, 16, 20] },
]
