#!/usr/bin/env node
/**
 * scan-course Check 18 — LEGO presentation/text drift, as a runnable check.
 *
 *   node tools/check-presentation-drift.cjs <course_code>   # one course
 *   node tools/check-presentation-drift.cjs --all           # whole estate
 *   node tools/check-presentation-drift.cjs <course> --json  # machine-readable
 *
 * READ-ONLY. It never writes to course content.
 *
 * It ALWAYS prints a coverage figure. The defect this replaces reported clean
 * because its template silently skipped 70% of the estate's presentation clips;
 * a coverage number next to the result is what makes that impossible to repeat.
 * A run whose coverage is below 99% should be treated as a failed run, not a
 * clean course.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.psql') });
const { Client } = require('pg');
const { matchesKnown } = require('./presentation-drift.cjs');

const COVERAGE_FLOOR = 99.0;

async function query(sql, params = []) {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try {
    return (await c.query(sql, params)).rows;
  } finally {
    await c.end();
  }
}

async function run(courseCode) {
  const rows = await query(
    `select l.course_code, l.seed_number, l.lego_index, l.known_text, l.target_text,
            l.presentation_audio_id, a.text as clip_text
       from course_legos l
       join course_audio a on a.id::text = l.presentation_audio_id
      where l.presentation_audio_id is not null
        and a.text is not null
        ${courseCode ? 'and l.course_code = $1' : ''}
      order by l.course_code, l.seed_number, l.lego_index`,
    courseCode ? [courseCode] : []
  );

  const drift = [], unparsed = [];
  for (const r of rows) {
    const v = matchesKnown(r.clip_text, r.known_text);
    if (v.status === 'drift') drift.push({ ...r, announced: v.announced });
    else if (v.status === 'unparsed') unparsed.push({ ...r, reason: v.reason });
  }
  const parsed = rows.length - unparsed.length;
  return {
    course: courseCode || 'ALL',
    clips: rows.length,
    parsed,
    unparsed: unparsed.length,
    coverage: rows.length ? +((100 * parsed) / rows.length).toFixed(2) : 100,
    drift: drift.length,
    drift_rows: drift,
    unparsed_rows: unparsed,
  };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const course = args.find((a) => !a.startsWith('--'));
  if (!course && !args.includes('--all')) {
    console.error('usage: check-presentation-drift.cjs <course_code> | --all  [--json]');
    process.exit(2);
  }
  run(course).then((r) => {
    if (json) { console.log(JSON.stringify(r, null, 1)); }
    else {
      console.log(`[18] PRESENTATION/TEXT DRIFT: ${r.drift}`);
      console.log(`     coverage: ${r.parsed}/${r.clips} clips parsed (${r.coverage}%)` +
                  (r.unparsed ? ` — ${r.unparsed} UNPARSED, not judged` : ''));
      if (r.coverage < COVERAGE_FLOOR) {
        console.log(`     ⚠️  coverage below ${COVERAGE_FLOOR}% — treat this run as FAILED, not clean.`);
      }
      for (const d of r.drift_rows.slice(0, 40)) {
        console.log(`     ${d.course_code} S${d.seed_number}L${d.lego_index}` +
                    `  LEGO ${JSON.stringify(d.known_text)}  ANNOUNCED ${JSON.stringify(d.announced)}`);
      }
      if (r.drift_rows.length > 40) console.log(`     … ${r.drift_rows.length - 40} more`);
      for (const u of r.unparsed_rows.slice(0, 20)) {
        console.log(`     UNPARSED ${u.course_code} S${u.seed_number}L${u.lego_index} (${u.reason}): ${JSON.stringify(String(u.clip_text).slice(0, 90))}`);
      }
    }
    // Non-zero exit on drift OR on a coverage shortfall: an unreadable run must
    // not read as a pass.
    process.exit(r.drift > 0 || r.coverage < COVERAGE_FLOOR ? 1 : 0);
  }).catch((e) => { console.error(e); process.exit(3); });
}

module.exports = { run, COVERAGE_FLOOR };
