-- Job #429 (Aran 2026-10-08 11:59Z): LEGOs with the same Welsh (identical, or a soft-mutated form) as one
-- taught earlier in the running order count as ALREADY TAUGHT, even when the English label differs.
-- Applied to the 10 "same Welsh, different English" cases #57 listed and left alone
-- (https://watson-1.tail4968cb.ts.net/d/6bc4ef4d): North 6, South 4. The 4 South rows are the ONE South
-- write Aran allowed. Same shape as #57 (weave-cym-reteach-mark.sql): only is_new and last_edit_event_id
-- change; no text, no audio, no phrases. The rule itself is now in v2 finalize (welsh-mutation.cjs isSameWelsh).
-- Dry run unless invoked with  -v finish=COMMIT . Undo: weave-cym-samewelsh-mark-undo.sql.
\set ON_ERROR_STOP on
\if :{?finish}
\else
  \set finish ROLLBACK
\endif
BEGIN ISOLATION LEVEL REPEATABLE READ;
SET LOCAL statement_timeout = '20min';
-- Everything the pass must NOT change: all courses except the two sandboxes, master canonical_seeds,
-- every canonical list. (Live cym_n / cym_s are inside "all courses except the two sandboxes".)
CREATE FUNCTION pg_temp.others_fp() RETURNS TABLE(t text, n bigint, h text) LANGUAGE sql AS $$
  SELECT 'courses', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.course_code)) FROM courses x WHERE x.course_code NOT IN ('cym_nv2_for_eng','cym_sv2_for_eng')
  UNION ALL SELECT 'course_seeds', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_seeds x WHERE x.course_code NOT IN ('cym_nv2_for_eng','cym_sv2_for_eng')
  UNION ALL SELECT 'course_legos', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_legos x WHERE x.course_code NOT IN ('cym_nv2_for_eng','cym_sv2_for_eng')
  UNION ALL SELECT 'course_practice_phrases', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_practice_phrases x WHERE x.course_code NOT IN ('cym_nv2_for_eng','cym_sv2_for_eng')
  UNION ALL SELECT 'lego_introductions', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM lego_introductions x WHERE x.course_code NOT IN ('cym_nv2_for_eng','cym_sv2_for_eng')
  UNION ALL SELECT 'course_round_index', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.course_code, x.round_index)) FROM course_round_index x WHERE x.course_code NOT IN ('cym_nv2_for_eng','cym_sv2_for_eng')
  UNION ALL SELECT 'canonical_seeds (master)', count(*), md5(string_agg(md5(x::text), '' ORDER BY x::text)) FROM canonical_seeds x
  UNION ALL SELECT 'canonical_list_seeds', count(*), md5(string_agg(md5(x::text), '' ORDER BY x::text)) FROM canonical_list_seeds x
  UNION ALL SELECT 'canonical_list_assignments', count(*), md5(string_agg(md5(x::text), '' ORDER BY x::text)) FROM canonical_list_assignments x
$$;
CREATE TEMP TABLE rt_pre AS SELECT * FROM pg_temp.others_fp();

CREATE TEMP TABLE flip (course_code text, seed_number int, lego_index int, target_text text, taught_by text,
                        PRIMARY KEY (course_code, seed_number, lego_index));
INSERT INTO flip VALUES
  ('cym_nv2_for_eng', 166, 1, 'i’r cyngor', 'same Welsh as "for the council" @1198L2'),
  ('cym_nv2_for_eng', 169, 1, 'treulio mwy o amser', 'same Welsh as "to spend more time" @1209L2'),
  ('cym_nv2_for_eng', 187, 1, 'bydden ni’n licio', 'same Welsh as "we would like" @1411L1'),
  ('cym_nv2_for_eng', 209, 2, 'codi', 'same Welsh as "to raise" @1437L2'),
  ('cym_nv2_for_eng', 212, 1, 'mynd allan', 'same Welsh as "to go out" @1349L1'),
  ('cym_nv2_for_eng', 278, 1, 'dw i ddim yn bwriadu', 'same Welsh as "I’m not planning" @1496L1'),
  ('cym_sv2_for_eng', 176, 1, 'cwrdd fel grŵp', 'same Welsh as "meeting as a group" @1209L3'),
  ('cym_sv2_for_eng', 187, 1, 'be’ oedd yn mynd', 'same Welsh as "what was going" @1201L3'),
  ('cym_sv2_for_eng', 191, 2, 'bo’ nhw’n moyn', 'same Welsh as "that they want" @1200L2'),
  ('cym_sv2_for_eng', 218, 2, 'codi', 'same Welsh as "to raise" @1437L2');

DO $$ BEGIN
  IF to_regclass('backup_cym_samewelsh_isnew_429') IS NOT NULL THEN RAISE EXCEPTION 'already applied (backup_cym_samewelsh_isnew_429 exists)'; END IF;
  IF (SELECT count(*) FROM flip WHERE course_code='cym_nv2_for_eng') <> 6
     OR (SELECT count(*) FROM flip WHERE course_code='cym_sv2_for_eng') <> 4 THEN RAISE EXCEPTION 'unexpected row counts'; END IF;
  IF (SELECT count(*) FROM flip f JOIN course_legos l ON l.course_code=f.course_code
        AND l.seed_number=f.seed_number AND l.lego_index=f.lego_index AND l.target_text=f.target_text AND l.is_new) <> (SELECT count(*) FROM flip) THEN
    RAISE EXCEPTION 'a listed LEGO is missing, has other text, or is already not new'; END IF;
END $$;

CREATE TABLE backup_cym_samewelsh_isnew_429 AS
  SELECT l.id, l.course_code, l.seed_number, l.lego_index, l.is_new, l.last_edit_event_id
  FROM course_legos l JOIN flip f USING (course_code, seed_number, lego_index);
REVOKE ALL ON backup_cym_samewelsh_isnew_429 FROM anon, authenticated;

CREATE TEMP TABLE ev (course_code text PRIMARY KEY, id uuid);
WITH e AS (
  INSERT INTO content_edit_events (course_code, surface, operation, actor_kind, actor_id, actor_label, actor_verified, actor_role, scope, detail)
  SELECT c.course_code, 'sql:job-429 weave-cym-samewelsh-mark', 'weave-samewelsh-mark', 'agent', 'claude-job-429-samewelsh-mark',
         'agent (claude-job-429-samewelsh-mark)', false, 'creator',
         jsonb_build_object('lego_keys', (SELECT jsonb_agg(seed_number||':'||lego_index ORDER BY seed_number, lego_index) FROM flip f WHERE f.course_code=c.course_code)),
         jsonb_build_object(
           'ruling', 'Aran 2026-10-08 11:59Z: LEGOs with the same Welsh (identical, or a soft-mutated form) as one taught earlier in the running order count as ALREADY TAUGHT, even when the English label differs. Applied to the 10 cases of https://watson-1.tail4968cb.ts.net/d/6bc4ef4d; flipping the 4 South LEGOs is the one South write allowed. Rule now enforced by v2 finalize (welsh-mutation.cjs isSameWelsh).',
           'backup', 'backup_cym_samewelsh_isnew_429',
           'count', (SELECT count(*) FROM flip f WHERE f.course_code=c.course_code),
           'rows', (SELECT jsonb_agg(jsonb_build_object('seed', seed_number, 'idx', lego_index, 'target', target_text, 'taught_by', taught_by) ORDER BY seed_number, lego_index) FROM flip f WHERE f.course_code=c.course_code))
  FROM (VALUES ('cym_nv2_for_eng'),('cym_sv2_for_eng')) c(course_code)
  RETURNING course_code, id)
INSERT INTO ev SELECT course_code, id FROM e;

UPDATE course_legos l SET is_new = false, last_edit_event_id = ev.id
FROM flip f JOIN ev USING (course_code)
WHERE l.course_code=f.course_code AND l.seed_number=f.seed_number AND l.lego_index=f.lego_index;

CREATE TEMP TABLE rt_post AS SELECT * FROM pg_temp.others_fp();
DO $$ BEGIN
  IF EXISTS (SELECT * FROM rt_pre EXCEPT SELECT * FROM rt_post) OR EXISTS (SELECT * FROM rt_post EXCEPT SELECT * FROM rt_pre) THEN
    RAISE EXCEPTION 'CHECK FAILED: something outside the two sandboxes changed'; END IF;
  IF (SELECT count(*) FROM course_legos l JOIN flip f USING (course_code, seed_number, lego_index) WHERE NOT l.is_new) <> (SELECT count(*) FROM flip) THEN
    RAISE EXCEPTION 'CHECK FAILED: not all flipped'; END IF;
  IF (SELECT count(*) FROM course_legos l JOIN ev USING (course_code) WHERE l.last_edit_event_id = ev.id) <> 10 THEN
    RAISE EXCEPTION 'CHECK FAILED: a row outside the list was stamped'; END IF;
  RAISE NOTICE 'ALL CHECKS PASSED';
END $$;
SELECT course_code, count(*) legos, count(DISTINCT seed_number) seeds FROM flip GROUP BY 1 ORDER BY 1;
SELECT course_code, count(*) FILTER (WHERE is_new) new_legos_after FROM course_legos WHERE course_code IN ('cym_nv2_for_eng','cym_sv2_for_eng') GROUP BY 1 ORDER BY 1;
SELECT 'finishing with' k, :'finish' v;
:finish;
SELECT :'finish' = 'COMMIT' AS do_refresh \gset
\if :do_refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index;
\endif
