#!/usr/bin/env node
'use strict';
// cat_for_eng seed 28 — nothing may use bare "és" before it is introduced as S0028L02 (round 87).
// Kai's ruling 2026-10-05 (Deborah's finding): keep S0028L02 NEW; wait for it rather than reorder.
//
// Why re-text and not swap L01/L02: lego_index is the teaching order and lego_id is generated from it, so a
// swap renumbers ids that decompositions, QA flags and learner progress all point at. The "és útil …" drills
// already live in the L02 (R87) basket and S0028L03, so the R86 basket just loses the six "és" rows and drills
// útil with a noun instead: "una paraula útil" (una paraula = S0018, taught R18). Every word used was taught
// before R86; positions 1-2 (útil, molt útil) are untouched and keep their clips.
//
//   node tools/course-optimization/cat-seed-28-no-es-before-r87-2026-10-05.cjs          # dry run
//   APPLY=1 node tools/course-optimization/cat-seed-28-no-es-before-r87-2026-10-05.cjs  # write
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
const COURSE = 'cat_for_eng', SEED = 28, SWEEP = 'cat-seed-28-no-es-before-r87-2026-10-05', SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const CHANGES = [
  { id: 'S0028L01B03', before: ["it's useful", 'és útil'],                         after: ['a useful word', 'una paraula útil'] },
  { id: 'S0028L01U01', before: ["it's very useful", 'és molt útil'],               after: ['a very useful word', 'una paraula molt útil'] },
  { id: 'S0028L01U02', before: ["it's useful to practise", 'és útil practicar'],  after: ['I want a useful word', 'vull una paraula útil'] },
  { id: 'S0028L01U03', before: ["it's useful to speak often", 'és útil parlar sovint'], after: ['I want to learn a useful word', 'vull aprendre una paraula útil'] },
  { id: 'S0028L01U04', before: ["it's useful to learn Catalan", 'és útil aprendre català'], after: ["I'd like to remember a useful word", "m'agradaria recordar una paraula útil"] },
  { id: 'S0028L01U05', before: ["it's very useful to meet people", 'és molt útil conèixer gent'], after: ['she wants a very useful word', 'ella vol una paraula molt útil'] },
];
const ES = /(^|[^\p{L}])és([^\p{L}]|$)/iu;
async function main() {
  const APPLY = process.env.APPLY === '1';
  const { Client } = require('pg'); const { createClient } = require('@supabase/supabase-js');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const bad = CHANGES.filter(c => ES.test(c.after[1])); if (bad.length) throw new Error('new text still has és: ' + bad.map(b => b.id));
  // taught-before-R86 check on the Catalan words
  const { rows: taught } = await pg.query(`SELECT l.target_text FROM course_legos l JOIN course_round_index r USING (course_code, lego_id) WHERE l.course_code=$1 AND r.round_index<=86`, [COURSE]);
  const words = new Set(taught.flatMap(t => t.target_text.toLowerCase().split(/\s+/))); 
  for (const c of CHANGES) for (const w of c.after[1].toLowerCase().split(/\s+/)) if (!words.has(w)) console.log(`  note: "${w}" in ${c.id} is not a whole LEGO word by itself before R86 (check it is part of a taught chunk)`);
  let chars = 0;
  for (const c of CHANGES) { chars += c.after[1].length * 2 + c.after[0].length; console.log(`${c.id}: "${c.before[0]}" | ${c.before[1]}  →  "${c.after[0]}" | ${c.after[1]}`); }
  console.log(`audio to render (target1+target2+known, no library hit): ${CHANGES.length * 3} clips, ${chars} characters`);
  if (!APPLY) { console.log('DRY RUN'); return pg.end(); }
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const pe = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-edit', scope: { seed_numbers: [SEED], phrase_ids: CHANGES.map(c => `${COURSE}:${c.id}`), rows: CHANGES.length }, detail: { ruling: 'Kai 2026-10-05: wait for és until S0028L02 (R87)' } });
  const ue = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'unapprove', scope: { seed_numbers: [SEED], rows: 1 }, detail: { why: 'six R86 phrases re-texted to drop és before its debut' } });
  await pg.query('BEGIN');
  try {
    for (const c of CHANGES) {
      const u = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, target_text=$2, word_count=$3, lego_count=$4, known_audio_id=NULL, target1_audio_id=NULL, target2_audio_id=NULL,
        qa_checked=NULL, decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL, last_edit_event_id=$5, updated_at=now()
        WHERE course_code=$6 AND id=$7 AND known_text=$8 AND target_text=$9`,
        [c.after[0], c.after[1], c.after[1].length, c.after[1].split(/\s+/).length, pe, COURSE, `${COURSE}:${c.id}`, c.before[0], c.before[1]]);
      if (u.rowCount !== 1) throw new Error(`${c.id}: ${u.rowCount} rows`);
    }
    const un = await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number=$3', [ue, COURSE, SEED]);
    if (un.rowCount !== 1) throw new Error('unapprove');
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  console.log('APPLIED', { pe, ue });
  await pg.end();
}
main().catch(e => { console.error(e); process.exit(1); });
