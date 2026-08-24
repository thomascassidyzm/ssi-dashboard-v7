/**
 * Back is a media-player back button now: one tap restarts the take being read,
 * two taps inside the window step back a line. Kai, 2026-08-21 — the old
 * first-press skip threw away the line being read AND landed the recordist on
 * one that was already fine.
 */
import { describe, it, expect } from 'vitest'
import { createBackTap, BACK_DOUBLE_TAP_MS } from './backTap'

function harness(windowMs = BACK_DOUBLE_TAP_MS) {
  const calls = []
  let clock = 1000
  const tapper = createBackTap({
    windowMs,
    now: () => clock,
    onRestart: () => calls.push('restart'),
    onPrevious: () => calls.push('previous')
  })
  return {
    calls,
    tap: () => tapper.tap(),
    reset: () => tapper.reset(),
    wait: (ms) => { clock += ms }
  }
}

describe('back button tap window', () => {
  it('restarts the current take on a single tap — the line does not move', () => {
    const h = harness()
    expect(h.tap()).toBe('restart')
    expect(h.calls).toEqual(['restart'])
  })

  it('goes to the previous take on a second tap inside the window', () => {
    const h = harness()
    h.tap()
    h.wait(200)
    expect(h.tap()).toBe('previous')
    expect(h.calls).toEqual(['restart', 'previous'])
  })

  it('treats a tap after the window as a fresh restart, not a skip', () => {
    const h = harness()
    h.tap()
    h.wait(BACK_DOUBLE_TAP_MS + 1)
    h.tap()
    expect(h.calls).toEqual(['restart', 'restart'])
  })

  it('counts a tap exactly on the window boundary as the pair', () => {
    const h = harness()
    h.tap()
    h.wait(BACK_DOUBLE_TAP_MS)
    h.tap()
    expect(h.calls).toEqual(['restart', 'previous'])
  })

  it('does not turn three fast taps into two skips', () => {
    // The pair is consumed, so tap 3 opens a new pair rather than closing the
    // old one — a recordist mashing the button steps back one line, not two.
    const h = harness()
    h.tap(); h.wait(100)
    h.tap(); h.wait(100)
    h.tap()
    expect(h.calls).toEqual(['restart', 'previous', 'restart'])
  })

  it('four fast taps are two restarts and two steps back, in order', () => {
    const h = harness()
    for (let i = 0; i < 4; i++) { h.tap(); h.wait(100) }
    expect(h.calls).toEqual(['restart', 'previous', 'restart', 'previous'])
  })

  it('forgets a half-finished pair on reset', () => {
    // Stopping the session mid-pair: the next tap is a first tap again.
    const h = harness()
    h.tap()
    h.reset()
    h.wait(100)
    expect(h.tap()).toBe('restart')
    expect(h.calls).toEqual(['restart', 'restart'])
  })

  it('keeps the window inside the phone convention band', () => {
    expect(BACK_DOUBLE_TAP_MS).toBeGreaterThanOrEqual(400)
    expect(BACK_DOUBLE_TAP_MS).toBeLessThanOrEqual(600)
  })
})
