// The hiss check: room before/after the voice, measured against the voice.
import { describe, it, expect } from 'vitest'
import { measureTakeNoise, HISS_HEADROOM_DB } from './take-noise-check.js'

const SR = 16000
// Deterministic noise so the test never flakes.
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32) * 2 - 1 }
const dbToAmp = (db) => 10 ** (db / 20)

// lead s of room, voice s of "speech" (amplitude-modulated tone), tail s of room.
function take({ roomDb, speechDb = -20, lead = 1, voice = 2, tail = 0.9 }) {
  const r = rng(7)
  const n = Math.round((lead + voice + tail) * SR)
  const out = new Float32Array(n)
  const roomAmp = dbToAmp(roomDb) * Math.sqrt(3) // uniform noise RMS = amp/sqrt3
  for (let i = 0; i < n; i++) {
    const t = i / SR
    let v = r() * roomAmp
    if (t >= lead && t < lead + voice) {
      const syll = 0.6 + 0.4 * Math.abs(Math.sin(Math.PI * 4 * (t - lead))) // syllable envelope
      v += Math.sin(2 * Math.PI * 180 * t) * dbToAmp(speechDb) * Math.SQRT2 * syll
    }
    out[i] = v
  }
  return out
}

describe('measureTakeNoise', () => {
  it('a clean take (room 50 dB under the voice) is clean', () => {
    const m = measureTakeNoise(take({ roomDb: -70 }), SR)
    expect(m.verdict).toBe('clean')
    expect(m.headroomDb).toBeGreaterThan(40)
  })

  it('an ordinary room (36 dB under) is NOT flagged — no nagging', () => {
    expect(measureTakeNoise(take({ roomDb: -56 }), SR).verdict).toBe('clean')
  })

  it('a hissy take (room 20 dB under) is flagged, with a lead and tail measured', () => {
    const m = measureTakeNoise(take({ roomDb: -40 }), SR)
    expect(m.verdict).toBe('hiss')
    expect(m.headroomDb).toBeLessThan(HISS_HEADROOM_DB)
    expect(m.leadDb).not.toBeNull()
    expect(m.tailDb).not.toBeNull()
  })

  it('hiss only AFTER the voice still counts', () => {
    const a = take({ roomDb: -75 })
    const r = rng(3)
    for (let i = Math.round(3.05 * SR); i < a.length; i++) a[i] += r() * dbToAmp(-42) * Math.sqrt(3)
    const m = measureTakeNoise(a, SR)
    expect(m.verdict).toBe('hiss')
    expect(m.reason).toMatch(/after/)
  })

  it('one loud click in the lead does not count as hiss', () => {
    const a = take({ roomDb: -70 })
    for (let i = Math.round(0.3 * SR); i < Math.round(0.32 * SR); i++) a[i] = 0.5
    expect(measureTakeNoise(a, SR).verdict).toBe('clean')
  })

  it('a take with no room either side is unjudged, never guessed', () => {
    expect(measureTakeNoise(take({ roomDb: -40, lead: 0.05, tail: 0.05 }), SR).verdict).toBe('unjudged')
    expect(measureTakeNoise(new Float32Array(SR), SR).verdict).toBe('unjudged')
  })
})
