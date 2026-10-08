-- UNDO for job #429 (Aran 2026-10-08): the Hadau Creiddiol practice phrases written into the North
-- sandbox cym_nv2_for_eng by tools/course-optimization/weave-cym-nv2-hc-phrases.cjs.
--
-- Before #429 the sandbox had NO phrase rows on block seeds (seed_number >= 1000): its 4,997
-- phrases were the copy of live North on old seeds (backup_cym_nv2_phrases_429), and the 1,534
-- block LEGOs (826 new) had none (backup_cym_nv2_hc_legos_429). Undo returns exactly that state.
--
-- WHY THE LEGOs GO OUT AND BACK. The constraint trigger debut_keeps_practice refuses, at commit,
-- any delete that leaves an is_new LEGO with no practice phrase — and an empty debut is exactly
-- the pre-#429 state. The guard lets a phrase go when its LEGO no longer exists, so: delete the
-- block phrases AND LEGOs, fire the deferred guard NOW (it finds no LEGO and passes), then put
-- the LEGOs back byte-for-byte from the backup (an INSERT is not something the guard watches).
-- One transaction: either all of it lands or none of it does.
--
-- Touches cym_nv2_for_eng ONLY. If part 2 was applied, run weave-cym-nv2-hc-recording-undo.sql FIRST.
BEGIN;

DELETE FROM course_practice_phrases WHERE course_code = 'cym_nv2_for_eng' AND seed_number >= 1000;
DELETE FROM course_legos            WHERE course_code = 'cym_nv2_for_eng' AND seed_number >= 1000;
SET CONSTRAINTS debut_keeps_practice IMMEDIATE;   -- the queued guard checks run here: no LEGO -> pass
SET CONSTRAINTS debut_keeps_practice DEFERRED;
INSERT INTO course_legos SELECT * FROM backup_cym_nv2_hc_legos_429;

DO $$
DECLARE dp int; dl int;
BEGIN
  SELECT count(*) INTO dp FROM (
    (SELECT * FROM course_practice_phrases WHERE course_code = 'cym_nv2_for_eng' EXCEPT SELECT * FROM backup_cym_nv2_phrases_429)
    UNION ALL
    (SELECT * FROM backup_cym_nv2_phrases_429 EXCEPT SELECT * FROM course_practice_phrases WHERE course_code = 'cym_nv2_for_eng')) d;
  SELECT count(*) INTO dl FROM (
    (SELECT * FROM course_legos WHERE course_code = 'cym_nv2_for_eng' AND seed_number >= 1000 EXCEPT SELECT * FROM backup_cym_nv2_hc_legos_429)
    UNION ALL
    (SELECT * FROM backup_cym_nv2_hc_legos_429 EXCEPT SELECT * FROM course_legos WHERE course_code = 'cym_nv2_for_eng' AND seed_number >= 1000)) d;
  IF dp <> 0 OR dl <> 0 THEN
    RAISE EXCEPTION 'undo check failed: phrases differ from backup by %, block LEGOs by % — rolled back', dp, dl;
  END IF;
  RAISE NOTICE 'undo ok: cym_nv2_for_eng phrases and block LEGOs equal their pre-#429 backups';
END $$;

COMMIT;
