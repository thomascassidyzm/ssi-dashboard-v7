-- T-21, 2026-08-17: give a regional-variant course its own voice-pool key.
--
-- WHY. `courses.target_lang` carries the BASE tag for a regional-variant
-- course: deu_at_for_eng is target_lang 'deu', ara_eg_for_eng is 'ara',
-- spa_mx_for_eng is 'spa'. Everything that casts pod voices resolved the pool
-- from that column, so a variant course and its base language shared ONE
-- casting slot. Tom then ruled OPPOSITE pairs either side of that slot —
-- German on Moritz + Lena, Austrian German on Felix + Sonja — and locking
-- either one would have silently recast the other. Six languages (German,
-- Austrian German, Arabic MSA, Egyptian Arabic, Syrian Arabic, French,
-- Québécois French) were held unlockable on exactly this.
--
-- WHY NOT RETAG target_lang. Roughly 105 files across this repo and
-- ssi-learning-app read courses.target_lang — syllable counting, i18n,
-- entitlement, pricing, the learner-facing round map. None of them want to
-- learn about regions, and a wrong answer in any of them is learner-facing.
-- This column is read by the casting path and nothing else, so the blast
-- radius is exactly the bug.
--
-- SEMANTICS. NULL means "resolve as before" — from the course code's region if
-- app_config.pod_voice_pools has that key, otherwise from target_lang. A
-- non-NULL value is a human ruling and WINS over both; if it names a pool that
-- does not exist the casting path THROWS rather than falling back, because a
-- silent fallback to the base language is the miscast this column exists to
-- stop. Resolver: poolKeysForCourse() in tools/pod-sync.cjs.

ALTER TABLE courses ADD COLUMN IF NOT EXISTS voice_pool_key TEXT;

COMMENT ON COLUMN courses.voice_pool_key IS
  'Explicit app_config.pod_voice_pools key for this course''s TARGET voices. NULL = resolve from the course code''s region, then target_lang. Set only where the pool key genuinely exists; the casting path throws on a key with no pool rather than falling back. See tools/pod-sync.cjs poolKeysForCourse().';

-- A pool key, not a free-text note: lowercase ISO-639-3 with an optional
-- region suffix. Rejecting junk here is cheaper than discovering it at render.
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_voice_pool_key_shape;
ALTER TABLE courses ADD CONSTRAINT courses_voice_pool_key_shape
  CHECK (voice_pool_key IS NULL OR voice_pool_key ~ '^[a-z]{2,3}(_[a-z0-9]{2,4})?$');
