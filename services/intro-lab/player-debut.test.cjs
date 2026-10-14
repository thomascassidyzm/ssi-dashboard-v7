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
  it('intro cycle: presentation, voice 1, voice 2, then a 2000 ms linger — no prompt/response/debut cycle, no pause', () => {
    const plan = P.introPlan({
      lego: { presentationAudioId: 'p', knownAudioId: 'k', target1AudioId: 'a', target2AudioId: 'b' },
      speedConfig: P.targetSpeedConfigFrom(mk(), null, 'easy'),
    })
    expect(plan.intro.map((c) => c.kind)).toEqual(['prompt', 'voice1', 'voice2', 'silence'])
    expect(plan.intro.map((c) => c.audioId)).toEqual(['p', 'a', 'b', undefined])
    expect(plan.intro[3].ms).toBe(2000)
    expect(plan.debut).toBeUndefined()
    expect(P.debutPlan).toBeUndefined()
  })
  it('Easy reads easy_mode, never normal_mode; normal_mode only backs Fast; rows merge over the defaults', () => {
    const m = P.modeConfigsFrom([
      { key: 'normal_mode', config: { min_pause_ms: 111 } },
      { key: 'easy_mode', config: { post_voice2_gap_ms: 1500 } },
    ])
    expect(m.easy.post_voice2_gap_ms).toBe(1500)
    expect(m.easy.min_pause_ms).toBe(2000) // default, not normal_mode's 111
    expect(m.fast.min_pause_ms).toBe(111) // Fast's legacy fallback
    const both = P.modeConfigsFrom([{ key: 'normal_mode', config: { min_pause_ms: 111 } }, { key: 'fast_mode', config: { min_pause_ms: 222 } }])
    expect(both.fast.min_pause_ms).toBe(222)
    expect(both.easy.min_pause_ms).toBe(2000)
  })
})
