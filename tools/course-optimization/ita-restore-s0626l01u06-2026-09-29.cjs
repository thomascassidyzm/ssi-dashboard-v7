#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-restore-s0626l01u06-2026-09-29.cjs
//
// ita_for_eng — puts back S0626L01U06 "are you thirsty? would you like something to drink?" that job #887·I deleted
// as "two questions in one phrase". Kai reversed that (job #888·I): it reads naturally as one thing.
// #887 logged the text but not the audio ids; the three clips are recovered from course_audio by exact text+role,
// which is unambiguous (unique per course/text/role/voice; one clip per role exists). No render.
//
//   node tools/course-optimization/ita-restore-s0626l01u06-2026-09-29.cjs          # dry run
//   APPLY=1 node tools/course-optimization/ita-restore-s0626l01u06-2026-09-29.cjs  # write
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'ita_for_eng';
const SWEEP = 'ita-restore-s0626l01u06-2026-09-29';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const ROW = {
  id: 'S0626L01U06', seed: 626, lego_index: 1, lego_id: 'S0626L01', position: 9, lego_position: 'middle',
  known: 'are you thirsty? would you like something to drink?', target: 'hai sete? vuoi qualcosa da bere?',
  clips: { known: '6cd7d596-cc1b-4331-bad6-8cb06261956f', target1: 'ba4139a3-0fa6-45d3-84d2-6ffb4cb6077f', target2: '391538f6-768d-465a-8bdc-7e29b926850f' },
};
const RULING = 'Kai, 2026-09-29 (job #888·I): reverses P29 for S0626L01U06 — it reads naturally as one thing';

async function main() {
  const APPLY = process.env.APPLY === '1';
  const { Client } = require('pg');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const full = `${COURSE}:${ROW.id}`;
  const { rows: clips } = await pg.query('SELECT id, role, text FROM course_audio WHERE course_code=$1 AND id = ANY($2)', [COURSE, Object.values(ROW.clips)]);
  const problems = [];
  for (const [role, id] of Object.entries(ROW.clips)) {
    const c = clips.find((x) => x.id === id);
    const want = role === 'known' ? ROW.known : ROW.target;
    if (!c || c.role !== role || c.text !== want) problems.push(`clip ${id} is not the ${role} clip for "${want}"`);
  }
  const { rows: [have] } = await pg.query('SELECT id FROM course_practice_phrases WHERE id=$1', [full]);
  if (have) problems.push(`${full} already exists`);
  const { rows: pos } = await pg.query('SELECT id FROM course_practice_phrases WHERE course_code=$1 AND seed_number=$2 AND lego_index=$3 AND position=$4', [COURSE, ROW.seed, ROW.lego_index, ROW.position]);
  if (pos.length) problems.push(`position ${ROW.position} taken by ${pos[0].id}`);
  const { rows: zut } = await pg.query(`SELECT id, target_text FROM course_practice_phrases WHERE course_code=$1 AND phrase_role<>'component' AND lower(trim(known_text))=lower($2) AND lower(trim(target_text))<>lower($3)`, [COURSE, ROW.known, ROW.target]);
  zut.forEach((z) => problems.push(`ZUT: ${z.id} → ${z.target_text}`));
  console.log(`${APPLY ? 'APPLY' : 'DRY RUN'} restore ${full} "${ROW.known}" | "${ROW.target}"`, problems.length ? '\nPROBLEMS:\n  ' + problems.join('\n  ') : '— guards hold');
  if (!APPLY || problems.length) { await pg.end(); process.exit(problems.length ? 2 : 0); }
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const ev = await recordContentEdit(supabase, { identity: serviceIdentity(SWEEP, { role: 'content-sweep' }), courseCode: COURSE, surface: SURFACE, operation: 'phrase-restore',
    scope: { seed_numbers: [ROW.seed], phrase_ids: [full], rows: 1 }, detail: { ruling: RULING, job: '#888·I', restores_delete_event: 'e326ce6e-f682-4f7c-848e-251d1d26f5bf', clips: ROW.clips } });
  const { rows: d } = await pg.query('SELECT id, duration_ms FROM course_audio WHERE id = ANY($1)', [[ROW.clips.target1, ROW.clips.target2]]);
  const dur = (id) => d.find((x) => x.id === id)?.duration_ms ?? null;
  const r = await pg.query(`INSERT INTO course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count, metadata, status, phrase_role, connected_lego_ids, lego_position, introduce, known_audio_id, target1_audio_id, target2_audio_id, target1_duration_ms, target2_duration_ms, last_edit_event_id)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'draft','use','{}',$11,true,$12,$13,$14,$15,$16,$17)`,
    [full, COURSE, ROW.seed, ROW.lego_index, ROW.position, ROW.known, ROW.target, ROW.target.length, ROW.target.split(/\s+/).length, JSON.stringify({ format: 'build_use', source: SWEEP, job: '#888·I', restored_from_delete: 'e326ce6e-f682-4f7c-848e-251d1d26f5bf' }), ROW.lego_position, ROW.clips.known, ROW.clips.target1, ROW.clips.target2, dur(ROW.clips.target1), dur(ROW.clips.target2), ev]);
  if (r.rowCount !== 1) throw new Error('insert ' + r.rowCount);
  await require('../../services/shared/round-index-refresh.cjs').refreshNow();
  console.log('APPLIED event', ev);
  await pg.end();
}
module.exports = { ROW };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
