-- Undo of south-yn-barod-not-new-332.sql: restores S1627 seed, L02 and its 10 phrases from the backup tables.
\set ON_ERROR_STOP on
BEGIN;
UPDATE course_legos l SET target_text=b.target_text, components=b.components, is_new=b.is_new, last_edit_event_id=b.last_edit_event_id FROM backup_south_yn_barod_332_legos b WHERE l.id=b.id;
UPDATE course_seeds s SET target_text=b.target_text, last_edit_event_id=b.last_edit_event_id FROM backup_south_yn_barod_332_seeds b WHERE s.id=b.id;
INSERT INTO course_practice_phrases SELECT * FROM backup_south_yn_barod_332_phrases ON CONFLICT (id) DO NOTHING;
UPDATE lego_proof_flags f SET flagged=b.flagged, note=b.note, updated_at=b.updated_at FROM backup_south_yn_barod_332_flags b WHERE f.course_code=b.course_code AND f.lego_id=b.lego_id;
COMMIT;
REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index;
