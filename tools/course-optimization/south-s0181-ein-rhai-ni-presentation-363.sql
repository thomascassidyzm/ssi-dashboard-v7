-- Job #363 (Aran, Welsh method lead, 2026-10-14): job #348 changed South sandbox LEGO S0181L02 "’n rhai ni" -> "ein rhai ni" and the
-- text-change trigger NULLed its target1, target2 and presentation links (content_audio_link_drops). Aran approved relinking the
-- PRESENTATION clip only: its script already says "…<tgt>ein rhai ni</tgt>. <tgt>Ein rhai ni</tgt>." (checked below, not assumed).
-- target1/target2 stay NULL: their clips say "’n rhai ni", now wrong; the human booth re-reads them (see job report).
-- Same clip and column the lego held before #348 (backup_south_s0181_348_legos). Link only: no clip is created, changed or deleted.
-- Sandbox only. Dry run unless psql -v finish=COMMIT.
-- UNDO: UPDATE course_legos SET presentation_audio_id=NULL WHERE id='89c0e245-ad1d-4d16-8c7f-546044306400' AND presentation_audio_id='16590908-d939-4a4f-ace2-f2f55a8cfbbe';
\set ON_ERROR_STOP on
\if :{?finish}
\else
  \set finish ROLLBACK
\endif
BEGIN;
INSERT INTO content_edit_events (course_code, surface, operation, actor_kind, actor_id, actor_label, actor_verified, scope, detail)
VALUES ('cym_sv2_for_eng', 'tools:south-s0181-ein-rhai-ni-presentation-363.sql', 'edit', 'service', 'claude-job-363', 'claude-job-363', false,
        '{"rows":"S0181L02 presentation_audio_id, sandbox only"}', '{"why":"Aran 2026-10-14: relink the presentation clip whose script already says ein rhai ni","clip":"16590908-d939-4a4f-ace2-f2f55a8cfbbe"}')
RETURNING id AS ev \gset

DO $$ BEGIN
  IF (SELECT count(*) FROM course_legos l JOIN course_audio a ON a.id='16590908-d939-4a4f-ace2-f2f55a8cfbbe'
        WHERE l.course_code='cym_sv2_for_eng' AND l.seed_number=181 AND l.lego_index=2 AND l.target_text='ein rhai ni'
          AND l.presentation_audio_id IS NULL AND a.role='presentation' AND a.text LIKE '%<tgt>ein rhai ni</tgt>. <tgt>Ein rhai ni</tgt>.') <> 1 THEN
    RAISE EXCEPTION 'S0181L02 / presentation clip are not in the expected state';
  END IF;
END $$;

UPDATE course_legos SET presentation_audio_id='16590908-d939-4a4f-ace2-f2f55a8cfbbe', last_edit_event_id=:'ev'
  WHERE course_code='cym_sv2_for_eng' AND seed_number=181 AND lego_index=2 AND presentation_audio_id IS NULL;

SELECT lego_id, target_text, target1_audio_id, target2_audio_id, presentation_audio_id FROM course_legos WHERE course_code='cym_sv2_for_eng' AND seed_number=181 AND lego_index=2;
:finish;
