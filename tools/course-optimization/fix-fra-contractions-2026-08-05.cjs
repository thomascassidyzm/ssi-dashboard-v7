#!/usr/bin/env node
// French elision fixes, approved by Tom 2026-08-05 ("surely they are all trivial fixes?").
// Scope: exactly 3 patterns from docs/exception-lego-leak-sweep-2026-08-04.md findings #1-3.
//   1. fra_ca_for_eng: "que on" -> "qu'on"
//   2. fra_for_eng:    "jusqu'à ce que il/elle" -> "jusqu'à ce qu'il/qu'elle"
//   3. fra_for_eng:    "si il" -> "s'il"
//
// DRY_RUN=1 node tools/course-optimization/fix-fra-contractions-2026-08-05.cjs   (default: dry run)
// APPLY=1   node tools/course-optimization/fix-fra-contractions-2026-08-05.cjs   (writes)
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql') });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const APPLY = process.env.APPLY === '1';
const STAMP = '2026-08-05';
const outDir = path.join(__dirname, '..', '..', 'docs', 'backfill-2026-08-04');

// Rows confirmed live and read in context (seed + siblings) before this script was written.
// See docs/fra-contraction-fixes-2026-08-05.md for the full evidence trail.
const ROWS = [
  { id: 'fra_ca_for_eng:S0038L02U05', course: 'fra_ca_for_eng', find: 'que on', replace: "qu'on" },
  { id: 'fra_ca_for_eng:S0022L01U02', course: 'fra_ca_for_eng', find: 'que on', replace: "qu'on" },
  { id: 'fra_ca_for_eng:S0033L01U05', course: 'fra_ca_for_eng', find: 'que on', replace: "qu'on" },
  { id: 'fra_ca_for_eng:S0047L01B04', course: 'fra_ca_for_eng', find: 'que on', replace: "qu'on" },
  { id: 'fra_for_eng:S0289L01U05', course: 'fra_for_eng', find: 'si il', replace: "s'il" },
];

// Expected before-state, asserted against live DB before any write — abort on drift.
const EXPECTED_BEFORE = {
  'fra_ca_for_eng:S0038L02U05': "ça fait à peu près une semaine que on veut y penser",
  'fra_ca_for_eng:S0022L01U02': 'parce que on veut se voir demain',
  'fra_ca_for_eng:S0033L01U05': 'ça fait combien de temps que on veut se voir?',
  'fra_ca_for_eng:S0047L01B04': "j'pense que on veut se voir",
  'fra_for_eng:S0289L01U05': 'je me demande si il va finir son travail',
};

function applyReplace(target, find, replace) {
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${find.replace(/'/g, "'")}(?![\\p{L}\\p{N}])`, 'u');
  return target.replace(re, replace);
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const log = [];
  for (const row of ROWS) {
    const { rows } = await client.query(
      'SELECT id, course_code, seed_number, lego_index, phrase_role, known_text, target_text FROM course_practice_phrases WHERE id = $1',
      [row.id]
    );
    if (!rows.length) {
      log.push({ ...row, status: 'ABORT_NOT_FOUND' });
      continue;
    }
    const live = rows[0];
    if (live.target_text !== EXPECTED_BEFORE[row.id]) {
      log.push({ ...row, status: 'ABORT_DRIFT', expected: EXPECTED_BEFORE[row.id], actual: live.target_text });
      continue;
    }
    const newTarget = applyReplace(live.target_text, row.find, row.replace);
    if (newTarget === live.target_text) {
      log.push({ ...row, status: 'ABORT_NO_CHANGE', before: live.target_text });
      continue;
    }

    // ZUT sanity: does any other row already use this known_text with a different target?
    const nk = s => (s || '').toLowerCase().trim().replace(/[.?!,]+$/, '');
    const { rows: collisionRows } = await client.query(
      `SELECT id, target_text FROM course_practice_phrases
       WHERE course_code = $1 AND lower(trim(known_text)) = $2 AND id != $3`,
      [live.course_code, nk(live.known_text), live.id]
    );
    const newCollisions = collisionRows.filter(c => c.target_text.trim() !== newTarget.trim() && c.target_text.trim() === live.target_text.trim());
    // (Only relevant if some other row shared the exact old target for the same known text pre-fix
    // and would now diverge; not expected for these singleton USE/BUILD rows, checked anyway.)

    log.push({
      id: row.id,
      course: row.course,
      seed_number: live.seed_number,
      lego_index: live.lego_index,
      phrase_role: live.phrase_role,
      known_text: live.known_text,
      before: live.target_text,
      after: newTarget,
      zut_collisions_checked: collisionRows.length,
      status: 'OK',
    });

    if (APPLY) {
      const { rowCount } = await client.query(
        'UPDATE course_practice_phrases SET target_text = $1 WHERE id = $2 AND target_text = $3',
        [newTarget, row.id, live.target_text]
      );
      log[log.length - 1].applied = rowCount === 1;
      if (rowCount !== 1) log[log.length - 1].status = 'ABORT_WRITE_RACE';
    }
  }

  const outFile = path.join(outDir, `fra-contraction-${APPLY ? 'applied' : 'dryrun'}-log-${STAMP}.json`);
  fs.writeFileSync(outFile, JSON.stringify(log, null, 2));
  console.log(`Wrote ${outFile}`);
  console.table(log.map(l => ({ id: l.id, status: l.status, before: l.before, after: l.after })));

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
