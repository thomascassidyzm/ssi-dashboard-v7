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

describe('Tom 2026-10-18 flat recording multipliers', () => {
  it('ignores measured pace, nudge and bounds for every role and mode', () => {
    for (const ratio of [0.5, 0.832, 1, 1.241, 2, null]) {
      for (const mode of ['easy', 'fast']) {
        const voice = { natural_pace_ratio: ratio, natural_pace_nudge: 1.2 }
        for (const role of ['target', 'target1', 'target2', 'known', 'presentation', 'listening']) {
          const expected = role.startsWith('target') ? (mode === 'easy' ? 0.8 : 0.9) : 1
          expect(playbackSpeed(voice, role, mode)).toMatchObject({ speed: expected, corrected: false, clamped: false })
        }
        expect(paceMultiplier({ paceRatio: ratio, targetPace: 0.8, min: 0.95, max: 1 }).speed).toBe(0.8)
      }
    }
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

describe('human recordings are never slowed (Tom, 2026-10-18)', () => {
  it('human clip plays at 1.0 in every role and mode; TTS keeps 0.8 Easy / 0.9 Fast', () => {
    for (const mode of ['easy', 'fast']) {
      for (const role of ['target', 'target1', 'target2', 'known', 'listening']) {
        expect(playbackSpeed(null, role, mode, true).speed).toBe(1)
      }
    }
    expect(playbackSpeed(null, 'target1', 'easy', false).speed).toBe(0.8)
    expect(playbackSpeed(null, 'target1', 'fast').speed).toBe(0.9)
  })
})
