import { describe, it, expect } from 'vitest'
import lib from './tom006-fade-lib.cjs'
const { endOfSpeechMs } = lib
describe('tom006 fade lib', () => {
  it('finds the end of the last speech frame, ignoring the silent tail', () => {
    const sr = 48000, s = new Float32Array(sr); for (let i = 0; i < sr * 0.5; i++) s[i] = 0.1 * Math.sin(i / 7)  // 0.5 s tone then silence
    expect(endOfSpeechMs(s, sr)).toBeGreaterThanOrEqual(495); expect(endOfSpeechMs(s, sr)).toBeLessThanOrEqual(505)
    expect(endOfSpeechMs(new Float32Array(sr), sr)).toBeNull()
  })
})
