/**
 * Unit tests for the closed-loop loudness convergence (Tom, 2026-08-24:
 * "Enzo is quite a LOT quieter than Ara and also the known language voices …
 * our mastering process probably needs tweaking for volume similarity").
 *
 * These test `planNextPass`, which is the whole decision: whether we have
 * arrived, whether the last pass helped, and what gain to try next. It is pure
 * precisely so that this file needs no ffmpeg, no audio and no network — the
 * end-to-end proof on real bytes lives in the published sample doc, and a test
 * that requires a real decode is a test nobody runs.
 *
 * The three failure modes these lock down, each of which would ship silently:
 *   1. never stopping (a limiter-bound clip looping to the pass ceiling forever);
 *   2. stopping while still out of band and CALLING it converged;
 *   3. boosting a near-silent file until its noise floor is the programme.
 */

import { describe, it, expect } from 'vitest'

const { planNextPass } = require('./audio-processor.cjs')

const base = {
  targetLufs: -15.5, toleranceDb: 0.5, gainDb: 3, pass: 1, maxPasses: 3, maxGainDb: 20,
}

describe('planNextPass — arrival', () => {
  it('stops as soon as the output is inside tolerance', () => {
    const p = planNextPass({ ...base, outputLufs: -15.4 })
    expect(p.done).toBe(true)
    expect(p.nextGainDb).toBeNull()
    expect(p.reason).toMatch(/within 0.5 dB/)
  })

  it('treats exactly-at-tolerance as arrived, not as one more pass', () => {
    expect(planNextPass({ ...base, outputLufs: -16.0 }).done).toBe(true)
    expect(planNextPass({ ...base, outputLufs: -15.0 }).done).toBe(true)
  })

  it('is symmetric — too LOUD converges the same way as too quiet', () => {
    const p = planNextPass({ ...base, outputLufs: -13.0 })
    expect(p.done).toBe(false)
    expect(p.errorDb).toBe(-2.5)
    expect(p.nextGainDb).toBe(0.5) // 3 + (-2.5)
  })
})

describe('planNextPass — the residual correction', () => {
  it('adds the shortfall to the TOTAL gain, so the next render starts from the original', () => {
    // Measured on live Enzo bytes 2026-08-24: gain 7.2 dB landed at -18.0.
    const p = planNextPass({ ...base, gainDb: 7.2, outputLufs: -18.0 })
    expect(p.done).toBe(false)
    expect(p.errorDb).toBe(2.5)
    expect(p.nextGainDb).toBe(9.7)
  })

  it('rounds the gain to two places so the ffmpeg argument is stable', () => {
    const p = planNextPass({ ...base, gainDb: 1.111, outputLufs: -17.333 })
    expect(p.nextGainDb).toBe(2.94)
  })
})

describe('planNextPass — stopping conditions that must never be skipped', () => {
  it('stops at the pass ceiling and does NOT claim to have converged', () => {
    const p = planNextPass({ ...base, pass: 3, maxPasses: 3, outputLufs: -19 })
    expect(p.done).toBe(true)
    expect(p.nextGainDb).toBeNull()
    expect(p.reason).toMatch(/pass ceiling/)
    expect(Math.abs(p.errorDb)).toBeGreaterThan(base.toleranceDb)
  })

  it('stops when a pass failed to improve — the limiter is the floor', () => {
    // Previous best error was 1.8 dB; this pass is no better.
    const p = planNextPass({ ...base, pass: 2, outputLufs: -17.3, bestErrorDb: 1.8 })
    expect(p.done).toBe(true)
    expect(p.improved).toBe(false)
    expect(p.reason).toMatch(/limiter is the floor/)
  })

  it('counts a genuine improvement as an improvement and keeps going', () => {
    const p = planNextPass({ ...base, pass: 2, outputLufs: -16.5, bestErrorDb: 2.5 })
    expect(p.improved).toBe(true)
    expect(p.done).toBe(false)
  })

  it('refuses to lift a near-silent file past the gain ceiling', () => {
    const p = planNextPass({ ...base, gainDb: 19, outputLufs: -20, maxGainDb: 20 })
    expect(p.done).toBe(true)
    expect(p.nextGainDb).toBeNull()
    expect(p.reason).toMatch(/exceeds the 20 dB ceiling/)
  })

  it('terminates from any starting point within maxPasses — no infinite loop', () => {
    for (const start of [-30, -25, -20, -17, -15.5, -12, -5]) {
      let s = { ...base, outputLufs: start, gainDb: 0, pass: 1, bestErrorDb: undefined }
      let guard = 0
      for (;;) {
        const p = planNextPass(s)
        if (p.done) break
        expect(++guard).toBeLessThanOrEqual(base.maxPasses)
        s = { ...s, pass: s.pass + 1, gainDb: p.nextGainDb, bestErrorDb: Math.abs(p.errorDb), outputLufs: start + p.nextGainDb }
      }
    }
  })
})
