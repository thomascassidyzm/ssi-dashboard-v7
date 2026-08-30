// ============================================================================
// Pause model — single source of truth for the learner "say-it-yourself" gap.
//
// MUST stay in lockstep with the learning app's
//   ssi-learning-app/packages/core/src/script/computePauseDuration.ts
// (mirror, like L1_FIXED). This JS copy powers the Speaking Lab preview so the
// dashboard shows EXACTLY what the player will do.
//
// MODEL (one formula, 2026-08-29 — Tom's ruling):
//
//   answer = (target1Ms + target2Ms) / 2     ← NATIVE 1.0× clip durations
//   gap    = clamp(min, max, k · answer + reaction_ms)
//
// The gap is the time to build and say the TARGET sentence, so it scales with
// how long that sentence takes to say. Two tunables per mode, and only two:
// `pause_k` (the thinking multiplier) and `pause_reaction_ms` (the fixed beat
// before you start). PLAYBACK SPEED IS NOT AN INPUT — the old belt taper read
// belt position off the target playback speed, and the older knee model divided
// the clip durations by it; both are gone.
//
// `min_pause_ms` / `max_pause_ms` are safety clamps, not tuning.
//
// Legacy fields on a stored row (pause_base_ms, pause_multiplier, pause_knee_ms,
// pause_tail_multiplier, pause_boot_ms, pause_assembly_*, pause_belt_*,
// pause_reference) are IGNORED — there is no legacy branch.
// ============================================================================

export const DEFAULT_PAUSE_K = 2.8
export const DEFAULT_PAUSE_REACTION_MS = 800

/** Pause (ms) from the two answer-voice NATIVE durations. */
export function computePauseDuration(target1Ms, target2Ms, cfg) {
  const answer = Math.max(0, ((target1Ms || 0) + (target2Ms || 0)) / 2)
  const k = cfg.pause_k ?? DEFAULT_PAUSE_K
  const reaction = cfg.pause_reaction_ms ?? DEFAULT_PAUSE_REACTION_MS
  const min = cfg.min_pause_ms ?? 0
  const max = cfg.max_pause_ms ?? Infinity
  return Math.round(Math.max(min, Math.min(max, k * answer + reaction)))
}

// Rough spoken rate, used ONLY to sort real sample sentences into length
// buckets for the hear-it row. Not part of the gap formula.
export const MS_PER_SYLLABLE = 280

// Length buckets for the hear-it row — words are a poor proxy, syllables track
// spoken length far better.
export const SYLLABLE_BUCKETS = [
  { key: 'short', label: 'Short', range: '2–4 syll', samples: [2, 3, 4] },
  { key: 'medium', label: 'Medium', range: '5–8 syll', samples: [5, 6, 7, 8] },
  { key: 'long', label: 'Long', range: '9–12 syll', samples: [9, 10, 11, 12] },
  { key: 'vlong', label: 'Very long', range: '13+ syll', samples: [13, 16, 20] },
]
