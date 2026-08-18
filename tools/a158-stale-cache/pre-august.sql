set statement_timeout='900s';
-- Before 2026-08-05 21:37Z the audio_revision column did not exist, so EVERY
-- in-place s3_key change was unversioned by construction. buildAudioRef() emits
-- a bare uuid at revision<=1, so introducing the column at 1 moved no ref and
-- cured nothing. A clip is cured only if it later reached revision >= 2.
CREATE TEMP TABLE pre AS
WITH states AS (
  SELECT primary_key::uuid AS audio_id, changed_at, old_row->>'s3_key' AS s3_key
  FROM content_audit_log
  WHERE table_name='course_audio' AND change_type='UPDATE'
    AND changed_at < '2026-08-05 21:37:09.427287+00'
  UNION ALL
  SELECT ca.id, 'infinity'::timestamptz, ca.s3_key FROM course_audio ca
),
paired AS (
  SELECT audio_id, changed_at, s3_key, lead(s3_key) OVER w AS next_s3_key
  FROM states WINDOW w AS (PARTITION BY audio_id ORDER BY changed_at)
)
SELECT audio_id, max(changed_at) FILTER (WHERE changed_at <> 'infinity') AS last_swap
FROM paired
WHERE next_s3_key IS NOT NULL AND s3_key IS NOT NULL AND s3_key <> next_s3_key
  AND regexp_replace(s3_key,'^.*/','') <> regexp_replace(next_s3_key,'^.*/','')
  AND changed_at <> 'infinity'
GROUP BY 1;
\echo '=== pre-2026-08-05 in-place swaps (audit floor 2026-07-03) ==='
SELECT count(*) AS clips_swapped FROM pre;
\echo '=== of those, still exposed (current revision still 1) ==='
CREATE TEMP TABLE pre_exposed AS
SELECT p.audio_id, p.last_swap, ca.course_code
FROM pre p JOIN course_audio ca ON ca.id=p.audio_id
WHERE ca.audio_revision = 1;
SELECT count(*) FROM pre_exposed;
\echo '=== top courses ==='
SELECT course_code, count(*) AS clips, min(last_swap)::date AS oldest, max(last_swap)::date AS newest
FROM pre_exposed GROUP BY 1 ORDER BY 2 DESC LIMIT 15;
