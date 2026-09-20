/*
 * The bug this tool shipped with was a ONE-WAY check: it asked only whether the
 * view pointed at legos that had been deleted, and skipped the refresh when the
 * answer was no. A course that has had content APPENDED is in exactly that
 * state — nothing dangling, and nine rounds of its own content invisible to the
 * learner app. afr_for_eng lived there.
 *
 * So the case that gets a test is the case the old check could not see: a clean
 * view with an appended lego must demand a refresh.
 *
 * Run: npx vitest run tools/refresh-round-index.test.cjs
 */
import { describe, it, expect } from 'vitest'

const { drift, describe: describeDrift, DRIFT_QUERY } = require('./refresh-round-index.cjs')

// One DRIFT_QUERY result row.
const row = (course_code, { missing = 0, dangling = 0, renumbered = 0, want = 100, have = 100, status = 'live' } = {}) =>
  ({ course_code, new_app_status: status, missing, dangling, renumbered, want_rows: want, have_rows: have })

describe('drift — the two-way check', () => {
  it('demands a refresh for an APPENDED lego with a clean view (the old one-way check saw nothing here)', () => {
    const d = drift([row('afr_for_eng', { missing: 9, dangling: 0, renumbered: 0, want: 493, have: 484, status: 'beta' })])
    expect(d.needsRefresh).toBe(true)
    expect(d.totals.missing).toBe(9)
    expect(d.totals.dangling).toBe(0)
    expect(d.released).toHaveLength(1)
  })

  it('still demands a refresh for the case the old check DID see — a deleted lego', () => {
    const d = drift([row('eng_for_hin', { dangling: 6, missing: 9, renumbered: 1267, want: 1341, have: 1339 })])
    expect(d.needsRefresh).toBe(true)
    expect(d.totals.renumbered).toBe(1267)
  })

  it('demands a refresh on renumbering alone — row counts can match while every round has moved', () => {
    const d = drift([row('spa_for_eng', { renumbered: 42, want: 900, have: 900 })])
    expect(d.needsRefresh).toBe(true)
    expect(d.totals.missing + d.totals.dangling).toBe(0)
  })

  it('stays quiet when the view matches its own predicate', () => {
    expect(drift([row('cym_s_for_eng'), row('jpn_for_eng')]).needsRefresh).toBe(false)
    expect(drift([]).needsRefresh).toBe(false)
  })

  it('counts released courses separately — an unreleased course drifting is not a learner problem', () => {
    const d = drift([
      row('cor_for_eng', { missing: 858, want: 931, have: 73, status: 'not_available' }),
      row('afr_for_eng', { missing: 9, want: 493, have: 484, status: 'beta' }),
    ])
    expect(d.totals.courses).toBe(2)
    expect(d.totals.released_courses).toBe(1)
    expect(d.released[0].course_code).toBe('afr_for_eng')
  })

  it('names all three kinds of drift in the line a human reads', () => {
    const text = describeDrift(drift([row('eng_for_hin', { missing: 9, dangling: 6, renumbered: 1267, want: 1341, have: 1339 })]))
    expect(text).toContain('9 round(s) missing')
    expect(text).toContain('6 round(s) pointing at content that is gone')
    expect(text).toContain('1267 round(s) renumbered')
  })
})

describe('DRIFT_QUERY', () => {
  it('joins BOTH directions and repeats the view\'s own predicate', () => {
    expect(DRIFT_QUERY).toMatch(/FULL\s+JOIN\s+course_round_index/i)
    expect(DRIFT_QUERY).toMatch(/is_new\s*=\s*true\s+AND\s+lego_id\s+IS\s+NOT\s+NULL/i)
    expect(DRIFT_QUERY).toMatch(/PARTITION BY course_code ORDER BY seed_number, lego_index/i)
  })
})
