-- Undo for clone-cym-sv2-2026-10-07.sql (job #905). Deletes ONLY cym_sv2_for_eng rows.
-- Audio pointers only: no course_audio rows belong to the sandbox, so none are touched.
\set ON_ERROR_STOP on
BEGIN;
DELETE FROM course_practice_phrases WHERE course_code='cym_sv2_for_eng';
DELETE FROM lego_introductions WHERE course_code='cym_sv2_for_eng';
DELETE FROM course_legos WHERE course_code='cym_sv2_for_eng';
DELETE FROM course_seeds WHERE course_code='cym_sv2_for_eng';
DELETE FROM courses WHERE course_code='cym_sv2_for_eng';
COMMIT;
