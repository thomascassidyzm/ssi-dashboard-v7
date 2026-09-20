#!/usr/bin/env node
/**
 * refresh-round-index.cjs — keep the course_round_index materialized view honest
 *
 * course_round_index has no trigger and no RPC behind it: nothing in the estate
 * refreshes it. Its definition is
 *
 *   SELECT course_code,
 *          row_number() OVER (PARTITION BY course_code ORDER BY seed_number, lego_index),
 *          lego_id, seed_number, lego_index
 *   FROM course_legos WHERE is_new = true AND lego_id IS NOT NULL
 *
 * so the view goes wrong in THREE ways, and the first version of this tool could
 * only see one of them:
 *
 *   DANGLING   — a view row whose lego no longer exists (manual delete/merge).
 *   MISSING    — a lego the view should carry and does not (content appended).
 *   RENUMBERED — a lego present on both sides at a different round_index
 *                (anything inserted or removed mid-course shifts every round
 *                after it).
 *
 * The old check asked only "are there view rows pointing at legos that are
 * gone?", and then EXITED EARLY when the answer was no — which is exactly the
 * state a course in the MISSING case is in. afr_for_eng sat nine rounds short of
 * its own content for weeks with this tool reporting "nothing dangling" every
 * time it was run. Hence `drift()` below: the decision to refresh is taken on
 * all three counts, never on dangling alone.
 *
 * It reads and it refreshes the view. It never writes course_legos or any other
 * content table.
 *
 * Usage:
 *   node tools/refresh-round-index.cjs            # measure, refresh if drifted, re-measure
 *   node tools/refresh-round-index.cjs --check    # measure only, never refresh
 *   node tools/refresh-round-index.cjs --force    # refresh even when already in sync
 *   node tools/refresh-round-index.cjs --json     # machine-readable report on stdout
 *
 * Exit codes: 0 measured (drifted or not), 1 could not measure / drift survived
 * the refresh.
 */
const path = require('path');
const fsm = require('fs');

/**
 * One row per course where the view and its own predicate disagree.
 * The FULL JOIN is what makes this two-way: the left side is what the view
 * SHOULD hold, recomputed from course_legos with the view's own window, and the
 * right side is what it does hold. A lego on the left with no right is MISSING;
 * a row on the right with no left is DANGLING; both sides at different
 * round_index is RENUMBERED.
 */
const DRIFT_QUERY = `
  WITH want AS (
    SELECT course_code,
           row_number() OVER (PARTITION BY course_code ORDER BY seed_number, lego_index)::int AS round_index,
           lego_id
    FROM course_legos
    WHERE is_new = true AND lego_id IS NOT NULL
  ),
  j AS (
    SELECT coalesce(w.course_code, h.course_code) AS course_code,
           w.round_index AS want_round, h.round_index AS have_round
    FROM want w
    FULL JOIN course_round_index h
      ON h.course_code = w.course_code AND h.lego_id = w.lego_id
  )
  SELECT j.course_code,
         c.new_app_status,
         count(*) FILTER (WHERE have_round IS NULL)::int AS missing,
         count(*) FILTER (WHERE want_round IS NULL)::int AS dangling,
         count(*) FILTER (WHERE want_round IS NOT NULL AND have_round IS NOT NULL
                            AND want_round <> have_round)::int AS renumbered,
         count(*) FILTER (WHERE want_round IS NOT NULL)::int AS want_rows,
         count(*) FILTER (WHERE have_round IS NOT NULL)::int AS have_rows
  FROM j
  LEFT JOIN courses c ON c.course_code = j.course_code
  GROUP BY 1, 2
  ORDER BY 1
`;

const RELEASED = new Set(['live', 'beta']);

/**
 * The decision, kept pure so it can be tested without a database.
 * A course has drifted if ANY of the three counts is non-zero — the whole point
 * of the rewrite. `rows` is DRIFT_QUERY's result.
 */
function drift(rows) {
  const drifted = (rows || [])
    .map(r => ({
      course_code: r.course_code,
      status: r.new_app_status || null,
      released: RELEASED.has(r.new_app_status),
      missing: Number(r.missing) || 0,
      dangling: Number(r.dangling) || 0,
      renumbered: Number(r.renumbered) || 0,
      want_rows: Number(r.want_rows) || 0,
      have_rows: Number(r.have_rows) || 0,
    }))
    .filter(r => r.missing || r.dangling || r.renumbered)
    .sort((a, b) => (b.missing + b.dangling + b.renumbered) - (a.missing + a.dangling + a.renumbered));

  const sum = k => drifted.reduce((n, r) => n + r[k], 0);
  return {
    needsRefresh: drifted.length > 0,
    courses: drifted,
    released: drifted.filter(r => r.released),
    totals: {
      courses: drifted.length,
      released_courses: drifted.filter(r => r.released).length,
      missing: sum('missing'),
      dangling: sum('dangling'),
      renumbered: sum('renumbered'),
    },
  };
}

/** One line per drifted course, in the words a human would use. */
function describe(d) {
  if (!d.needsRefresh) return 'course_round_index matches course_legos on every course — nothing to refresh.';
  const L = [`${d.totals.courses} course(s) out of step with their own content (${d.totals.released_courses} released):`];
  for (const r of d.courses) {
    const bits = [];
    if (r.missing) bits.push(`${r.missing} round(s) missing`);
    if (r.dangling) bits.push(`${r.dangling} round(s) pointing at content that is gone`);
    if (r.renumbered) bits.push(`${r.renumbered} round(s) renumbered`);
    L.push(`  ${r.course_code} (${r.status || 'unknown'}): ${bits.join(', ')} — view holds ${r.have_rows}, content says ${r.want_rows}`);
  }
  return L.join('\n');
}

function databaseUrl() {
  const envFile = path.join(__dirname, '..', '.env.psql');
  const url = (fsm.readFileSync(envFile, 'utf8').match(/postgresql:\/\/[^\s"']+/) || [])[0];
  if (!url) throw new Error(`no DATABASE_URL in ${envFile}`);
  return url;
}

async function run({ check = false, force = false, json = false } = {}) {
  const { Client } = require('pg');
  const client = new Client({ connectionString: databaseUrl() });
  await client.connect();
  try {
    const before = drift((await client.query(DRIFT_QUERY)).rows);
    if (!json) { console.log('BEFORE:'); console.log(describe(before)); }

    if (check) return { before, after: before, refreshed: false };
    if (!before.needsRefresh && !force) {
      if (!json) console.log('in sync — no refresh needed (pass --force to refresh anyway)');
      return { before, after: before, refreshed: false };
    }

    if (!json) console.log('refreshing course_round_index (CONCURRENTLY)...');
    await client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index');

    const after = drift((await client.query(DRIFT_QUERY)).rows);
    if (!json) { console.log('AFTER:'); console.log(describe(after)); }
    return { before, after, refreshed: true };
  } finally {
    await client.end();
  }
}

module.exports = { drift, describe, DRIFT_QUERY, run };

if (require.main === module) {
  const json = process.argv.includes('--json');
  run({ check: process.argv.includes('--check'), force: process.argv.includes('--force'), json })
    .then(r => {
      if (json) console.log(JSON.stringify(r, null, 2));
      if (r.refreshed && r.after.needsRefresh) {
        console.error('drift SURVIVED the refresh — investigate before relying on the view');
        process.exit(1);
      }
    })
    .catch(e => { console.error('ERR:', e.message); process.exit(1); });
}
