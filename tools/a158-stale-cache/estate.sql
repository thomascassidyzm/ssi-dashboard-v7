set statement_timeout='900s';
\set boundary '''2026-08-05 21:37:09.427287+00'''

-- Provable window: audit snapshot carries audio_revision, so "revision stood
-- still while s3_key moved" is directly observable.
CREATE TEMP TABLE post AS
WITH states AS (
  SELECT primary_key::uuid AS audio_id, changed_at, old_row->>'s3_key' AS s3_key,
         (old_row->>'audio_revision')::int AS rev
  FROM content_audit_log
  WHERE table_name='course_audio' AND change_type='UPDATE' AND changed_at >= :boundary
  UNION ALL SELECT ca.id,'infinity'::timestamptz,ca.s3_key,ca.audio_revision FROM course_audio ca
), paired AS (
  SELECT audio_id, changed_at, s3_key, rev,
         lead(s3_key) OVER w AS nk, lead(rev) OVER w AS nr
  FROM states WINDOW w AS (PARTITION BY audio_id ORDER BY changed_at)
)
SELECT audio_id, max(changed_at) AS last_swap, max(rev) AS rev
FROM paired
WHERE nk IS NOT NULL AND s3_key IS NOT NULL AND s3_key <> nk
  AND regexp_replace(s3_key,'^.*/','') <> regexp_replace(nk,'^.*/','')
  AND rev IS NOT NULL AND nr IS NOT NULL AND rev = nr AND changed_at <> 'infinity'
GROUP BY 1;

-- Pre-column window: every in-place swap was unversioned by construction.
CREATE TEMP TABLE pre AS
WITH states AS (
  SELECT primary_key::uuid AS audio_id, changed_at, old_row->>'s3_key' AS s3_key
  FROM content_audit_log
  WHERE table_name='course_audio' AND change_type='UPDATE' AND changed_at < :boundary
  UNION ALL SELECT ca.id,'infinity'::timestamptz,ca.s3_key FROM course_audio ca
), paired AS (
  SELECT audio_id, changed_at, s3_key, lead(s3_key) OVER w AS nk
  FROM states WINDOW w AS (PARTITION BY audio_id ORDER BY changed_at)
)
SELECT audio_id, max(changed_at) AS last_swap
FROM paired
WHERE nk IS NOT NULL AND s3_key IS NOT NULL AND s3_key <> nk
  AND regexp_replace(s3_key,'^.*/','') <> regexp_replace(nk,'^.*/','')
  AND changed_at <> 'infinity'
GROUP BY 1;

-- Exposure = the clip's address never moved since its last unversioned swap.
CREATE TEMP TABLE exposed AS
SELECT ca.course_code, ca.id AS audio_id, x.last_swap, x.window
FROM (
  SELECT audio_id, last_swap, 'post' AS window, rev FROM post
  UNION ALL SELECT audio_id, last_swap, 'pre', 1 FROM pre
) x JOIN course_audio ca ON ca.id = x.audio_id
WHERE ca.audio_revision = x.rev;

CREATE TEMP TABLE activity AS
SELECT course_code, count(*) AS events,
       count(DISTINCT coalesce(learner_id::text,user_id::text,session_id::text)) AS actors
FROM player_events WHERE occurred_at > '2026-06-01' GROUP BY 1;

\echo '=== ESTATE: exposed clips, courses WITH real play activity ==='
SELECT e.course_code, a.actors,
       count(*) FILTER (WHERE e.window='pre')  AS pre_aug,
       count(*) FILTER (WHERE e.window='post') AS post_aug,
       count(*) AS total_exposed,
       min(e.last_swap)::date AS oldest_swap
FROM exposed e JOIN activity a USING (course_code)
GROUP BY 1,2 ORDER BY 5 DESC LIMIT 30;

\echo ''
\echo '=== totals ==='
SELECT
  (SELECT count(*) FROM exposed) AS all_exposed_clips,
  (SELECT count(*) FROM exposed e JOIN activity a USING (course_code)) AS in_active_courses,
  (SELECT count(*) FROM exposed e LEFT JOIN activity a USING (course_code) WHERE a.course_code IS NULL) AS in_dormant_courses;
