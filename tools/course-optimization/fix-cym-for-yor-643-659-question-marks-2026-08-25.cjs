#!/usr/bin/env node
// cym_for_yor seeds 643 and 659 are direct questions in the Yoruba known side
// (Ṣé ... question particle, and both end '?') but the Welsh target_text carries
// no terminal punctuation at all. Kai authorised: add the missing '?' to the
// Welsh target, change nothing else — not a word, not a mutation, not the
// dialect. Northern Welsh forms (dach chi, fedrach chi, isio) are the standard
// and stand as-is.
//
// Pre-write safety already verified by hand for both rows before this script
// was written: target1_audio_id / target2_audio_id / known_audio_id all NULL,
// no course_audio row matches either target_text, no course_legos or
// course_practice_phrases rows exist at seed 643 or 659 for this course.
//
// node tools/course-optimization/fix-cym-for-yor-643-659-question-marks-2026-08-25.cjs            (dry run)
// APPLY=1 node tools/course-optimization/fix-cym-for-yor-643-659-question-marks-2026-08-25.cjs    (writes)
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql'), quiet: true });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const APPLY = process.env.APPLY === '1';
const STAMP = '2026-08-25';
const outDir = path.join(__dirname, '..', '..', 'docs', 'seed-punctuation-cym-for-yor-643-659-2026-08-25');

const EXPECTED = new Map([
  [643, 'Dach chi isio syr'],
  [659, 'Fedrach chi i gyd ddeud hynna'],
]);

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const log = { mode: APPLY ? 'apply' : 'dryrun', stamp: STAMP, rows: [] };

  const { rows } = await client.query(
    `SELECT id, seed_number, known_text, target_text, target1_audio_id, target2_audio_id, known_audio_id
       FROM course_seeds
      WHERE course_code = 'cym_for_yor' AND seed_number IN (643, 659)
      ORDER BY seed_number`
  );

  for (const r of rows) {
    const expected = EXPECTED.get(r.seed_number);
    const entry = { seed_number: r.seed_number, id: r.id, known_text: r.known_text, before: r.target_text };

    if (r.target1_audio_id || r.target2_audio_id || r.known_audio_id) {
      entry.status = 'ABORT_AUDIO_LINKED';
      log.rows.push(entry);
      continue;
    }
    if (r.target_text !== expected) {
      entry.status = 'ABORT_DRIFT';
      log.rows.push(entry);
      continue;
    }
    if (r.target_text.endsWith('?')) {
      entry.status = 'SKIP_ALREADY_PUNCTUATED';
      log.rows.push(entry);
      continue;
    }

    const after = r.target_text + '?';
    entry.after = after;
    entry.status = 'OK';
    log.rows.push(entry);

    if (APPLY) {
      const { rowCount } = await client.query(
        `UPDATE course_seeds SET target_text = $1
          WHERE id = $2 AND target_text = $3
            AND target1_audio_id IS NULL AND target2_audio_id IS NULL AND known_audio_id IS NULL`,
        [after, r.id, r.target_text]
      );
      entry.applied = rowCount === 1;
      if (rowCount !== 1) entry.status = 'ABORT_WRITE_RACE';
    }
  }

  // Independent re-query duplicate check across the whole course, not derived from rows above.
  const { rows: dupCheck } = await client.query(
    `SELECT target_text, count(*)::int AS n, array_agg(seed_number ORDER BY seed_number) AS seeds
       FROM course_seeds
      WHERE course_code = 'cym_for_yor'
      GROUP BY target_text
      HAVING count(*) > 1
      ORDER BY n DESC`
  );
  log.duplicates_by_target_text = dupCheck;

  fs.mkdirSync(outDir, { recursive: true });
  const touched = log.rows.filter(r => r.status === 'OK').length;
  const suffix = APPLY ? (touched ? 'applied' : 'rerun-noop') : 'dryrun';
  const outFile = path.join(outDir, `fix-cym-for-yor-643-659-${suffix}-log.json`);
  fs.writeFileSync(outFile, JSON.stringify(log, null, 2));

  console.log(JSON.stringify(log, null, 2));
  console.log(`Wrote ${outFile}`);

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
