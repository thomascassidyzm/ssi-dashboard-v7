-- Job #949: THE switch. Where cym_nv2_for_eng's Hadau Creiddiol block plays:
--   psql "$DATABASE_URL" -v after=257 -f tools/course-optimization/weave-set-insert-after.sql   (panic switch)
--   psql "$DATABASE_URL" -v after=137 -f tools/course-optimization/weave-set-insert-after.sql   (default)
-- One UPDATE of one row; no seed, LEGO or phrase is written. Prints the order around the block
-- and fingerprints of everything else before and after, then refreshes course_round_index
-- (outside the transaction, because REFRESH ... CONCURRENTLY cannot run inside one).
\set ON_ERROR_STOP on
\if :{?after}
\else
  \echo 'usage: -v after=137|257'
  \quit
\endif
BEGIN;
\ir weave-fingerprint-fn.sql
CREATE TEMP TABLE sw_pre AS SELECT * FROM pg_temp.others_fingerprint();
CREATE TEMP TABLE sw_seeds_pre AS SELECT md5(string_agg(md5(x::text), '' ORDER BY x.id)) h FROM course_seeds x WHERE x.course_code = 'cym_nv2_for_eng';
SELECT 'before' k, insert_after FROM course_seed_weave WHERE course_code = 'cym_nv2_for_eng';
UPDATE course_seed_weave SET insert_after = :after, set_by = 'weave-set-insert-after.sql', set_at = now()
WHERE course_code = 'cym_nv2_for_eng';
DO $$ BEGIN
  IF EXISTS (SELECT * FROM sw_pre EXCEPT SELECT * FROM pg_temp.others_fingerprint())
     OR (SELECT h FROM sw_seeds_pre) IS DISTINCT FROM (SELECT md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_seeds x WHERE x.course_code = 'cym_nv2_for_eng') THEN
    RAISE EXCEPTION 'CHECK FAILED: the switch changed something besides the setting';
  END IF;
  RAISE NOTICE 'switch checks passed: no other course, no seed row changed';
END $$;
SELECT 'after' k, insert_after FROM course_seed_weave WHERE course_code = 'cym_nv2_for_eng';
SELECT o.position, o.seed_number, o.in_block, left(s.known_text, 50) known
FROM course_running_order o JOIN course_seeds s USING (course_code, seed_number)
WHERE o.course_code = 'cym_nv2_for_eng'
  AND o.position BETWEEN (SELECT min(position) FROM course_running_order WHERE course_code = 'cym_nv2_for_eng' AND in_block) - 2
                     AND (SELECT min(position) FROM course_running_order WHERE course_code = 'cym_nv2_for_eng' AND in_block) + 1
ORDER BY 1;
COMMIT;
REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index;
