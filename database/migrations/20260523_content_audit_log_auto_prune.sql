-- Auto-prune content_audit_log to a 7-day retention window.
--
-- Rationale: the audit log exists for *row-level* recovery — "I (or an agent)
-- broke a row yesterday, restore it from the captured old_row snapshot".
-- For anything older than ~7 days the recovery path is Supabase's daily
-- backup, not the audit log. Capping retention at 7 days keeps the table
-- bounded forever, which keeps every query against it cheap.
--
-- Mechanism: pg_cron schedules a daily call to audit_log_prune(7), which
-- batches the delete to stay within statement_timeout and emits a single
-- log line summarising what was removed.
--
-- Depends on: 20260517_content_audit_log_changed_at_index.sql — without
-- the changed_at index this prune is a full table scan.
--
-- Schedule: 03:00 UTC daily (≈ 04:00 BST / 03:00 GMT — quietest hour for
-- SSi traffic).

-- ============================================================================
-- 0. Make sure pg_cron is available (it usually is on Supabase, but be safe).
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- 1. The prune function — batched delete, runs as superuser via SECURITY DEFINER.
-- ============================================================================
-- statement_timeout = '5min' overrides the default 8s for this maintenance
-- task; the batch loop itself caps total work per call, but we want each
-- batch delete to be allowed to run as long as it needs.
--
-- The function is idempotent: if there's nothing to prune it returns
-- (0, cutoff) and exits in milliseconds.

CREATE OR REPLACE FUNCTION public.audit_log_prune(retention_days int DEFAULT 7)
RETURNS table(deleted_count bigint, deleted_through timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
SET statement_timeout = '5min'
AS $$
DECLARE
  cutoff       timestamptz := now() - make_interval(days => retention_days);
  total        bigint := 0;
  batch_count  bigint;
  batch_size   constant int := 10000;
BEGIN
  -- Loop batched DELETE so each iteration stays short enough to keep WAL
  -- happy and not block other writes. Exit as soon as a batch returns no
  -- rows (we've reached the retention boundary).
  LOOP
    DELETE FROM content_audit_log
    WHERE id IN (
      SELECT id FROM content_audit_log
      WHERE changed_at < cutoff
      LIMIT batch_size
    );
    GET DIAGNOSTICS batch_count = ROW_COUNT;
    total := total + batch_count;
    EXIT WHEN batch_count = 0;
  END LOOP;

  RAISE LOG '[audit_log_prune] retention_days=% cutoff=% deleted=%', retention_days, cutoff, total;
  RETURN QUERY SELECT total, cutoff;
END;
$$;

COMMENT ON FUNCTION public.audit_log_prune(int) IS
  'Batched delete of content_audit_log rows older than retention_days. Called daily by pg_cron job audit-log-daily-prune.';

-- ============================================================================
-- 2. Schedule the daily job. cron.schedule is idempotent on name only —
--    re-running this migration updates the schedule in place rather than
--    creating duplicate jobs.
-- ============================================================================
-- Unschedule any prior version of the job (safe no-op if not present) so we
-- can re-create cleanly even if the body changes between migrations.
DO $$
BEGIN
  PERFORM cron.unschedule('audit-log-daily-prune')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'audit-log-daily-prune');
EXCEPTION WHEN OTHERS THEN
  -- cron.unschedule raises if the job doesn't exist; swallow that.
  NULL;
END $$;

SELECT cron.schedule(
  'audit-log-daily-prune',
  '0 3 * * *',
  $$ SELECT * FROM public.audit_log_prune(7); $$
);

-- ============================================================================
-- 3. Sanity — run it once now so the table is immediately bounded and we
--    can see how big the catch-up delete is. Safe: same function the cron
--    will call every day.
-- ============================================================================
-- Note: with 13 days of accumulation since the trigger was added (~690k
-- rows/day × 6 stale days ≈ 4M rows to delete on first run), this could
-- take a few minutes. The function is batched so it'll get there.

SELECT * FROM public.audit_log_prune(7);
