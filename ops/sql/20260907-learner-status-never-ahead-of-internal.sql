-- THE LEARNER-FACING STATUS MAY NEVER BE AHEAD OF THE INTERNAL ONE.
--
-- A course carries two status fields that mean different things and are meant
-- to move together:
--
--   courses.status          — the INTERNAL state. draft | beta | released.
--   courses.new_app_status  — the LEARNER GATE. not_available | draft | beta | live.
--
-- Only the second one has any effect on a learner. Every catalogue read in
-- ssi-learning-app is the same predicate — `.in('new_app_status', ['live',
-- 'beta'])` — in packages/player-vue/src/App.vue, api/courses/available.ts,
-- api/entitlement/grant.ts, api/onboarding/provision.ts, api/_utils/orgCoverage.ts,
-- useSchoolCourseCatalogue.ts, CourseSelector.vue, BrowseScreen.vue. Nothing
-- learner-facing reads courses.status, and nothing learner-facing reads
-- courses.visibility either (that column appears only in the courses_select RLS
-- policy, which governs whether the ROW is readable, not whether the course is
-- offered).
--
-- WHAT WENT WRONG. services/production-api.cjs PUT /api/courses/:code/status is
-- the only surface that is supposed to move either field, and it moves both in
-- one write through an explicit map (draft->draft, beta->beta, released->live)
-- and runs the manual QA approval gate before promoting. On 2026-08-06 two
-- direct-SQL statements, one per language pair, set new_app_status='beta' on
-- kor_for_hin + kor_for_tam (13:32:02.825331Z) and zho_for_hin + zho_for_tam
-- (17:30:02.181311Z) and touched nothing else. status stayed 'draft'.
-- visibility stayed 'hidden'. released_at stayed NULL. The audit trail is in
-- content_audit_log (table_name='courses', those two timestamps, two rows each).
--
-- The result: four courses the estate believed were unfinished drafts were
-- offered to learners as BETA for a month, and the approval gate built the day
-- before had no chance to see them, because the write never went past it.
--
-- WHY A CONSTRAINT AND NOT A TEST OR A NIGHTLY REPORT. The write that caused
-- this was hand-written SQL running as `postgres`. No unit test, no lint, no
-- API-layer guard and no report can be in the path of that write. A CHECK is
-- the only thing that is. It also costs nothing to run and nothing to maintain:
-- the class of defect becomes unrepresentable rather than merely detectable.
--
-- WHAT IT FORBIDS — one direction only. The learner-facing state may sit at or
-- BELOW the internal state, never above it. Pulling a course back is always
-- allowed (fra_for_eng is 'released' internally and 'beta' to learners, which
-- is deliberate and stays legal; cym_anthem_for_jpn is 'released' internally
-- and 'not_available' to learners, likewise). Promoting a course past what the
-- estate believes about it is what is now impossible.
--
-- The API's own map (draft->draft, beta->beta, released->live) writes equality
-- every time, in a single UPDATE, so the constraint sees the final state and
-- this is a strict no-op for every legitimate promotion and demotion path.

BEGIN;

-- ── 1. The four rows, put back where the estate believes they are ───────────
-- Learner ACCESS is what changes. Nothing here touches course_enrollments,
-- lego_progress, seed_progress, learner_* or player_events: progress is keyed
-- by course_id/course_code and survives untouched, so restoring the flag
-- restores every learner exactly where they were.
UPDATE courses
   SET new_app_status = 'draft', updated_at = now()
 WHERE course_code IN ('kor_for_hin', 'kor_for_tam', 'zho_for_hin', 'zho_for_tam')
   AND status = 'draft'
   AND new_app_status = 'beta';

-- ── 2. The rule ────────────────────────────────────────────────────────────
ALTER TABLE courses
  ADD CONSTRAINT courses_learner_status_never_ahead_of_internal
  CHECK (
    CASE new_app_status
      WHEN 'not_available' THEN 0 WHEN 'draft' THEN 1
      WHEN 'beta' THEN 2 WHEN 'live' THEN 3 END
    <=
    CASE status
      WHEN 'draft' THEN 1 WHEN 'beta' THEN 2 WHEN 'released' THEN 3 END
  );

COMMIT;
