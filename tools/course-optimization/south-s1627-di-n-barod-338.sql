-- Job #338 (Aran, Welsh method lead, 2026-10-14; canon K43): 'n after a vowel IS the taught 'yn', so seed 1627 of the
-- South sandbox cym_sv2_for_eng goes back to its natural contracted Welsh, 'mae dy goffi di’n barod' (the course's ’),
-- undoing job #332's 'mae dy goffi di yn barod'. S1627L02 stays the already-taught 'yn barod' (is_new false); with
-- welshExpandYn the seed now tiles from 'dy goffi di' + 'yn barod'. Seed text only: no LEGO, phrase or audio row is
-- touched. Sandbox only. Dry run unless psql -v finish=COMMIT. Undo: restore target_text/last_edit_event_id from
-- backup_south_s1627_338_seeds.
\set ON_ERROR_STOP on
\if :{?finish}
\else
  \set finish ROLLBACK
\endif
BEGIN;
CREATE TABLE backup_south_s1627_338_seeds AS SELECT * FROM course_seeds WHERE course_code='cym_sv2_for_eng' AND seed_number=1627;
REVOKE ALL ON backup_south_s1627_338_seeds FROM anon, authenticated;

INSERT INTO content_edit_events (course_code, surface, operation, actor_kind, actor_id, actor_label, actor_verified, scope, detail)
VALUES ('cym_sv2_for_eng', 'tools:south-s1627-di-n-barod-338.sql', 'edit', 'service', 'claude-job-338', 'claude-job-338', false,
        '{"rows":"S1627 seed target_text, sandbox only"}', '{"why":"Aran 2026-10-14: yn/’n equivalence (K43); undo #332 uncontraction","backup":"backup_south_s1627_338_seeds"}')
RETURNING id AS ev \gset

DO $$ BEGIN
  IF (SELECT count(*) FROM course_seeds WHERE course_code='cym_sv2_for_eng' AND seed_number=1627 AND target_text='mae dy goffi di yn barod') <> 1 THEN
    RAISE EXCEPTION 'S1627 is not the expected #332 text';
  END IF;
END $$;

UPDATE course_seeds SET target_text='mae dy goffi di’n barod', last_edit_event_id=:'ev'
  WHERE course_code='cym_sv2_for_eng' AND seed_number=1627 AND target_text='mae dy goffi di yn barod';

SELECT seed_number, known_text, target_text FROM course_seeds WHERE course_code='cym_sv2_for_eng' AND seed_number=1627;
:finish;
SELECT :'finish' = 'COMMIT' AS do_refresh \gset
\if :do_refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index;
\endif
