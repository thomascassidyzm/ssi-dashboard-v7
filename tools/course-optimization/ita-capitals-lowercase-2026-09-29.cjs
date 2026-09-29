#!/usr/bin/env node
// ita_for_eng, Kai approved (job #883·I, scan #867 Check 13): the target side is lowercase-initial
// (13,749 of 13,766 phrase rows), so the 16 phrase rows that open with a capital (Perché…/È…) are
// lowercased, and the two case-only known-side pairs (13a) are made to match the dominant lowercase.
// "Africa" (a component, a proper noun) is deliberately left alone.
//
// AUDIO MUST STAY ATTACHED: case does not change sound, and normalize_text lowercases. The write runs
// in ONE transaction that compares known/target1/target2 audio ids before and after and counts new
// content_audio_link_drops; any difference => ROLLBACK, nothing written.
//
//   node tools/course-optimization/ita-capitals-lowercase-2026-09-29.cjs           (dry run)
//   APPLY=1 node tools/course-optimization/ita-capitals-lowercase-2026-09-29.cjs   (writes)
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql') });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const COURSE = 'ita_for_eng';
const SWEEP = 'ita-capitals-lowercase-2026-09-29';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const JOB = '#883·I';
const isUpper = (c) => c === c.toUpperCase() && c !== c.toLowerCase();
const lowerFirst = (t) => { const [f] = [...t]; return f.toLowerCase() + t.slice(f.length); };

// 13b: capital-initial target_text on a course whose target side is lowercase-initial; proper nouns exempt.
const PROPER_NOUNS = new Set(['Africa']);
function targetOutliers(rows) {
  return rows.filter((r) => {
    const t = (r.target_text || '').trim();
    const f = [...t][0];
    return f && isUpper(f) && !PROPER_NOUNS.has(t);
  });
}
// 13a: groups of same-lowercased text with >1 spelling; the rows NOT spelled in the dominant form (ties -> lowercase).
function caseOnlyFixes(rows, field) {
  const groups = new Map();
  for (const r of rows) { const k = (r[field] || '').toLowerCase().trim(); if (k) (groups.get(k) || groups.set(k, []).get(k)).push(r); }
  const out = [];
  for (const g of groups.values()) {
    const counts = {}; g.forEach((r) => { counts[r[field]] = (counts[r[field]] || 0) + 1; });
    if (Object.keys(counts).length < 2) continue;
    const lower = g[0][field].toLowerCase().trim();
    const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1] || (a[0] === lower ? -1 : 1))[0][0];
    g.filter((r) => r[field] !== dominant).forEach((r) => out.push({ row: r, field, to: dominant }));
  }
  return out;
}
module.exports = { lowerFirst, targetOutliers, caseOnlyFixes };
if (require.main !== module) return;

(async () => {
  const { Client } = require('pg');
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  const cols = 'id, seed_number, phrase_role, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id';
  const { rows } = await pg.query(`SELECT ${cols} FROM course_practice_phrases WHERE course_code=$1`, [COURSE]);
  const edits = new Map(); // id -> {row, known?, target?}
  const put = (row, k, v) => { const e = edits.get(row.id) || { row }; e[k] = v; edits.set(row.id, e); };
  targetOutliers(rows).forEach((r) => put(r, 'target', lowerFirst(r.target_text)));
  caseOnlyFixes(rows, 'known_text').forEach((f) => put(f.row, 'known', f.to));
  const list = [...edits.values()];
  const seeds = [...new Set(list.map((e) => e.row.seed_number))].sort((a, b) => a - b);
  console.log(`${APPLY() ? 'APPLY' : 'DRY RUN'}: ${list.length} rows, seeds ${seeds.join(',')}`);
  list.forEach((e) => console.log(' ', e.row.id, e.target ? `target ${JSON.stringify(e.row.target_text)} -> ${JSON.stringify(e.target)}` : '', e.known ? `known ${JSON.stringify(e.row.known_text)} -> ${JSON.stringify(e.known)}` : ''));
  if (!APPLY()) return pg.end();

  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const { rows: seedRows } = await pg.query('SELECT seed_number, approved_at FROM course_seeds WHERE course_code=$1 AND seed_number = ANY($2)', [COURSE, seeds]);
  const phraseEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-edit',
    scope: { seed_numbers: seeds, phrase_ids: list.map((e) => e.row.id), rows: list.length },
    detail: { job: JOB, why: 'Check 13 capitalisation: case-only, audio links kept', changes: list.map((e) => ({ id: e.row.id, target_from: e.target ? e.row.target_text : undefined, target_to: e.target, known_from: e.known ? e.row.known_text : undefined, known_to: e.known })) } });
  const seedEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'unapprove',
    scope: { seed_numbers: seeds, rows: seeds.length }, detail: { job: JOB, why: 'capitalisation edit on a phrase of the seed; house edit rule', approved_at_before: seedRows } });

  const ids = list.map((e) => e.row.id);
  const snap = async () => (await pg.query('SELECT id, known_audio_id, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE id = ANY($1) ORDER BY id', [ids])).rows;
  const drops = async () => +(await pg.query('SELECT count(*) FROM content_audio_link_drops WHERE course_code=$1', [COURSE])).rows[0].count;
  const beforeLinks = JSON.stringify(await snap()), beforeDrops = await drops();
  await pg.query('BEGIN');
  try {
    for (const e of list) {
      const r = await pg.query(
        `UPDATE course_practice_phrases SET target_text=COALESCE($1,target_text), known_text=COALESCE($2,known_text), last_edit_event_id=$3, updated_at=now()
          WHERE id=$4 AND target_text=$5 AND known_text=$6`, [e.target ?? null, e.known ?? null, phraseEvent, e.row.id, e.row.target_text, e.row.known_text]);
      if (r.rowCount !== 1) throw new Error(`${e.row.id}: ${r.rowCount} rows`);
    }
    const s = await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number = ANY($3)', [seedEvent, COURSE, seeds]);
    if (s.rowCount !== seeds.length) throw new Error(`seed unapprove ${s.rowCount}`);
    const afterLinks = JSON.stringify(await snap()), afterDrops = await drops();
    if (afterLinks !== beforeLinks || afterDrops !== beforeDrops) throw new Error(`AUDIO LINK CHANGED (drops ${beforeDrops}->${afterDrops}); rolled back`);
    await pg.query('COMMIT');
    console.log(`committed: ${list.length} rows, ${seeds.length} seeds unapproved, audio ids identical, drops ${beforeDrops}->${afterDrops}, events ${phraseEvent} ${seedEvent}`);
  } catch (err) { await pg.query('ROLLBACK'); console.error('ROLLED BACK:', err.message); process.exitCode = 1; }
  await pg.end();
})();
function APPLY() { return process.env.APPLY === '1'; }
