import { describe, it, expect } from 'vitest'
import { BELTS, beltIndex, prefixTops, rowAt, windowRange } from './phraseProofWindow.js'

describe('belt stripe', () => {
  it('divides the course evenly into the 8 belts in order', () => {
    expect(BELTS.map((b) => b.name)).toEqual(['white', 'yellow', 'orange', 'green', 'blue', 'purple', 'brown', 'black'])
    const total = 800
    expect(beltIndex(1, total)).toBe(0)
    expect(beltIndex(100, total)).toBe(0)
    expect(beltIndex(101, total)).toBe(1)
    expect(beltIndex(701, total)).toBe(7)
    expect(beltIndex(800, total)).toBe(7)
    const counts = Array(8).fill(0)
    for (let n = 1; n <= 11797; n++) counts[beltIndex(n, 11797)]++
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1)
  })
})

describe('window', () => {
  const tops = prefixTops([20, 20, 40, 20, 20])   // 0 20 40 80 100 120
  it('finds the row at a y and the slice to render', () => {
    expect([rowAt(tops, 0), rowAt(tops, 39), rowAt(tops, 40), rowAt(tops, 79), rowAt(tops, 500)]).toEqual([0, 1, 2, 2, 4])
    expect(windowRange(tops, 45, 85, 0)).toEqual([2, 4])
    expect(windowRange(tops, 45, 85, 1000)).toEqual([0, 5])
  })
})
