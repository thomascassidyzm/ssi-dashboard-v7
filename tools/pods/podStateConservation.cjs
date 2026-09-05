/**
 * podStateConservation.cjs — the count-conservation assertion for pod flips.
 *
 * ZERO ORPHANS IS THE WRONG INSTRUMENT. The 2026-08-24 flip destroyed carried learner
 * positions on 12 courses (275 rows — proved row-by-row for German in job #648, restored
 * fleet-wide in job #651) and every orphan check re-ran green throughout: a deleted row
 * leaves no key to fail resolution, so deletion is invisible to an orphan census by
 * construction. What deletion CANNOT pass is arithmetic: the number of a course's
 * learner_pod_state rows after the migration must equal the number before, minus exactly
 * the drops the plan deliberately made, minus carries that deliberately landed on an
 * already-occupied key (two old rows converging on one new slot). Anything else means a
 * row vanished for an unplanned reason, and the transaction must roll back.
 *
 * Pure function, zero dependencies, so it is testable under bare node with no install.
 */

function assertPodStateConservation({ course, before, after, dropped, converged = 0 }) {
  for (const [k, v] of Object.entries({ before, after, dropped, converged })) {
    if (!Number.isInteger(v) || v < 0) throw new Error(`conservation check: ${k} must be a non-negative integer, got ${v}`)
  }
  const expected = before - dropped - converged
  if (after !== expected) {
    throw new Error(
      `post-check failed: learner_pod_state count not conserved for ${course} — ` +
      `${before} row(s) before, ${after} after, but the plan accounts for only ` +
      `${dropped} drop(s) and ${converged} converged carry target(s) (expected ${expected}). ` +
      `${Math.abs(after - expected)} row(s) ${after < expected ? 'DESTROYED' : 'appeared'} unplanned — rolling back.`)
  }
  return { expected }
}

module.exports = { assertPodStateConservation }
