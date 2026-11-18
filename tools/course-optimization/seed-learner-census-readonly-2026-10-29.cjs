#!/usr/bin/env node
'use strict';
// node tools/course-optimization/seed-learner-census-readonly-2026-10-29.cjs <course> <seed> [out.json]
// READ-ONLY (job #503, eng_for_hin seed 128 re-cut): who is standing on a seed's LEGOs before a re-cut changes them.
// Through the sanctioned agent-db login (5 s cap). Counts only, plus the LEGO ids learners' cursors sit on — no learner ids.
//   - enrolments whose highest_completed_seed is at/after the seed
//   - cursor (last_completed_lego_id) and ceiling (highest_completed_lego_id) distribution inside the seed's LEGOs
//   - learners whose cursor AND ceiling both sit on a LEGO id the re-cut will remove (resolveResumeAnchor would call them fresh)
//   - lego_progress rows per LEGO id of the seed (the spaced-repetition rows keyed by lego_id)
// Every query is by course_id (indexed) or lego_id prefix within a course.
const fs = require('fs');
const { connect } = require('../../services/shared/agent-db.cjs');
async function main() {
  const [course, seedArg, out] = process.argv.slice(2);
  const seed = Number(seedArg);
  if (!course || !Number.isInteger(seed)) throw new Error('usage: <course> <seed> [out.json]');
  const prefix = `S${String(seed).padStart(4, '0')}L%`;
  const pg = await connect();
  try {
    const q = async (sql, params) => (await pg.query(sql, params)).rows;
    const result = {
      course, seed,
      enrolled: Number((await q('SELECT count(*) n FROM course_enrollments WHERE course_id=$1', [course]))[0].n),
      atOrBeyondSeed: Number((await q('SELECT count(*) n FROM course_enrollments WHERE course_id=$1 AND highest_completed_seed >= $2', [course, seed]))[0].n),
      cursorsInSeed: await q('SELECT last_completed_lego_id lego, count(*)::int n FROM course_enrollments WHERE course_id=$1 AND last_completed_lego_id LIKE $2 GROUP BY 1 ORDER BY 1', [course, prefix]),
      ceilingsInSeed: await q('SELECT highest_completed_lego_id lego, count(*)::int n FROM course_enrollments WHERE course_id=$1 AND highest_completed_lego_id LIKE $2 GROUP BY 1 ORDER BY 1', [course, prefix]),
      cursorAndCeilingBothInSeed: await q('SELECT last_completed_lego_id cursor, highest_completed_lego_id ceiling, count(*)::int n FROM course_enrollments WHERE course_id=$1 AND last_completed_lego_id LIKE $2 AND highest_completed_lego_id LIKE $2 GROUP BY 1,2 ORDER BY 1,2', [course, prefix]),
      legoProgressRows: await q('SELECT lego_id, count(*)::int rows, count(DISTINCT learner_id)::int learners FROM lego_progress WHERE course_id=$1 AND lego_id LIKE $2 GROUP BY 1 ORDER BY 1', [course, prefix]),
    };
    if (out) fs.writeFileSync(out, JSON.stringify(result, null, 1));
    console.log(JSON.stringify(result, null, 1));
  } finally { await pg.end(); }
}
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
