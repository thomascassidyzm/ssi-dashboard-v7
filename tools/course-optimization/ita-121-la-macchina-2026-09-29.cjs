#!/usr/bin/env node
'use strict';
// ita_for_eng seed 121 (job #869·I, Kai 2026-09-29, from #866·I check): the build phrase "the car" said bare "macchina";
// every other use of "the car" (S0315L01B01, S0540L02C02, the seed's own phrases) has the article. One row: → "la macchina".
// The text edit's trigger drops the changed side's clip (asset kept) and audio_autolink relinks from the library; the seed is
// unapproved per the edit rule. Audio that is still empty afterwards goes through POST /api/audio/render, never from here.
//   node …          # dry run    APPLY=1 node …   # write
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
const { Client } = require('pg');
const COURSE = 'ita_for_eng', ID = 'ita_for_eng:S0121L04B01', SEED = 121;
const BEFORE = { known: 'the car', target: 'macchina' }, AFTER = { known: 'the car', target: 'la macchina' };
(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const { rows: clash } = await pg.query(`SELECT id, target_text FROM course_practice_phrases WHERE course_code=$1 AND phrase_role<>'component' AND lower(trim(known_text))='the car' AND lower(trim(target_text))<>lower($2) AND id<>$3
    UNION ALL SELECT lego_id, target_text FROM course_legos WHERE course_code=$1 AND lower(trim(known_text))='the car' AND lower(trim(target_text))<>lower($2)`, [COURSE, AFTER.target, ID]);
  console.log('ZUT clashes for "the car" → "la macchina":', clash);
  if (clash.length) process.exit(1);
  if (process.env.APPLY !== '1') { console.log('dry run'); return pg.end(); }
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity('ita-121-la-macchina-2026-09-29', { role: 'content-sweep' });
  const ev = (op, scope, detail) => recordContentEdit(supabase, { identity, courseCode: COURSE, surface: 'tools/course-optimization/ita-121-la-macchina-2026-09-29.cjs', operation: op, scope, detail });
  const { rows: [s] } = await pg.query('SELECT approved_at FROM course_seeds WHERE course_code=$1 AND seed_number=$2', [COURSE, SEED]);
  const e1 = await ev('phrase-edit', { seed_numbers: [SEED], phrase_ids: [ID], rows: 1 }, { job: '#869·I', ruling: 'Kai 2026-09-29: the car = la macchina', from: BEFORE, to: AFTER });
  const e2 = await ev('unapprove', { seed_numbers: [SEED], rows: 1 }, { job: '#869·I', approved_at_before: s.approved_at });
  await pg.query('BEGIN');
  try {
    const r = await pg.query(`UPDATE course_practice_phrases SET target_text=$1, word_count=$2, qa_checked=NULL, decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL, last_edit_event_id=$3, updated_at=now()
      WHERE course_code=$4 AND id=$5 AND known_text=$6 AND target_text=$7`, [AFTER.target, AFTER.target.length, e1, COURSE, ID, BEFORE.known, BEFORE.target]);
    if (r.rowCount !== 1) throw new Error('phrase rows: ' + r.rowCount);
    const u = await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number=$3', [e2, COURSE, SEED]);
    if (u.rowCount !== 1) throw new Error('seed rows: ' + u.rowCount);
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  const { rows } = await pg.query('SELECT id, known_text, target_text, lego_count, lego_position, target1_audio_id, target2_audio_id, known_audio_id FROM course_practice_phrases WHERE id=$1', [ID]);
  console.log(rows);
  await pg.end();
})().catch((e) => { console.error(e); process.exit(1); });
