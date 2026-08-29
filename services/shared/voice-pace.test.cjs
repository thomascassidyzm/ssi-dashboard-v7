/**
 * Per-voice natural pace. The first test is the one that matters: a voice with
 * no measurement is played at the belt number itself, to the digit — which is
 * what lets this ship against an estate where not one voice is measured yet.
 */
import { describe, it, expect } from 'vitest'
import pkg from './voice-pace.cjs'
const { effectivePaceRatio, paceMultiplier, combineMeasurements, MIN_SPEED, MAX_SPEED } = pkg

describe('the invariant: an unmeasured voice behaves exactly as today', () => {
  it('plays at the belt target unchanged', () => {
    for (const target of [0.8, 0.9, 0.95, 1.0]) {
      const r = paceMultiplier({ paceRatio: null, targetPace: target })
      expect(r.speed).toBe(target)
      expect(r.corrected).toBe(false)
    }
  })

  it('reads an unmeasured voice as null, never as 1.0 — "typical" and "not looked at" are different claims', () => {
    expect(effectivePaceRatio({ natural_pace_ratio: null })).toBe(null)
    expect(effectivePaceRatio({})).toBe(null)
    expect(effectivePaceRatio(null)).toBe(null)
  })
})

describe('the correction', () => {
  it('leaves a median-paced voice on the belt number', () => {
    expect(paceMultiplier({ paceRatio: 1.0, targetPace: 0.9 }).speed).toBe(0.9)
  })

  it('slows a brisk voice, which is the whole point', () => {
    // eve, measured 2026-08-29 at 1.413x the English median for `known`.
    // Today a white belt plays her at 0.8 of HER pace = 1.13 of the median —
    // faster than a green belt on a slow voice. That is the bug.
    const r = paceMultiplier({ paceRatio: 1.413, targetPace: 0.8 })
    expect(r.corrected).toBe(true)
    expect(r.speed).toBeLessThan(0.8)
    expect(r.clamped).toBe(true)          // 0.8/1.413 = 0.566, under the floor
    expect(r.speed).toBe(MIN_SPEED)
  })

  it('never plays a slow voice faster than it was rendered', () => {
    // en-GB-HollieNeural, 0.782x. 0.8/0.782 = 1.023 — above 1.0, and everything
    // in the estate is minted at 1.0x, so speeding a clip up is a new behaviour.
    const r = paceMultiplier({ paceRatio: 0.782, targetPace: 0.8 })
    expect(r.speed).toBe(MAX_SPEED)
    expect(r.clamped).toBe(true)
  })

  it('says WHY in words, because an unexplained speed number is how the current ladder became unreasonable', () => {
    expect(paceMultiplier({ paceRatio: 1.2, targetPace: 0.9 }).reason).toMatch(/median/)
  })

  it('refuses a nonsense target rather than inventing one', () => {
    expect(paceMultiplier({ paceRatio: 1.2, targetPace: 0 }).speed).toBe(1.0)
    expect(paceMultiplier({ paceRatio: 1.2, targetPace: null }).corrected).toBe(false)
  })
})

describe('the human nudge', () => {
  it('multiplies on top of the measurement', () => {
    expect(effectivePaceRatio({ natural_pace_ratio: 1.2, natural_pace_nudge: 0.9 })).toBeCloseTo(1.08, 5)
  })

  it('is ignored when absent or zero, never treated as a pace of its own', () => {
    expect(effectivePaceRatio({ natural_pace_ratio: 1.2, natural_pace_nudge: null })).toBe(1.2)
    expect(effectivePaceRatio({ natural_pace_ratio: 1.2, natural_pace_nudge: 0 })).toBe(1.2)
  })

  it('accepts the numeric strings postgres hands back for a numeric column', () => {
    expect(effectivePaceRatio({ natural_pace_ratio: '1.413', natural_pace_nudge: '1.000' })).toBeCloseTo(1.413, 5)
  })
})

describe('combining per-language measurements into one figure', () => {
  it('takes the median, so 34,000 English clips do not outvote the voice itself', () => {
    const r = combineMeasurements([
      { ratio: 1.41, samples: 34000 },
      { ratio: 1.52, samples: 1006 },
      { ratio: 1.36, samples: 8008 },
    ])
    expect(r.ratio).toBe(1.41)
    expect(r.samples).toBe(43014)
  })

  it('averages the middle pair on an even count', () => {
    expect(combineMeasurements([{ ratio: 1.0, samples: 1 }, { ratio: 1.2, samples: 1 }]).ratio).toBe(1.1)
  })

  it('returns null rather than a number when there is nothing to combine', () => {
    expect(combineMeasurements([])).toBe(null)
    expect(combineMeasurements(null)).toBe(null)
    expect(combineMeasurements([{ ratio: 0, samples: 5 }])).toBe(null)
  })
})
