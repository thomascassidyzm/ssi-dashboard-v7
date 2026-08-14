-- ============================================================================
-- Canon may only ever be a learner-serving object. Rule fix, not a data fix.
--
-- Tom's ruling, 2026-08-14: "An unaccepted proposal is never canon — same
-- principle as human-outranks-canon, applied from the other direction."
--
-- WHAT WENT WRONG. Canon selection ordered by origin, then veracity, then OLDEST
-- created_at. For 623 identities the oldest member row pointed at a
-- `repair-candidates/` object: a take PROPOSED for a human decision and never
-- accepted. So the selector promoted an unaccepted proposal to canonical — and
-- every one of those 623 objects returns HTTP 403, because that prefix is not
-- publicly served at all. The estate's canonical clip for those lines was a take
-- no learner could ever hear and no human had ever approved.
--
-- Excluding a prefix in the backfill's WHERE clause would fix these 623 rows and
-- leave the next writer free to make the same mistake. The prefix rule belongs
-- in the table, where nothing can route around it.
--
-- SERVING PREFIXES, as of 2026-08-14, measured against the live bucket:
--   mastered/          2,563,230 course_audio rows — the learner-serving prefix
--   repair-candidates/     1,303 rows — proposals awaiting a human decision, 403
--   mastered-v2/              26 rows — 403
--   pending/                  50 rows — unrendered placeholders, already barred
-- All 623 non-`mastered/` canonical objects were fetched individually: 623 of
-- 623 returned 403. Not a sample — every one.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- The guard. A CHECK, not a convention: it applies to the backfill, to the
-- BEFORE INSERT trigger, to any future tool, and to a human at a psql prompt.
--
-- Written as an allow-list rather than a deny-list on purpose. A deny-list of
-- `repair-candidates/` would have said nothing about `mastered-v2/`, which was
-- equally dead and which nobody had thought about. A new prefix is now
-- suspicious by default and has to be admitted deliberately.
-- ----------------------------------------------------------------------------

ALTER TABLE audio_clips DROP CONSTRAINT IF EXISTS audio_clips_not_pending;

-- NOT VALID, deliberately and with the reason stated.
--
-- 289 of the 623 broken canons have NO serving member to fall back on — every
-- course_audio row pointing at them is itself on a dead prefix, so there is no
-- correct value available and inventing one would be a guess. A VALIDATED
-- constraint would have to be bought by deleting or falsifying those 289 rows,
-- neither of which is approved and neither of which is honest.
--
-- NOT VALID enforces the rule on every INSERT and every UPDATE from this moment
-- — which is the whole ask, "fix the rule, not just the data" — while leaving
-- the 289 pre-existing rows visible as the declared gap they are. They cannot
-- spread: nothing new can join them.
--
-- To finish the job later:  ALTER TABLE audio_clips VALIDATE CONSTRAINT
-- audio_clips_serving_prefix;  which will fail loudly until those 289 identities
-- get a real serving take. That failure is the reminder, and it is a better
-- reminder than a comment.
ALTER TABLE audio_clips
  ADD CONSTRAINT audio_clips_serving_prefix
  CHECK (s3_key LIKE 'mastered/%') NOT VALID;

COMMENT ON CONSTRAINT audio_clips_serving_prefix ON audio_clips IS
  'Canon must be a learner-serving object. Bars pending/ placeholders and repair-candidates/ proposals — an unaccepted proposal is never canon (Tom, 2026-08-14). Allow-list, not deny-list: a new prefix must be admitted deliberately.';

COMMIT;

-- ============================================================================
-- DOWN:
--   ALTER TABLE audio_clips DROP CONSTRAINT IF EXISTS audio_clips_serving_prefix;
--   ALTER TABLE audio_clips ADD CONSTRAINT audio_clips_not_pending
--     CHECK (s3_key NOT LIKE 'pending/%');
--
-- NOTE: this migration must run AFTER 20260814_canon_reselect_serving.sql, which
-- repairs the 623 rows that would otherwise violate the new constraint.
-- ============================================================================
