-- Partial index: fast course_audio DELETE recovery on the ~9M-row audit log.
--
-- Context: recover-pod-audio-from-audit.cjs (and any "what audio got deleted in
-- window X" lookup) runs:
--
--   SELECT ... FROM content_audit_log
--   WHERE table_name = 'course_audio'
--     AND change_type = 'DELETE'
--     AND changed_at >= :since
--   ORDER BY changed_at DESC;
--
-- The only supporting index today is on changed_at alone
-- (20260517_content_audit_log_changed_at_index.sql), so that scan still has to
-- walk EVERY audit row in the time window — across all tables and ops — and
-- filter down to the course_audio DELETEs. On a 9M-row table with no working
-- prune, even a few-day window trips the 8s statement timeout.
--
-- A partial index restricted to exactly the course_audio DELETE rows turns that
-- into an index-only range scan over just the rows we want. The course_audio
-- DELETE rows are a small fraction of the table, so the index is small and
-- cheap to maintain.
--
-- This is the recurring recovery hot path: pod audio gets cascade-nulled
-- whenever a course_audio cleanup deletes still-referenced rows (28 May and
-- 19 May 2026). Make recovering from it instant.
--
-- IF NOT EXISTS for idempotency. A partial-index predicate may reference only
-- immutable expressions — table_name and change_type constants qualify.
--
-- ⚠ CREATE INDEX CONCURRENTLY cannot run inside a transaction block, and the
-- Supabase SQL editor wraps every statement in one (ERROR 25001). So:
--
--   • Default below is the NON-concurrent form — works in the SQL editor. It
--     takes a brief write-lock on content_audit_log during the build (blocks
--     audit inserts, i.e. content writes). Because the index only covers the
--     course_audio DELETE subset the build is quick; run it after the VACUUM in
--     audit-log-maintenance.sql and when no one is mid course-build.
--
--   • For a ZERO-lock build, use the CONCURRENTLY variant at the bottom via a
--     direct psql connection (NOT the SQL editor):
--       psql "<supabase connection string>" -f <this file>

CREATE INDEX IF NOT EXISTS idx_content_audit_log_course_audio_delete
  ON content_audit_log (changed_at DESC)
  WHERE table_name = 'course_audio' AND change_type = 'DELETE';

-- Refresh planner stats so the new index is used immediately.
ANALYZE content_audit_log;

-- Zero-lock alternative (psql only, NOT the SQL editor) — drop the index above
-- first if it already exists, or just run this instead:
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_audit_log_course_audio_delete
--     ON content_audit_log (changed_at DESC)
--     WHERE table_name = 'course_audio' AND change_type = 'DELETE';
