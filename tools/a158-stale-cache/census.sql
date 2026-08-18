-- A-158 estate census: every course with detector residue, ordered by activity.
-- Same detector as snapshot.sql, run once estate-wide to produce the worklist.
-- Activity is used ONLY for ORDERING now, never to exclude a course: absence
-- from player_events does not prove a course is unused (the telemetry window is
-- small), and a metadata bump costs a device nothing for clips it does not hold.
set statement_timeout='3600s';
\set boundary '''2026-08-05 21:37:09.427287+00'''

CREATE TEMP TABLE post AS
WITH s AS (
  SELECT primary_key::uuid AS audio_id, changed_at, old_row->>'s3_key' AS k,
         (old_row->>'audio_revision')::int AS rev
  FROM content_audit_log
  WHERE table_name='course_audio' AND change_type='UPDATE' AND changed_at >= :boundary
  UNION ALL SELECT ca.id,'infinity'::timestamptz,ca.s3_key,ca.audio_revision FROM course_audio ca
), p AS (
  SELECT audio_id, changed_at, k, rev, lead(k) OVER w AS nk, lead(rev) OVER w AS nr
  FROM s WINDOW w AS (PARTITION BY audio_id ORDER BY changed_at)
)
SELECT audio_id, max(changed_at) AS last_swap, max(rev) AS rev FROM p
WHERE nk IS NOT NULL AND k IS NOT NULL AND k <> nk
  AND regexp_replace(k,'^.*/','') <> regexp_replace(nk,'^.*/','')
  AND rev IS NOT NULL AND nr IS NOT NULL AND rev = nr AND changed_at <> 'infinity'
GROUP BY 1;

CREATE TEMP TABLE pre AS
WITH s AS (
  SELECT primary_key::uuid AS audio_id, changed_at, old_row->>'s3_key' AS k
  FROM content_audit_log
  WHERE table_name='course_audio' AND change_type='UPDATE' AND changed_at < :boundary
  UNION ALL SELECT ca.id,'infinity'::timestamptz,ca.s3_key FROM course_audio ca
), p AS (
  SELECT audio_id, changed_at, k, lead(k) OVER w AS nk
  FROM s WINDOW w AS (PARTITION BY audio_id ORDER BY changed_at)
)
SELECT audio_id, max(changed_at) AS last_swap FROM p
WHERE nk IS NOT NULL AND k IS NOT NULL AND k <> nk
  AND regexp_replace(k,'^.*/','') <> regexp_replace(nk,'^.*/','')
  AND changed_at <> 'infinity'
GROUP BY 1;

CREATE TEMP TABLE exposed AS
SELECT ca.course_code, ca.id, x.last_swap
FROM (
  SELECT audio_id, last_swap, rev FROM post
  UNION ALL SELECT audio_id, last_swap, 1 FROM pre
) x JOIN course_audio ca ON ca.id = x.audio_id
WHERE ca.audio_revision = x.rev;

CREATE TEMP TABLE activity AS
SELECT course_code, count(DISTINCT coalesce(learner_id::text,user_id::text,session_id::text)) AS actors
FROM player_events WHERE occurred_at > '2026-06-01' GROUP BY 1;

\echo '=== worklist: every course with residue, activity-ordered ==='
SELECT e.course_code, coalesce(a.actors,0) AS actors, count(*) AS exposed,
       min(e.last_swap)::date AS oldest_swap
FROM exposed e LEFT JOIN activity a USING (course_code)
GROUP BY 1,2 ORDER BY 2 DESC, 3 DESC;

\echo '=== totals ==='
SELECT count(*) AS exposed_clips, count(DISTINCT course_code) AS courses FROM exposed;

\copy (SELECT e.course_code, coalesce(a.actors,0) AS actors, count(*) AS exposed FROM exposed e LEFT JOIN activity a USING (course_code) GROUP BY 1,2 ORDER BY 2 DESC, 3 DESC) TO :'out' CSV HEADER
