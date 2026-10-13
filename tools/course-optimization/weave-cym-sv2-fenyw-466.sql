-- Job #466 (Aran 2026-10-13): "gweld ’r fenyw" -> "gweld y fenyw" in the 3 S1355L03 pairing phrases from #459. cym_sv2_for_eng ONLY (cym_nv2 has no such phrase).
-- Dry run unless psql -v finish=COMMIT . Undo: weave-cym-sv2-fenyw-466-undo.sql
\set ON_ERROR_STOP on
\if :{?finish}
\else
  \set finish ROLLBACK
\endif
BEGIN;
DO $$ BEGIN
  IF to_regclass('backup_cym_sv2_fenyw_466') IS NOT NULL THEN RAISE EXCEPTION 'already applied'; END IF;
  IF (SELECT count(*) FROM course_practice_phrases WHERE course_code='cym_sv2_for_eng' AND target_text LIKE '%gweld ’r fenyw%') <> 3 THEN RAISE EXCEPTION 'expected exactly 3 matching phrases'; END IF;
  IF EXISTS (SELECT 1 FROM course_practice_phrases WHERE course_code='cym_sv2_for_eng' AND target_text LIKE '%gweld ’r fenyw%' AND (target1_audio_id IS NOT NULL OR target2_audio_id IS NOT NULL)) THEN RAISE EXCEPTION 'a phrase has audio: re-render needed first'; END IF;
END $$;
CREATE TABLE backup_cym_sv2_fenyw_466 AS SELECT id, course_code, target_text, word_count, last_edit_event_id FROM course_practice_phrases WHERE course_code='cym_sv2_for_eng' AND target_text LIKE '%gweld ’r fenyw%';
REVOKE ALL ON backup_cym_sv2_fenyw_466 FROM anon, authenticated;
INSERT INTO content_edit_events (course_code, surface, operation, actor_kind, actor_id, actor_label, actor_verified, actor_role, scope, detail)
VALUES ('cym_sv2_for_eng','sql:job-466 weave-cym-sv2-fenyw','fix-phrase-text','agent','claude-job-466-fenyw','agent (claude-job-466-fenyw)',false,'creator',
  (SELECT jsonb_build_object('phrase_ids', jsonb_agg(id)) FROM backup_cym_sv2_fenyw_466),
  jsonb_build_object('ruling','Aran 2026-10-13: gweld ’r fenyw -> gweld y fenyw','backup','backup_cym_sv2_fenyw_466'))
RETURNING id AS ev \gset
UPDATE course_practice_phrases p SET target_text = replace(p.target_text,'gweld ’r fenyw','gweld y fenyw'),
  word_count = length(replace(p.target_text,'gweld ’r fenyw','gweld y fenyw')), last_edit_event_id = :'ev'
WHERE p.id IN (SELECT id FROM backup_cym_sv2_fenyw_466);
SELECT id, target_text, word_count FROM course_practice_phrases WHERE id IN (SELECT id FROM backup_cym_sv2_fenyw_466) ORDER BY id;
SELECT 'finishing with' k, :'finish' v;
:finish;
