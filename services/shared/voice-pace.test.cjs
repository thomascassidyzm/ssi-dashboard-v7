/**
 * Per-voice natural pace, and the role+mode rule that replaced the belt ramp
 * (Tom, 2026-08-29). The first two blocks are the ones that matter: the rule
 * itself, and the invariant that an unmeasured voice is played at the target
 * number unchanged.
 */
import { describe, it, expect } from 'vitest'
import pkg from './voice-pace.cjs'
const {
  effectivePaceRatio, paceMultiplier, combineMeasurements, targetPace, playbackSpeed,
  MIN_SPEED, MAX_SPEED,
} = pkg

describe('the rule: role and mode, never belt', () => {
  it('slows the target language, and only the target language', () => {
    expect(targetPace('target', 'easy').targetPace).toBe(0.8)
    expect(targetPace('target', 'fast').targetPace).toBe(0.9)
    expect(targetPace('known', 'easy').targetPace).toBe(1.0)
    expect(targetPace('known', 'fast').targetPace).toBe(1.0)
  })

  it('plays listening at full speed in any language and any mode', () => {
    for (const mode of ['easy', 'fast']) {
      const r = targetPace('listening', mode)
      expect(r.targetPace).toBe(1.0)
      expect(r.correctByVoice).toBe(false)
    }
  })

  it('reads the estate\'s own slot names — target1/target2 are target, presentation is known', () => {
    expect(targetPace('target1', 'easy').targetPace).toBe(0.8)
    expect(targetPace('target2', 'easy').targetPace).toBe(0.8)
    expect(targetPace('presentation', 'easy').targetPace).toBe(1.0)
  })

  it('corrects per voice ONLY on the target language — known and listening are played exactly as rendered', () => {
    const brisk = { natural_pace_ratio: 1.241 }
    expect(playbackSpeed(brisk, 'known', 'easy').speed).toBe(1.0)
    expect(playbackSpeed(brisk, 'listening', 'easy').speed).toBe(1.0)
    expect(playbackSpeed(brisk, 'target', 'easy').speed).toBeLessThan(0.8)
  })

  it('does not guess at a role it does not recognise', () => {
    const r = targetPace('chorus', 'easy')
    expect(r.targetPace).toBe(1.0)
    expect(r.role).toBe(null)
    expect(r.reason).toMatch(/unrecognised/)
  })

  it('treats anything that is not "fast" as easy — the cautious of the two', () => {
    expect(targetPace('target', undefined).targetPace).toBe(0.8)
    expect(targetPace('target', 'FAST').targetPace).toBe(0.9)
  })
})

describe('the rule, end to end on real measurements', () => {
  it('clamps the briskest voice measured, partially correcting it', () => {
    // fr-FR-VivienneMultilingualNeural, 1.241x, provider-API measurement 2026-08-29.
    const r = playbackSpeed({ natural_pace_ratio: 1.241 }, 'target1', 'easy')
    expect(r.clamped).toBe(true)
    expect(r.speed).toBe(MIN_SPEED)
  })

  it('barely touches the slowest voice measured', () => {
    // en-US-SerenaMultilingualNeural, 0.832x. 0.8/0.832 = 0.962 — no clamp.
    const r = playbackSpeed({ natural_pace_ratio: 0.832 }, 'target1', 'easy')
    expect(r.speed).toBe(0.962)
    expect(r.clamped).toBe(false)
  })

  it('plays an unmeasured voice at the plain target number', () => {
    expect(playbackSpeed({ natural_pace_ratio: null }, 'target', 'easy').speed).toBe(0.8)
    expect(playbackSpeed({ natural_pace_ratio: null }, 'target', 'fast').speed).toBe(0.9)
    expect(playbackSpeed(null, 'target', 'easy').corrected).toBe(false)
  })
})

describe('the invariant: an unmeasured voice behaves exactly as today', () => {
  it('plays at the target unchanged', () => {
    for (const target of [0.8, 0.9, 1.0]) {
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
  it('leaves a reference-paced voice on the target number', () => {
    expect(paceMultiplier({ paceRatio: 1.0, targetPace: 0.9 }).speed).toBe(0.9)
  })

  it('slows a brisk voice, which is the whole point', () => {
    // A voice at 1.413x its language's reference. Under the retired ramp a
    // white belt played it at 0.8 of ITS OWN pace = 1.13 of the reference —
    // faster than a green belt on a slow voice. That was the bug.
    const r = paceMultiplier({ paceRatio: 1.413, targetPace: 0.8 })
    expect(r.corrected).toBe(true)
    expect(r.speed).toBeLessThan(0.8)
    expect(r.clamped).toBe(true)          // 0.8/1.413 = 0.566, under the floor
    expect(r.speed).toBe(MIN_SPEED)
  })

  it('never plays a slow voice faster than it was rendered', () => {
    // A voice at 0.782x its reference. 0.8/0.782 = 1.023 — above 1.0, and everything
    // in the estate is minted at 1.0x, so speeding a clip up is a new behaviour.
    const r = paceMultiplier({ paceRatio: 0.782, targetPace: 0.8 })
    expect(r.speed).toBe(MAX_SPEED)
    expect(r.clamped).toBe(true)
  })

  it('says WHY in words, because an unexplained speed number is how the old ladder became unreasonable', () => {
    expect(paceMultiplier({ paceRatio: 1.2, targetPace: 0.9 }).reason).toMatch(/reference/)
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
