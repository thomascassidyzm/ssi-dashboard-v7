#!/usr/bin/env node
'use strict';
// tools/course-optimization/cat-deborah-findings-2026-10-01.cjs
//
// cat_for_eng — Deborah's review-column findings of 22, 25 and 28 Sept (Creu Cyrsiau board, "Catalan for English"
// card), clear defects only (Kai said yes, 2026-10-01, job #46). The eight rows below were re-texted in place through
// PATCH /api/production/cat_for_eng/phrase/:id (x-agent-id kai-cat-deborah-findings-46), so each carries its own
// content_edit_events row and the null-audio trigger has already cleared the changed slots. That route does NOT do the
// housekeeping a re-text needs, so this tool does it:
//   - word_count / lego_count recomputed (same formula as the ita sweeps: target length, target word count)
//   - stored decomposition / display tiling / qa stamp cleared: they describe the OLD text, and the player renders a
//     stored decomposition verbatim
//   - the touched seeds unapproved (no trigger does it), refresh course_round_index, queue an audio pass
// Audio is NOT rendered here — the clips go through the one route (POST :3470/api/audio/render) once Kai approves.
//
// Why each row changed (round = learner round, i.e. the nth new LEGO):
//   S0038L03U08/U11 (R113 "ago | fa") used aprenc, which S0038L04 introduces at R114 → parlo (R26).
//   S0044L02U05 (R126 "I need to | he de") used millorar, which S0044L03 introduces at R127 → parlar millor (R89).
//   S0040L02B02 "do you feel tired | com et trobes cansat" — English and Catalan disagree and the Catalan is not a
//     natural sentence (Deborah: "How do you feel? Tired?") → how do you feel today | com et trobes avui.
//   S0040L02B03 "feel right now | com et trobes ara" — English drops "how do you" → how do you feel now.
//   S0026L04B03 — Deborah's 23 Sept edit added "to go" to the English but the Catalan has no "de marxar" → dropped.
//   S0026L03U04/U05 (R80) — English and Catalan said different things ("more ready soon" | "gairebé a punt de marxar
//     avui"), same defect class as her R81 note → "feel that I'm nearly ready (to go)" | "sentir que estic gairebé a punt
//     (de marxar)".
//
//   node tools/course-optimization/cat-deborah-findings-2026-10-01.cjs          # verify: rows hold AFTER text, early uses gone
//   APPLY=1 node tools/course-optimization/cat-deborah-findings-2026-10-01.cjs  # housekeeping + unapprove + refresh + queue
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'cat_for_eng';
const SWEEP = 'cat-deborah-findings-2026-10-01';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const JOB = '#46 (cat-deborah-findings)';

const ROWS = [
  { id: 'S0038L03U08', before: ["I've been learning catalan for a week", 'fa una setmana que aprenc català'], after: ["I've been speaking Catalan for a week", 'fa una setmana que parlo català'] },
  { id: 'S0038L03U11', before: ["I've been learning catalan for a week", 'fa una setmana que aprenc català'], after: ["I've been speaking with you for a week", 'fa una setmana que parlo amb tu'] },
  { id: 'S0044L02U05', before: ['I need to improve as soon as I can', 'he de millorar tan aviat com pugui'], after: ['I need to speak better as soon as I can', 'he de parlar millor tan aviat com pugui'] },
  { id: 'S0040L02B02', before: ['do you feel tired', 'com et trobes cansat'], after: ['how do you feel today', 'com et trobes avui'] },
  { id: 'S0040L02B03', before: ['feel right now', 'com et trobes ara'], after: ['how do you feel now', 'com et trobes ara'] },
  { id: 'S0026L04B03', before: ['I like feeling as if I were almost ready to go', "m'agrada sentir com si estigués gairebé a punt"], after: ['I like feeling as if I were almost ready', "m'agrada sentir com si estigués gairebé a punt"] },
  { id: 'S0026L03U04', before: ['I want to feel more ready soon', 'vull sentir gairebé a punt de marxar avui'], after: ["I want to feel that I'm nearly ready", 'vull sentir que estic gairebé a punt'] },
  { id: 'S0026L03U05', before: ['I like to feel nearly ready', "m'agrada sentir gairebé a punt de marxar ara"], after: ["I like to feel that I'm nearly ready to go", "m'agrada sentir que estic gairebé a punt de marxar"] },
];
const SEEDS = [...new Set(ROWS.map(r => Number(r.id.slice(1, 5))))];
// A word may not appear in a phrase played before the round whose LEGO introduces it.
const EARLY_USE = [{ word: 'aprenc', lego: 'S0038L04' }, { word: 'millorar', lego: 'S0044L03' }];

async function earlyUses(pg) {
  const out = [];
  for (const { word, lego } of EARLY_USE) {
    const { rows } = await pg.query(
      `SELECT p.id, p.target_text FROM course_practice_phrases p
         JOIN course_round_index r ON r.course_code=p.course_code AND r.lego_id = 'S'||lpad(p.seed_number::text,4,'0')||'L'||lpad(p.lego_index::text,2,'0')
        WHERE p.course_code=$1 AND p.target_text ~* $2
          AND r.round_index < (SELECT round_index FROM course_round_index WHERE course_code=$1 AND lego_id=$3)`,
      [COURSE, `(^|[^[:alpha:]])${word}([^[:alpha:]]|$)`, lego]);
    for (const r of rows) out.push(`${word} before ${lego}: ${r.id} "${r.target_text}"`);
  }
  return out;
}

async function main() {
  const APPLY = process.env.APPLY === '1';
  const { Client } = require('pg');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const problems = [];
  for (const r of ROWS) {
    const { rows: [row] } = await pg.query('SELECT known_text, target_text FROM course_practice_phrases WHERE id=$1', [`${COURSE}:${r.id}`]);
    if (!row) problems.push(`${r.id} missing`);
    else if (row.known_text !== r.after[0] || row.target_text !== r.after[1]) problems.push(`${r.id} does not hold the AFTER text: "${row.known_text}" | "${row.target_text}"`);
  }
  problems.push(...await earlyUses(pg));
  const { rows: appr } = await pg.query('SELECT seed_number, approved_at FROM course_seeds WHERE course_code=$1 AND seed_number = ANY($2) AND approved_at IS NOT NULL', [COURSE, SEEDS]);
  console.log(`${COURSE} ${SWEEP} — ${APPLY ? 'APPLY' : 'VERIFY'}; seeds ${SEEDS.join(', ')}; still approved: ${appr.map(a => a.seed_number).join(', ') || 'none'}`);
  console.log(problems.length ? 'PROBLEMS:\n  ' + problems.join('\n  ') : 'all eight rows hold their AFTER text; no aprenc/millorar before its LEGO');
  if (!APPLY || problems.length) { await pg.end(); process.exit(problems.length ? 2 : 0); }

  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const unapproveEvent = appr.length ? await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'unapprove',
    scope: { seed_numbers: appr.map(a => a.seed_number), rows: appr.length },
    detail: { why: "phrases re-texted for Deborah's 22/25/28 Sept findings; edited phrases arrive unchecked", job: JOB, approved_at_before: appr, rows: ROWS } }) : null;
  await pg.query('BEGIN');
  try {
    for (const r of ROWS) {
      const t = r.after[1];
      const u = await pg.query(`UPDATE course_practice_phrases SET word_count=$1, lego_count=$2, qa_checked=NULL, decomposition=NULL, decomposition_course_version=NULL,
          display_tiling=NULL, display_tiling_version=NULL WHERE id=$3 AND target_text=$4`, [t.length, t.split(/\s+/).length, `${COURSE}:${r.id}`, t]);
      if (u.rowCount !== 1) throw new Error(`${r.id}: update ${u.rowCount}`);
    }
    if (unapproveEvent) await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number = ANY($3)', [unapproveEvent, COURSE, appr.map(a => a.seed_number)]);
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  await require('../../services/shared/round-index-refresh.cjs').refreshNow();
  const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs');
  const pass = await queueAudioPass(supabase, { courseCode: COURSE, requestedBy: `@${SWEEP}`, reason: `job ${JOB}: 8 phrases re-texted for Deborah's findings; 20 slots await /api/audio/render`, metadata: { job: JOB, seeds: SEEDS, rows: ROWS.length } });
  console.log(`APPLIED. unapproveEvent=${unapproveEvent} audioPass=${JSON.stringify(pass)}`);
  await pg.end();
}
module.exports = { ROWS, SEEDS, EARLY_USE };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
