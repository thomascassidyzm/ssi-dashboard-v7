#!/usr/bin/env node
// tools/gle-round-realign-2026-09-10.cjs
//
// Realigns gle_for_eng learner round pointers after S0008L03 ("to try to" =
// iarracht a dhéanamh) was appended to seed 8.
//
// course_round_index is row_number() over (seed_number, lego_index) across the
// is_new LEGOs of a course, so inserting one LEGO at seed 8 renumbers every
// round after it: the round that was R23 is now R24, and so on to the end of
// the course. course_enrollments stores ABSOLUTE round numbers, so a stored
// value that meant "S0009L01" yesterday means "S0008L03" today unless it is
// shifted.
//
// The learner's actual POSITION is last_completed_lego_id, a lego_id, and this
// change renames no LEGO — nothing there moves and nothing is stranded. What
// moves is only the numeric mirror: the ratcheted ceiling used for the belt,
// the "furthest point" readout and the teacher views. It is shifted here so the
// number keeps pointing at the content it pointed at before.
//
//   node tools/gle-round-realign-2026-09-10.cjs --dry-run
//   node tools/gle-round-realign-2026-09-10.cjs --apply
//
// HISTORY. This tool was applied ONCE, on 2026-09-10, to 105 gle_for_eng rows
// (commit b5323292c). That run had no guard: a second --apply would have
// shifted 23 -> 24 -> 25, and a row already written under the new numbering
// was shifted too (foreign-eyes, confirmed 2026-09-11). Since then it is
// idempotent, three ways, none of them a comment or a --force:
//
//   1. An application RECORD is written to app_config in the same transaction
//      as the shift (applicationKey below). Present => the shift committed;
//      absent => it did not. A second --apply finds it and writes nothing.
//   2. The 2026-09-10 run predates that record, so the event this file ships
//      with lists it under priorApplications — the shipped script refuses to
//      apply its own event again. A NEW insertion is a new event: new LEGO,
//      new round, empty priorApplications, its own record key.
//   3. Per row, the anchor testifies where it can. The player stores the
//      round as a 0-based array position (LearningPlayer.vue,
//      `cachedRounds.value[roundIndex]`), i.e. course_round_index.round_index - 1.
//      If a row's stored value ALREADY equals that for its own lego_id under
//      the post-insertion numbering, it was written after the insertion and
//      is not shifted — the case a "have I run before?" flag alone would miss.
//
// A shift also needs the numbering it targets to be real: the run refuses
// unless course_round_index shows the inserted LEGO at exactly its round.
//
// Note on the threshold. Stored values are 0-based, so the first round the
// insertion moved (old R23, S0009L01) was stored as 22, not 23. The 2026-09-10
// run compared stored values against 23 and so left a row stored at exactly 22
// alone; the live check on 2026-09-11 found no gle_for_eng row at 22 or 23, so
// nothing was missed. storedRoundOf() carries the convention now.
//
// The ratchet trigger (ratchet_highest_completed_round) recomputes
// highest_completed_round_index from last_completed_round_index on every write,
// which would clamp a +1 on `highest` for rows whose last < highest. It is
// disabled for the duration of the transaction so the shift is exactly a
// shift: the trigger's job is to ratchet a learner's forward progress, and this
// write is not progress.

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const COURSE = 'gle_for_eng';
const INSERTED_ROUND = 23;             // course_round_index.round_index of S0008L03
const COLUMNS = [
  'last_completed_round_index',
  'highest_completed_round_index',
  'infplay_round_index',
  'pod_activation_round',
];
// The lego_id column each round column mirrors. infplay_round_index and
// pod_activation_round have no anchor: for them the event-level guards (1, 2)
// are the only protection, and that is why those guards exist.
const ANCHOR = {
  last_completed_round_index: 'last_completed_lego_id',
  highest_completed_round_index: 'highest_completed_lego_id',
};

/** The value the player stores for a course_round_index round r. */
const storedRoundOf = (r) => r - 1;

const DEFAULT_EVENT = {
  course: COURSE,
  insertedLegoId: 'S0008L03',
  insertedRound: INSERTED_ROUND,
  priorApplications: [
    { appliedOn: '2026-09-10', rows: 105, note: 'commit b5323292c, before the app_config record existed' },
  ],
};

/** app_config key that records this event's application, written with the shift. */
const applicationKey = (event) =>
  `round_realign:${event.course}:${event.insertedLegoId}@${event.insertedRound}`;

function databaseUrl() {
  const line = fs
    .readFileSync(path.join(__dirname, '..', '.env.psql'), 'utf8')
    .split('\n')
    .find((l) => l.startsWith('DATABASE_URL='));
  if (!line) throw new Error('.env.psql has no DATABASE_URL');
  return line.slice('DATABASE_URL='.length).trim();
}

/**
 * Per-row plan. `anchorRound` maps lego_id -> course_round_index.round_index
 * under the CURRENT (post-insertion) numbering.
 */
function planRow(row, anchorRound, event) {
  const threshold = storedRoundOf(event.insertedRound);
  const want = { id: row.id };
  const shifted = {};
  for (const col of COLUMNS) {
    const v = row[col];
    let shift = v !== null && v >= threshold;
    if (shift && ANCHOR[col]) {
      const r = anchorRound.get(row[ANCHOR[col]]);
      // Already agrees with its own lego under the new numbering: written
      // post-insertion, leave it. (The inserted LEGO itself only exists
      // post-insertion, so a row anchored on it is caught here too.)
      if (r !== undefined && storedRoundOf(r) === v) shift = false;
    }
    want[col] = shift ? v + 1 : v;
    shifted[col] = shift;
  }
  return { want, shifted };
}

/**
 * The realign, against any pg-compatible `client` ({ query(sql, params) }).
 * Exported so a test can run it twice against an in-process Postgres copy.
 */
async function realign(client, { apply = false, event = DEFAULT_EVENT, log = console.log } = {}) {
  const key = applicationKey(event);
  const threshold = storedRoundOf(event.insertedRound);

  // Guard 1: the record this run would write.
  const recorded = (await client.query('SELECT value FROM app_config WHERE key = $1', [key])).rows[0];
  if (recorded) {
    log(`${event.course}: ALREADY APPLIED at ${recorded.value.applied_at} (app_config key ${key}) — nothing to do, nothing written.`);
    return { applied: false, alreadyApplied: true, record: recorded.value };
  }
  // Guard 2: an application that predates the record.
  if (event.priorApplications && event.priorApplications.length) {
    const p = event.priorApplications[0];
    log(`${event.course}: ALREADY APPLIED on ${p.appliedOn} to ${p.rows} row(s) — recorded in this script's event, not in app_config. Nothing to do, nothing written.`);
    log('A new insertion is a new event: set insertedLegoId/insertedRound and an empty priorApplications.');
    return { applied: false, alreadyApplied: true, record: p };
  }
  // Precondition: the numbering we shift into is the one course_round_index holds.
  const index = (await client.query(
    'SELECT lego_id, round_index FROM course_round_index WHERE course_code = $1',
    [event.course],
  )).rows;
  const anchorRound = new Map(index.map((r) => [r.lego_id, r.round_index]));
  const got = anchorRound.get(event.insertedLegoId);
  if (got !== event.insertedRound) {
    throw new Error(
      `course_round_index does not show ${event.insertedLegoId} at round ${event.insertedRound} for ${event.course} `
      + `(${index.length} rows, ${event.insertedLegoId} at ${got === undefined ? 'no round' : got}). `
      + 'Refresh the view or check the event. Nothing written.',
    );
  }

  const anchorCols = Object.values(ANCHOR).join(', ');
  const before = (await client.query(
    `SELECT id, ${anchorCols}, ${COLUMNS.join(', ')} FROM course_enrollments WHERE course_id = $1 ORDER BY id`,
    [event.course],
  )).rows;

  const expected = new Map();
  const counts = Object.fromEntries(COLUMNS.map((c) => [c, 0]));
  const heldByAnchor = Object.fromEntries(Object.keys(ANCHOR).map((c) => [c, 0]));
  for (const row of before) {
    const { want, shifted } = planRow(row, anchorRound, event);
    for (const col of COLUMNS) {
      if (shifted[col]) counts[col] += 1;
      else if (ANCHOR[col] && row[col] !== null && row[col] >= threshold) heldByAnchor[col] += 1;
    }
    expected.set(row.id, want);
  }

  log(`${event.course}: ${before.length} enrollments; ${event.insertedLegoId} at round ${event.insertedRound}; stored values >= ${threshold} shift`);
  for (const col of COLUMNS) {
    const held = ANCHOR[col] ? `, ${heldByAnchor[col]} already on the new numbering (held)` : '';
    log(`  ${col}: ${counts[col]} row(s) shift +1${held}`);
  }

  if (!apply) {
    log('\nDRY RUN — nothing written. Re-run with --apply.');
    return { before, after: before, counts, applied: false };
  }

  await client.query('BEGIN');
  try {
    await client.query('ALTER TABLE course_enrollments DISABLE TRIGGER course_enrollments_ratchet_highest_round');
    const sets = COLUMNS.map((c) => {
      const anchored = ANCHOR[c]
        ? ` AND NOT EXISTS (SELECT 1 FROM course_round_index r WHERE r.course_code = e.course_id AND r.lego_id = e.${ANCHOR[c]} AND r.round_index - 1 = e.${c})`
        : '';
      return `${c} = CASE WHEN e.${c} >= ${threshold}${anchored} THEN e.${c} + 1 ELSE e.${c} END`;
    }).join(', ');
    const res = await client.query(
      `UPDATE course_enrollments e SET ${sets} WHERE e.course_id = $1`,
      [event.course],
    );
    await client.query('ALTER TABLE course_enrollments ENABLE TRIGGER course_enrollments_ratchet_highest_round');

    const after = (await client.query(
      `SELECT id, ${anchorCols}, ${COLUMNS.join(', ')} FROM course_enrollments WHERE course_id = $1 ORDER BY id`,
      [event.course],
    )).rows;
    if (after.length !== before.length) throw new Error(`row count moved: ${before.length} -> ${after.length}`);
    const beforeById = new Map(before.map((r) => [r.id, r]));
    for (const row of after) {
      const want = expected.get(row.id);
      if (!want) throw new Error(`unexpected enrollment ${row.id}`);
      const was = beforeById.get(row.id);
      for (const col of COLUMNS) {
        if (row[col] !== want[col]) throw new Error(`${row.id}.${col}: expected ${want[col]}, got ${row[col]}`);
        if (was[col] !== null && was[col] < threshold && row[col] !== was[col]) {
          throw new Error(`${row.id}.${col}: below the insertion (${was[col]}) yet moved to ${row[col]}`);
        }
        // Independent of the write: the anchor. A row that agreed with its
        // lego before must still agree, and a row that sat exactly one
        // behind (pre-insertion) must agree now.
        if (ANCHOR[col] && row[col] !== null && row[col] >= threshold) {
          const r = anchorRound.get(row[ANCHOR[col]]);
          if (r === undefined) continue;
          const agreedBefore = storedRoundOf(r) === was[col];
          const oneBehindBefore = storedRoundOf(r) - 1 === was[col];
          if ((agreedBefore || oneBehindBefore) && storedRoundOf(r) !== row[col]) {
            throw new Error(`${row.id}.${col}: ${row[ANCHOR[col]]} is round ${r}, stored ${was[col]} -> ${row[col]}, expected ${storedRoundOf(r)}`);
          }
        }
      }
    }

    await client.query(
      'INSERT INTO app_config (key, value) VALUES ($1, $2)',
      [key, JSON.stringify({
        course: event.course,
        inserted_lego_id: event.insertedLegoId,
        inserted_round: event.insertedRound,
        applied_at: new Date().toISOString(),
        rows_scanned: before.length,
        shifted: counts,
        tool: 'tools/gle-round-realign-2026-09-10.cjs',
      })],
    );
    await client.query('COMMIT');
    log(`\nAPPLIED — ${res.rowCount} enrollment row(s) scanned, all ${after.length} verified against plan and anchor; recorded as ${key}.`);
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

module.exports = { COURSE, INSERTED_ROUND, COLUMNS, ANCHOR, DEFAULT_EVENT, applicationKey, storedRoundOf, planRow, realign };
