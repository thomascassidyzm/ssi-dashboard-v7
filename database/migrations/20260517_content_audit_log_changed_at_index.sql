-- Add an index on content_audit_log.changed_at so:
--   • the Maintenance audit-stats "oldest entry" query (ORDER BY changed_at LIMIT 1) is fast
--   • the audit-cleanup batched delete (WHERE changed_at < cutoff) is fast
--   • the audit-events feed (filtered by time window) is fast
--
-- Without this index, the audit-stats endpoint trips Postgres's 8s statement_timeout
-- on a 4M-row log, the cleanup can't make progress, and the events feed is slow.
--
-- CONCURRENTLY so the index build doesn't block writes during creation. Builds
-- can take a few minutes on a 4M-row table; the table stays available throughout.
-- IF NOT EXISTS so the migration is idempotent if it gets re-run.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_audit_log_changed_at
  ON content_audit_log (changed_at DESC);

-- Sanity: confirm it exists and update planner stats.
ANALYZE content_audit_log;
