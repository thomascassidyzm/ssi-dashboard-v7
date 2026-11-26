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
 *   node tools/refresh-round-index.cjs --course X # only course X (with --force: time one rebuild of it)
 *
 * Exit codes: 0 measured (drifted or not), 1 could not measure / drift survived
 * the refresh.
 */
const path = require('path');
const { boundedClient } = require('./qa/lib/bounded-client.cjs');
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

// ONE MECHANISM, NOT TWO (Tom's ruling, 2026-09-20). The write paths refresh
// this view as their last act through services/shared/round-index-refresh.cjs;
// this tool is the BACKSTOP that catches a write path nobody wired. It runs the
// same statement, resolved the same way, from that one module — so the nightly
// and the write paths can never disagree about what a refresh is.
const { databaseUrl, rebuildOn, scopedAvailable } = require('../services/shared/round-index-refresh.cjs');

/**
 * After ops/sql/20261126-round-index-table.sql (cs #533·AL) the round map's ONE
 * definition is the view course_round_index_source, so "what the map should
 * hold" is read from it rather than recomputed here. DRIFT_QUERY's own window
 * predates the woven-course ordering (#949), which is why cym_sv2_for_eng and
 * cym_nv2_for_eng were reported as drifted every night since October with the
 * refresh changing nothing: the check, not the map, was wrong for them.
 */
const SOURCE_WANT = `
    SELECT course_code, round_index, lego_id
    FROM course_round_index_source
    WHERE course_code = $1`;

async function run({ check = false, force = false, json = false, course = null } = {}) {
  const { Client } = require('pg');
  const connection = new Client({ connectionString: databaseUrl(), statement_timeout: 5000, application_name: 'qa:round-index' });
  await connection.connect();
  const client = boundedClient(connection, 'qa:round-index', { readOnly: false });
  try {
    const perCourse = await scopedAvailable(client);
    const { rows: courses } = course
      ? { rows: [{ course_code: course }] }
      : await client.query('SELECT course_code FROM courses ORDER BY course_code');
    async function measure() {
      const rows = [];
      let scoped = DRIFT_QUERY.replace('WHERE is_new = true', 'WHERE course_code = $1 AND is_new = true')
        .replace('FULL JOIN course_round_index h', 'FULL JOIN (SELECT * FROM course_round_index WHERE course_code = $1) h');
      if (perCourse) {
        const wantStart = scoped.indexOf('want AS (') + 'want AS ('.length;
        const wantEnd = scoped.indexOf('),', wantStart);
        scoped = scoped.slice(0, wantStart) + SOURCE_WANT + '\n  ' + scoped.slice(wantEnd);
      }
      for (const c of courses) rows.push(...(await client.query(scoped, [c.course_code])).rows);
      return drift(rows);
    }
    const before = await measure();
    if (!json) { console.log('BEFORE:'); console.log(describe(before)); }

    if (check) return { before, after: before, refreshed: false };
    if (!before.needsRefresh && !force) {
      if (!json) console.log('in sync — no refresh needed (pass --force to refresh anyway)');
      return { before, after: before, refreshed: false };
    }

    if (perCourse) {
      // Only what drifted, one course per statement (each well inside the 5 s cap);
      // --force rebuilds every course measured, which on an in-sync course writes nothing.
      const targets = force ? courses.map(c => c.course_code) : before.courses.map(r => r.course_code);
      for (const code of targets) {
        const t0 = Date.now();
        const out = await rebuildOn(client, code);
        if (!json) console.log(`rebuilt ${code}: ${out.changed} row(s) changed in ${Date.now() - t0}ms`);
      }
    } else {
      if (!json) console.log('refreshing course_round_index (whole view; per-course rebuild not installed)...');
      await rebuildOn(client);
    }

    const after = await measure();
    if (!json) { console.log('AFTER:'); console.log(describe(after)); }
    return { before, after, refreshed: true };
  } finally {
    await client.end();
  }
}

module.exports = { drift, describe, DRIFT_QUERY, databaseUrl, run };

if (require.main === module) {
  const json = process.argv.includes('--json');
  const ci = process.argv.indexOf('--course');
  const course = ci > 0 ? process.argv[ci + 1] : null;
  run({ check: process.argv.includes('--check'), force: process.argv.includes('--force'), json, course })
    .then(r => {
      if (json) console.log(JSON.stringify(r, null, 2));
      if (r.refreshed && r.after.needsRefresh) {
        console.error('drift SURVIVED the refresh — investigate before relying on the view');
        process.exit(1);
      }
    })
    .catch(e => { console.error('ERR:', e.message); process.exit(1); });
}
