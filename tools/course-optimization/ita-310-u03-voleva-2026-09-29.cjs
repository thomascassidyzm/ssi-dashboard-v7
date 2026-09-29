#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-310-u03-voleva-2026-09-29.cjs
//
// ita_for_eng — S0310L02U03 re-texted (Kai, 2026-09-29, job #865·I, on #864·I's research d/482a8e22).
//
// S0310L02U03 "he said he could write a story about that man | ha detto che potrebbe scrivere…" had the SAME English
// as S0313L01U03 "… | ha detto che poteva scrivere…": one known prompt, two targets (ZUT). S0313L01 "he could | poteva"
// is the LEGO that teaches the form; S0310L02 is "about that man | su quell'uomo" and does not practise potere at all,
// so the U03 row loses nothing the LEGO teaches by leaving "could" behind. Kai approved:
//   he said he wanted to write a story about that man | ha detto che voleva scrivere una storia su quell'uomo
// Every piece is taught before 310: voleva "he wanted to" S0052L01, "he said he wanted to" as ha detto che voleva
// (S0127L01U03 and 29 other rows, never anything else), scrivere / una storia / su quell'uomo from seed 310 itself.
// The row is re-texted IN PLACE (progress is filed by slot). All three audio links are cleared; the Italian and the
// English are re-made through the one audio route (tools/audio/render.cjs), never here.
//
//   node tools/course-optimization/ita-310-u03-voleva-2026-09-29.cjs          # dry run: guards + plan
//   APPLY=1 node tools/course-optimization/ita-310-u03-voleva-2026-09-29.cjs  # write, unapprove seed 310, refresh, queue audio pass
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'ita_for_eng';
const SWEEP = 'ita-310-u03-voleva-2026-09-29';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const JOB = '#865·I';
const RULING = 'Kai, 2026-09-29 (job #865·I): S0310L02U03 clashed with S0313L01U03 (same English, potrebbe vs poteva); replace with "he said he wanted to write a story about that man | ha detto che voleva scrivere una storia su quell\'uomo" since S0310L02 (about that man) does not practise potere';
const ROW = 'S0310L02U03';
const BEFORE = { known: 'he said he could write a story about that man', target: "ha detto che potrebbe scrivere una storia su quell'uomo" };
const AFTER = { known: 'he said he wanted to write a story about that man', target: "ha detto che voleva scrivere una storia su quell'uomo" };
const LEGO = { id: 'S0310L02', known: 'about that man', target: "su quell'uomo" };

const norm = (s) => String(s || '').toLowerCase().replace(/’/g, "'").replace(/[.,!?;:"«»]+/g, ' ').replace(/\s+/g, ' ').trim();
/** The live gate's containment rule: every word of the needle is in the hay, as a multiset. */
function containsWords(hay, needle) {
  const bag = {}; for (const w of norm(hay).split(' ')) bag[w] = (bag[w] || 0) + 1;
  return norm(needle).split(' ').every(w => bag[w]-- > 0);
}
/** ZUT: rows (other than `selfId`) whose English equals `known` but whose Italian differs. */
function zutClashes(rows, selfId, known, target) {
  return rows.filter(r => r.id !== selfId && norm(r.known_text) === norm(known) && norm(r.target_text) !== norm(target));
}

async function main() {
  const APPLY = process.env.APPLY === '1';
  const { Client } = require('pg');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const problems = [];
  const id = `${COURSE}:${ROW}`;
  const { rows: [row] } = await pg.query('SELECT id, seed_number, lego_index, known_text, target_text, lego_position FROM course_practice_phrases WHERE id=$1', [id]);
  if (!row) problems.push(`${ROW} missing`);
  else if (row.known_text !== BEFORE.known || row.target_text !== BEFORE.target) problems.push(`${ROW} is no longer the before-text: "${row.known_text}" → "${row.target_text}"`);
  const { rows: [lego] } = await pg.query('SELECT known_text, target_text FROM course_legos WHERE course_code=$1 AND lego_id=$2', [COURSE, LEGO.id]);
  if (!lego || lego.known_text !== LEGO.known || lego.target_text !== LEGO.target) problems.push(`${LEGO.id} is not "${LEGO.known} | ${LEGO.target}" — if it now teaches potere, stop (Kai's condition)`);
  if (!containsWords(AFTER.known, LEGO.known) || !containsWords(AFTER.target, LEGO.target)) problems.push('new row does not contain its LEGO');
  // Taught before 310: voleva as "he wanted to"; nowhere does "said he wanted" map to anything but ha detto che voleva.
  const { rows: [t] } = await pg.query("SELECT count(*)::int n FROM course_legos WHERE course_code=$1 AND seed_number < 310 AND known_text='he wanted to' AND target_text='voleva'", [COURSE]);
  if (!t.n) problems.push('voleva "he wanted to" is not taught before seed 310');
  const { rows: all } = await pg.query(`SELECT id, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND phrase_role<>'component' AND (lower(known_text)=lower($2) OR lower(target_text)=lower($3))
    UNION ALL SELECT lego_id, known_text, target_text FROM course_legos WHERE course_code=$1 AND (lower(known_text)=lower($2) OR lower(target_text)=lower($3))`, [COURSE, AFTER.known, AFTER.target]);
  const clashes = zutClashes(all, id, AFTER.known, AFTER.target);
  for (const c of clashes) problems.push(`ZUT: ${c.id} "${c.known_text}" → "${c.target_text}"`);
  const { rows: [seed] } = await pg.query('SELECT approved_at FROM course_seeds WHERE course_code=$1 AND seed_number=310', [COURSE]);
  console.log(`\n══ ${COURSE} ${ROW} — ${APPLY ? 'APPLY' : 'DRY RUN'} ══\n  "${BEFORE.known}" → "${BEFORE.target}"\n  ⇒ "${AFTER.known}" → "${AFTER.target}"\n  seed 310 approved_at: ${seed?.approved_at?.toISOString?.() || 'null'}`);
  console.log(problems.length ? 'PROBLEMS:\n  ' + problems.join('\n  ') : 'guards hold');
  if (!APPLY || problems.length) { await pg.end(); process.exit(problems.length ? 2 : 0); }

  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const editEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-edit', scope: { seed_numbers: [310], phrase_ids: [id], rows: 1 },
    detail: { ruling: RULING, job: JOB, rows: [{ id, seed: 310, lego: LEGO.id, before: BEFORE, after: AFTER }] } });
  const unapproveEvent = seed?.approved_at ? await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'unapprove', scope: { seed_numbers: [310], rows: 1 },
    detail: { why: 'practice phrase edited; edited phrases arrive unchecked', job: JOB, approved_at_before: seed.approved_at } }) : null;
  await pg.query('BEGIN');
  try {
    const u = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, target_text=$2, word_count=$3, lego_count=$4, qa_checked=NULL, decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL,
        known_audio_id=NULL, target1_audio_id=NULL, target2_audio_id=NULL, target1_duration_ms=NULL, target2_duration_ms=NULL, last_edit_event_id=$5, updated_at=now()
        WHERE id=$6 AND known_text=$7 AND target_text=$8`,
      [AFTER.known, AFTER.target, AFTER.target.length, AFTER.target.split(/\s+/).length, editEvent, id, BEFORE.known, BEFORE.target]);
    if (u.rowCount !== 1) throw new Error(`update ${u.rowCount}`);
    if (unapproveEvent) {
      const un = await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number=310', [unapproveEvent, COURSE]);
      if (un.rowCount !== 1) throw new Error('unapprove');
    }
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  await require('../../services/shared/round-index-refresh.cjs').refreshNow();
  const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs');
  const pass = await queueAudioPass(supabase, { courseCode: COURSE, requestedBy: `@${SWEEP}`, reason: `job ${JOB}: ${ROW} re-texted (could → wanted to); slots re-made via /api/audio/render`, metadata: { job: JOB, seeds: [310], rows: 1 } });
  console.log(`APPLIED. editEvent=${editEvent} unapproveEvent=${unapproveEvent} audioPass=${JSON.stringify(pass)}`);
  console.log(`Now render through the one route (dry run first):\n  node tools/audio/render.cjs --course ${COURSE} --role target1 --voice azure_it-IT-ElsaNeural --voice-bound --text "${AFTER.target}" --purpose "${JOB} ${ROW}" --dry-run`);
  await pg.end();
}
module.exports = { norm, containsWords, zutClashes, BEFORE, AFTER, LEGO };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
