-- Removes the v2 sandbox (job #796). Audio pointers only: no course_audio rows belong to v2, so none are touched.
\set ON_ERROR_STOP on
BEGIN;
DELETE FROM course_practice_phrases WHERE course_code='cym_nv2_for_eng';
DELETE FROM lego_introductions WHERE course_code='cym_nv2_for_eng';
DELETE FROM course_legos WHERE course_code='cym_nv2_for_eng';
DELETE FROM course_seeds WHERE course_code='cym_nv2_for_eng';
DELETE FROM courses WHERE course_code='cym_nv2_for_eng';
COMMIT;
