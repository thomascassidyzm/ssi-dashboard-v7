// services/shared/library-courses.cjs
//
// WHICH COURSES A SIGNED-IN POPTY USER SEES IN THE COURSE LIBRARY — hidden
// (sandbox) courses included.
//
// The browser reads `courses` with the anon key, and row-level security hides
// visibility='hidden' rows from anon (the learning app relies on that to keep
// sandboxes away from learners — we do NOT loosen it). So Popty's server reads
// the table with the service role and returns only the rows this user may open,
// by the same rule that gates every /api/…/:courseCode route
// (casting-rights.courseAccessVerdict: casting first, then admin / '*' / grant).
// Nothing here writes.

const { courseAccessVerdict } = require('../voice-engine/casting-rights.cjs')

/** The rows of `courses` this user may open, each stamped with `is_hidden`. */
function coursesVisibleTo(user, rows) {
  if (!user) return []
  return (rows || [])
    .filter((row) => row && row.course_code && courseAccessVerdict(user, row.course_code).ok)
    .map((row) => ({ ...row, is_hidden: row.visibility === 'hidden' }))
}

module.exports = { coursesVisibleTo }
