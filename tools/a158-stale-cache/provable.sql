set statement_timeout='600s';
CREATE TEMP TABLE swaps AS
WITH states AS (
  SELECT primary_key::uuid AS audio_id, changed_at,
         old_row->>'s3_key' AS s3_key,
         (old_row->>'audio_revision')::int AS rev,
         old_row->>'course_code' AS course_code
  FROM content_audit_log
  WHERE table_name='course_audio' AND change_type='UPDATE'
    AND changed_at >= '2026-08-05 21:37:09.427287+00'
  UNION ALL
  SELECT ca.id, 'infinity'::timestamptz, ca.s3_key, ca.audio_revision, ca.course_code
  FROM course_audio ca
),
paired AS (
  SELECT audio_id, changed_at, s3_key, rev, course_code,
         lead(s3_key) OVER w AS next_s3_key,
         lead(rev)    OVER w AS next_rev
  FROM states WINDOW w AS (PARTITION BY audio_id ORDER BY changed_at)
)
SELECT * FROM paired
WHERE next_s3_key IS NOT NULL AND s3_key IS NOT NULL
  AND s3_key <> next_s3_key                       -- bytes really moved
  AND regexp_replace(s3_key,'^.*/','') <> regexp_replace(next_s3_key,'^.*/','')  -- not a re-path
  AND rev IS NOT NULL AND next_rev IS NOT NULL
  AND rev = next_rev;                              -- and the address did NOT move
\echo '=== provable unversioned swaps, 2026-08-05 21:37Z -> now ==='
SELECT count(*) AS events, count(DISTINCT audio_id) AS clips FROM swaps;
\echo ''
\echo '=== still exposed? (a later revision bump would have cured it) ==='
CREATE TEMP TABLE exposed AS
SELECT s.audio_id, max(s.changed_at) AS last_unversioned_swap, ca.course_code,
       ca.audio_revision, ca.voice_id, ca.role, ca.language
FROM swaps s JOIN course_audio ca ON ca.id = s.audio_id
WHERE s.rev = ca.audio_revision          -- address never moved since the swap
GROUP BY 1,3,4,5,6,7;
SELECT (SELECT count(DISTINCT audio_id) FROM swaps) AS swapped_clips,
       (SELECT count(*) FROM exposed)                AS still_exposed,
       (SELECT count(DISTINCT audio_id) FROM swaps) - (SELECT count(*) FROM exposed) AS cured_or_gone;
\echo ''
\echo '=== by course ==='
SELECT course_code, count(*) AS clips,
       min(last_unversioned_swap)::date AS oldest,
       max(last_unversioned_swap)::date AS newest
FROM exposed GROUP BY 1 ORDER BY 2 DESC;
\echo ''
\echo '=== by age (older = more devices hold the stale bytes) ==='
SELECT (now()::date - last_unversioned_swap::date) AS days_ago, count(*) AS clips
FROM exposed GROUP BY 1 ORDER BY 1;
