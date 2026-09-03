#!/usr/bin/env node
// eng_for_hin: the English TARGET side lost its question marks in the 2026-09-02 teaching-layer
// rebuild. The Hindi KNOWN side of the same rows still carries '?', which is what makes the
// defect one-sided and unambiguous. Scan: 1,194 practice phrases (342 build / 852 use) across
// 333 seeds, all at seed 201+; seed 196 and earlier are clean. Plus one course_seeds row.
//
// Kai's instruction 2026-09-03: read every flagged phrase and confirm it really is a question
// in English before adding the mark. All 1,194 were read; 0 rejected. The reading list actually
// read is frozen in docs/eng-for-hin-question-marks-2026-09-03/reading-list.json and this tool
// refuses to write any row whose text has moved since (ABORT_DRIFT).
//
// Two legs, logged separately:
//   A. course_practice_phrases — target_text of the 1,194 confirmed rows
//   B. course_seeds            — target_text of seed 659 'Could you all say that'. Same sentence
//      the 2026-08-20 tool fixed on the English KNOWN side of every '%_for_eng' course; that pass
//      was scoped "English known side only", so eng_for_hin — where English is the TARGET — was
//      never reached by it.
//
// NOT touched, deliberately: the Hindi known side anywhere; capitalisation; word order; any
// phrase whose Hindi lacks '?'; decomposition/display_tiling; canonical_seeds (Hindi-target
// courses do not re-seed English from it on this side).
//
// AUDIO: nothing is generated or queued. Adding a trailing '?' does NOT drop audio links —
// normalize_text() strips trailing '.?!' and null_phrase_audio_on_text_change() explicitly keeps
// a link whose clip still speaks the new text under that normalisation. The 70 phrases that do
// have English audio therefore keep their clips, and those clips are now STALE (spoken with
// statement intonation). They are listed in the log for a later, separately approved pass.
//
// node tools/course-optimization/fix-eng-for-hin-question-marks-2026-09-03.cjs          (dry run)
// APPLY=1 node tools/course-optimization/fix-eng-for-hin-question-marks-2026-09-03.cjs  (writes)
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql') });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const APPLY = process.env.APPLY === '1';
const STAMP = '2026-09-03';
const COURSE = 'eng_for_hin';
const outDir = path.join(__dirname, '..', '..', 'docs', `eng-for-hin-question-marks-${STAMP}`);

// The confirmed reading list: every row id -> the exact target_text that was read and judged a
// question. Anything the DB now disagrees with is drift and is refused, never guessed at.
const readingList = JSON.parse(fs.readFileSync(path.join(outDir, 'reading-list.json'), 'utf8'));
const CONFIRMED = new Map(readingList.phrases.map(p => [p.id, p.target_text]));

// A second, independent gate applied at write time — belt and braces on top of the frozen list.
const INTERROGATIVE = /^(so |and |then |but )?(what|who|whom|whose|which|when|where|why|how|do|does|did|don't|doesn't|didn't|is|are|was|were|isn't|aren't|wasn't|weren't|can|could|can't|couldn't|will|would|won't|wouldn't|shall|should|shouldn't|may|might|have|has|had|haven't|hasn't|hadn't|am|must)\b/i;

function fixed(text) {
  return text + '?';
}

// Per-row: re-read, assert against the frozen list, write with the old value in the WHERE clause,
// verify exactly one row moved.
async function processRow(client, { table, textCol, id, expected, course, seed, extra }, log) {
  const { rows } = await client.query(
    `SELECT id, known_text, ${textCol} AS text FROM ${table} WHERE id = $1`,
    [id]
  );
  if (!rows.length) {
    log.push({ table, id, status: 'ABORT_NOT_FOUND' });
    return;
  }
  const before = rows[0].text;
  if (before !== expected) {
    log.push({ table, id, status: 'ABORT_DRIFT', before, expected });
    return;
  }
  if (before.trim().endsWith('?')) {
    log.push({ table, id, status: 'SKIP_ALREADY_PUNCTUATED', before });
    return;
  }
  // The Hindi cue must still be the question that licenses the mark.
  if (!rows[0].known_text.trim().endsWith('?')) {
    log.push({ table, id, status: 'ABORT_KNOWN_NOT_QUESTION', before, known: rows[0].known_text });
    return;
  }
  if (!INTERROGATIVE.test(before.trim())) {
    log.push({ table, id, status: 'ABORT_NOT_INTERROGATIVE', before });
    return;
  }
  const after = fixed(before);
  const entry = { table, id, course, seed, ...extra, before, after, status: 'OK' };
  log.push(entry);

  if (APPLY) {
    const { rowCount } = await client.query(
      `UPDATE ${table} SET ${textCol} = $1 WHERE id = $2 AND ${textCol} = $3`,
      [after, id, before]
    );
    entry.applied = rowCount === 1;
    if (rowCount !== 1) entry.status = 'ABORT_WRITE_RACE';
  }
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const log = { mode: APPLY ? 'apply' : 'dryrun', stamp: STAMP, course: COURSE, phrases: [], seeds: [] };

  // --- Leg A: practice phrases ------------------------------------------------
  const { rows: phraseRows } = await client.query(
    `SELECT id, seed_number, position, phrase_role, target_text,
            target1_audio_id, target2_audio_id, presentation_audio_id
       FROM course_practice_phrases
      WHERE course_code = $1
        AND trim(known_text) LIKE '%?'
        AND trim(target_text) NOT LIKE '%?'
      ORDER BY seed_number, position, id`,
    [COURSE]
  );

  for (const r of phraseRows) {
    if (!CONFIRMED.has(r.id)) {
      // A row the reading list never saw. Not read = not confirmed = not touched.
      log.phrases.push({ table: 'course_practice_phrases', id: r.id, seed: r.seed_number,
                         status: 'ABORT_UNREAD', before: r.target_text });
      continue;
    }
    await processRow(client, {
      table: 'course_practice_phrases',
      textCol: 'target_text',
      id: r.id,
      expected: CONFIRMED.get(r.id),
      course: COURSE,
      seed: r.seed_number,
      extra: {
        phrase_role: r.phrase_role,
        had_target_audio: Boolean(r.target1_audio_id || r.target2_audio_id),
        target1_audio_id: r.target1_audio_id,
        target2_audio_id: r.target2_audio_id,
      },
    }, log.phrases);
  }

  // --- Leg B: the one seed row ------------------------------------------------
  const { rows: seedRows } = await client.query(
    `SELECT id, seed_number, target_text FROM course_seeds
      WHERE course_code = $1
        AND trim(known_text) LIKE '%?'
        AND trim(target_text) NOT LIKE '%?'
      ORDER BY seed_number`,
    [COURSE]
  );
  for (const r of seedRows) {
    const expected = readingList.seeds.find(s => s.id === r.id);
    if (!expected) {
      log.seeds.push({ table: 'course_seeds', id: r.id, seed: r.seed_number,
                       status: 'ABORT_UNREAD', before: r.target_text });
      continue;
    }
    await processRow(client, {
      table: 'course_seeds',
      textCol: 'target_text',
      id: r.id,
      expected: expected.target_text,
      course: COURSE,
      seed: r.seed_number,
      extra: {},
    }, log.seeds);
  }

  await client.end();

  const all = [...log.phrases, ...log.seeds];
  log.summary = all.reduce((acc, e) => { acc[e.status] = (acc[e.status] || 0) + 1; return acc; }, {});
  log.summary.stale_audio_phrases = log.phrases.filter(e => e.status === 'OK' && e.had_target_audio).length;

  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${APPLY ? 'applied' : 'dryrun'}-log.json`);
  fs.writeFileSync(outFile, JSON.stringify(log, null, 1));
  console.log(JSON.stringify(log.summary, null, 1));
  console.log('log ->', outFile);
}

main().catch(e => { console.error(e); process.exit(1); });
