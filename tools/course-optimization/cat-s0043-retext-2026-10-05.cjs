#!/usr/bin/env node
'use strict';
// tools/course-optimization/cat-s0043-retext-2026-10-05.cjs
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
// S0043L01U02 (R123) said 'no estava pensant en com respondre'; 'com respondre' is only introduced at R124 (S0043L02).
// Re-texted via PATCH to 'no estava pensant en la resposta' (la resposta = S0017L02, R51). Kai said yes 2026-10-05 (job #849).
// Same housekeeping as the 1 Oct tool: counts, stale decomposition/tiling/qa cleared, seed unapproved, index refreshed.
//   node tools/course-optimization/cat-s0043-retext-2026-10-05.cjs          # verify: rows hold AFTER text, early uses gone
//   APPLY=1 node tools/course-optimization/cat-s0043-retext-2026-10-05.cjs  # housekeeping + unapprove + refresh + queue
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'cat_for_eng';
const SWEEP = 'cat-s0043-retext-2026-10-05';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const JOB = '#849 (cat-s0043-retext)';

const ROWS = [
  { id: 'S0043L01U02', before: ["I wasn't thinking about how to answer", 'no estava pensant en com respondre'], after: ["I wasn't thinking about the answer", 'no estava pensant en la resposta'] },
];
const SEEDS = [...new Set(ROWS.map(r => Number(r.id.slice(1, 5))))];
// A word may not appear in a phrase played before the round whose LEGO introduces it.
const EARLY_USE = [{ word: 'com respondre', lego: 'S0043L02' }];

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
  console.log(problems.length ? 'PROBLEMS:\n  ' + problems.join('\n  ') : 'the row holds its AFTER text; no com respondre before S0043L02');
  if (!APPLY || problems.length) { await pg.end(); process.exit(problems.length ? 2 : 0); }

  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const unapproveEvent = appr.length ? await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'unapprove',
    scope: { seed_numbers: appr.map(a => a.seed_number), rows: appr.length },
    detail: { why: "S0043L01U02 re-texted (com respondre untaught at R123); edited phrase arrives unchecked", job: JOB, approved_at_before: appr, rows: ROWS } }) : null;
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
  const pass = await queueAudioPass(supabase, { courseCode: COURSE, requestedBy: `@${SWEEP}`, reason: `job ${JOB}: S0043L01U02 re-texted; 3 slots await /api/audio/render`, metadata: { seeds: SEEDS, rows: ROWS.length }, append: true, metadataKey: SWEEP });
  console.log(`APPLIED. unapproveEvent=${unapproveEvent} audioPass=${JSON.stringify(pass)}`);
  await pg.end();
}
module.exports = { ROWS, SEEDS, EARLY_USE };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
