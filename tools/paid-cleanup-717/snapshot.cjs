#!/usr/bin/env node
'use strict';
// tools/paid-cleanup-717/snapshot.cjs — READ-ONLY whole-course snapshot for the paid-course cleanup
// mechanical items 12/14/15/16/18 (cs #717·AI, Kai 18 Nov 2026).
//
// WHY THE QA COPY: whole-course reads on live Popty (GET /api/production/:course/seeds) hit the 8 s
// statement timeout on 18 Nov while six sibling jobs were writing; Tom's 2026-11-05 ruling sends bulk
// reads to the nightly QA copy. The surface's guard points a committed tool at the copy by setting
// DATABASE_URL; agent-db.agentUrl() honours DATABASE_URL first. Nothing here writes. Every write the
// cleanup makes goes through Popty's edit-batch route carrying `expect` (the text read here), so a
// row another job changed since the copy was taken is REFUSED, never overwritten.
//
//   node tools/paid-cleanup-717/snapshot.cjs <course_code> <out.json>
//
// Output: { course, db, at, seeds:[…seed row…], legos:[…], phrases:[…], clips:{id:{text,voice_id,role}} }
// clips = every clip a seed slot or a phrase/LEGO known slot points at (items 12 and 14 need their text).
const fs = require('fs');
const path = require('path');
const db = require(path.join(__dirname, '..', '..', 'services', 'shared', 'agent-db.cjs'));

async function main() {
  const [course, out] = process.argv.slice(2);
  if (!course || !out) { console.error('usage: snapshot.cjs <course_code> <out.json>'); process.exit(2); }
  const pg = await db.connect({ app: 'agent:paid-cleanup-717-snapshot' });
  try {
    const dbName = (await pg.query('SELECT current_database() AS d')).rows[0].d;
    const seeds = (await pg.query(
      `SELECT seed_number, known_text, target_text, status, known_audio_id::text AS ka, target1_audio_id::text AS t1, target2_audio_id::text AS t2
         FROM course_seeds WHERE course_code = $1 ORDER BY seed_number`, [course])).rows;
    const legos = (await pg.query(
      `SELECT id::text AS uuid, lego_id, seed_number, lego_index, type, is_new, known_text, target_text, components,
              known_audio_id::text AS ka, target1_audio_id::text AS t1, target2_audio_id::text AS t2, presentation_audio_id AS pres
         FROM course_legos WHERE course_code = $1 ORDER BY seed_number, lego_index`, [course])).rows;
    const phrases = (await pg.query(
      `SELECT id, seed_number, lego_index, lego_id, position, phrase_role, known_text, target_text, target_text_roman,
              known_audio_id::text AS ka, target1_audio_id::text AS t1, target2_audio_id::text AS t2, updated_at, status
         FROM course_practice_phrases WHERE course_code = $1 ORDER BY seed_number, lego_index, position`, [course])).rows;
    const ids = [...seeds.flatMap((s) => [s.ka, s.t1, s.t2]), ...phrases.map((p) => p.ka), ...legos.map((l) => l.ka)];
    const clips = {};
    for (const c of await db.clipsById(pg, ids, { cols: 'id::text AS id, text, voice_id, role' })) clips[c.id] = { text: c.text, voice_id: c.voice_id, role: c.role };
    fs.writeFileSync(out, JSON.stringify({ course, db: dbName, at: new Date().toISOString(), seeds, legos, phrases, clips }));
    console.log(`${course} db=${dbName} seeds ${seeds.length} legos ${legos.length} phrases ${phrases.length} clips ${Object.keys(clips).length}`);
  } finally { await pg.end(); }
}
main().catch((e) => { console.error(e.message); process.exit(1); });
