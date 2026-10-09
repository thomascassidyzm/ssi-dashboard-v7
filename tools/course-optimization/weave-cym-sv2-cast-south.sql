-- Job #429 (Aran 2026-10-09 07:29Z): "Southern recording voices are Dan and Eleri. Add both to the Welsh
-- recording policy as Southern voices, cast the SOUTH SANDBOX ONLY with Dan on target1 and Eleri on
-- target2 (do NOT touch live South casting)."
--
-- 1. POLICY. language_recording_policy('cym') gains two SOUTHERN slots, spelt 'm:south' / 'f:south' as
--    services/voice-engine/recordist-queue.cjs resolveRecordist() anticipates for a two-dialect language.
--    The existing four (all north) are untouched. A voice reads only its own dialect, and "first named
--    wins" per (dialect, gender) bucket, so no North line moves. Live South's pod lines already name
--    human_dan_cym_s / human_eleri_cym_s, and the owner lookup returns those same ids, so they stay
--    with Dan and Eleri. No email is written (none exists for either; the vault trigger has nothing to
--    take).
-- 2. CAST the South sandbox cym_sv2_for_eng only: voice_config.voices.target1 = Dan, target2 = Eleri, in
--    the shape the North sandbox uses. Live South (cym_s_for_eng) is never written; it still casts no
--    target voice.
-- 3. LIBRARY FIRST: no Dan or Eleri take exists for any sandbox sentence (checked 2026-10-09), so nothing
--    new links; the 32 per-voice seed links to clips live South plays stay as they are.
-- NO audio is made. Undo: weave-cym-sv2-cast-south-undo.sql.  Dry run unless  -v finish=COMMIT .
\set ON_ERROR_STOP on
\if :{?finish}
\else
  \set finish ROLLBACK
\endif
BEGIN;

DO $$ BEGIN
  IF to_regclass('backup_cym_policy_429') IS NOT NULL THEN RAISE EXCEPTION 'already applied (backup_cym_policy_429 exists) — after a committed undo, drop backup_cym_policy_429 and backup_cym_sv2_course_429 first'; END IF;
  IF (SELECT voices ? 'm:south' OR voices ? 'f:south' FROM language_recording_policy WHERE language = 'cym') THEN
    RAISE EXCEPTION 'cym policy already has a southern slot'; END IF;
END $$;

CREATE TABLE backup_cym_policy_429 AS SELECT * FROM language_recording_policy WHERE language = 'cym';
CREATE TABLE backup_cym_sv2_course_429 AS SELECT * FROM courses WHERE course_code = 'cym_sv2_for_eng';
REVOKE ALL ON backup_cym_policy_429, backup_cym_sv2_course_429 FROM anon, authenticated;

UPDATE language_recording_policy SET voices = voices
  || jsonb_build_object('m:south', jsonb_build_object('name', 'Dan', 'gender', 'm', 'aliases', '[]'::jsonb, 'dialect', 'south', 'voiceId', 'human_dan_cym_s'))
  || jsonb_build_object('f:south', jsonb_build_object('name', 'Eleri', 'gender', 'f', 'aliases', '[]'::jsonb, 'dialect', 'south', 'voiceId', 'human_eleri_cym_s'))
WHERE language = 'cym';

-- The sandbox's voice_config has NO `voices` block (live South has none either), and jsonb_set never
-- creates a missing parent — so the block is built with || rather than jsonb_set (a first version of
-- this script did nothing to the cast for exactly that reason, and its NULL-blind check let it pass).
UPDATE courses SET voice_config = voice_config || jsonb_build_object('voices',
    coalesce(voice_config -> 'voices', '{}'::jsonb)
    || jsonb_build_object('target1', jsonb_build_object('name', 'Dan', 'voiceId', 'human_dan_cym_s', 'language', '', 'provider', 'human',
                                       'settings', jsonb_build_object('speed', 1, 'stability', 0.5, 'similarityBoost', 0.75)))
    || jsonb_build_object('target2', jsonb_build_object('name', 'Eleri', 'voiceId', 'human_eleri_cym_s', 'language', '', 'provider', 'human',
                                       'settings', jsonb_build_object('speed', 1, 'stability', 0.5, 'similarityBoost', 0.75))))
WHERE course_code = 'cym_sv2_for_eng';

INSERT INTO content_edit_events (course_code, surface, operation, actor_kind, actor_id, actor_label, actor_verified, scope, detail)
VALUES ('cym_sv2_for_eng', 'sql:job-429 weave-cym-sv2-cast-south', 'cast-recordists', 'agent', 'claude-job-429-cast-south',
        'agent (claude-job-429-cast-south)', false, '{"rows":"courses.voice_config + language_recording_policy(cym)"}',
        jsonb_build_object('ruling', 'Aran 2026-10-09 07:29Z: Southern recording voices are Dan and Eleri; add both to the Welsh recording policy as Southern voices; cast the South sandbox only, Dan target1, Eleri target2; do not touch live South casting.',
                           'backups', jsonb_build_array('backup_cym_policy_429', 'backup_cym_sv2_course_429')));

DO $$ BEGIN
  IF (SELECT count(*) FROM jsonb_object_keys((SELECT voices FROM language_recording_policy WHERE language='cym'))) <> 6 THEN RAISE EXCEPTION 'policy does not hold 6 slots'; END IF;
  IF (SELECT voices - 'm:south' - 'f:south' FROM language_recording_policy WHERE language='cym') IS DISTINCT FROM (SELECT voices FROM backup_cym_policy_429) THEN
    RAISE EXCEPTION 'an existing policy slot changed'; END IF;
  IF (SELECT voice_config #>> '{voices,target1,voiceId}' FROM courses WHERE course_code='cym_sv2_for_eng') IS DISTINCT FROM 'human_dan_cym_s'
     OR (SELECT voice_config #>> '{voices,target2,voiceId}' FROM courses WHERE course_code='cym_sv2_for_eng') IS DISTINCT FROM 'human_eleri_cym_s' THEN
    RAISE EXCEPTION 'sandbox cast not as intended'; END IF;
  IF (SELECT voice_config - 'voices' FROM courses WHERE course_code='cym_sv2_for_eng') IS DISTINCT FROM (SELECT voice_config - 'voices' FROM backup_cym_sv2_course_429) THEN
    RAISE EXCEPTION 'something besides voices changed in the sandbox voice_config'; END IF;
  RAISE NOTICE 'ALL CHECKS PASSED';
END $$;
SELECT jsonb_pretty(voices -> 'm:south') m_south, jsonb_pretty(voices -> 'f:south') f_south FROM language_recording_policy WHERE language = 'cym';
SELECT 'finishing with' k, :'finish' v;
:finish;
