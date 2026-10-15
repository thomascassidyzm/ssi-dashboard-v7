import { describe, it, expect } from 'vitest'
import { shouldRefreshQueue, REFRESH_MIN_GAP_MS } from './queue-refresh.js'

const base = { visible: true, active: true, phase: 'ready', busy: false, arming: false, editing: false, pending: 0, lastAt: 0, now: 10 * REFRESH_MIN_GAP_MS }

describe('shouldRefreshQueue', () => {
  it('re-reads the queue on the batch page, the home screen and the done screen', () => {
    for (const phase of ['ready', 'home', 'done']) expect(shouldRefreshQueue({ ...base, phase })).toBe(true)
  })
  it('never while recording, loading or on an error screen', () => {
    for (const phase of ['recording', 'loading', 'error', 'unknown']) expect(shouldRefreshQueue({ ...base, phase })).toBe(false)
  })
  it('never while takes are still uploading from this device', () => {
    expect(shouldRefreshQueue({ ...base, pending: 1 })).toBe(false)
  })
  it('never mid-action (busy, arming the mic, rewriting a line)', () => {
    expect(shouldRefreshQueue({ ...base, busy: true })).toBe(false)
    expect(shouldRefreshQueue({ ...base, arming: true })).toBe(false)
    expect(shouldRefreshQueue({ ...base, editing: true })).toBe(false)
  })
  it('not for a hidden tab or a booth kept alive behind another voice tab', () => {
    expect(shouldRefreshQueue({ ...base, visible: false })).toBe(false)
    expect(shouldRefreshQueue({ ...base, active: false })).toBe(false)
  })
  it('debounced: focus and visibilitychange together read once', () => {
    const now = base.now
    expect(shouldRefreshQueue({ ...base, lastAt: now - 1000, now })).toBe(false)
    expect(shouldRefreshQueue({ ...base, lastAt: now - REFRESH_MIN_GAP_MS, now })).toBe(true)
  })
})
