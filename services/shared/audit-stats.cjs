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
    sb.from(AUDIT_TABLE).select('*', { count: 'estimated', head: true }),
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
    total_rows_estimated: true,
    oldest_at,
    days_since_oldest,
    oldest_unavailable: !!oldestRes.error
  }
}

module.exports = { fetchAuditStats, AUDIT_TABLE }
