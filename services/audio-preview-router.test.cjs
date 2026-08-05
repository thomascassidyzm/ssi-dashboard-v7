/**
 * audio-preview-router.test.cjs — the filter predicates, which are the whole
 * honesty claim of the listening page.
 *
 * Run: npx vitest run services/audio-preview-router
 *
 * The bug these tests exist to keep dead: `recent` applied NO predicate, so
 * "Recently rendered" was byte-identical to "All". In the newest-first list
 * that looks fine; through /sample — a uniform draw over the filtered set — it
 * served a course's entire pre-gate history under a label promising the
 * opposite. A filter that silently matches everything is not a filter.
 */
import { describe, it, expect } from 'vitest'

const {
  GATE_LIVE_FROM,
  RECENT_WINDOW_DAYS,
  applyFilter,
  recentCutoff,
  parseFilter,
  gateStateFor,
} = require('./audio-preview-router.cjs')

// Minimal PostgREST query double: records the predicates applied to it.
function fakeQuery () {
  const calls = []
  const q = {
    calls,
    gte: (col, val) => { calls.push(['gte', col, val]); return q },
    lt: (col, val) => { calls.push(['lt', col, val]); return q },
    eq: (col, val) => { calls.push(['eq', col, val]); return q },
  }
  return q
}

const NOW = Date.parse('2026-08-05T12:00:00.000Z')

describe('applyFilter', () => {
  it('constrains "recent" to a real window — never a no-op', () => {
    const q = applyFilter(fakeQuery(), 'recent', null, NOW)
    expect(q.calls).toEqual([['gte', 'created_at', '2026-07-29T12:00:00.000Z']])
  })

  it('constrains "gated" to the gate-era window', () => {
    const q = applyFilter(fakeQuery(), 'gated', null, NOW)
    expect(q.calls).toEqual([['gte', 'created_at', GATE_LIVE_FROM]])
  })

  it('leaves "all" unconstrained — the one filter allowed to match everything', () => {
    expect(applyFilter(fakeQuery(), 'all', null, NOW).calls).toEqual([])
  })

  it('makes "recent" and "all" different queries', () => {
    const recent = applyFilter(fakeQuery(), 'recent', null, NOW).calls
    const all = applyFilter(fakeQuery(), 'all', null, NOW).calls
    expect(recent).not.toEqual(all)
  })

  it('applies the role predicate on top of any filter', () => {
    const q = applyFilter(fakeQuery(), 'all', 'known', NOW)
    expect(q.calls).toEqual([['eq', 'role', 'known']])
  })
})

describe('recentCutoff', () => {
  it('is RECENT_WINDOW_DAYS back from now', () => {
    const cutoff = Date.parse(recentCutoff(NOW))
    expect(NOW - cutoff).toBe(RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000)
  })

  it('is well after the gate went live, so "recent" is never a superset of "gated"', () => {
    expect(Date.parse(recentCutoff(NOW))).toBeGreaterThan(Date.parse('2026-07-01T00:00:00Z'))
  })
})

describe('parseFilter', () => {
  it('accepts the three real filters', () => {
    expect(['recent', 'gated', 'all'].map(parseFilter)).toEqual(['recent', 'gated', 'all'])
  })

  it('falls back to "recent" — a bounded window — for anything unrecognised', () => {
    expect(parseFilter('nonsense')).toBe('recent')
    expect(parseFilter(undefined)).toBe('recent')
  })
})

describe('gateStateFor', () => {
  it('never returns "passed" — no per-clip verdict is persisted', () => {
    expect(gateStateFor('2026-08-05T00:00:00Z')).toBe('gate-era')
    expect(gateStateFor('2026-08-01T00:00:00Z')).toBe('pre-gate')
    expect(gateStateFor(null)).toBe('pre-gate')
  })

  // The cutoff was originally set BEFORE the gate's own commit so that the
  // fra_for_eng pilot batch (23:02…23:46) would fall inside the window. That
  // made the filter select 251 clips the gate had never seen and call them
  // gate-covered. The cutoff must never drift back before the gate exists.
  it('excludes the fra_for_eng pilot batch, which predates the gate module', () => {
    expect(gateStateFor('2026-08-04T23:30:26Z')).toBe('pre-gate')
    expect(gateStateFor('2026-08-04T23:46:05Z')).toBe('pre-gate')
  })

  it('sits at or after the commit that wired the gate into phase8', () => {
    expect(Date.parse(GATE_LIVE_FROM)).toBeGreaterThanOrEqual(Date.parse('2026-08-04T23:59:33Z'))
  })
})
