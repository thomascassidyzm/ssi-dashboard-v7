#!/usr/bin/env node
// ita_for_eng S0091L01U06: known_text only, "I don't want to think about it now" -> "I don't want to think about this now"
// (Kai-approved fallback, job #855). The Italian "non voglio pensare a questo adesso" stays: the LEGO is
// "pensare a questo", so the English must say "this", and "it" clashed with S0037L02U02 (pensarci).
// Writes: the one phrase row (known_text, qa_checked=NULL), seed 91 approved_at=NULL, one edit event per kind.
// Writes NO audio: the trg_null_*_audio_on_text_change trigger unlinks the stale known clip (bytes stay).
// Dry run by default; APPLY=1 writes.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql') });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const COURSE = 'ita_for_eng', SEED = 91, ID = 'ita_for_eng:S0091L01U06';
const BEFORE = { known: "I don't want to think about it now", target: 'non voglio pensare a questo adesso' };
const AFTER_KNOWN = "I don't want to think about this now";
(async () => {
  const APPLY = process.env.APPLY === '1';
  const { Client } = require('pg');
  const { createClient } = require('@supabase/supabase-js');
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const SWEEP = 'ita-s0091l01u06-this-not-it';
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const { rows: [live] } = await pg.query(`SELECT known_text,target_text,known_audio_id,target1_audio_id,target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND id=$2`, [COURSE, ID]);
  if (!live || live.known_text !== BEFORE.known || live.target_text !== BEFORE.target) throw new Error('drift: ' + JSON.stringify(live));
  const { rows: clash } = await pg.query(
    `SELECT id,target_text FROM course_practice_phrases WHERE course_code=$1 AND id<>$2 AND lower(trim(known_text))=lower(trim($3)) AND lower(trim(target_text))<>lower(trim($4))
     UNION ALL SELECT lego_id,target_text FROM course_legos WHERE course_code=$1 AND lower(trim(known_text))=lower(trim($3)) AND lower(trim(target_text))<>lower(trim($4))`,
    [COURSE, ID, AFTER_KNOWN, BEFORE.target]);
  console.log('live', live, '\nZUT clashes for new English:', clash);
  if (clash.length) throw new Error('ZUT clash');
  if (!APPLY) { console.log('DRY RUN'); return pg.end(); }
  const scope = { phrase_ids: [ID], seed_numbers: [SEED], rows: 1 };
  const ev = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: `tools/course-optimization/${path.basename(__filename)}`, operation: 'phrase-edit', scope,
    detail: { source: 'job #855 fallback, approved by Kai', edits: [{ id: ID, before: BEFORE, after: { known: AFTER_KNOWN, target: BEFORE.target } }] } });
  const evS = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: `tools/course-optimization/${path.basename(__filename)}`, operation: 'unapprove', scope: { seed_numbers: [SEED], rows: 1 }, detail: { why: 'S0091L01U06 known text changed' } });
  await pg.query('BEGIN');
  try {
    const r = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, qa_checked=NULL, last_edit_event_id=$2, updated_at=now() WHERE course_code=$3 AND id=$4 AND known_text=$5 AND target_text=$6 RETURNING known_audio_id,target1_audio_id,target2_audio_id`, [AFTER_KNOWN, ev, COURSE, ID, BEFORE.known, BEFORE.target]);
    if (r.rowCount !== 1) throw new Error('write race');
    console.log('audio after', r.rows[0]);
    const s = await pg.query(`UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number=$3`, [evS, COURSE, SEED]);
    if (s.rowCount !== 1) throw new Error('seed unapprove');
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); console.error('ROLLED BACK', e.message); process.exit(1); }
  await pg.end();
})().catch(e => { console.error(e); process.exit(1); });
