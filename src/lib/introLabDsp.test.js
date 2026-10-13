import { describe, it, expect } from 'vitest'
import { HOUSE, buildIntro, join, tomEnding, voicedRms, toDb, TARGET_DB } from './introLabDsp.js'

const SR = 8000
const tone = (ms, amp = 0.3) => Float32Array.from({ length: Math.round(SR * ms / 1000) }, (_, i) => amp * Math.sin(i / 7))

describe('intro lab DSP', () => {
  it('HOUSE is the by-ear ruling of 2026-10-13, every number', () => {
    expect({ ...HOUSE }).toEqual({ g1: 0, g2: -60, inGap: 120, em: 1.5, tl: 0, fd: 80, trim: false, tail: 'said-like-this' })
  })

  it('a negative gap overlaps the pieces; a positive one leaves silence', () => {
    expect(join([tone(100), tone(100)], [-60], SR).length).toBe(Math.round(SR * 0.1) + Math.round(SR * 0.1) - Math.round(SR * 0.06))
    expect(join([tone(100), tone(100)], [120], SR).length).toBe(Math.round(SR * 0.32))
  })

  it('the ending adds 250 ms of silence after the faded speech', () => {
    const x = tone(400)
    const y = tomEnding(x, SR, 80)
    expect(y.length).toBe(x.length + Math.round(SR * 0.25))
    expect(Math.abs(y[x.length - 1])).toBeLessThan(0.01) // faded out
  })

  it('a finished bare intro sits at -14 dBFS voiced RMS and never clips', () => {
    const x = buildIntro('bare', { frame: tone(500, 0.1), lego: tone(400, 0.5), tail: tone(300, 0.2) }, HOUSE, SR)
    expect(Math.abs(toDb(voicedRms(x, SR)) - TARGET_DB)).toBeLessThan(0.6)
    expect(Math.max(...x.map(Math.abs))).toBeLessThanOrEqual(0.9701)
  })

  it('house gap LEGO->tail of -60 ms makes the intro 60 ms shorter than a 0 ms gap', () => {
    const pcm = { frame: tone(300), lego: tone(300), tail: tone(300) }
    const a = buildIntro('bare', pcm, { ...HOUSE, g2: 0 }, SR)
    const b = buildIntro('bare', pcm, HOUSE, SR)
    expect(a.length - b.length).toBe(Math.round(SR * 0.06))
  })
})
