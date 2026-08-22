-- Dialect is a property of the COURSE. (Tom, 2026-08-19.)
--
-- "A Southern Welsh course is Southern as a fact of its content — this should be
-- a durable property of the course record, not inferred from who happens to be
-- cast." The recording queue routes by matching this against the reading voice's
-- own dialect tag (language_recording_policy.voices[].dialect).
--
-- WHY THE COLUMN EXISTS AT ALL. cym_n_for_eng and cym_s_for_eng both carry
-- target_lang = 'cym'. Nothing in the database said which accent either course
-- was in, so the recording queue — which is by LANGUAGE, deliberately, so that
-- one Welsh line is read once rather than twice — put 197 Southern pod lines in
-- the two Northern speakers' lists, to be read in the wrong accent, and nothing
-- flagged it (docs/welsh-south-pulled-from-northern-queues-2026-08-19.md).
--
-- WHY NOT INFER IT. Two inferences were available and both are wrong:
--   * from the course CODE's _n/_s suffix — that spelling is a naming habit, not
--     a declaration, and most courses have no suffix at all;
--   * from the CASTING — which is the original bug wearing a hat. cym_s_for_eng
--     was cast to Aran and Catrin, so "the dialect is whoever is cast" makes the
--     Southern course Northern, exactly as the queue already believed.
--
-- WHY NOT NULL DEFAULT 'standard'. Every language but Welsh has one dialect, and
-- this must change nothing for any of them. One explicit default on every course
-- and every voice makes the match trivially true wherever it used to be unasked
-- — a no-op by construction rather than a null branch in the queue. 'standard'
-- is deliberately not a real dialect name: a language that later grows a second
-- accent renames its own courses' tags, which is a visible content decision.
--
-- This file is STRUCTURE ONLY and is a strict no-op for every existing queue:
-- it gives every course the same tag. The Welsh ruling that actually moves lines
-- is a separate file, 20260819-welsh-dialects.sql, so the two can be verified
-- apart.

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS dialect text NOT NULL DEFAULT 'standard';

-- The empty string would be a third state meaning neither "standard" nor a real
-- dialect, and the queue canonicalises it back to 'standard' anyway. Refuse it
-- here so the column cannot hold something the code has to forgive.
ALTER TABLE courses
  DROP CONSTRAINT IF EXISTS courses_dialect_not_blank;
ALTER TABLE courses
  ADD CONSTRAINT courses_dialect_not_blank CHECK (btrim(dialect) <> '');

COMMENT ON COLUMN courses.dialect IS
  'Which dialect of target_lang this course teaches, as a fact of its content (Tom 2026-08-19). Lowercase tag; ''standard'' means the language has one dialect. Matched against language_recording_policy.voices[].dialect to route the human recording queue. NEVER inferred from the course code or from who is cast.';
