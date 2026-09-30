#!/usr/bin/env node
'use strict';
// Job #919·I, Kai's update of 30 Sept: he REJECTS the growth of S0072L02 to "you're doing very well | tu stia andando molto bene" (no context) and
// wants nothing written for seeds 72 / 655. This restores S0072L02, S0655L01 and S0129L01 (+ their baskets, intros, audio links, S0129's approval)
// to the exact rows the content_audit_log holds from before ita-919-small-fixes-2026-09-30 wrote them — one transaction, so the deferred
// debut_keeps_practice guard sees the restored baskets. New clips made for the rejected texts stay in the library (unlinked, not deleted).
// Seed 312's reorder and seed 1's B03 deletion are NOT touched. APPLY=1 to write.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
const COURSE = 'ita_for_eng', SWEEP = 'ita-919-rollback-72-655-129-2026-09-30';
const FIRST_AUDIT_ID = 24021790; // the first audit row the apply wrote (S0072L02 lego update = 24021794)
const LEGOS = ['S0072L02', 'S0655L01', 'S0129L01'];
const OLD_INTRO = { S0072L02: '7f17c638-8eab-48ac-9445-42ce5f607897', S0655L01: 'a60456cc-0d7c-45f1-9a52-ad8710cad7e4' };
const APPROVAL_129 = '2026-06-17T22:05:13.585Z';
(async () => {
  const { Client } = require('pg'); const { createClient } = require('@supabase/supabase-js');
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const first = async (table, filter) => (await pg.query(`SELECT DISTINCT ON (primary_key) primary_key, old_row FROM content_audit_log WHERE table_name=$1 AND id >= $2 AND ${filter} ORDER BY primary_key, id`, [table, FIRST_AUDIT_ID])).rows;
  const legos = await first('course_legos', `old_row->>'lego_id' = ANY(ARRAY['S0072L02','S0655L01','S0129L01']) AND old_row->>'course_code'='${COURSE}'`);
  const phrases = await first('course_practice_phrases', `old_row->>'course_code'='${COURSE}' AND ((old_row->>'seed_number')::int IN (72,655) AND old_row->>'phrase_role' IN ('build','use') AND (old_row->>'lego_index')::int = CASE (old_row->>'seed_number')::int WHEN 72 THEN 2 ELSE 1 END OR old_row->>'id' IN ('ita_for_eng:S0129L01C01','ita_for_eng:S0129L01C02'))`);
  console.log(`audit: ${legos.length} LEGO rows, ${phrases.length} phrase rows to restore`);
  if (legos.length !== 3 || phrases.length !== 8 + 6 + 2 + 0 && phrases.length !== 16 && phrases.length < 14) throw new Error('unexpected audit counts');
  console.log(phrases.map((p) => `${p.old_row.id} "${p.old_row.known_text}" | ${p.old_row.target_text}`).join('\n'));
  if (process.env.APPLY !== '1') return;
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const ev = await recordContentEdit(sb, { identity: serviceIdentity(SWEEP, { role: 'content-sweep' }), courseCode: COURSE, surface: `tools/course-optimization/${SWEEP}.cjs`, operation: 'rollback',
    scope: { seed_numbers: [72, 655, 129], lego_ids: LEGOS, phrase_ids: phrases.map((p) => p.old_row.id), rows: legos.length + phrases.length }, detail: { job: '#919·I', why: 'Kai 2026-09-30: growth of 72 L02 rejected (no context); nothing to be written for 72/655; 129 tiles depended on it' } });
  await pg.query('BEGIN');
  try {
    const qa = await pg.query(`SELECT count(*)::int n FROM course_qa_flags WHERE phrase_id LIKE 'ita_for_eng:S0072L02%' OR phrase_id LIKE 'ita_for_eng:S0655L01%' OR phrase_id LIKE 'ita_for_eng:S0129L01C0%'`);
    if (qa.rows[0].n) throw new Error('qa flags would be cascade-deleted');
    for (const l of legos) {
      const o = l.old_row;
      await pg.query(`UPDATE course_legos SET type=$1, known_text=$2, target_text=$3, components=$4, last_edit_event_id=NULL, updated_at=now() WHERE id=$5`, [o.type, o.known_text, o.target_text, o.components == null ? null : JSON.stringify(o.components), l.primary_key]);
      await pg.query(`UPDATE course_legos SET known_audio_id=$1, target1_audio_id=$2, target2_audio_id=$3, presentation_audio_id=$4 WHERE id=$5`, [o.known_audio_id, o.target1_audio_id, o.target2_audio_id, o.presentation_audio_id, l.primary_key]);
    }
    await pg.query(`DELETE FROM course_practice_phrases WHERE course_code=$1 AND ((seed_number=72 AND lego_index=2 AND phrase_role IN ('build','use')) OR (seed_number=655 AND lego_index=1 AND phrase_role IN ('build','use')) OR id IN ('ita_for_eng:S0129L01C01','ita_for_eng:S0129L01C02'))`, [COURSE]);
    for (const p of phrases) {
      // components_never_introduced refuses a component row that carries an intro, so those two come back without the (never-played, already dropped) intro link
      const row = p.old_row.phrase_role === 'component' ? { ...p.old_row, presentation_audio_id: null } : p.old_row;
      const r = await pg.query(`INSERT INTO course_practice_phrases SELECT * FROM jsonb_populate_record(null::course_practice_phrases, $1::jsonb)`, [JSON.stringify(row)]);
      if (r.rowCount !== 1) throw new Error(`insert ${p.old_row.id}`);
    }
    for (const [lego, uuid] of Object.entries(OLD_INTRO)) {
      const cur = (await pg.query('SELECT audio_uuid FROM lego_introductions WHERE course_code=$1 AND lego_id=$2', [COURSE, lego])).rows[0].audio_uuid;
      await pg.query('UPDATE lego_introductions SET audio_uuid=$1, presentation_audio_id=$1 WHERE course_code=$2 AND lego_id=$3', [uuid, COURSE, lego]);
      await pg.query('UPDATE course_audio SET lego_id=NULL WHERE id=$1', [cur]);
      await pg.query('UPDATE course_audio SET lego_id=$1 WHERE id=$2', [lego, uuid]);
    }
    await pg.query('UPDATE course_seeds SET approved_at=$1, updated_at=now() WHERE course_code=$2 AND seed_number=129', [APPROVAL_129, COURSE]);
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  await require('../../services/shared/round-index-refresh.cjs').refreshNow();
  await pg.end(); console.log('restored');
})().catch((e) => { console.error(e); process.exit(1); });
