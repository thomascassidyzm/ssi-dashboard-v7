#!/usr/bin/env node
// Seeds 643 and 659 are questions in English and have always been missing their question mark.
// Every course that mirrors English punctuation has faithfully mirrored the typo.
// Tom ruled 2026-08-20: "yes, fix" — punctuation only, English known side only.
//
// Three legs, each logged separately:
//   A. course_seeds        — known_text of seeds 643/659 in every '%_for_eng' course (expect 156)
//   B. course_practice_phrases — rows whose known_text IS the whole sentence, build/use only,
//                            '%_for_eng' only, never phrase_role='component' (expect 25)
//   C. canonical_seeds     — source_text for S0643/S0659 (expect 2). This is the table
//                            initializeCourseSeeds() copies from when a NEW course is created
//                            (services/course-builder/routes/seed-complete.cjs:308), so leaving
//                            it unpunctuated would re-seed the typo into every future course.
//
// NOT touched, deliberately: target_text anywhere; non-English known sides at the same seed
// numbers; capitalisation ('Do you want sir' vs 'do you want sir'); commas/vocatives; the two
// empty eng_for_spa known_text rows. No audio is generated or queued — see the doc for why.
//
// node tools/course-optimization/fix-seed-punctuation-643-659-2026-08-20.cjs            (dry run)
// APPLY=1 node tools/course-optimization/fix-seed-punctuation-643-659-2026-08-20.cjs    (writes)
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql') });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const APPLY = process.env.APPLY === '1';
const STAMP = '2026-08-20';
const outDir = path.join(__dirname, '..', '..', 'docs', 'seed-punctuation-643-659-2026-08-20');

// The only known_text values this script will ever write over. Anything else = drift = abort.
const EXPECTED = new Set([
  'Do you want sir',
  'do you want sir',
  'Could you all say that',
  'could you all say that',
]);

function fixed(text) {
  return text + '?';
}

// Per-row: re-read, assert, write with the old value in the WHERE clause, verify one row moved.
async function processRow(client, { table, idCol, textCol, id, course, seed, extra }, log) {
  const { rows } = await client.query(
    `SELECT ${idCol} AS id, ${textCol} AS text FROM ${table} WHERE ${idCol} = $1`,
    [id]
  );
  if (!rows.length) {
    log.push({ table, id, status: 'ABORT_NOT_FOUND' });
    return;
  }
  const before = rows[0].text;
  if (!EXPECTED.has(before)) {
    log.push({ table, id, status: 'ABORT_DRIFT', before });
    return;
  }
  if (before.endsWith('?')) {
    log.push({ table, id, status: 'SKIP_ALREADY_PUNCTUATED', before });
    return;
  }
  const after = fixed(before);
  const entry = { table, id, course, seed, ...extra, before, after, status: 'OK' };
  log.push(entry);

  if (APPLY) {
    const { rowCount } = await client.query(
      `UPDATE ${table} SET ${textCol} = $1 WHERE ${idCol} = $2 AND ${textCol} = $3`,
      [after, id, before]
    );
    entry.applied = rowCount === 1;
    if (rowCount !== 1) entry.status = 'ABORT_WRITE_RACE';
  }
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const log = { mode: APPLY ? 'apply' : 'dryrun', stamp: STAMP, seeds: [], phrases: [], canonical: [] };

  // ---- Leg A: course_seeds, English known side only -------------------------
  const { rows: seedRows } = await client.query(
    `SELECT id, course_code, seed_number, known_text
       FROM course_seeds
      WHERE seed_number IN (643, 659)
        AND course_code LIKE '%\\_for\\_eng'
        AND known_text = ANY($1::text[])
      ORDER BY course_code, seed_number`,
    [[...EXPECTED]]
  );
  for (const r of seedRows) {
    await processRow(client, {
      table: 'course_seeds', idCol: 'id', textCol: 'known_text',
      id: r.id, course: r.course_code, seed: r.seed_number,
    }, log.seeds);
  }

  // ---- Leg B: whole-sentence practice phrases -------------------------------
  // Only rows whose known_text IS the complete sentence (case-insensitively identical to the
  // seed's English), only build/use, never component rows (literal tiling glosses, per Tom's
  // 2026-07-04 component-scope ruling), only '%_for_eng'.
  const { rows: phraseRows } = await client.query(
    `SELECT id, course_code, seed_number, phrase_role, known_text
       FROM course_practice_phrases
      WHERE course_code LIKE '%\\_for\\_eng'
        AND phrase_role IN ('build', 'use')
        AND known_text = ANY($1::text[])
      ORDER BY course_code, seed_number`,
    [[...EXPECTED]]
  );
  for (const r of phraseRows) {
    await processRow(client, {
      table: 'course_practice_phrases', idCol: 'id', textCol: 'known_text',
      id: r.id, course: r.course_code, seed: r.seed_number, extra: { phrase_role: r.phrase_role },
    }, log.phrases);
  }

  // ---- Leg C: canonical_seeds (the re-seed source) --------------------------
  const { rows: canonRows } = await client.query(
    `SELECT id, seed_number, source_text
       FROM canonical_seeds
      WHERE seed_number IN (643, 659)
        AND source_text = ANY($1::text[])
      ORDER BY seed_number`,
    [[...EXPECTED]]
  );
  for (const r of canonRows) {
    await processRow(client, {
      table: 'canonical_seeds', idCol: 'id', textCol: 'source_text',
      id: r.id, course: '(canonical)', seed: r.seed_number,
    }, log.canonical);
  }

  // ---- Independent re-query, not derived from the logs above ----------------
  const { rows: recon } = await client.query(
    `SELECT
       (SELECT count(*) FROM course_seeds
         WHERE seed_number IN (643,659) AND course_code LIKE '%\\_for\\_eng'
           AND known_text LIKE '%?')::int AS seeds_with_q,
       (SELECT count(*) FROM course_seeds
         WHERE seed_number IN (643,659) AND course_code LIKE '%\\_for\\_eng'
           AND known_text = ANY($1::text[]))::int AS seeds_unpunctuated,
       (SELECT count(*) FROM course_practice_phrases
         WHERE course_code LIKE '%\\_for\\_eng' AND phrase_role IN ('build','use')
           AND known_text LIKE '%?'
           AND lower(trim(known_text)) IN ('do you want sir?','could you all say that?'))::int AS phrases_with_q,
       (SELECT count(*) FROM course_practice_phrases
         WHERE course_code LIKE '%\\_for\\_eng' AND phrase_role IN ('build','use')
           AND known_text = ANY($1::text[]))::int AS phrases_unpunctuated,
       (SELECT count(*) FROM canonical_seeds
         WHERE seed_number IN (643,659) AND source_text LIKE '%?')::int AS canonical_with_q`,
    [[...EXPECTED]]
  );
  log.reconciliation = recon[0];

  fs.mkdirSync(outDir, { recursive: true });
  // A re-run finds nothing to do (that IS the idempotency proof) — don't let its empty result
  // overwrite the log of the run that actually wrote the rows.
  const touched = log.seeds.length + log.phrases.length + log.canonical.length;
  const suffix = APPLY ? (touched ? 'applied' : 'rerun-noop') : 'dryrun';
  const outFile = path.join(outDir, `fix-seed-punctuation-643-659-${suffix}-log.json`);
  fs.writeFileSync(outFile, JSON.stringify(log, null, 2));

  const count = (arr, s) => arr.filter(r => r.status === s).length;
  for (const [name, arr] of [['course_seeds', log.seeds], ['practice_phrases', log.phrases], ['canonical_seeds', log.canonical]]) {
    console.log(`${name}: ${arr.length} candidates — OK ${count(arr, 'OK')}, skip ${count(arr, 'SKIP_ALREADY_PUNCTUATED')}, drift ${count(arr, 'ABORT_DRIFT')}, notfound ${count(arr, 'ABORT_NOT_FOUND')}, race ${count(arr, 'ABORT_WRITE_RACE')}`);
  }
  console.log('reconciliation (independent re-query):', log.reconciliation);
  console.log(`Wrote ${outFile}`);

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
