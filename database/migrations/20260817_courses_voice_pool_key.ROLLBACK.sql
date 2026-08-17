-- Rollback for 20260817_courses_voice_pool_key.sql.
-- Dropping the column restores the pre-T-21 resolution exactly: every course
-- falls back to the course code's region, then target_lang.
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_voice_pool_key_shape;
ALTER TABLE courses DROP COLUMN IF EXISTS voice_pool_key;
