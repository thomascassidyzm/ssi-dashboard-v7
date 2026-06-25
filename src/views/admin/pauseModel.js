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

// Syllable length buckets for the Lab — words are a poor proxy, syllables track
// spoken length far better.
export const SYLLABLE_BUCKETS = [
  { key: 'short', label: 'Short', range: '2–4 syll', samples: [2, 3, 4] },
  { key: 'medium', label: 'Medium', range: '5–8 syll', samples: [5, 6, 7, 8] },
  { key: 'long', label: 'Long', range: '9–12 syll', samples: [9, 10, 11, 12] },
  { key: 'vlong', label: 'Very long', range: '13+ syll', samples: [13, 16, 20] },
]
