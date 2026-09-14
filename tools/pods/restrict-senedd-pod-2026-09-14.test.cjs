import { describe, it, expect } from 'vitest'
const { assertBefore, assertSouth, checkRowCount, checkTriggerEnabled, UPDATE_SQL } = require('./restrict-senedd-pod-2026-09-14.cjs')

describe('restrict-senedd-pod gates (pure)', () => {
  it('accepts the North row only when it is live and open', () => {
    expect(assertBefore({ visibility: 'live', required_role: null }).ok).toBe(true)
    expect(assertBefore({ visibility: 'live', required_role: 'previewer_001' }).ok).toBe(false)
    expect(assertBefore({ visibility: 'held', required_role: null }).ok).toBe(false)
    expect(assertBefore(null).ok).toBe(false)
  })
  it('requires the South row to already carry the role, so the courses never diverge', () => {
    expect(assertSouth({ visibility: 'live', required_role: 'previewer_001' }).ok).toBe(true)
    expect(assertSouth({ visibility: 'live', required_role: null }).ok).toBe(false)
    expect(assertSouth(null).ok).toBe(false)
  })
  it('refuses anything but exactly one row, and a trigger left disabled', () => {
    expect(checkRowCount(1).ok).toBe(true)
    expect(checkRowCount(0).ok).toBe(false)
    expect(checkRowCount(2).ok).toBe(false)
    expect(checkTriggerEnabled('O').ok).toBe(true)
    expect(checkTriggerEnabled('D').ok).toBe(false)
  })
  it('the UPDATE names the pod and repeats the before-state in its WHERE', () => {
    expect(UPDATE_SQL).toMatch(/WHERE id = 'cym_n_for_eng:senedd-s4c-steve' AND visibility = 'live' AND required_role IS NULL/)
  })
})
