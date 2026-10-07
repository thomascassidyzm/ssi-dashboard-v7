-- Job #22 (copy of #997's backup, South sandbox): before the HC block of cym_sv2_for_eng gets its LEGOs through the
-- course builder's v2 decompose route, back up everything that route can touch in the sandbox,
-- and record the fingerprint of everything it must NOT touch (live cym_n/cym_s, the North sandbox, master
-- canonical_seeds, every other course) so the after-check can prove nothing moved.
--   backup_cym_sv2_seeds_22b / _legos_22b / _phrases_22b : the sandbox exactly as it stood.
--   backup_cym_sv2_fp_22b                                : others_fingerprint() + live Welsh sums.
-- Undo of the build: weave-cym-sv2-hc-legos-undo.sql. Run once; refuses if the backup exists.
\set ON_ERROR_STOP on
BEGIN ISOLATION LEVEL REPEATABLE READ;
SET LOCAL statement_timeout = '20min';
DO $$ BEGIN
  IF to_regclass('backup_cym_sv2_legos_22b') IS NOT NULL THEN RAISE EXCEPTION 'backup already taken'; END IF;
  IF EXISTS (SELECT 1 FROM course_legos WHERE course_code='cym_sv2_for_eng' AND seed_number >= 1000) THEN
    RAISE EXCEPTION 'LEGOs already exist on block seeds; backup would not be the pre-build state'; END IF;
END $$;
\ir weave-fingerprint-fn-sv2.sql
CREATE TABLE backup_cym_sv2_seeds_22b   AS SELECT * FROM course_seeds WHERE course_code='cym_sv2_for_eng';
CREATE TABLE backup_cym_sv2_legos_22b   AS SELECT * FROM course_legos WHERE course_code='cym_sv2_for_eng';
CREATE TABLE backup_cym_sv2_phrases_22b AS SELECT * FROM course_practice_phrases WHERE course_code='cym_sv2_for_eng';
CREATE TABLE backup_cym_sv2_fp_22b AS
  SELECT * FROM pg_temp.others_fingerprint()
  UNION ALL SELECT 'live '||c||' '||t, n, h FROM (
    SELECT c, 'seeds' t, count(*) n, md5(string_agg(md5(x::text), '' ORDER BY x.id)) h FROM (VALUES ('cym_n_for_eng'),('cym_s_for_eng')) v(c) JOIN course_seeds x ON x.course_code=v.c GROUP BY c
    UNION ALL SELECT c, 'legos', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM (VALUES ('cym_n_for_eng'),('cym_s_for_eng')) v(c) JOIN course_legos x ON x.course_code=v.c GROUP BY c
    UNION ALL SELECT c, 'phrases', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM (VALUES ('cym_n_for_eng'),('cym_s_for_eng')) v(c) JOIN course_practice_phrases x ON x.course_code=v.c GROUP BY c
  ) s;
REVOKE ALL ON backup_cym_sv2_seeds_22b, backup_cym_sv2_legos_22b, backup_cym_sv2_phrases_22b, backup_cym_sv2_fp_22b FROM anon, authenticated;
SELECT 'seeds' k, count(*) FROM backup_cym_sv2_seeds_22b UNION ALL SELECT 'legos', count(*) FROM backup_cym_sv2_legos_22b
UNION ALL SELECT 'phrases', count(*) FROM backup_cym_sv2_phrases_22b;
SELECT * FROM backup_cym_sv2_fp_22b ORDER BY t;
COMMIT;
