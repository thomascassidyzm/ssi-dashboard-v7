#!/usr/bin/env node
'use strict';
// tools/course-optimization/cat-s0028-es-fresh-phrases-2026-10-05.cjs
//
// cat_for_eng seed 28 (S0028L01 "it is | és", round 86). After job #858·J swapped the LEGOs, its basket was filled by
// REUSING existing audio: five of the eight rows have a target text that is already a phrase elsewhere in the course
// (S0028L01B01 "és" = S0017L03's component, U02 = S0270L03, U03 = S0068L01, U04/U05 = S0017L03). Kai (2026-10-05, job #860):
// write fresh ones. This inserts seven NEW rows (two builds, five uses) after the eight existing ones and tags the four
// reused USE rows they replace (metadata.retire_after_fresh_audio). Nothing is deleted and no audio is rendered: the new
// rows carry no audio, so the player skips them until the render pass voices them; THAT pass then deletes the tagged rows
// and renumbers positions to FINAL_ORDER.
//
// Rule the verify mode enforces: every Catalan word is taught by a LEGO at a round BEFORE 86 (or is "és" itself, R52 inside
// "quina és"), and no new target text exists as a phrase anywhere else in the course.
//
//   node tools/course-optimization/cat-s0028-es-fresh-phrases-2026-10-05.cjs          # verify only
//   APPLY=1 node tools/course-optimization/cat-s0028-es-fresh-phrases-2026-10-05.cjs  # insert + tag + unapprove seed 28 + refresh
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'cat_for_eng';
const SEED = 28, LEGO_INDEX = 1, LEGO_ROUND = 86;
const SWEEP = 'cat-s0028-es-fresh-phrases-2026-10-05';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const JOB = '#860 (cat-s0028-es-fresh-phrases)';

// suffix = the id tail (id is `${COURSE}:S0028L01${suffix}`); replaces = the reused row this one stands in for.
const NEW_ROWS = [
  { suffix: 'B04', role: 'build', pos: 9,  known: 'it is a word', target: 'és una paraula' },
  { suffix: 'B05', role: 'build', pos: 10, known: 'it is a word I want to remember', target: 'és una paraula que vull recordar' },
  { suffix: 'U06', role: 'use', pos: 11, known: "it's too soon", target: 'és massa aviat', replaces: 'U02' },
  { suffix: 'U07', role: 'use', pos: 12, known: 'it is his name', target: 'és el seu nom', replaces: 'U03' },
  { suffix: 'U08', role: 'use', pos: 13, known: "it isn't what I mean", target: 'no és el que vull dir', replaces: 'U04' },
  { suffix: 'U09', role: 'use', pos: 14, known: "it's possible to practise with someone else", target: 'és possible practicar amb algú altre', replaces: 'U05' },
  { suffix: 'U10', role: 'use', pos: 15, known: "it isn't possible to speak all day", target: 'no és possible parlar tot el dia' },
];
const RETIRE = ['U02', 'U03', 'U04', 'U05'];
// Order the basket must have once the retired rows are gone (the render pass sets positions 1..N from this).
const FINAL_ORDER = ['B01', 'B02', 'B03', 'B04', 'B05', 'U01', 'U06', 'U07', 'U08', 'U09', 'U10'];

const words = t => t.toLowerCase().normalize('NFC').split(/[^\p{L}'’·-]+/u).filter(Boolean).flatMap(w => w.split(/['’-]/).filter(Boolean));

async function main() {
  const APPLY = process.env.APPLY === '1';
  const { Client } = require('pg');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const problems = [];
  const { rows: taught } = await pg.query(
    `SELECT l.target_text FROM course_round_index r JOIN course_legos l ON l.course_code=r.course_code AND l.lego_id=r.lego_id
      WHERE r.course_code=$1 AND r.round_index < $2`, [COURSE, LEGO_ROUND]);
  const known = new Set(taught.flatMap(r => words(r.target_text)));
  known.add('és');
  for (const r of NEW_ROWS) {
    const untaught = words(r.target).filter(w => !known.has(w));
    if (untaught.length) problems.push(`${r.suffix} "${r.target}": untaught before R${LEGO_ROUND}: ${untaught.join(', ')}`);
    const { rows: dup } = await pg.query(
      `SELECT id FROM course_practice_phrases WHERE course_code=$1 AND lower(target_text)=lower($2) AND id <> $3`, [COURSE, r.target, `${COURSE}:S0028L01${r.suffix}`]);
    if (dup.length) problems.push(`${r.suffix} "${r.target}": already a phrase at ${dup.map(d => d.id).join(', ')}`);
    const { rows: clash } = await pg.query(
      `SELECT target_text FROM course_practice_phrases WHERE course_code=$1 AND lower(known_text)=lower($2) AND lower(target_text)<>lower($3) LIMIT 3`, [COURSE, r.known, r.target]);
    if (clash.length) problems.push(`${r.suffix} ZUT: known "${r.known}" already means ${clash.map(c => `"${c.target_text}"`).join(', ')}`);
  }
  const { rows: have } = await pg.query(`SELECT id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2)`, [COURSE, NEW_ROWS.map(r => `${COURSE}:S0028L01${r.suffix}`)]);
  console.log(`${COURSE} ${SWEEP} — ${APPLY ? 'APPLY' : 'VERIFY'}; ${have.length} of ${NEW_ROWS.length} new rows already present`);
  console.log(problems.length ? 'PROBLEMS:\n  ' + problems.join('\n  ') : 'all new rows: every word taught before the round, no duplicate target, no known-side clash');
  if (!APPLY || problems.length || have.length) { await pg.end(); process.exit(problems.length ? 2 : 0); }

  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const { rows: [seed] } = await pg.query('SELECT approved_at FROM course_seeds WHERE course_code=$1 AND seed_number=$2', [COURSE, SEED]);
  const insertEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'insert',
    scope: { seed_numbers: [SEED], rows: NEW_ROWS.length },
    detail: { why: 'fresh practice phrases for S0028L01; the basket reused existing audio (5 of 8 duplicates)', job: JOB, rows: NEW_ROWS, retire_after_fresh_audio: RETIRE, final_order: FINAL_ORDER } });
  const unapproveEvent = seed && seed.approved_at ? await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'unapprove',
    scope: { seed_numbers: [SEED], rows: 1 }, detail: { why: 'new phrases arrive unchecked', job: JOB, approved_at_before: seed.approved_at } }) : null;
  await pg.query('BEGIN');
  try {
    for (const r of NEW_ROWS) {
      await pg.query(
        `INSERT INTO course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count, phrase_role, lego_position, metadata, status, last_edit_event_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'start',$11::jsonb,'draft',$12)`,
        [`${COURSE}:S0028L01${r.suffix}`, COURSE, SEED, LEGO_INDEX, r.pos, r.known, r.target, r.target.length, r.target.split(/\s+/).length, r.role,
          JSON.stringify({ format: 'build_use', fresh_job: '860', ...(r.replaces ? { replaces: `S0028L01${r.replaces}` } : {}) }), insertEvent]);
    }
    for (const s of RETIRE) {
      const u = await pg.query(`UPDATE course_practice_phrases SET metadata = metadata || '{"retire_after_fresh_audio": true}'::jsonb WHERE id=$1`, [`${COURSE}:S0028L01${s}`]);
      if (u.rowCount !== 1) throw new Error(`${s}: tag ${u.rowCount}`);
    }
    if (unapproveEvent) await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number=$3', [unapproveEvent, COURSE, SEED]);
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  await require('../../services/shared/round-index-refresh.cjs').refreshNow();
  console.log(`APPLIED. insertEvent=${insertEvent} unapproveEvent=${unapproveEvent}`);
  await pg.end();
}
module.exports = { NEW_ROWS, RETIRE, FINAL_ORDER };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
