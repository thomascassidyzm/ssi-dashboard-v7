-- Undo for the job #997 HC LEGO build of cym_nv2_for_eng. Run weave-cym-nv2-already-taught-undo.sql
-- FIRST (it puts the 81 is_new flags back), then this:
--   * deletes every course_legos row of the sandbox that was not there before the build
--     (backup_cym_nv2_legos_997 = the sandbox's LEGOs exactly as they stood), and
--   * puts every course_seeds row the build touched back as backup_cym_nv2_seeds_997 holds it
--     (finalize sets status 'released', decomposed_at, version, last_edit_event_id).
-- No phrase was written by the build (it stops at LEGOs), so none is touched. Make-before-break
-- does not apply: no audio exists for these LEGOs. Dry run unless invoked with  -v finish=COMMIT .
\set ON_ERROR_STOP on
\if :{?finish}
\else
  \set finish ROLLBACK
\endif
BEGIN;
DO $$ BEGIN
  IF to_regclass('backup_cym_nv2_legos_997') IS NULL OR to_regclass('backup_cym_nv2_seeds_997') IS NULL THEN
    RAISE EXCEPTION 'backups missing'; END IF;
  IF to_regclass('backup_cym_nv2_isnew_997') IS NOT NULL AND EXISTS (
       SELECT 1 FROM course_legos l JOIN backup_cym_nv2_isnew_997 b ON b.id=l.id WHERE l.is_new IS DISTINCT FROM b.is_new) THEN
    RAISE EXCEPTION 'run weave-cym-nv2-already-taught-undo.sql first'; END IF;
  IF EXISTS (SELECT 1 FROM course_practice_phrases p WHERE p.course_code='cym_nv2_for_eng'
             AND NOT EXISTS (SELECT 1 FROM backup_cym_nv2_phrases_997 b WHERE b.id=p.id)) THEN
    RAISE EXCEPTION 'phrases exist that the backup does not have; something was built on these LEGOs since'; END IF;
END $$;
DELETE FROM course_legos l WHERE l.course_code='cym_nv2_for_eng'
  AND NOT EXISTS (SELECT 1 FROM backup_cym_nv2_legos_997 b WHERE b.id=l.id);
UPDATE course_seeds s SET status=b.status, decomposed_at=b.decomposed_at, version=b.version, last_edit_event_id=b.last_edit_event_id
FROM backup_cym_nv2_seeds_997 b WHERE s.id=b.id AND s.course_code='cym_nv2_for_eng'
  AND (s.status, s.decomposed_at, s.version, s.last_edit_event_id) IS DISTINCT FROM (b.status, b.decomposed_at, b.version, b.last_edit_event_id);
DO $$ BEGIN
  -- Every column but updated_at and version, which the UPDATE triggers stamp/bump and no undo can put back.
  IF EXISTS (SELECT id, seed_number, lego_index, type, is_new, known_text, target_text, components, status,
                    known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id, last_edit_event_id
             FROM course_legos WHERE course_code='cym_nv2_for_eng'
             EXCEPT SELECT id, seed_number, lego_index, type, is_new, known_text, target_text, components, status,
                    known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id, last_edit_event_id
             FROM backup_cym_nv2_legos_997)
     OR (SELECT count(*) FROM course_legos WHERE course_code='cym_nv2_for_eng') <> (SELECT count(*) FROM backup_cym_nv2_legos_997) THEN
    RAISE EXCEPTION 'CHECK FAILED: sandbox LEGOs do not match the pre-build backup'; END IF;
  IF EXISTS (SELECT 1 FROM course_seeds s JOIN backup_cym_nv2_seeds_997 b ON b.id=s.id
             WHERE (s.status, s.decomposed_at) IS DISTINCT FROM (b.status, b.decomposed_at)) THEN
    RAISE EXCEPTION 'CHECK FAILED: a seed row differs from the backup'; END IF;
  RAISE NOTICE 'undo checks passed';
END $$;
SELECT 'finishing with' k, :'finish' v;
:finish;
SELECT :'finish' = 'COMMIT' AS do_refresh \gset
\if :do_refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index;
\endif
