-- Job #332 (Aran 2026-10-14): S1627L02 of cym_sv2_for_eng is the ALREADY-TAUGHT 'yn barod' (S0097L03, S1076L04,
-- S1421L03), not a new LEGO, and '’n barod' is not a valid LEGO form. The LEGO becomes 'yn barod' / 'is ready',
-- is_new=false (same Welsh under other English stays taught: weave-cym-proof-fixes-554 S1152 precedent). A taught LEGO
-- cannot tile the contracted span 'di’n', so the seed is written 'di yn barod'. L02's 10 unrecorded build/use phrases
-- are deleted (that drops their lines from every recording queue; queues read the rows). B05/B06 carry recorded audio
-- (moved in by #555) and are NOT touched. Flag cleared. Dry run unless psql -v finish=COMMIT. Undo: -undo.sql.
\set ON_ERROR_STOP on
\if :{?finish}
\else
  \set finish ROLLBACK
\endif
BEGIN;
CREATE TABLE backup_south_yn_barod_332_legos AS SELECT * FROM course_legos WHERE course_code='cym_sv2_for_eng' AND seed_number=1627 AND lego_index=2;
CREATE TABLE backup_south_yn_barod_332_seeds AS SELECT * FROM course_seeds WHERE course_code='cym_sv2_for_eng' AND seed_number=1627;
CREATE TABLE backup_south_yn_barod_332_phrases AS SELECT * FROM course_practice_phrases WHERE course_code='cym_sv2_for_eng' AND seed_number=1627 AND lego_index=2 AND position<=10;
CREATE TABLE backup_south_yn_barod_332_flags AS SELECT * FROM lego_proof_flags WHERE course_code='cym_sv2_for_eng' AND lego_id='S1627L02';
REVOKE ALL ON backup_south_yn_barod_332_legos, backup_south_yn_barod_332_seeds, backup_south_yn_barod_332_phrases, backup_south_yn_barod_332_flags FROM anon, authenticated;

INSERT INTO content_edit_events (course_code, surface, operation, actor_kind, actor_id, actor_label, actor_verified, scope, detail)
VALUES ('cym_sv2_for_eng', 'tools:south-yn-barod-not-new-332.sql', 'edit', 'service', 'claude-job-332', 'claude-job-332', false,
        '{"rows":"S1627 seed + L02 + its unrecorded phrases, sandbox only"}', '{"why":"Aran 2026-10-14: yn barod already taught, not a new LEGO","backup":"backup_south_yn_barod_332"}')
RETURNING id AS ev \gset

DO $$ BEGIN
  IF (SELECT count(*) FROM course_practice_phrases WHERE course_code='cym_sv2_for_eng' AND seed_number=1627 AND lego_index=2
        AND position<=10 AND target1_audio_id IS NULL AND target2_audio_id IS NULL AND known_audio_id IS NULL) <> 10 THEN
    RAISE EXCEPTION 'expected exactly 10 unrecorded L02 phrases';
  END IF;
  IF (SELECT count(*) FROM course_legos WHERE course_code='cym_sv2_for_eng' AND seed_number=1627 AND lego_index=2 AND target_text='’n barod' AND is_new) <> 1 THEN
    RAISE EXCEPTION 'S1627L02 is not the expected ’n barod';
  END IF;
END $$;

DELETE FROM course_practice_phrases WHERE course_code='cym_sv2_for_eng' AND seed_number=1627 AND lego_index=2 AND position<=10;
UPDATE course_legos SET target_text='yn barod', components='[{"known": "is ready", "target": "yn barod"}]'::jsonb, is_new=false, last_edit_event_id=:'ev'
  WHERE course_code='cym_sv2_for_eng' AND seed_number=1627 AND lego_index=2 AND target_text='’n barod';
UPDATE course_seeds SET target_text='mae dy goffi di yn barod', last_edit_event_id=:'ev'
  WHERE course_code='cym_sv2_for_eng' AND seed_number=1627 AND target_text='mae dy goffi di’n barod';
UPDATE lego_proof_flags SET flagged=false, note='fixed (job #332): already-taught yn barod, not a new LEGO (Aran 2026-10-14)', updated_at=now()
  WHERE course_code='cym_sv2_for_eng' AND lego_id='S1627L02';

SELECT lego_index,is_new,known_text,target_text FROM course_legos WHERE course_code='cym_sv2_for_eng' AND seed_number=1627 ORDER BY 1;
SELECT count(*) AS l02_phrases_left FROM course_practice_phrases WHERE course_code='cym_sv2_for_eng' AND seed_number=1627 AND lego_index=2;
SELECT :'finish' = 'COMMIT' AS do_refresh \gset
\if :do_refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index;
\endif
:finish;
