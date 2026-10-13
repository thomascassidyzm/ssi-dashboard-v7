-- Rollback for 20261013_human_take_lock.sql
-- Removes the human-take lock from the four slot tables. No data is touched by either direction.
DROP TRIGGER IF EXISTS human_take_lock ON course_seeds;
DROP TRIGGER IF EXISTS human_take_lock ON course_legos;
DROP TRIGGER IF EXISTS human_take_lock ON course_practice_phrases;
DROP TRIGGER IF EXISTS human_take_lock ON lego_introductions;
DROP FUNCTION IF EXISTS refuse_human_take_replacement();
