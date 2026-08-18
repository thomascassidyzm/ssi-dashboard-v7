-- A-158: course-scoped snapshot of clips whose ADDRESS never moved after their
-- bytes did. Generalises snapshot-eus.sql; identical logic, but the audit-log
-- scan is restricted up front to the clips that actually belong to the course.
--
-- That restriction is not an approximation: exposure is only ever asserted of a
-- LIVE course_audio row (the final join), so audit rows for clips outside the
-- course can never contribute a row to the output.
--
-- Usage: sed "s#:'out'#'/path/snap.csv'#" snapshot.sql | psql -v course=zho_for_eng -f -
--   (\copy is a client meta-command and does NOT interpolate psql variables, so
--    the destination is substituted shell-side; run-course.sh does this for you.)
-- Re-run after a bump with the same args to reconcile: it must return 0 rows.
set statement_timeout='1800s';
\set boundary '''2026-08-05 21:37:09.427287+00'''

CREATE TEMP TABLE mine AS
SELECT id, s3_key, audio_revision FROM course_audio WHERE course_code = :'course';
CREATE INDEX ON mine (id);
ANALYZE mine;

-- Provable window: the audit snapshot carries audio_revision, so "the revision
-- stood still while s3_key moved" is directly observable.
CREATE TEMP TABLE post AS
WITH s AS (
  SELECT cal.primary_key::uuid AS audio_id, cal.changed_at,
         cal.old_row->>'s3_key' AS k, (cal.old_row->>'audio_revision')::int AS rev
  FROM content_audit_log cal
  JOIN mine m ON m.id = cal.primary_key::uuid
  WHERE cal.table_name='course_audio' AND cal.change_type='UPDATE'
    AND cal.changed_at >= :boundary
  UNION ALL
  SELECT m.id, 'infinity'::timestamptz, m.s3_key, m.audio_revision FROM mine m
), p AS (
  SELECT audio_id, changed_at, k, rev,
         lead(k)   OVER w AS nk,
         lead(rev) OVER w AS nr
  FROM s WINDOW w AS (PARTITION BY audio_id ORDER BY changed_at)
)
SELECT audio_id, max(changed_at) AS last_swap, max(rev) AS rev
FROM p
WHERE nk IS NOT NULL AND k IS NOT NULL AND k <> nk
  AND regexp_replace(k,'^.*/','') <> regexp_replace(nk,'^.*/','')
  AND rev IS NOT NULL AND nr IS NOT NULL AND rev = nr AND changed_at <> 'infinity'
GROUP BY 1;

-- Pre-column window: audio_revision did not exist, so every in-place swap was
-- unversioned by construction. NULL-vs-NULL is never compared here — that was
-- the error that inflated the first estate count 100x.
CREATE TEMP TABLE pre AS
WITH s AS (
  SELECT cal.primary_key::uuid AS audio_id, cal.changed_at, cal.old_row->>'s3_key' AS k
  FROM content_audit_log cal
  JOIN mine m ON m.id = cal.primary_key::uuid
  WHERE cal.table_name='course_audio' AND cal.change_type='UPDATE'
    AND cal.changed_at < :boundary
  UNION ALL
  SELECT m.id, 'infinity'::timestamptz, m.s3_key FROM mine m
), p AS (
  SELECT audio_id, changed_at, k, lead(k) OVER w AS nk
  FROM s WINDOW w AS (PARTITION BY audio_id ORDER BY changed_at)
)
SELECT audio_id, max(changed_at) AS last_swap
FROM p
WHERE nk IS NOT NULL AND k IS NOT NULL AND k <> nk
  AND regexp_replace(k,'^.*/','') <> regexp_replace(nk,'^.*/','')
  AND changed_at <> 'infinity'
GROUP BY 1;

-- Exposed = the live row still sits at the revision it held at its last
-- unversioned swap, i.e. the learner's address never moved.
CREATE TEMP TABLE exposed AS
SELECT ca.id, ca.s3_key, ca.audio_revision, x.swap_window, x.last_swap
FROM (
  SELECT audio_id, last_swap, rev, 'post' AS swap_window FROM post
  UNION ALL SELECT audio_id, last_swap, 1, 'pre' FROM pre
) x
JOIN course_audio ca ON ca.id = x.audio_id
WHERE ca.audio_revision = x.rev AND ca.course_code = :'course';

\echo '=== exposed, by window ==='
SELECT swap_window, count(*), min(last_swap)::date AS oldest, max(last_swap)::date AS newest
FROM exposed GROUP BY 1 ORDER BY 1;
\echo '=== total ==='
SELECT count(*) AS exposed_clips FROM exposed;

\copy (SELECT id, s3_key, audio_revision, swap_window, last_swap FROM exposed ORDER BY 1) TO :'out' CSV HEADER
