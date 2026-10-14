#!/usr/bin/env node
'use strict';
// node tools/course-optimization/course-dump-readonly-2026-10-14.cjs <course> <out.json>
// READ-ONLY (job #412, spa conozco first-teaching): one course's seeds, LEGOs (all columns), phrases (all columns)
// and intro clips as JSON, through the sanctioned agent-db login (5 s cap), so a plan can be computed OFFLINE from the
// file and applied through Popty's edit-batch door. Every query is by course_code (indexed).
const fs = require('fs');
const { connect, presentationClips } = require('../../services/shared/agent-db.cjs');
async function main() {
  const [course, out] = process.argv.slice(2);
  if (!course || !out) throw new Error('usage: <course> <out.json>');
  const pg = await connect();
  try {
    const q = async (sql) => (await pg.query(sql, [course])).rows;
    const dump = {
      course,
      seeds: await q('SELECT seed_number, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id FROM course_seeds WHERE course_code=$1 ORDER BY seed_number'),
      legos: await q('SELECT l.*, r.round_index FROM course_legos l LEFT JOIN course_round_index r ON r.course_code=l.course_code AND r.lego_id=l.lego_id WHERE l.course_code=$1 ORDER BY l.seed_number, l.lego_index'),
      phrases: await q('SELECT * FROM course_practice_phrases WHERE course_code=$1 ORDER BY seed_number, lego_index, position'),
      intros: await presentationClips(pg, course),
    };
    fs.writeFileSync(out, JSON.stringify(dump));
    console.log(`${course}: ${dump.seeds.length} seeds, ${dump.legos.length} legos, ${dump.phrases.length} phrases → ${out}`);
  } finally { await pg.end(); }
}
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
