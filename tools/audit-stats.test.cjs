/**
 * The Content audit log stats panel (Admin -> Maintenance) returned HTTP 500 for five
 * weeks — first recorded 2026-08-06, still red on 2026-09-10. It is the front door to
 * the estate's row-level undo history, so a dead panel is a dead recovery surface.
 *
 * THE CAUSE WAS A TIMEOUT, NOT A LOGIC BUG. PostgREST executes the underlying SELECT
 * even for a HEAD request, so `select('*', { count: 'estimated', head: true })` with no
 * limit plans and runs a sequential scan of the ~24GB content_audit_log and trips
 * Postgres's 8s statement_timeout. Measured against the live PostgREST on 2026-09-10:
 *
 *   unbounded, count=estimated  -> HTTP 500 in 8.17s
 *   unbounded, count=planned    -> HTTP 500 in 8.11s   (so it is the SELECT, not the count)
 *   ?select=id&limit=1, estimated -> HTTP 206 in 0.11s, content-range 0-0/4305108
 *
 * The 500 body read {"error":"unknown error"} because a failed HEAD has no body for
 * supabase-js to parse: the service journal logged the error object as `{ message: '' }`.
 *
 * The fake client below reproduces exactly that: an unbounded count query on
 * content_audit_log fails the way production failed, a bounded one succeeds.
 *
 * RECORDED RED, against the pre-fix query (services/shared/audit-stats.cjs at commit
 * before the bound was added):
 *   FAIL  bounds the count query so it cannot seq-scan the whole audit log
 *     AssertionError: promise rejected "{ message: '' }" instead of resolving
 *   FAIL  reports the row count as an ESTIMATE, never as an exact figure
 *   FAIL  still returns the oldest entry and the age derived from it
 *   FAIL  degrades to a dash rather than a 500 when the oldest-entry query fails
 *     { message: '', stacks: [] }
 *   Test Files 1 failed (1) / Tests 4 failed (4) — the whole handler dies on the count
 *   leg, which is why even the already-guarded oldest-entry leg never reaches the page.
 */
import { describe, it, expect } from 'vitest'
const { fetchAuditStats } = require('../services/shared/audit-stats.cjs')

const ESTIMATED_ROWS = 4305108
const OLDEST = '2026-07-03T00:21:45.947996+00:00'

// A PostgREST-shaped stub. The only behaviour it models is the one that broke
// production: an unbounded scan of the audit log dies at the statement timeout,
// with the empty-message error object supabase-js produces for a bodyless HEAD 500.
function fakeSupabase ({ oldestFails = false } = {}) {
  const seen = []
  return {
    seen,
    from (table) {
      const q = { table, limit: null, order: null, head: false, count: null }
      seen.push(q)
      const builder = {
        select (_cols, opts = {}) {
          q.head = !!opts.head
          q.count = opts.count || null
          return builder
        },
        order (col, opts) { q.order = { col, ...opts }; return builder },
        limit (n) { q.limit = n; return builder },
        then (resolve, reject) {
          return Promise.resolve(result(q)).then(resolve, reject)
        }
      }
      return builder
    }
  }

  function result (q) {
    if (q.count) {
      if (q.limit === null) {
        // The production failure: full scan, 8s statement_timeout, bodyless 500.
        return { data: null, count: null, error: { message: '' } }
      }
      return { data: null, count: ESTIMATED_ROWS, error: null }
    }
    if (oldestFails) return { data: null, error: { message: 'canceling statement due to statement timeout' } }
    return { data: [{ changed_at: OLDEST }], error: null }
  }
}

describe('audit-stats', () => {
  it('bounds the count query so it cannot seq-scan the whole audit log', async () => {
    const sb = fakeSupabase()
    await expect(fetchAuditStats(sb, null)).resolves.toBeTruthy()
    const countQuery = sb.seen.find(q => q.count)
    expect(countQuery).toBeTruthy()
    expect(countQuery.limit).not.toBeNull()
  })

  it('reports the row count as an ESTIMATE, never as an exact figure', async () => {
    const stats = await fetchAuditStats(fakeSupabase(), null)
    expect(stats.total_rows).toBe(ESTIMATED_ROWS)
    // The panel must not present a planner estimate as a counted number.
    expect(stats.total_rows_estimated).toBe(true)
  })

  it('still returns the oldest entry and the age derived from it', async () => {
    const stats = await fetchAuditStats(fakeSupabase(), null)
    expect(stats.oldest_at).toBe(OLDEST)
    expect(stats.oldest_unavailable).toBe(false)
    expect(stats.days_since_oldest).toBeGreaterThan(0)
  })

  it('degrades to a dash rather than a 500 when the oldest-entry query fails', async () => {
    const warned = []
    const stats = await fetchAuditStats(fakeSupabase({ oldestFails: true }), { warn: (...a) => warned.push(a) })
    expect(stats.oldest_at).toBeNull()
    expect(stats.days_since_oldest).toBeNull()
    expect(stats.oldest_unavailable).toBe(true)
    expect(stats.total_rows).toBe(ESTIMATED_ROWS)
    expect(warned.length).toBe(1)
  })
})
