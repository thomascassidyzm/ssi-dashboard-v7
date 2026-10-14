-- Job #348 (Aran, Welsh method lead, 2026-10-14): in the South sandbox cym_sv2_for_eng the bare LEGO S0181L02
-- "’n rhai ni | ours" becomes "ein rhai ni" (a bare ’n is never taught). LEGO target_text only: seed S0181 and its 9
-- practice phrases keep their spoken "ma’n rhai ni" (the tiler/containment read ’n as ein in front of an "ein …" LEGO,
-- welshExpandEin). Audio links are NOT touched (make-before-break): the new words are queued for a new render.
-- Sandbox only. Dry run unless psql -v finish=COMMIT.
-- UNDO: UPDATE course_legos l SET target_text=b.target_text, last_edit_event_id=b.last_edit_event_id, version=b.version
--       FROM backup_south_s0181_348_legos b WHERE l.id=b.id;  then REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index;
\set ON_ERROR_STOP on
\if :{?finish}
\else
  \set finish ROLLBACK
\endif
BEGIN;
CREATE TABLE backup_south_s0181_348_legos AS SELECT * FROM course_legos WHERE course_code='cym_sv2_for_eng' AND seed_number=181 AND lego_index=2;
REVOKE ALL ON backup_south_s0181_348_legos FROM anon, authenticated;

INSERT INTO content_edit_events (course_code, surface, operation, actor_kind, actor_id, actor_label, actor_verified, scope, detail)
VALUES ('cym_sv2_for_eng', 'tools:south-s0181-ein-rhai-ni-348.sql', 'edit', 'service', 'claude-job-348', 'claude-job-348', false,
        '{"rows":"S0181L02 LEGO target_text, sandbox only"}', '{"why":"Aran 2026-10-14: bare ’n LEGO never taught; ’n rhai ni -> ein rhai ni","backup":"backup_south_s0181_348_legos"}')
RETURNING id AS ev \gset

DO $$ BEGIN
  IF (SELECT count(*) FROM course_legos WHERE course_code='cym_sv2_for_eng' AND seed_number=181 AND lego_index=2 AND target_text='’n rhai ni') <> 1 THEN
    RAISE EXCEPTION 'S0181L02 is not the expected ’n rhai ni';
  END IF;
END $$;

UPDATE course_legos SET target_text='ein rhai ni', last_edit_event_id=:'ev', updated_at=now()
  WHERE course_code='cym_sv2_for_eng' AND seed_number=181 AND lego_index=2 AND target_text='’n rhai ni';

SELECT lego_id, known_text, target_text FROM course_legos WHERE course_code='cym_sv2_for_eng' AND seed_number=181 ORDER BY lego_index;
:finish;
SELECT :'finish' = 'COMMIT' AS do_refresh \gset
\if :do_refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index;
\endif
