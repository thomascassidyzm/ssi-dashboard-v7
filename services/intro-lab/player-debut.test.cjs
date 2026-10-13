import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
const P = createRequire(import.meta.url)('./player-debut.cjs')

// Worked numbers taken from the player's own rules (see the header of player-debut.cjs).
describe('player debut port', () => {
  const mk = (t1) => ({ voices: { target1: { voiceId: 'v', settings: { speed: 1 }, ...(t1 || {}) }, target2: { voiceId: 'w', settings: { speed: 1 } } } })

  it('unmeasured native voice: Easy 0.8, Fast 0.9, uncorrected', () => {
    const e = P.cycleSpeed(P.targetSpeedConfigFrom(mk(), null, 'easy'), 'target1')
    const f = P.cycleSpeed(P.targetSpeedConfigFrom(mk(), null, 'fast'), 'target1')
    expect(e.speed).toBe(0.8)
    expect(f.speed).toBe(0.9)
  })
  it('the course by-ear speed REPLACES the rule (Easy = the ear number; Fast scales by 0.9/0.8)', () => {
    const e = P.cycleSpeed(P.targetSpeedConfigFrom(mk({ playbackSpeed: 0.85 }), null, 'easy'), 'target1')
    const f = P.cycleSpeed(P.targetSpeedConfigFrom(mk({ playbackSpeed: 0.8 }), null, 'fast'), 'target1')
    expect(e.speed).toBe(0.85)
    expect(f.speed).toBe(0.9)
  })
  it('a measured voice is corrected: 0.8 / 1.25 = 0.64 clamps up to 0.7', () => {
    const pace = { roles: { target1: { primary: { effectivePaceRatio: 1.25 } } } }
    expect(P.cycleSpeed(P.targetSpeedConfigFrom(mk(), pace, 'easy'), 'target1').speed).toBe(0.7)
  })
  it('legacy (non-native) voices are left at the base', () => {
    const cfg = P.targetSpeedConfigFrom({ voices: { target1: { voiceId: 'v', settings: { speed: 0.9 } } } }, null, 'easy')
    expect(P.cycleSpeed(cfg, 'target1').speed).toBe(1.0)
  })
  it('pause = 2.8 × mean answer + 800, clamped to 1000..15000', () => {
    const cfg = { pause_k: 2.8, pause_reaction_ms: 800, min_pause_ms: 1000, max_pause_ms: 15000 }
    expect(P.computePauseDuration(1000, 3000, cfg)).toBe(6400)
    expect(P.computePauseDuration(0, 0, cfg)).toBe(7800)
    expect(P.computePauseDuration(100, 100, cfg)).toBe(1080)
  })
  it('intro cycle: presentation, t1, t2, then a 2000 ms linger with no pause; debut has the pause', () => {
    const plan = P.debutPlan({
      lego: { presentationAudioId: 'p', knownAudioId: 'k', target1AudioId: 'a', target2AudioId: 'b', target1DurationMs: 1000, target2DurationMs: 3000 },
      speedConfig: P.targetSpeedConfigFrom(mk(), null, 'easy'),
      modeCfg: { pause_k: 2.8, pause_reaction_ms: 800, min_pause_ms: 1000, max_pause_ms: 15000, post_voice2_gap_ms: 1500 },
    })
    expect(plan.intro.map((c) => c.kind)).toEqual(['prompt', 'voice1', 'voice2', 'silence'])
    expect(plan.intro[3].ms).toBe(2000)
    expect(plan.debut.map((c) => c.kind)).toEqual(['prompt', 'silence', 'voice1', 'voice2', 'silence'])
    expect(plan.debut[1].ms).toBe(6400)
  })
})
