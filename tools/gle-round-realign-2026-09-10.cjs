#!/usr/bin/env node
// tools/gle-round-realign-2026-09-10.cjs
//
// Realigns gle_for_eng learner round pointers after S0008L03 ("to try to" =
// iarracht a dhéanamh) was appended to seed 8.
//
// course_round_index is row_number() over (seed_number, lego_index) across the
// is_new LEGOs of a course, so inserting one LEGO at seed 8 renumbers every
// round after it: the round that was R23 is now R24, and so on to the end of
// the course. course_enrollments stores ABSOLUTE round numbers, so a stored 23
// that meant "S0009L01" yesterday means "S0008L03" today unless it is shifted.
//
// The learner's actual POSITION is last_completed_lego_id, a lego_id, and this
// change renames no LEGO — nothing there moves and nothing is stranded. What
// moves is only the numeric mirror: the ratcheted ceiling used for the belt,
// the "furthest point" readout and the teacher views. It is shifted here so the
// number keeps pointing at the content it pointed at before.
//
// The columns are shifted by +1 where the stored value is >= 23 (the new
// round's index). Values below 23 name rounds the insertion did not move.
//
//   node tools/gle-round-realign-2026-09-10.cjs --dry-run
//   node tools/gle-round-realign-2026-09-10.cjs --apply
//
// The ratchet trigger (ratchet_highest_completed_round) recomputes
// highest_completed_round_index from last_completed_round_index on every write,
// which would clamp a +1 on `highest` for the two rows whose last < highest. It
// is disabled for the duration of the transaction so the shift is exactly a
// shift: the trigger's job is to ratchet a learner's forward progress, and this
// write is not progress.

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const COURSE = 'gle_for_eng';
const INSERTED_ROUND = 23;             // course_round_index of S0008L03
const COLUMNS = [
  'last_completed_round_index',
  'highest_completed_round_index',
  'infplay_round_index',
  'pod_activation_round',
];

function databaseUrl() {
  const line = fs
    .readFileSync(path.join(__dirname, '..', '.env.psql'), 'utf8')
    .split('\n')
    .find((l) => l.startsWith('DATABASE_URL='));
  if (!line) throw new Error('.env.psql has no DATABASE_URL');
  return line.slice('DATABASE_URL='.length).trim();
}

/**
 * The realign itself, against any pg-compatible `client` ({ query(sql, params) }).
 * Exported so a test can run it twice against an in-process Postgres copy.
 * Returns { before, after, counts, applied }.
 */
async function realign(client, { apply = false, log = console.log } = {}) {
  const before = (await client.query(
    `SELECT id, ${COLUMNS.join(', ')} FROM course_enrollments WHERE course_id = $1 ORDER BY id`,
    [COURSE],
  )).rows;

  const expected = new Map();
  const counts = Object.fromEntries(COLUMNS.map((c) => [c, 0]));
  for (const row of before) {
    const want = { id: row.id };
    for (const col of COLUMNS) {
      const v = row[col];
      want[col] = v !== null && v >= INSERTED_ROUND ? v + 1 : v;
      if (want[col] !== v) counts[col] += 1;
    }
    expected.set(row.id, want);
  }

  log(`${COURSE}: ${before.length} enrollments`);
  for (const col of COLUMNS) log(`  ${col}: ${counts[col]} row(s) shift +1`);

  if (!apply) {
    log('\nDRY RUN — nothing written. Re-run with --apply.');
    return { before, after: before, counts, applied: false };
  }

  await client.query('BEGIN');
  try {
    await client.query('ALTER TABLE course_enrollments DISABLE TRIGGER course_enrollments_ratchet_highest_round');
    const sets = COLUMNS.map((c) => `${c} = CASE WHEN ${c} >= ${INSERTED_ROUND} THEN ${c} + 1 ELSE ${c} END`).join(', ');
    const res = await client.query(
      `UPDATE course_enrollments SET ${sets} WHERE course_id = $1`,
      [COURSE],
    );
    await client.query('ALTER TABLE course_enrollments ENABLE TRIGGER course_enrollments_ratchet_highest_round');

    // Assert every row landed on the value computed from its own before-image.
    const after = (await client.query(
      `SELECT id, ${COLUMNS.join(', ')} FROM course_enrollments WHERE course_id = $1 ORDER BY id`,
      [COURSE],
    )).rows;
    if (after.length !== before.length) throw new Error(`row count moved: ${before.length} -> ${after.length}`);
    for (const row of after) {
      const want = expected.get(row.id);
      if (!want) throw new Error(`unexpected enrollment ${row.id}`);
      for (const col of COLUMNS) {
        if (row[col] !== want[col]) {
          throw new Error(`${row.id}.${col}: expected ${want[col]}, got ${row[col]}`);
        }
      }
    }
    await client.query('COMMIT');
    log(`\nAPPLIED — ${res.rowCount} enrollment row(s) rewritten, all ${after.length} verified against their before-image.`);
    return { before, after, counts, applied: true };
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
    await realign(client, { apply });
  } catch (err) {
    console.error('ROLLED BACK:', err.message);
    process.exitCode = 1;
  }
  await client.end();
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { COURSE, INSERTED_ROUND, COLUMNS, realign };
