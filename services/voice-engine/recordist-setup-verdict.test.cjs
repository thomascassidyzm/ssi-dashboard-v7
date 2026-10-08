// The automatic setup verdict (job #435). Numbers below are shaped on the real
// calibration set documented at SETUP_VERDICT in recordist-setup-check.cjs.
import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { judgeSetupCheck, analyseSamples, SETUP_HINTS, artistVerdict } = require('./recordist-setup-check.cjs')

const dan = (i) => ({ id: `p${i}`, floorDb: -92, speechDb: -20, cleanSnrDb: 72, clipFracPct: 0 })
const set = (n, over = {}, which = () => true) =>
  Array.from({ length: n }, (_, i) => ({ ...dan(i), ...(which(i) ? over : {}) }))

describe('judgeSetupCheck', () => {
  it('passes a clean Dan-like set, and Aran-/Tom-like extremes seen in accepted takes', () => {
    expect(judgeSetupCheck(set(10)).verdict).toBe('pass')
    const aranWorst = { floorDb: -80, speechDb: -23, cleanSnrDb: 61, clipFracPct: 0 }
    const tomClippy = { floorDb: -120, speechDb: -13, cleanSnrDb: 107, clipFracPct: 0.011 }
    expect(judgeSetupCheck(set(10, aranWorst)).verdict).toBe('pass')
    expect(judgeSetupCheck(set(10, tomClippy)).verdict).toBe('pass')
  })
  it('asks for a quieter room when the floor is high', () => {
    const j = judgeSetupCheck(set(10, { floorDb: -48, cleanSnrDb: 28 }))
    expect(j.verdict).toBe('retry')
    expect(j.reasons).toEqual([SETUP_HINTS.noise])
  })
  it('asks to speak quieter when the takes clip', () => {
    const j = judgeSetupCheck(set(10, { clipFracPct: 0.8 }))
    expect(j.verdict).toBe('retry')
    expect(j.reasons).toEqual([SETUP_HINTS.clipping])
  })
  it('asks to come closer when the voice is far down', () => {
    const j = judgeSetupCheck(set(10, { speechDb: -45, cleanSnrDb: 47 }))
    expect(j.verdict).toBe('retry')
    expect(j.reasons).toEqual([SETUP_HINTS.far])
  })
  it('leans to pass: one bad take, too few takes and unmeasured takes never fail', () => {
    expect(judgeSetupCheck(set(10, { floorDb: -40, cleanSnrDb: 20 }, (i) => i === 0)).verdict).toBe('pass')
    expect(judgeSetupCheck(set(1, { floorDb: -40, cleanSnrDb: 20 })).verdict).toBe('unmeasured')
    expect(judgeSetupCheck({ p01: null, p02: { levelDb: -20 } }).verdict).toBe('unmeasured')
    expect(judgeSetupCheck(undefined).verdict).toBe('unmeasured')
    expect(artistVerdict({ status: 'submitted', metrics: { verdict: { verdict: 'unmeasured', reasons: [], judged: 0 } } })).toBeNull()
    expect(artistVerdict({ status: 'submitted', metrics: { verdict: { verdict: 'pass', reasons: [], judged: 0 } } })).toBeNull()
  })
})

describe('analyseSamples', () => {
  it('reads clipping and floor from the samples', () => {
    const x = new Float32Array(16000 * 2)
    for (let i = 8000; i < 16000; i += 1) x[i] = i % 2 ? 1 : -1 // loud, clipped middle
    const m = analyseSamples(x)
    expect(m.clipFracPct).toBeGreaterThan(20)
    expect(m.floorDb).toBeLessThan(-100)
  })
})
