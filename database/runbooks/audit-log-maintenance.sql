-- ============================================================================
-- content_audit_log maintenance runbook  (2026-06-01)
-- Run these by hand in the Supabase SQL editor / psql. NOT a migration:
-- VACUUM can't run in a transaction, and the cron checks are diagnostics.
-- ============================================================================
-- Context: the audit log is the row-level recovery store. It bloated to ~5M
-- rows and the scheduled prune stopped firing, so even indexed top-N reads now
-- time out. New design: short HOT window in Postgres + full COLD history in S3
-- via tools/archive-audit-log.cjs (see that file's header). This runbook covers
-- the bits that live in the DB: diagnose the dead cron, reclaim the bloat,
-- decommission the old delete-only prune.


-- 1. WHY ISN'T THE PRUNE RUNNING? --------------------------------------------
-- The audit_log_prune() FUNCTION works (verified via RPC). The scheduled job is
-- what's dead. Empirically the oldest row is ~2026-05-22 — consistent with the
-- migration's one-time prune running once (~05-29) and the cron never firing
-- since (a 7-day cron would have deleted everything before 05-25 by now).

-- NOTE: older pg_cron (<1.4) has NO `jobname` column on cron.job and does NOT
-- support the named 3-arg cron.schedule(name, schedule, command). The
-- 20260523 migration used the NAMED form — so on old pg_cron that schedule
-- call itself errored, which is a prime suspect for why the prune never ran.
-- These queries are version-agnostic (no jobname).

-- Which pg_cron version? (<1.4 = no named jobs)
SELECT extname, extversion FROM pg_extension WHERE extname = 'pg_cron';

-- All scheduled jobs — eyeball the `command` column for 'audit_log_prune'.
SELECT * FROM cron.job;

-- Recent run history (if any).
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- Likely outcomes:
--   • no job whose command mentions audit_log_prune → named cron.schedule()
--     never took (root cause). Don't bother re-scheduling pg_cron — we're
--     moving to an external scheduler (section 4).
--   • a job exists but cron.job_run_details has no/failed runs → pg_cron worker
--     not processing (Supabase support) or the command errored.


-- 2. HEALTH CHECK — and the timeouts are NOT bloat ---------------------------
-- Checked 2026-06-01: 5,023,940 live tuples, 306 dead (0.0%), autovacuum last
-- ran 05-27. The table is HEALTHY — autovacuum is keeping up. So there is
-- nothing to VACUUM and no autovacuum tuning needed. (Earlier "it's bloated"
-- guess was wrong.)
SELECT n_live_tup, n_dead_tup,
       round(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 1) AS dead_pct,
       last_vacuum, last_autovacuum
FROM pg_stat_user_tables
WHERE relname = 'content_audit_log';

-- Index check (2026-06-01): the table is FULLY INDEXED. Present:
--   • content_audit_log_pkey                    (id)
--   • idx_content_audit_log_changed_at          (changed_at DESC)            -- 20260517 DID land
--   • idx_content_audit_table_time              (table_name, changed_at DESC)
--   • idx_content_audit_pk                      (table_name, primary_key, changed_at DESC)
--   • idx_content_audit_log_course_audio_delete (changed_at DESC) WHERE course_audio/DELETE -- new
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'content_audit_log';
--
-- CONCLUSION: healthy + fully indexed. The timeouts seen during the 2026-06-01
-- investigation were transient (load), NOT bloat and NOT a missing index.
-- exact COUNT(*) on 5M rows always full-scans → slow, but that's inherent and
-- harmless. Nothing to fix here. The ONE real issue is section 3+4: the prune
-- is dead, so the table grows unbounded (5M and climbing).


-- 3. DECOMMISSION THE OLD DELETE-ONLY PRUNE ----------------------------------
-- The new model archives to S3 BEFORE deleting (tools/archive-audit-log.cjs,
-- driven by an external scheduler — pg_cron can't write to S3). The old
-- pg_cron job just DELETES, which would destroy history the archive job hasn't
-- copied yet. If section 1 showed a live prune job, turn it off so the two
-- don't race. Unschedule by id (works on every pg_cron version); get the id
-- from `SELECT * FROM cron.job` above:
--   SELECT cron.unschedule(<jobid>);
-- (If no audit_log_prune job exists, there's nothing to remove — skip this.)

-- Keep the audit_log_prune() function — archive-audit-log.cjs does its own
-- batched deletes, but the function is a handy manual escape hatch.


-- 4. ONGOING (outside the DB) ------------------------------------------------
-- Schedule nightly, e.g. Vercel cron / pm2 / system cron:
--   node tools/archive-audit-log.cjs --hot-days=14 --prune --execute
-- Backfill the existing >14d days once, then it's one small day per night.
-- Recover from cold storage with:
--   node scripts/fixes/recover-pod-audio-from-audit.cjs <course> --since=YYYY-MM-DD --archive
