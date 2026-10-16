import { describe, it, expect } from 'vitest'
import { fitRail, MAX_SQ, MIN_SQ } from './rail-fit.js'

const extent = ({ cols, sq, gap }, n) => ({
  w: cols * (sq + gap) - gap,
  h: Math.ceil(n / cols) * (sq + gap) - gap,
})

describe('fitRail — every square of the batch fits the rail (job #286)', () => {
  // the rail's inner width on a desktop (216px column less its padding)
  const W = 176
  for (const [n, h] of [[196, 330], [250, 330], [250, 560], [196, 260], [300, 300]]) {
    it(`${n} lines in ${W}x${h}: all fit, no scrolling`, () => {
      const f = fitRail({ n, width: W, height: h })
      expect(f.scroll).toBe(false)
      const e = extent(f, n)
      expect(e.w).toBeLessThanOrEqual(W)
      expect(e.h).toBeLessThanOrEqual(h)
      expect(f.sq).toBeGreaterThanOrEqual(MIN_SQ)
    })
  }
  it('the old ten 14px columns would NOT fit 250 lines in 330px — the case Aran hit', () => {
    expect(extent({ cols: 10, sq: 14, gap: 4 }, 250).h).toBeGreaterThan(330)
  })
  it('a short batch keeps the old look: ten columns of 14px squares', () => {
    expect(fitRail({ n: 40, width: W, height: 600 })).toMatchObject({ cols: 10, sq: MAX_SQ, gap: 4 })
  })
  it('never larger than the old square, however much room', () => {
    expect(fitRail({ n: 5, width: 1000, height: 1000 }).sq).toBe(MAX_SQ)
  })
  it('past what can fit at a tappable size, it stops shrinking and scrolls', () => {
    const f = fitRail({ n: 2000, width: W, height: 200 })
    expect(f.scroll).toBe(true)
    expect(f.sq).toBe(MIN_SQ)
    expect(extent(f, 2000).w).toBeLessThanOrEqual(W)
  })
})
