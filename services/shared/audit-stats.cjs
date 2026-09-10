/**
 * The stats behind the Content audit log panel (Admin -> Maintenance).
 *
 * This is the front door to the estate's row-level undo history: every UPDATE and
 * DELETE on the at-risk content tables is captured into content_audit_log by DB
 * triggers, and that panel is how a human finds a change and rolls it back.
 * It has to be both up and TRUE.
 */

const AUDIT_TABLE = 'content_audit_log'

async function fetchAuditStats(sb, logger) {
  const [countRes, oldestRes] = await Promise.all([
    // THE COUNT QUERY MUST BE BOUNDED. PostgREST executes the underlying SELECT even
    // for a HEAD request, so an unbounded `select('*', { head: true })` seq-scans the
    // whole ~24GB audit log and trips Postgres's 8s statement_timeout — that, and not
    // the count itself, is what 500'd this panel from 2026-08-06 to 2026-09-10. Measured
    // live: unbounded 500 in 8.17s, `select=id&limit=1` 206 in 0.11s. `limit(1)` bounds
    // the scan; `count: 'estimated'` still returns the planner's reltuples figure, which
    // is why total_rows is APPROXIMATE and the panel must say so. There is no cheap exact
    // count of this table — an exact count is the same seq scan that times out.
    sb.from(AUDIT_TABLE).select('id', { count: 'estimated', head: true }).limit(1),
    sb.from(AUDIT_TABLE).select('changed_at').order('changed_at', { ascending: true }).limit(1)
  ])
  if (countRes.error) throw countRes.error
  if (oldestRes.error) {
    logger?.warn?.('[Audit] oldest-row query failed (likely missing index on changed_at):', oldestRes.error?.message)
  }

  const oldest_at = oldestRes.error ? null : (oldestRes.data?.[0]?.changed_at ?? null)
  const days_since_oldest = oldest_at
    ? Math.floor((Date.now() - new Date(oldest_at).getTime()) / (1000 * 60 * 60 * 24))
    : null

  return {
    total_rows: countRes.count ?? 0,
    // Never presented as an exact figure. See the comment on the count query above.
    total_rows_estimated: true,
    oldest_at,
    days_since_oldest,
    oldest_unavailable: !!oldestRes.error
  }
}

module.exports = { fetchAuditStats, AUDIT_TABLE }
