#!/usr/bin/env node
// ita_for_eng, Kai approved (job #884·I, follow-on to #883·I): lowercase the first letter of the seed and LEGO
// target_text rows that open with a capital (È…/Perché…/A mia madre…). Proper nouns are exempt (none open a seed today).
//
// AUDIO MUST STAY ATTACHED. course_seeds / course_legos have BEFORE UPDATE triggers (null_seed_/null_lego_audio_on_text_change)
// that keep a link only when normalize_text(clip text) == normalize_text(new text) — case-only edits satisfy that. The write runs in
// ONE transaction that compares every known/target1/target2 (+ LEGO presentation) audio id before and after and counts new
// content_audio_link_drops; any difference => ROLLBACK. Intro clips quote the KNOWN side only ("The Italian for: '…', is:"), so a
// target-side case change cannot make an intro drift; check-intro-mirror is run afterwards regardless.
// ZUT: a case-only edit can only merge same-known/different-target pairs, never split one; the tool prints distinct
// (known,target) counts across seeds+legos before/after and refuses if the clash count rises.
//
//   node tools/course-optimization/ita-capitals-lowercase-seeds-legos-2026-09-29.cjs           (dry run)
//   APPLY=1 node tools/course-optimization/ita-capitals-lowercase-seeds-legos-2026-09-29.cjs   (writes)
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql') });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const { lowerFirst, targetOutliers } = require('./ita-capitals-lowercase-2026-09-29.cjs');

const COURSE = 'ita_for_eng';
const SWEEP = 'ita-capitals-lowercase-seeds-legos-2026-09-29';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const JOB = '#884·I';
const APPLY = process.env.APPLY === '1';

// Clash = a known text that maps to more than one distinct target text (exact spelling).
function zutClashes(rows) {
  const m = new Map();
  for (const r of rows) { const k = (r.known_text || '').trim().toLowerCase(); if (!k) continue; (m.get(k) || m.set(k, new Set()).get(k)).add(r.target_text); }
  return [...m.values()].filter((s) => s.size > 1).length;
}
module.exports = { zutClashes };
if (require.main !== module) return;

(async () => {
  const { Client } = require('pg');
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  const q = async (t) => (await pg.query(`SELECT id, seed_number, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id${t === 'course_legos' ? ', presentation_audio_id' : ''} FROM ${t} WHERE course_code=$1`, [COURSE])).rows;
  const seeds = await q('course_seeds'), legos = await q('course_legos');
  const sEdits = targetOutliers(seeds), lEdits = targetOutliers(legos);
  const seedNums = [...new Set([...sEdits, ...lEdits].map((r) => r.seed_number))].sort((a, b) => a - b);
  const after = (rows, edits) => { const ids = new Set(edits.map((e) => e.id)); return rows.map((r) => ids.has(r.id) ? { ...r, target_text: lowerFirst(r.target_text) } : r); };
  const zBefore = zutClashes([...seeds, ...legos]), zAfter = zutClashes([...after(seeds, sEdits), ...after(legos, lEdits)]);
  console.log(`${APPLY ? 'APPLY' : 'DRY RUN'}: ${sEdits.length} seeds, ${lEdits.length} LEGOs, ${seedNums.length} distinct seeds; ZUT clashes ${zBefore} -> ${zAfter}`);
  sEdits.forEach((r) => console.log('  seed', r.seed_number, JSON.stringify(r.target_text), '->', JSON.stringify(lowerFirst(r.target_text))));
  lEdits.forEach((r) => console.log('  lego', r.seed_number, JSON.stringify(r.target_text), '->', JSON.stringify(lowerFirst(r.target_text))));
  if (zAfter > zBefore) { console.error('ZUT would worsen; refusing'); process.exitCode = 1; return pg.end(); }
  if (!APPLY) return pg.end();

  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const { rows: approvedBefore } = await pg.query('SELECT seed_number, approved_at FROM course_seeds WHERE course_code=$1 AND seed_number = ANY($2)', [COURSE, seedNums]);
  const chg = (rs) => rs.map((r) => ({ id: r.id, seed_number: r.seed_number, target_from: r.target_text, target_to: lowerFirst(r.target_text) }));
  const editEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'seed-edit',
    scope: { seed_numbers: seedNums, seeds: sEdits.length, legos: lEdits.length },
    detail: { job: JOB, why: 'Check 13 capitalisation on seed/LEGO target text: case-only, audio links kept', seeds: chg(sEdits), legos: chg(lEdits) } });
  const unEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'unapprove',
    scope: { seed_numbers: seedNums, rows: seedNums.length }, detail: { job: JOB, why: 'capitalisation edit on the seed or its LEGO; house edit rule', approved_at_before: approvedBefore } });

  const sIds = sEdits.map((r) => r.id), lIds = lEdits.map((r) => r.id);
  const snap = async () => JSON.stringify([
    (await pg.query('SELECT id, known_audio_id, target1_audio_id, target2_audio_id FROM course_seeds WHERE id = ANY($1) ORDER BY id', [sIds])).rows,
    (await pg.query('SELECT id, known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id FROM course_legos WHERE id = ANY($1) ORDER BY id', [lIds])).rows]);
  const drops = async () => +(await pg.query('SELECT count(*) FROM content_audio_link_drops WHERE course_code=$1', [COURSE])).rows[0].count;
  const beforeLinks = await snap(), beforeDrops = await drops();
  await pg.query('BEGIN');
  try {
    for (const [t, rs] of [['course_seeds', sEdits], ['course_legos', lEdits]]) for (const r of rs) {
      const x = await pg.query(`UPDATE ${t} SET target_text=$1, last_edit_event_id=$2, updated_at=now() WHERE id=$3 AND target_text=$4`, [lowerFirst(r.target_text), editEvent, r.id, r.target_text]);
      if (x.rowCount !== 1) throw new Error(`${t} ${r.id}: ${x.rowCount} rows`);
    }
    const s = await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number = ANY($3)', [unEvent, COURSE, seedNums]);
    if (s.rowCount !== seedNums.length) throw new Error(`seed unapprove ${s.rowCount}`);
    const afterLinks = await snap(), afterDrops = await drops();
    if (afterLinks !== beforeLinks || afterDrops !== beforeDrops) throw new Error(`AUDIO LINK CHANGED (drops ${beforeDrops}->${afterDrops}); rolled back`);
    await pg.query('COMMIT');
    console.log(`committed: ${sEdits.length} seeds, ${lEdits.length} LEGOs, ${seedNums.length} seeds unapproved, audio ids identical, drops ${beforeDrops}->${afterDrops}, events ${editEvent} ${unEvent}`);
  } catch (err) { await pg.query('ROLLBACK'); console.error('ROLLED BACK:', err.message); process.exitCode = 1; }
  await pg.end();
})();
