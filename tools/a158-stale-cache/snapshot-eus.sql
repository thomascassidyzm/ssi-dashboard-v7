set statement_timeout='900s';
\set boundary '''2026-08-05 21:37:09.427287+00'''
CREATE TEMP TABLE post AS
WITH s AS (
  SELECT primary_key::uuid AS audio_id, changed_at, old_row->>'s3_key' AS k, (old_row->>'audio_revision')::int AS rev
  FROM content_audit_log WHERE table_name='course_audio' AND change_type='UPDATE' AND changed_at >= :boundary
  UNION ALL SELECT ca.id,'infinity'::timestamptz,ca.s3_key,ca.audio_revision FROM course_audio ca
), p AS (SELECT audio_id,changed_at,k,rev,lead(k) OVER w AS nk,lead(rev) OVER w AS nr FROM s WINDOW w AS (PARTITION BY audio_id ORDER BY changed_at))
SELECT audio_id, max(changed_at) AS last_swap, max(rev) AS rev FROM p
WHERE nk IS NOT NULL AND k IS NOT NULL AND k<>nk AND regexp_replace(k,'^.*/','')<>regexp_replace(nk,'^.*/','')
  AND rev IS NOT NULL AND nr IS NOT NULL AND rev=nr AND changed_at<>'infinity' GROUP BY 1;
CREATE TEMP TABLE pre AS
WITH s AS (
  SELECT primary_key::uuid AS audio_id, changed_at, old_row->>'s3_key' AS k
  FROM content_audit_log WHERE table_name='course_audio' AND change_type='UPDATE' AND changed_at < :boundary
  UNION ALL SELECT ca.id,'infinity'::timestamptz,ca.s3_key FROM course_audio ca
), p AS (SELECT audio_id,changed_at,k,lead(k) OVER w AS nk FROM s WINDOW w AS (PARTITION BY audio_id ORDER BY changed_at))
SELECT audio_id, max(changed_at) AS last_swap FROM p
WHERE nk IS NOT NULL AND k IS NOT NULL AND k<>nk AND regexp_replace(k,'^.*/','')<>regexp_replace(nk,'^.*/','')
  AND changed_at<>'infinity' GROUP BY 1;
\copy (SELECT ca.id, ca.s3_key, ca.audio_revision, x.window, x.last_swap FROM (SELECT audio_id,last_swap,rev,'post' AS window FROM post UNION ALL SELECT audio_id,last_swap,1,'pre' FROM pre) x JOIN course_audio ca ON ca.id=x.audio_id WHERE ca.audio_revision=x.rev AND ca.course_code='eus_for_eng' ORDER BY 1) TO '/tmp/a158-wt/scripts/a158/eus-snapshot.csv' CSV HEADER
