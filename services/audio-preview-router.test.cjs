/**
 * audio-preview-router.test.cjs — the filter predicates and the verdict
 * mapping, which together are the whole honesty claim of the listening page.
 *
 * Run: npx vitest run services/audio-preview-router
 *
 * Two bugs these tests exist to keep dead:
 *
 * 1. `recent` applied NO predicate, so "Recently rendered" was byte-identical
 *    to "All". In the newest-first list that looks fine; through /sample — a
 *    uniform draw over the filtered set — it served a course's entire history
 *    under a label promising the opposite. A filter that silently matches
 *    everything is not a filter.
 *
 * 2. The page decided whether a clip had been quality-checked by comparing its
 *    created_at to the date the gate shipped. docs/gate-bypass-audit-2026-08-05.md
 *    measured that inference as false for 100% of the 1,413 rows it selected.
 *    Quality is now a stored verdict, and the tests below pin the one rule that
 *    makes a stored verdict safe: "could not check" NEVER reads as a pass.
 */
import { describe, it, expect } from 'vitest'

const {
  RECENT_WINDOW_DAYS,
  FILTERS,
  applyFilter,
  recentCutoff,
  parseFilter,
  verdictFor,
} = require('./audio-preview-router.cjs')

// Minimal PostgREST query double: records the predicates applied to it.
function fakeQuery () {
  const calls = []
  const q = {
    calls,
    gte: (col, val) => { calls.push(['gte', col, val]); return q },
    lt: (col, val) => { calls.push(['lt', col, val]); return q },
    eq: (col, val) => { calls.push(['eq', col, val]); return q },
    is: (col, val) => { calls.push(['is', col, val]); return q },
    or: (expr) => { calls.push(['or', expr]); return q },
  }
  return q
}

const NOW = Date.parse('2026-08-05T12:00:00.000Z')

describe('applyFilter', () => {
  it('constrains "recent" to a real window — never a no-op', () => {
    const q = applyFilter(fakeQuery(), 'recent', null, NOW)
    expect(q.calls).toEqual([['gte', 'created_at', '2026-07-29T12:00:00.000Z']])
  })

  it('makes "checked" a verdict lookup, not a date window', () => {
    const q = applyFilter(fakeQuery(), 'checked', null, NOW)
    expect(q.calls).toEqual([['is', 'veracity_pass', true]])
    // The bug this replaces: quality asserted from created_at.
    expect(JSON.stringify(q.calls)).not.toContain('created_at')
  })

  /**
   * The three-valued-logic trap. `veracity_pass` is NULL for every clip
   * rendered before 2026-08-05 and for every could-not-check admission, and in
   * SQL `pass <> true` is NULL — not TRUE — for those rows. Written as a
   * not-equals, this filter would return NOTHING on a course of entirely
   * unchecked audio, and the page would report that course as having nothing
   * to worry about.
   */
  it('makes "unchecked" catch NULLs — the population it exists for', () => {
    const q = applyFilter(fakeQuery(), 'unchecked', null, NOW)
    expect(q.calls).toEqual([['or', 'veracity_pass.is.null,veracity_pass.is.false']])
    expect(q.calls[0][1]).toContain('is.null')
    expect(q.calls[0][1]).not.toContain('not.eq')
  })

  it('puts checked-and-failed in "unchecked" so a failure cannot hide', () => {
    // Defined as "not confirmed passed", so the two filters partition the set:
    // nothing is in both, and nothing is in neither.
    const q = applyFilter(fakeQuery(), 'unchecked', null, NOW)
    expect(q.calls[0][1]).toContain('is.false')
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
})

describe('parseFilter', () => {
  it('accepts every real filter', () => {
    expect(FILTERS.map(parseFilter)).toEqual(FILTERS)
  })

  it('falls back to "recent" — a bounded window — for anything unrecognised', () => {
    expect(parseFilter('nonsense')).toBe('recent')
    expect(parseFilter(undefined)).toBe('recent')
    // The old date-window filter. It no longer exists; it must degrade to a
    // bounded window, never be silently reinterpreted as a quality claim.
    expect(parseFilter('gated')).toBe('recent')
  })
})

describe('verdictFor', () => {
  it('reports a stored pass as passed, with its evidence', () => {
    const v = verdictFor({
      veracity_checked_at: '2026-08-05T14:00:00Z',
      veracity_pass: true,
      veracity_reason: 'ok',
      veracity_cer: 0.02,
      veracity_attempts: 1,
      veracity_checker: 'phase8-generate',
    })
    expect(v.state).toBe('passed')
    expect(v.cer).toBe(0.02)
    expect(v.checker).toBe('phase8-generate')
  })

  /**
   * THE rule. `checked: false` means the gate ran and could not look — missing
   * whisper, a decode error, the gate switched off. It writes a checked_at (it
   * did run) and leaves pass NULL (it reached no verdict). If that ever renders
   * as a pass, the page is back to asserting quality it has not measured, which
   * is the entire defect this column set was added to end.
   */
  it('never reads a could-not-check admission as a pass', () => {
    const v = verdictFor({
      veracity_checked_at: '2026-08-05T14:00:00Z',
      veracity_pass: null,
      veracity_reason: 'unchecked_no_whisper',
    })
    expect(v.state).toBe('unchecked')
    expect(v.state).not.toBe('passed')
    expect(v.reasonText).toMatch(/not installed/)
  })

  it('reads a clip nothing ever checked as unchecked, and says so in words', () => {
    const v = verdictFor({ created_at: '2026-03-01T00:00:00Z' })
    expect(v.state).toBe('unchecked')
    expect(v.checkedAt).toBeNull()
    expect(v.reasonText).toMatch(/has ever run/)
  })

  it('surfaces checked-and-failed rather than folding it into unchecked', () => {
    const v = verdictFor({
      veracity_checked_at: '2026-08-05T14:00:00Z',
      veracity_pass: false,
      veracity_reason: 'non_speech_decode',
    })
    expect(v.state).toBe('failed')
    expect(v.reasonText).toMatch(/no speech/)
  })

  it('turns every reason code into prose — the page never prints a bare code', () => {
    const codes = [
      'ok', 'non_speech_decode', 'cer_above_threshold',
      'cer_above_unvalidated_language_threshold', 'unchecked_no_whisper',
      'unchecked_disabled', 'unchecked_decode_error', 'unchecked_no_text',
    ]
    for (const reason of codes) {
      const v = verdictFor({ veracity_checked_at: '2026-08-05T14:00:00Z', veracity_reason: reason })
      expect(v.reasonText).not.toBe(reason)
      expect(v.reasonText.length).toBeGreaterThan(reason.length / 2)
    }
  })
})

/**
 * The payload contract, exercised through the real router with a fake database.
 *
 * These exist because of a live miss: `unchecked` is a REMAINDER the route has
 * to hand the counter (total - passed - failed), and when the route forgot to
 * pass the total, every response carried `unchecked: null`. Nothing threw. The
 * page simply stopped saying how much of the course had never been checked —
 * the single number this whole feature exists to publish — and the unit tests
 * on the pure functions all stayed green, because the defect lived in the wiring
 * between them.
 */
describe('GET /clips payload', () => {
  // Minimal PostgREST double. `head: true` requests are the counters; the rest
  // is the row page. Counts are derived from the predicates actually applied,
  // so a route that forgets one gets a wrong number rather than a lucky pass.
  function fakeDb ({ rows, counts }) {
    return {
      from () {
        const state = { head: false, preds: [] }
        const q = {
          select: (_cols, opts) => { state.head = !!(opts && opts.head); return q },
          eq: (c, v) => { state.preds.push(`eq:${c}=${v}`); return q },
          gte: (c, v) => { state.preds.push(`gte:${c}`); return q },
          is: (c, v) => { state.preds.push(`is:${c}=${v}`); return q },
          or: (e) => { state.preds.push(`or:${e}`); return q },
          order: () => q,
          range: () => Promise.resolve({ data: rows, count: counts.total, error: null }),
          then: (resolve) => {
            const passed = state.preds.includes('is:veracity_pass=true')
            const failed = state.preds.includes('is:veracity_pass=false')
            resolve({
              count: passed ? counts.passed : failed ? counts.failed : counts.total,
              error: null,
            })
          },
        }
        return q
      },
    }
  }

  async function callClips (db) {
    const router = require('./audio-preview-router.cjs')({ getDb: () => db, logger: { error () {}, info () {} } })
    const layer = router.stack.find(l => l.route && l.route.path === '/clips')
    let body = null
    await layer.route.stack[0].handle(
      { params: { courseCode: 'fra_for_eng' }, query: {} },
      { json: (b) => { body = b }, status: () => ({ json: (b) => { body = b } }) },
    )
    return body
  }

  it('states unchecked as a NUMBER, never null, when the total is known', async () => {
    const body = await callClips(fakeDb({
      rows: [{ id: 'a', course_code: 'fra_for_eng', text: 'bonjour', role: 'target1', created_at: '2026-08-05T00:00:00Z' }],
      counts: { total: 49098, passed: 12, failed: 0 },
    }))
    expect(body.error).toBeUndefined()
    expect(body.verdictTotals.unchecked).toBe(49098 - 12)
    expect(body.verdictTotals.unchecked).not.toBeNull()
  })

  it('gives every clip a verdict, so no row can render as blank', async () => {
    const body = await callClips(fakeDb({
      rows: [{ id: 'a', course_code: 'fra_for_eng', text: 'bonjour', role: 'target1', created_at: '2026-08-05T00:00:00Z' }],
      counts: { total: 1, passed: 0, failed: 0 },
    }))
    expect(body.clips[0].verdict.state).toBe('unchecked')
  })
})
