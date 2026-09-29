#!/usr/bin/env node
// ita_for_eng S0091L01U06 — Kai 2026-09-29 (supersedes the "this" fallback of job #856, same day):
// an infinitive with an attached clitic CONTAINS the infinitive LEGO (canon L28 clarification), so the
// phrase under S0091L01 (to think | pensare) takes the Italian "non voglio pensarci adesso" and the English
// goes back to "it". That is exactly S0037L02U02, so the ZUT clash "it now" -> two Italians is closed.
// Writes: this one phrase row (known_text back, target_text, qa_checked NULL), known_audio_id restored to the
// old English clip, seed 91 approved_at NULL. Writes NO audio; target1/target2 slots are listed for a render.
// Dry run by default; APPLY=1 writes.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql') });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const COURSE = 'ita_for_eng', SEED = 91, ID = 'ita_for_eng:S0091L01U06';
const BEFORE = { known: "I don't want to think about this now", target: 'non voglio pensare a questo adesso' };
const AFTER = { known: "I don't want to think about it now", target: 'non voglio pensarci adesso' };
const OLD_KNOWN_CLIP = 'aa485374-772f-4e6a-aafc-7ffb6bd7342b';
(async () => {
  const APPLY = process.env.APPLY === '1';
  const { Client } = require('pg');
  const { createClient } = require('@supabase/supabase-js');
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const { decoratePhrasesWithDecomposition } = require('../../services/phrase-decomposition-writer.cjs');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const identity = serviceIdentity('ita-s0091l01u06-pensarci', { role: 'content-sweep' });
  const { rows: [live] } = await pg.query(`SELECT known_text,target_text,known_audio_id,target1_audio_id,target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND id=$2`, [COURSE, ID]);
  if (!live || live.known_text !== BEFORE.known || live.target_text !== BEFORE.target) throw new Error('drift: ' + JSON.stringify(live));
  const { rows: [clip] } = await pg.query(`SELECT text,s3_key,role FROM course_audio WHERE id=$1`, [OLD_KNOWN_CLIP]);
  if (!clip || !/think about it now/i.test(clip.text)) throw new Error('old clip missing/changed ' + JSON.stringify(clip));
  const { rows: clash } = await pg.query(
    `SELECT id,target_text FROM course_practice_phrases WHERE course_code=$1 AND id<>$2 AND lower(trim(known_text))=lower(trim($3)) AND lower(trim(target_text))<>lower(trim($4))
     UNION ALL SELECT lego_id,target_text FROM course_legos WHERE course_code=$1 AND lower(trim(known_text))=lower(trim($3)) AND lower(trim(target_text))<>lower(trim($4))`,
    [COURSE, ID, AFTER.known, AFTER.target]);
  console.log('live', live, '\nZUT clashes for the new pair:', clash);
  if (clash.length) throw new Error('ZUT clash');
  if (!APPLY) { console.log('DRY RUN'); return pg.end(); }
  const src = `tools/course-optimization/${path.basename(__filename)}`;
  const ev = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: src, operation: 'phrase-edit', scope: { phrase_ids: [ID], seed_numbers: [SEED], rows: 1 },
    detail: { source: 'Kai 2026-09-29: infinitive + enclitic contains the LEGO; reverts the #856 "this" fallback', edits: [{ id: ID, before: BEFORE, after: AFTER }] } });
  const evS = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: src, operation: 'unapprove', scope: { seed_numbers: [SEED], rows: 1 }, detail: { why: 'S0091L01U06 text changed' } });
  await pg.query('BEGIN');
  try {
    const r = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, target_text=$2, word_count=length($2), qa_checked=NULL, last_edit_event_id=$3, updated_at=now() WHERE course_code=$4 AND id=$5 AND known_text=$6 AND target_text=$7`, [AFTER.known, AFTER.target, ev, COURSE, ID, BEFORE.known, BEFORE.target]);
    if (r.rowCount !== 1) throw new Error('write race');
    // make-before-break in reverse: the old English clip is verified alive above; relink it if the trigger left the slot empty.
    await pg.query(`UPDATE course_practice_phrases SET known_audio_id=$1 WHERE course_code=$2 AND id=$3 AND known_audio_id IS NULL`, [OLD_KNOWN_CLIP, COURSE, ID]);
    const s = await pg.query(`UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number=$3`, [evS, COURSE, SEED]);
    if (s.rowCount !== 1) throw new Error('seed unapprove');
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); console.error('ROLLED BACK', e.message); process.exit(1); }
  try { console.log('decomposition', JSON.stringify(await decoratePhrasesWithDecomposition(supabase, [{ id: ID, course_code: COURSE, seed_number: SEED, target_text: AFTER.target }]))); } catch (e) { console.log('decomposition error', e.message); }
  const { rows: [after] } = await pg.query(`SELECT known_text,target_text,known_audio_id,target1_audio_id,target2_audio_id FROM course_practice_phrases WHERE id=$1`, [ID]);
  console.log('AFTER', after);
  await pg.end();
})().catch(e => { console.error(e); process.exit(1); });
