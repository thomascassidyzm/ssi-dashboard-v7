#!/usr/bin/env node
// tools/gle-learner-progress-repair-2026-09-09.cjs
//
// Repairs learner progress after the gle_for_eng LEGO reorder (#737, commit
// 952c34937): renames lego_id in learner-owned rows so each learner's earned
// repetition/mastery state stays attached to the same CHUNK OF TEXT, not the
// teaching slot that chunk used to occupy. The reorder tool itself renamed
// course_legos/course_practice_phrases/decomposition/qa_flags but deliberately
// left learner tables alone — see its --learner-map and the comment on why.
//
// Every query is scoped to gle_for_eng explicitly: lego_id carries no course
// prefix and is reused identically across 113 courses' course_legos, so an
// unscoped query silently mixes in unrelated courses (job #743's finding).
//
// Live re-derivation on 2026-09-09 found exposure confined to a single seed:
// only seed 2 (the 2-LEGO swap S0002L01<->S0002L02) has any matching rows —
// every other seed in the reorder plan has zero. 138 lego_progress rows / 69
// learners, 18 learner_lego_metrics rows / 10 learners, 0 learner_l1_state.
// lego_introductions is course content (audio), not learner data — untouched.
//
// Because PLAN[2] is a straight two-element swap, the OLD and NEW lego_id sets
// are the same set {S0002L01, S0002L02} — only which row owns which label
// moves — so most affected learners hold rows for BOTH ids at once. A naive
// per-row UPDATE would collide with the (learner_id, lego_id, course) unique
// key mid-flight; this renames to a '#tmp' suffix first, same technique the
// reorder tool used for course_legos.
//
//   node tools/gle-learner-progress-repair-2026-09-09.cjs --dry-run
//   node tools/gle-learner-progress-repair-2026-09-09.cjs --apply
//
// HISTORY. This tool was applied ONCE, on 2026-09-09. That run had no guard,
// and a swap leaves the data unable to testify — {S0002L01, S0002L02} is the
// same set before and after, so a second --apply silently swapped everything
// back (foreign-eyes, confirmed 2026-09-10). Since then it is idempotent two
// ways, neither a comment nor a --force:
//
//   1. An application RECORD is written to app_config in the same transaction
//      as the rename (applicationKey below). Present => the rename committed.
//   2. The 2026-09-09 run predates that record, so the shipped event lists it
//      under priorApplications and the script refuses to apply its own event
//      again. A new reorder is a new event with its own key.
//
// (The sibling round-realign tool has a third, per-row guard from the lego
// anchor; a pure rename has no such anchor, which is exactly why 1 and 2 are
// the whole of the protection here.)

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { legoIdRenames } = require('./gle-lego-reorder-2026-09-09.cjs');

const COURSE = 'gle_for_eng';

const DEFAULT_EVENT = {
  course: COURSE,
  reorder: 'commit 952c34937 (#737)',
  priorApplications: [
    { appliedOn: '2026-09-09', note: '138 lego_progress / 18 learner_lego_metrics rows, before the app_config record existed' },
  ],
};

/** app_config key that records this event's application, written with the rename. */
const applicationKey = (event) => `learner_progress_repair:${event.course}:${event.reorder}`;

// Learner tables keyed by lego_id, and how each one names the course.
const TABLES = [
  { name: 'lego_progress', courseCol: 'course_id', pk: ['learner_id', 'lego_id', 'course_id'] },
  { name: 'learner_lego_metrics', courseCol: 'course_code', pk: ['learner_id', 'lego_id'] },
  { name: 'learner_l1_state', courseCol: 'course_code', pk: ['learner_id', 'course_code', 'lego_id'] },
];

function databaseUrl() {
  const envPath = path.join(__dirname, '..', '.env.psql');
  const line = fs.readFileSync(envPath, 'utf8').split('\n').find((l) => l.startsWith('DATABASE_URL='));
  if (!line) throw new Error('.env.psql has no DATABASE_URL');
  return line.slice('DATABASE_URL='.length).trim();
}

/** All columns of the table, in a stable order. */
async function columnsOf(client, table) {
  const { rows } = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name=$1 AND table_schema='public'`,
    [table],
  );
  return rows.map((r) => r.column_name);
}

async function snapshot(client, table, courseCol, ids) {
  const cols = await columnsOf(client, table);
  const { rows } = await client.query(
    `SELECT ${cols.join(', ')} FROM ${table} WHERE ${courseCol}=$1 AND lego_id = ANY($2)`,
    [COURSE, ids],
  );
  return rows;
}

/**
 * The repair, against any pg-compatible `client` ({ query(sql, params) }).
 * Exported so a test can run it twice against an in-process Postgres copy.
 */
async function repair(client, { apply = false, event = DEFAULT_EVENT, log = console.log } = {}) {
  const key = applicationKey(event);
  // Guard 1: the record this run would write.
  const recorded = (await client.query('SELECT value FROM app_config WHERE key = $1', [key])).rows[0];
  if (recorded) {
    log(`${event.course}: ALREADY APPLIED at ${recorded.value.applied_at} (app_config key ${key}) — nothing to do, nothing written.`);
    return { applied: false, alreadyApplied: true, record: recorded.value };
  }
  // Guard 2: an application that predates the record.
  if (event.priorApplications && event.priorApplications.length) {
    const p = event.priorApplications[0];
    log(`${event.course}: ALREADY APPLIED on ${p.appliedOn} — recorded in this script's event, not in app_config. Nothing to do, nothing written.`);
    return { applied: false, alreadyApplied: true, record: p };
  }

  const renames = legoIdRenames();
  const oldIds = [...renames.keys()];
  const newIds = [...renames.values()];
  const allIds = [...new Set([...oldIds, ...newIds])];

  try {
    await client.query('BEGIN');

    const report = {};
    for (const t of TABLES) {
      const before = await snapshot(client, t.name, t.courseCol, allIds);

      // rename to a tmp suffix first — avoids the unique-key collision when a
      // learner holds rows for both ends of a swap simultaneously
      await client.query(
        `UPDATE ${t.name} SET lego_id = lego_id || '#tmp' WHERE ${t.courseCol}=$1 AND lego_id = ANY($2)`,
        [COURSE, oldIds],
      );
      for (const [oldId, newId] of renames) {
        await client.query(
          `UPDATE ${t.name} SET lego_id = $3 WHERE ${t.courseCol}=$1 AND lego_id = $2`,
          [COURSE, `${oldId}#tmp`, newId],
        );
      }

      const after = await snapshot(client, t.name, t.courseCol, allIds);

      if (after.length !== before.length) {
        throw new Error(`${t.name}: row count changed ${before.length} -> ${after.length}`);
      }

      // every before-row's non-lego_id fields must reappear unchanged under its renamed lego_id
      let matched = 0;
      for (const b of before) {
        const expectedNewId = renames.get(b.lego_id) || b.lego_id;
        const a = after.find((r) => r.learner_id === b.learner_id && r.lego_id === expectedNewId);
        if (!a) throw new Error(`${t.name}: no after-row for learner ${b.learner_id} lego ${expectedNewId} (was ${b.lego_id})`);
        for (const col of Object.keys(b)) {
          if (col === 'lego_id' || col === 'updated_at') continue;
          const bv = JSON.stringify(b[col]);
          const av = JSON.stringify(a[col]);
          if (bv !== av) throw new Error(`${t.name}: learner ${b.learner_id} column ${col} changed (${bv} -> ${av}) across the rename`);
        }
        matched += 1;
      }

      report[t.name] = { rows: before.length, learners: new Set(before.map((r) => r.learner_id)).size, matched };
    }

    log(JSON.stringify(report, null, 2));

    if (apply) {
      await client.query(
        'INSERT INTO app_config (key, value) VALUES ($1, $2)',
        [key, JSON.stringify({
          course: event.course,
          reorder: event.reorder,
          applied_at: new Date().toISOString(),
          report,
          tool: 'tools/gle-learner-progress-repair-2026-09-09.cjs',
        })],
      );
      await client.query('COMMIT');
      log(`COMMITTED — recorded as ${key}`);
      return { report, applied: true };
    }
    await client.query('ROLLBACK');
    log('DRY RUN — rolled back');
    return { report, applied: false };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

async function main() {
  const apply = process.argv.includes('--apply');
  const client = new Client({ connectionString: databaseUrl() });
  await client.connect();
  try {
    await repair(client, { apply });
  } finally {
    await client.end();
  }
}

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
module.exports = { TABLES, DEFAULT_EVENT, applicationKey, repair };
