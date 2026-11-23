// Again right after the booth moved on by itself re-reads the line it just filed
// (Dan, 2026-11-23, cs #865). boothAgainTarget.js says why.
import { describe, it, expect } from 'vitest'
import { againReopensFiledLine, AGAIN_AFTER_AUTO_MS } from './boothAgainTarget'

const at = 1_000_000
const auto = { from: 7, to: 8, at }

describe('againReopensFiledLine', () => {
  it('Again on the new line before anything is said on it re-opens the line just filed', () => {
    expect(againReopensFiledLine({ lastAuto: auto, index: 8, now: at + 20_000, lineHasSpeech: false })).toBe(7)
  })
  it('his reaction landing on the new line does not stop a quick Again going back', () => {
    expect(againReopensFiledLine({ lastAuto: auto, index: 8, now: at + AGAIN_AFTER_AUTO_MS - 1, lineHasSpeech: true })).toBe(7)
  })
  it('once he has read the new line and the grace is over, Again means the new line', () => {
    expect(againReopensFiledLine({ lastAuto: auto, index: 8, now: at + AGAIN_AFTER_AUTO_MS, lineHasSpeech: true })).toBe(-1)
  })
  it('a tapped Next (no lastAuto) keeps Again on the line on screen', () => {
    expect(againReopensFiledLine({ lastAuto: null, index: 8, now: at + 10, lineHasSpeech: false })).toBe(-1)
  })
  it('a stale record from another line never moves him', () => {
    expect(againReopensFiledLine({ lastAuto: auto, index: 12, now: at + 10, lineHasSpeech: false })).toBe(-1)
  })
})
