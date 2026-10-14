#!/usr/bin/env node
/**
 * APPLY A STAGED GAP FILL — the only v4 tool that writes course rows (job #924).
 *
 * Reads staged-<course>.json (gap-fill-course.cjs: every row already passed
 * Popty's seed-complete gates) and INSERTS the rows into course_practice_phrases.
 *
 * ADDITIVE BY CONSTRUCTION (Tom, 2026-10-06: a write script compares what it is
 * about to write against what exists and refuses to shrink or overwrite):
 *   - plain INSERT, never upsert: an id that already exists aborts the whole
 *     transaction, it is never overwritten;
 *   - ids continue each LEGO's own B/U numbering from the highest existing id,
 *     positions continue from the highest existing position;
 *   - a staged row whose known+target already sits on that LEGO is skipped
 *     (so a second apply is a no-op, not a duplicate);
 *   - one transaction asserts the course's row count afterwards is exactly
 *     before + inserted, and every pre-existing row's (id, known, target) hash
 *     is unchanged — or it rolls back.
 *
 * LIVE COURSES NEED TOM. Every paying course in this Supabase is served to
 * learners — there is no staging copy of course_practice_phrases — so a course
 * whose status is beta or released is refused unless --tom-go "<his words>" is
 * given. The words are recorded on the content-edit event.
 *
 * Default is a DRY RUN that writes apply-plan-<course>.json and touches nothing.
 *
 * Usage: node tools/frame-layer/v4/apply-gap-fill.cjs <course> [--apply --tom-go "<Tom's words>"]
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { makePhraseId, computeLegoPosition } = require('../../../services/course-builder/lib/phrase-structure.cjs');
const { query, lit } = require('./db.cjs');

const RUN_DIR = process.env.V4_RUN_DIR || path.join(process.env.HOME, 'ssi-evidence', 'ssi-dashboard-v7', '924-phrase-v4-all-courses');
const ROLE = { build: 'B', use: 'U' };
const key = (s) => String(s || '').trim().toLowerCase();

/**
 * Pure planner: staged rows + the live rows of the LEGOs they touch → rows to
 * insert. Never returns an id that exists; skips rows already present.
 */
function planInsert(course, staged, existing) {
  const byLego = new Map();
  for (const e of existing) {
    const k = `${e.seed_number}:${e.lego_index}`;
    if (!byLego.has(k)) byLego.set(k, { maxPos: 0, maxNum: { B: 0, U: 0 }, pairs: new Set(), ids: new Set() });
    const L = byLego.get(k);
    L.maxPos = Math.max(L.maxPos, e.position || 0);
    const m = String(e.id).match(/([A-Z])(\d+)$/);
    if (m && L.maxNum[m[1]] != null) L.maxNum[m[1]] = Math.max(L.maxNum[m[1]], +m[2]);
    L.pairs.add(key(e.known_text) + '|' + key(e.target_text));
    L.ids.add(e.id);
  }
  const rows = [], skipped = [];
  for (const r of staged) {
    const k = `${r.seed_number}:${r.lego_index}`;
    if (!byLego.has(k)) byLego.set(k, { maxPos: 0, maxNum: { B: 0, U: 0 }, pairs: new Set(), ids: new Set() });
    const L = byLego.get(k);
    const pair = key(r.known_text) + '|' + key(r.target_text);
    if (L.pairs.has(pair)) { skipped.push({ ...r, why: 'already on this LEGO' }); continue; }
    const letter = ROLE[r.phrase_role];
    if (!letter) throw new Error(`unknown role ${r.phrase_role}`);
    const num = ++L.maxNum[letter];
    const id = makePhraseId(course, r.seed_number, r.lego_index, r.phrase_role, num);
    if (L.ids.has(id)) throw new Error(`refusing: ${id} already exists`);
    L.ids.add(id); L.pairs.add(pair);
    rows.push({
      id, course_code: course, seed_number: r.seed_number, lego_index: r.lego_index, position: ++L.maxPos,
      known_text: r.known_text, target_text: r.target_text,
      word_count: r.target_text.length, lego_count: (r.known_text.match(/\s+/g) || []).length + 1,
      phrase_role: r.phrase_role, connected_lego_ids: [], lego_position: computeLegoPosition(r.target_text, r.lego_target),
      metadata: { format: 'build_use', pipeline: 'v4-gap', job: '924', window: r.window, frames: r.frames },
      status: 'draft', version: 1, introduce: true,
    });
  }
  return { rows, skipped };
}


async function main() {
  const a = process.argv.slice(2);
  const course = a[0];
  const apply = a.includes('--apply');
  const gi = a.indexOf('--tom-go'); const tomGo = gi >= 0 ? a[gi + 1] : null;
  const dir = path.join(RUN_DIR, course);
  const staged = JSON.parse(fs.readFileSync(path.join(dir, `staged-${course}.json`), 'utf8'));
  const [c] = query(`select status, visibility from courses where course_code=${lit(course)}`);
  if (!c) throw new Error(`no course ${course}`);
  if (/^cym/.test(course)) throw new Error('Welsh is excluded (r-2026-09-27)');
  const keys = [...new Set(staged.rows.map(r => `(${+r.seed_number},${+r.lego_index})`))];
  const existing = keys.length ? query(`select id, seed_number, lego_index, position, known_text, target_text from course_practice_phrases
    where course_code=${lit(course)} and (seed_number, lego_index) in (${keys.join(',')})`) : [];
  const { rows, skipped } = planInsert(course, staged.rows, existing);
  const [{ n: before }] = query(`select count(*)::int n from course_practice_phrases where course_code=${lit(course)}`);
  const plan = { course, status: c.status, generated: new Date().toISOString(), live_rows_before: before, to_insert: rows.length, skipped: skipped.length,
    by_role: { build: rows.filter(r => r.phrase_role === 'build').length, use: rows.filter(r => r.phrase_role === 'use').length }, rows, skipped };
  fs.writeFileSync(path.join(dir, `apply-plan-${course}.json`), JSON.stringify(plan, null, 1));
  console.log(`${course} (${c.status}): ${rows.length} rows to insert (${plan.by_role.build} BUILD / ${plan.by_role.use} USE), ${skipped.length} already present; course has ${before} rows`);
  if (!apply) { console.log('DRY RUN — nothing written'); return; }
  if (['beta', 'released'].includes(c.status) && !tomGo) throw new Error(`refusing: ${course} is ${c.status} (served to learners); needs --tom-go "<Tom's words>"`);
  if (!rows.length) return;

  require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '.env'), quiet: true });
  const { supabase } = require('../../../services/supabase-client.cjs');
  const { serviceIdentity } = require('../../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../../services/shared/content-edit-log.cjs');
  const eventId = await recordContentEdit(supabase, { identity: serviceIdentity('v4-gap-fill-924'), courseCode: course,
    surface: 'tools/frame-layer/v4/apply-gap-fill.cjs', operation: 'insert',
    scope: { rows: rows.length, phrase_ids: rows.map(r => r.id) }, detail: { tom_go: tomGo || null, staged_at: staged.generated } });
  for (const r of rows) r.last_edit_event_id = eventId;
  const hashSql = `select md5(string_agg(id||'|'||coalesce(known_text,'')||'|'||target_text, ',' order by id)) from course_practice_phrases where course_code=${lit(course)}`;
  const [{ md5: hashBefore }] = query(hashSql);
  const jsonFile = path.join(dir, `apply-rows-${course}.json`);
  fs.writeFileSync(jsonFile, JSON.stringify(rows));
  const sql = `\\set ON_ERROR_STOP 1
begin;
\\set rows \`cat ${jsonFile}\`
insert into course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count, phrase_role, connected_lego_ids, lego_position, metadata, status, version, introduce, last_edit_event_id)
  select id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count, phrase_role, connected_lego_ids, lego_position, metadata, status, version, introduce, last_edit_event_id
  from json_populate_recordset(null::course_practice_phrases, :'rows');
do $$ begin
  if (select count(*) from course_practice_phrases where course_code=${lit(course)}) <> ${before + rows.length} then raise exception 'row count is not before + inserted'; end if;
  if (select md5(string_agg(id||'|'||coalesce(known_text,'')||'|'||target_text, ',' order by id)) from course_practice_phrases where course_code=${lit(course)} and not (id = any(array[${rows.map(r => lit(r.id)).join(',')}]))) <> ${lit(hashBefore)} then raise exception 'a pre-existing row changed'; end if;
end $$;
commit;
`;
  execFileSync('psql', ['-X', '-q', psqlArg()], { input: sql, stdio: ['pipe', 'inherit', 'inherit'] });
  const [{ n: after }] = query(`select count(*)::int n from course_practice_phrases where course_code=${lit(course)}`);
  console.log(`APPLIED: ${before} → ${after} rows (event ${eventId})`);
  execFileSync('node', [path.join(__dirname, '..', '..', 'course-optimization', 'queue-audio-pass.cjs'), course, '--reason', 'v4 gap fill (#924)'], { stdio: 'inherit' });
}

function psqlArg() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const env = fs.readFileSync(path.join(__dirname, '..', '..', '..', '.env.psql'), 'utf8');
  return env.match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/)[1].trim();
}

module.exports = { planInsert };
if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });
