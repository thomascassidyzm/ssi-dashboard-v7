-- Unversioned in-place s3_key swaps on course_audio.
-- Evidence: content_audit_log stores only old_row, so the "new" state of update N
-- is the old_row of update N+1, and for the final update it is the live row.
-- An unversioned swap = s3_key moved while audio_revision stood still.
WITH states AS (
  SELECT primary_key::uuid AS audio_id,
         changed_at,
         old_row->>'s3_key'                        AS s3_key,
         (old_row->>'audio_revision')::int         AS rev,
         old_row->>'course_code'                   AS course_code
  FROM content_audit_log
  WHERE table_name = 'course_audio' AND change_type = 'UPDATE'
  UNION ALL
  SELECT ca.id, 'infinity'::timestamptz, ca.s3_key, ca.audio_revision, ca.course_code
  FROM course_audio ca
),
paired AS (
  SELECT audio_id, changed_at, s3_key, rev, course_code,
         lead(s3_key)     OVER w AS next_s3_key,
         lead(rev)        OVER w AS next_rev
  FROM states
  WINDOW w AS (PARTITION BY audio_id ORDER BY changed_at)
)
SELECT * FROM paired
WHERE next_s3_key IS NOT NULL
  AND s3_key IS DISTINCT FROM next_s3_key
  AND rev IS NOT DISTINCT FROM next_rev;
