-- Undo for weave-cym-sv2-cast-south.sql (job #429): put the Welsh recording policy and the South sandbox's
-- voice_config back exactly as the backups hold them. Touches language_recording_policy('cym') and
-- cym_sv2_for_eng only; the 'cast-recordists' audit event stays as the record. Dry run unless -v finish=COMMIT .
\set ON_ERROR_STOP on
\if :{?finish}
\else
  \set finish ROLLBACK
\endif
BEGIN;
UPDATE language_recording_policy p SET voices = b.voices FROM backup_cym_policy_429 b WHERE p.language = 'cym' AND b.language = 'cym';
UPDATE courses c SET voice_config = b.voice_config FROM backup_cym_sv2_course_429 b WHERE c.course_code = 'cym_sv2_for_eng' AND b.course_code = c.course_code;
DO $$ BEGIN
  IF (SELECT voices FROM language_recording_policy WHERE language='cym') IS DISTINCT FROM (SELECT voices FROM backup_cym_policy_429) THEN RAISE EXCEPTION 'policy not restored'; END IF;
  IF (SELECT voice_config FROM courses WHERE course_code='cym_sv2_for_eng') IS DISTINCT FROM (SELECT voice_config FROM backup_cym_sv2_course_429) THEN RAISE EXCEPTION 'sandbox cast not restored'; END IF;
  RAISE NOTICE 'undo checks passed';
END $$;
SELECT 'finishing with' k, :'finish' v;
:finish;
