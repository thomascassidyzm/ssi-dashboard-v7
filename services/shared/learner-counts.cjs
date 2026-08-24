/**
 * learner-counts.cjs — the ONE honest "how many real people" answer.
 *
 * Built 2026-08-23. The Romanian pod-1 cutover record (docs/pods/ron-pod-1-cutover-
 * record-2026-08-22.md) carried "109 rows — the largest progress base" as if it meant
 * 109 people. Tom: "Romanian users! 109 sounds a lot. Any of this fake data?" Watson
 * checked and found the number was a `learner_pod_state` ROW count belonging to just
 * 2 learner ids — a real defect (rows are not people) even though Watson's own
 * follow-up claim that both ids were synthetic/non-auth turned out to be wrong on
 * re-check (see the correction appended to that doc). Tom: "Yes. Do that" — make
 * every rollout/usage report count DISTINCT REAL HUMAN LEARNERS, never rows.
 *
 * "Real human learner" for a course = a distinct learner_id that:
 *   1. joins to a real auth.users row via learners.user_id = auth.users.id — NOT
 *      learners.id, which is the trap documented at services/insight-discovery.cjs:72-74
 *      (player_events.user_id and course_enrollments.learner_id both key on
 *      learners.id; only learners.user_id reaches auth.users).
 *   2. is not flagged is_demo, is_internal, or educational_role='student' (school-demo
 *      accounts) — the same shape of exclusion services/insight-discovery.cjs already
 *      applies to telemetry, stamped with an explicit count rather than silently
 *      dropped. TASTE-SAFE DEFAULT (flagged for Tom to overrule): school-demo AND
 *      internal-staff accounts are excluded from the "real human learner" headline,
 *      but both counts are reported separately, never deleted from the picture.
 *   3. is not on a scratch/rehearsal course code (tools/pods/rehearse-switchover.cjs
 *      writes clone state under a scratch code like `zzz_rehearsal`, never under the
 *      real course code — this function refuses a scratch code outright rather than
 *      quietly reporting zero).
 *   4. is not a machine-speed outlier — see MACHINE_SPEED_EXPOSURE_THRESHOLD below.
 *
 * KNOWN LIMITATION, stated rather than hidden: `learner_pod_state.updated_at` is NOT
 * a per-event log. `tools/pods/pod-switchover.cjs` DELETEs and re-INSERTs every
 * "carried" row during a switchover, and the INSERT takes no explicit updated_at, so
 * it defaults to the migration's own `now()` — resetting EVERY row for EVERY learner
 * in that course to one identical timestamp. Confirmed 2026-08-23 against
 * ron_for_eng/swe_for_eng/isl_for_eng/eus_for_eng (all switched 2026-08-22) AND
 * fra_for_eng/hrv_for_eng (not part of that rollout, switched on other dates) — every
 * migrated course shows exactly one updated_at value shared by every row of every
 * learner. So updated_at can NOT be read as "did N exposures in one day" for any
 * migrated course; it only ever means "this course was migrated at this moment". The
 * threshold below is therefore a lifetime-total sanity ceiling, not a same-day rate
 * detector — say so wherever this module's output is surfaced.
 */
'use strict'

// No real dedicated listener observed in this estate exceeds a few thousand lifetime
// exposures on one course (the largest confirmed-real case, 2,787 for a learner
// enrolled ~2 months earlier with graduating per-sentence exposure counts in the
// pre-migration data, is well inside this). Set well above that so it is a hedge
// against a genuine scripted/QA burst, not a filter that catches real dedicated
// learners. Named and commented per Tom's ruling rather than a bare number, and
// currently fires on none of the four free-tier rollout courses (see the module's
// test fixture and the job report that shipped this file for a case where it does).
const MACHINE_SPEED_EXPOSURE_THRESHOLD = 5000

// tools/pods/rehearse-switchover.cjs's default --scratch value; any course_code
// starting with it is estate machinery testing itself, never a real course.
const SCRATCH_COURSE_CODE_RE = /^zzz_/

/**
 * Pure classifier — no DB access, so it is trivially unit-testable. Takes one row
 * per (learner_id) already aggregated across their learner_pod_state rows for one
 * course, shaped as returned by the SQL in `fetchLearnerCourseRows` below.
 *
 * @param {Array<{learner_id:string, rows:number, exposures:number, has_auth_user:boolean,
 *   is_demo:boolean, is_internal:boolean, educational_role:string|null}>} learnerRows
 * @returns {{humans:number, rows:number, exposures:number, excluded:object, method:string}}
 */
function classifyLearnerRows(learnerRows) {
  const excluded = { no_auth_user: 0, rehearsal_or_clone: 0, machine_speed: 0, school_demo: 0, internal_staff: 0 }
  let humans = 0, rows = 0, exposures = 0

  for (const r of learnerRows) {
    rows += r.rows
    exposures += r.exposures

    if (!r.has_auth_user) { excluded.no_auth_user++; continue }
    if (r.educational_role === 'student' || r.is_demo) { excluded.school_demo++; continue }
    if (r.is_internal) { excluded.internal_staff++; continue }
    if (r.exposures >= MACHINE_SPEED_EXPOSURE_THRESHOLD) { excluded.machine_speed++; continue }
    humans++
  }

  return {
    humans, rows, exposures, excluded,
    method: 'distinct learner_id, joined learners.user_id -> auth.users.id, ' +
      'excluding no-auth-match / school-demo / internal-staff / machine-speed(>=' +
      `${MACHINE_SPEED_EXPOSURE_THRESHOLD} lifetime exposures on this course) learner ids`
  }
}

/**
 * DB-backed entry point. `db` is any object with an async `.query(sql, params)`
 * method returning `{ rows }` (a `pg` Client/Pool — the pattern already used across
 * tools/pods/*.cjs — satisfies this; a Supabase REST client does NOT, because
 * auth.users is not PostgREST-exposed — see the module doc / job report for that gap).
 *
 * @param {{query: Function}} db
 * @param {string} courseCode e.g. 'ron_for_eng'
 */
async function realHumanLearners(db, courseCode) {
  if (SCRATCH_COURSE_CODE_RE.test(courseCode)) {
    throw new Error(
      `realHumanLearners: refusing scratch/rehearsal course code '${courseCode}' — ` +
      'these are estate test fixtures (tools/pods/rehearse-switchover.cjs), not a real course.'
    )
  }

  const { rows } = await db.query(
    `select lps.learner_id,
            count(*)::int as rows,
            sum(lps.exposures)::int as exposures,
            (au.id is not null) as has_auth_user,
            coalesce(l.is_demo, false) as is_demo,
            coalesce(l.is_internal, false) as is_internal,
            l.educational_role
       from learner_pod_state lps
       left join learners l on l.id = lps.learner_id
       left join auth.users au on au.id::text = l.user_id
      where lps.course_code = $1
      group by 1, 4, 5, 6, 7`,
    [courseCode]
  )

  return classifyLearnerRows(rows)
}

module.exports = { realHumanLearners, classifyLearnerRows, MACHINE_SPEED_EXPOSURE_THRESHOLD, SCRATCH_COURSE_CODE_RE }
