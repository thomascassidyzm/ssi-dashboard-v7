import { describe, it, expect } from 'vitest'
import { goneRefusedLineIds } from './refused-takes.js'

describe('goneRefusedLineIds (F55)', () => {
  const refusedTakes = [{ lineId: 'a' }, { lineId: 'b' }, { lineId: 'c' }]
  it('a refused take whose line is on screen or already placed is not gone', () => {
    const gone = goneRefusedLineIds({ refusedTakes, queueLines: [{ id: 'a' }], batchLines: [{ id: 'b' }], placed: {} })
    expect(gone).toEqual(['c'])
    expect(goneRefusedLineIds({ refusedTakes, queueLines: [{ id: 'a' }], batchLines: [], placed: { b: ['t', 1, false] } }).sort()).toEqual(['c'])
  })
  it('before the full queue is read, only the server\'s list counts', () => {
    expect(goneRefusedLineIds({ serverGone: ['z'], refusedTakes, queueLines: null })).toEqual(['z'])
  })
})
