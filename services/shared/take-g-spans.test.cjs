import { describe, it, expect } from 'vitest'
import spans from './take-g-spans.cjs'
const { spansFromWordTimings, spansFromWordBoundaries } = spans

const group = [{ target_surface: 'Ciao a' }, { target_surface: 'tutti' }]
describe('take-g-spans', () => {
  it('derives padded unit spans from Cartesia word_timings (seconds → ms)', () => {
    const wt = { source: 'cartesia', words: ['Ciao', 'a', 'tutti'], starts: [0, 0.4, 0.9], ends: [0.35, 0.5, 1.4] }
    // gap 500→900ms: pad = min(150, 133) = 133 each side
    expect(spansFromWordTimings(wt, group, 1500)).toEqual([{ start: 0, end: 633 }, { start: 767, end: 1500 }])
  })
  it('returns null when words do not reconstruct the units', () => {
    const wt = { source: 'cartesia', words: ['Ciao', 'tutti'], starts: [0, 0.9], ends: [0.35, 1.4] }
    expect(spansFromWordTimings(wt, group, 1500)).toBeNull()
  })
  it('returns null on a malformed shape', () => {
    expect(spansFromWordTimings({ words: ['a'], starts: [], ends: [] }, group, 1500)).toBeNull()
  })
  it('Azure boundaries still work', () => {
    const wb = [{ text: 'Ciao', offset: 0, duration: 350 }, { text: 'a', offset: 400, duration: 100 }, { text: 'tutti', offset: 900, duration: 500 }]
    expect(spansFromWordBoundaries(wb, group, 1500)).toEqual([{ start: 0, end: 633 }, { start: 767, end: 1500 }])
  })
})
