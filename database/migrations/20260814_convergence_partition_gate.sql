-- ============================================================================
-- Convergence gate — the partition that must exist before any s3_key converges.
--
-- Tom's standing doctrine, 2026-08-14:
--
--   HUMAN DECISIONS OUTRANK CANON. A clip touched by human QA — a regeneration,
--   an explicit rejection or replacement, any human recording — IS the canon for
--   that line. Convergence PROMOTES such a clip into audio_clips. It never
--   converges over it. Divergence from canon is a signal to CLASSIFY, not
--   automatically an error to fix.
--
-- This file is the mechanical form of that ruling. A manual pause is not a gate:
-- the write path is mechanical, so the protection has to be too.
--
-- Read-only. It classifies; it converges nothing. No UPDATE of course_audio
-- appears anywhere in this file, deliberately.
--
--   BUCKET (a) a_human_corrected  -> PROMOTE to canon. Never converge.
--   BUCKET (b) b_stale_duplicate  -> safe to converge.
--   BUCKET (c) c_unknown          -> LEAVE ALONE. Count, report, do not guess.
--
-- Bucket (c) is the one that earns its keep. "No evidence of human touch" and
-- "proven machine artefact" are different claims and only the second licenses a
-- write. Anything whose bytes were demonstrably replaced by an actor the ledgers
-- cannot name lands here rather than being flattened on an assumption.
-- ============================================================================

\set ON_ERROR_STOP on
SET statement_timeout = 0;

-- ----------------------------------------------------------------------------
-- 1. Unattributed byte replacements.
--
-- content_audit_log records UPDATEs to course_audio, but its changed_by_role is
-- always 'postgres' — it can prove a replacement HAPPENED and never prove WHO.
-- That is precisely the shape of evidence that belongs in bucket (c).
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS _audit_s3_touch;
CREATE UNLOGGED TABLE _audit_s3_touch AS
SELECT DISTINCT (primary_key)::uuid AS audio_id
FROM content_audit_log
WHERE table_name = 'course_audio'
  AND change_type = 'UPDATE'
  AND old_row ? 's3_key';
CREATE UNIQUE INDEX _audit_s3_touch_pk ON _audit_s3_touch (audio_id);
ANALYZE _audit_s3_touch;

-- ----------------------------------------------------------------------------
-- 2. Classify every row whose serving bytes differ from its canonical clip.
--
-- Note which ledgers are NOT consulted, and why: audio_clip_flags and
-- audio_clip_signoffs are empty estate-wide — they are dead tables, and reading
-- them would manufacture false confidence that human decisions had been checked.
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS _divergence_partition;
CREATE UNLOGGED TABLE _divergence_partition AS
SELECT
  ca.id AS audio_id, ca.course_code, ca.role, ca.language, ca.origin,
  ca.s3_key AS serving_now, c.s3_key AS canon_s3_key, ca.clip_id,

  -- HUMAN signals: an explicit person-or-QA-campaign decision on THIS row.
  (ca.origin = 'human') AS sig_human_origin,
  EXISTS (SELECT 1 FROM recording_provenance rp WHERE rp.audio_uuid = ca.id::text) AS sig_provenance,
  EXISTS (SELECT 1 FROM audio_flags f WHERE f.audio_uuid = ca.id::text) AS sig_flagged,
  EXISTS (SELECT 1 FROM audio_repair_candidates r
           WHERE r.audio_id = ca.id AND r.decided_by IS NOT NULL AND r.decided_by <> '') AS sig_repair_decision,
  -- A revision whose source is NOT the bulk reuse pass: someone aimed at this row.
  EXISTS (SELECT 1 FROM course_audio_revisions v
           WHERE v.audio_id = ca.id AND v.source IS DISTINCT FROM 'reuse-first-rebuild') AS sig_revision_targeted,

  -- AMBIGUOUS signals: the bytes moved, but nothing names who moved them.
  EXISTS (SELECT 1 FROM course_audio_revisions v
           WHERE v.audio_id = ca.id AND v.source = 'reuse-first-rebuild') AS amb_bulk_reuse,
  EXISTS (SELECT 1 FROM _audit_s3_touch a WHERE a.audio_id = ca.id) AS amb_audited_update,

  NULL::text AS bucket
FROM course_audio ca
JOIN audio_clips c ON c.id = ca.clip_id
WHERE ca.s3_key <> c.s3_key;

CREATE INDEX _divergence_partition_id ON _divergence_partition (audio_id);
ANALYZE _divergence_partition;

UPDATE _divergence_partition SET bucket = CASE
  WHEN sig_human_origin OR sig_provenance OR sig_flagged
    OR sig_repair_decision OR sig_revision_targeted THEN 'a_human_corrected'
  WHEN amb_bulk_reuse OR amb_audited_update          THEN 'c_unknown'
  ELSE                                                    'b_stale_duplicate'
END;

CREATE INDEX _divergence_partition_bucket ON _divergence_partition (bucket);
ANALYZE _divergence_partition;

-- ----------------------------------------------------------------------------
-- 3. Report. This is the whole output — nothing is written to course_audio.
-- ----------------------------------------------------------------------------

\echo '=== partition ==='
SELECT bucket, count(*) FROM _divergence_partition GROUP BY 1 ORDER BY 1;

\echo '=== (a) which signal protects each row (a row may carry several) ==='
SELECT count(*) FILTER (WHERE sig_human_origin)      AS human_origin,
       count(*) FILTER (WHERE sig_provenance)        AS has_provenance,
       count(*) FILTER (WHERE sig_flagged)           AS flagged,
       count(*) FILTER (WHERE sig_repair_decision)   AS repair_decided,
       count(*) FILTER (WHERE sig_revision_targeted) AS targeted_revision
FROM _divergence_partition WHERE bucket = 'a_human_corrected';

\echo '=== (a) by course ==='
SELECT course_code, count(*) FROM _divergence_partition
WHERE bucket = 'a_human_corrected' GROUP BY 1 ORDER BY 2 DESC;

\echo '=== (c) why unknown ==='
SELECT count(*) FILTER (WHERE amb_bulk_reuse)      AS bulk_reuse,
       count(*) FILTER (WHERE amb_audited_update)  AS unattributed_s3_change
FROM _divergence_partition WHERE bucket = 'c_unknown';

-- ============================================================================
-- WHEN CONVERGENCE IS EVENTUALLY APPROVED, it operates on bucket (b) ONLY:
--
--   UPDATE course_audio ca SET s3_key = p.canon_s3_key, …
--   FROM _divergence_partition p
--   WHERE ca.id = p.audio_id AND p.bucket = 'b_stale_duplicate';
--
-- and bucket (a) is handled the OPPOSITE way — the row's own clip is promoted
-- into audio_clips as canonical, per Tom's doctrine. Bucket (c) is not touched
-- by either. That UPDATE is deliberately NOT in this file: this file is the gate,
-- not the pass, and the pass needs its own approval.
-- ============================================================================
