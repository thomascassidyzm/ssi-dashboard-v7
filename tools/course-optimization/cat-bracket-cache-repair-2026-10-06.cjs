#!/usr/bin/env node
'use strict';
// Job #20 (lane review #19·K) — repairs what the K42 pass (cat-bracket-tags-2026-10-05.cjs) left stale on cat_for_eng:
// cached decomposition / display_tiling on phrases whose own text it re-wrote (English-only edits kept the old cache),
// and on every phrase whose decomposition carries a re-texted LEGO's OLD gloss ("few / little (adj.)").
// A NULL decomposition is the established "rebuild me" state: POST /api/admin/decomposition-backfill refills it from
// the LEGOs as they now stand. Nothing else on the row changes.
//   node tools/course-optimization/cat-bracket-cache-repair-2026-10-06.cjs            # dry: counts + snapshot
//   APPLY=1 node …                                                                      # write, one transaction
const path = require('path'), fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
const D = require('./cat-bracket-tags-2026-10-05.data.cjs');
const COURSE = D.COURSE, SWEEP = 'cat-bracket-cache-repair-2026-10-06', SURFACE = `tools/course-optimization/${SWEEP}.cjs`;

async function main() {
  const { Client } = require('pg');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  // (1) phrases the pass edited with a text change on either side (ids from the pass's own audit events)
  const { rows: edited } = await pg.query(`SELECT DISTINCT c->>'id' id FROM content_edit_events e, jsonb_array_elements(e.detail->'changes') c
    WHERE e.course_code=$1 AND e.surface LIKE '%cat-bracket-tags%' AND e.operation='phrase-edit'
      AND (c->'from'->>'known' IS DISTINCT FROM c->'to'->>'known' OR c->'from'->>'target' IS DISTINCT FROM c->'to'->>'target')`, [COURSE]);
  // (2) phrases whose decomposition quotes a re-texted LEGO under words that LEGO no longer has
  const { rows: carriers } = await pg.query(`SELECT DISTINCT p.id FROM course_practice_phrases p CROSS JOIN LATERAL jsonb_array_elements(p.decomposition::jsonb) e
    JOIN course_legos l ON l.course_code=p.course_code AND l.lego_id=e->>'legoId'
    WHERE p.course_code=$1 AND p.decomposition IS NOT NULL AND l.lego_id = ANY($2) AND e->>'known' <> '' AND btrim(e->>'known') <> l.known_text`, [COURSE, Object.keys(D.LEGOS)]);
  const ids = [...new Set([...edited.map((r) => r.id), ...carriers.map((r) => r.id)])];
  const { rows: before } = await pg.query(`SELECT id, known_text, target_text, decomposition, decomposition_course_version, display_tiling, display_tiling_version, known_gloss_segments
    FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2) AND (decomposition IS NOT NULL OR display_tiling IS NOT NULL OR known_gloss_segments IS NOT NULL) ORDER BY id`, [COURSE, ids]);
  const out = process.env.CS_SCRATCH || require('os').tmpdir();
  fs.writeFileSync(path.join(out, `${SWEEP}-before.json`), JSON.stringify(before, null, 2));
  console.log(`${COURSE}: ${edited.length} edited-text phrases, ${carriers.length} stale-gloss carriers → ${before.length} rows holding a cache to drop`);
  if (process.env.APPLY !== '1') { await pg.end(); return; }
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const ev = await recordContentEdit(supabase, { identity: serviceIdentity(SWEEP, { role: 'content-sweep' }), courseCode: COURSE, surface: SURFACE, operation: 'phrase-cache-clear',
    scope: { phrase_ids: before.map((r) => r.id), rows: before.length }, detail: { job: '#20 (lane review #19·K)', why: 'K42 left decomposition/display_tiling caches describing the pre-edit words' } });
  await pg.query('BEGIN');
  try {
    const r = await pg.query(`UPDATE course_practice_phrases SET decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL, known_gloss_segments=NULL, last_edit_event_id=$1, updated_at=now()
      WHERE course_code=$2 AND id = ANY($3)`, [ev, COURSE, before.map((x) => x.id)]);
    if (r.rowCount !== before.length) throw new Error(`${r.rowCount} != ${before.length}`);
    await pg.query('COMMIT'); console.log(`CLEARED ${r.rowCount} rows (event ${ev})`);
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  await pg.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
