#!/usr/bin/env node
'use strict';
// tools/course-optimization/regenerate-debut-practice.cjs
//
// Writes practice phrases for every DEBUT LEGO that has none — no BUILD and no USE beyond the bare
// LEGO, the one case the release gate blocks (services/shared/debut-practice.cjs; Tom, 2026-09-30,
// jobs #906/#910). A BUILD-only debut is practised and is not a target unless named with --lego.
//
// The phrases come from phrase v3 (lib/phrase-generation.cjs, in-process: the real prompt, Opus,
// the real gates — floors, containment, earlier-siblings-only vocabulary, ZUT, known side — and the
// declaration check, with its own retries). A set v3 cannot make pass is NOT written: it is listed
// with v3's reasons, because a debut v3 cannot practise is a decomposition question (re-order or
// re-cut the seed — P7), not something to paper over.
//
// Writing APPENDS: existing rows under the LEGO keep their ids, positions and clips; new rows take
// the next B/U numbers and positions. A generated phrase whose target already sits under the LEGO is
// skipped. `--cut <ids>` deletes named rows of the SAME LEGOs in the same transaction (only rows you
// have read and judged — never a pattern). Every touched seed is unapproved (an edit unapproves), the
// round index is refreshed, and an audio pass is QUEUED — nothing is rendered here.
//
//   node tools/course-optimization/regenerate-debut-practice.cjs ita_for_eng                   # plan: generate, gate, print
//   node tools/course-optimization/regenerate-debut-practice.cjs ita_for_eng --lego S0190L01   # one LEGO
//   APPLY=1 node tools/course-optimization/regenerate-debut-practice.cjs ita_for_eng [--cut S0190L01B03,S0190L01B04]
//   APPLY=1 ... --from <plan.json> --lego S0190L01 --p7 --cut ...   # BUILD fragments for a sibling-carried debut (P7)
//
// The plan is written to $CS_SCRATCH (or ~/ssi-evidence) so an APPLY run can reuse it with --from <plan.json>
// instead of paying for generation twice.
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const SWEEP = 'regenerate-debut-practice';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const JOB = '#906';
const RULING = 'Tom, 2026-09-30 10:35Z (job #906): a debut LEGO (is_new=true) NEEDS practice phrases when it is introduced';

function args(argv) {
  const a = { course: null, legos: null, seeds: null, cut: [], from: null, p7: false };
  for (let i = 0; i < argv.length; i++) {
    const v = argv[i];
    if (v === '--lego') a.legos = String(argv[++i]).split(',');
    else if (v === '--seeds') a.seeds = String(argv[++i]).split(',').map(Number);
    else if (v === '--cut') a.cut = String(argv[++i]).split(',').filter(Boolean);
    else if (v === '--from') a.from = argv[++i];
    else if (v === '--p7') a.p7 = true;
    else if (!v.startsWith('--')) a.course = v;
  }
  return a;
}
const lid = (s, i) => `S${String(s).padStart(4, '0')}L${String(i).padStart(2, '0')}`;
const normT = (s) => String(s || '').toLowerCase().replace(/[.,!?;:"«»¿¡]+/g, ' ').replace(/\s+/g, ' ').trim();

async function plan(supabase, a) {
  const { checkCourseDebutPractice } = require('../../services/shared/debut-practice.cjs');
  const { generateLegoPhrases } = require('../../services/course-builder/lib/phrase-generation.cjs');
  const seeds = a.seeds || (a.legos ? [...new Set(a.legos.map((l) => Number(l.slice(1, 5))))] : null);
  const audit = await checkCourseDebutPractice(supabase, a.course, { seeds });
  // --lego names LEGOs to work on whether or not they block (a carried, thin debut can still need
  // its BUILD basket repaired); without it, every blocking debut in scope.
  let targets = a.legos ? [...audit.blocking, ...audit.thin].filter((b) => a.legos.includes(b.lego_id)) : audit.blocking;
  const out = [];
  for (const b of targets) {
    console.log(`→ ${b.lego_id} "${b.known_text}" → "${b.target_text}" (${b.reason}; ${b.build} BUILD / ${b.use} USE)`);
    const r = await generateLegoPhrases(supabase, a.course, b.seed_number, b.lego_index);
    const e = { ...b, model: r.model, blocked: r.blocked, failingGates: r.gate?.failingGates || [],
      reasons: (r.attempts || []).slice(-1)[0]?.reasons || [], build: r.build, use: r.use, declarationPass: r.declarationCheck?.pass ?? null };
    console.log(`  ${r.blocked ? 'BLOCKED ' + e.failingGates.join(',') : 'gate PASS'} — ${r.build.length} BUILD / ${r.use.length} USE on ${r.model}`);
    for (const p of r.build) console.log(`    B  ${p.known} | ${p.target}`);
    for (const p of r.use) console.log(`    U  ${p.known} | ${p.target}`);
    if (r.blocked) e.reasons.slice(0, 6).forEach((x) => console.log(`    ✗ ${x}`));
    out.push(e);
  }
  return { course: a.course, at: new Date().toISOString(), audited: audit.blocking.length, entries: out };
}

async function apply(pg, supabase, p, cut, { p7 = false } = {}) {
  const { makePhraseId, computeLegoPosition } = require('../../services/course-builder/lib/phrase-structure.cjs');
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const course = p.course;
  // --p7 (Kai's fix-time remedy, canon P7): a debut that cannot stand in a complete sentence
  // until a later LEGO of its seed is taught takes BUILD fragments only, and is written when the
  // ONLY thing v3 refused was the USE floor AND a later sibling's USE carries it (re-checked now).
  let carried = new Set();
  if (p7) {
    const { checkCourseDebutPractice } = require('../../services/shared/debut-practice.cjs');
    const seeds = [...new Set(p.entries.map((e) => e.seed_number))];
    const now = await checkCourseDebutPractice(supabase, p.course, { seeds });
    carried = new Set(now.thin.filter((t) => t.carried_by).map((t) => t.lego_id));
  }
  const p7ok = (e) => p7 && e.blocked && carried.has(e.lego_id) && e.use.length === 0 && e.build.length > 0
    && e.failingGates.every((g) => g === 'buildUseFloors');
  const ok = p.entries.filter((e) => !e.blocked || p7ok(e));
  if (!ok.length) return { written: 0 };
  const cutIds = cut.map((c) => (c.includes(':') ? c : `${course}:${c}`));
  for (const c of cutIds) if (!ok.some((e) => c.includes(e.lego_id))) throw new Error(`--cut ${c} is not a row of a LEGO being regenerated`);

  const rows = [];
  for (const e of ok) {
    const { rows: [lego] } = await pg.query('SELECT is_new, known_text, target_text FROM course_legos WHERE course_code=$1 AND seed_number=$2 AND lego_index=$3', [course, e.seed_number, e.lego_index]);
    if (!lego || !lego.is_new || lego.target_text !== e.target_text || lego.known_text !== e.known_text) throw new Error(`${e.lego_id} changed since the plan — re-plan`);
    const { rows: have } = await pg.query('SELECT id, position, phrase_role, target_text FROM course_practice_phrases WHERE course_code=$1 AND seed_number=$2 AND lego_index=$3', [course, e.seed_number, e.lego_index]);
    const kept = have.filter((h) => !cutIds.includes(h.id));
    const seen = new Set(kept.filter((h) => h.phrase_role !== 'component').map((h) => normT(h.target_text)));
    let pos = Math.max(0, ...have.map((h) => h.position));
    const num = { build: 0, use: 0 };
    for (const h of have) { const m = /([BU])(\d{2})$/.exec(h.id); if (m) { const r = m[1] === 'B' ? 'build' : 'use'; num[r] = Math.max(num[r], Number(m[2])); } }
    for (const [role, list] of [['build', e.build], ['use', e.use]]) {
      for (const ph of list) {
        if (seen.has(normT(ph.target))) continue;
        seen.add(normT(ph.target));
        num[role] += 1; pos += 1;
        rows.push({ id: makePhraseId(course, e.seed_number, e.lego_index, role, num[role]), seed: e.seed_number, idx: e.lego_index, lego: e.lego_id,
          position: pos, role, known: ph.known, target: ph.target, lego_position: computeLegoPosition(ph.target, e.target_text) });
      }
    }
  }
  const seeds = [...new Set(ok.map((e) => e.seed_number))].sort((x, y) => x - y);
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const rec = (operation, scope, detail) => recordContentEdit(supabase, { identity, courseCode: course, surface: SURFACE, operation, scope, detail: { ruling: RULING, job: JOB, ...detail } });
  const insEvent = await rec('phrase-insert', { seed_numbers: seeds, lego_ids: ok.map((e) => e.lego_id), phrase_ids: rows.map((r) => r.id), rows: rows.length },
    { generator: 'phrase v3', model: ok[0].model, rows: rows.map((r) => ({ id: r.id, known: r.known, target: r.target })) });
  const cutEvent = cutIds.length ? await rec('phrase-delete', { seed_numbers: seeds, phrase_ids: cutIds, rows: cutIds.length }, { why: 'replaced by the v3 basket; read and judged defective', ids: cutIds }) : null;
  const { rows: appr } = await pg.query('SELECT seed_number FROM course_seeds WHERE course_code=$1 AND seed_number = ANY($2) AND approved_at IS NOT NULL', [course, seeds]);
  const toUnapprove = appr.map((s) => s.seed_number);
  const unEvent = toUnapprove.length ? await rec('unapprove', { seed_numbers: toUnapprove, rows: toUnapprove.length }, { why: 'phrases added; edits unapprove their seed' }) : null;

  await pg.query('BEGIN');
  try {
    for (const r of rows) {
      const ins = await pg.query(`INSERT INTO course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count, metadata, status, phrase_role, connected_lego_ids, lego_position, lego_id, introduce, last_edit_event_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'draft',$11,'{}',$12,$13,true,$14)`,
        [r.id, course, r.seed, r.idx, r.position, r.known, r.target, r.target.length, r.known.split(/\s+/).length,
          JSON.stringify({ format: 'build_use', pipeline: 'v3', source: SWEEP, job: JOB, model: ok[0].model }), r.role, r.lego_position, r.lego, insEvent]);
      if (ins.rowCount !== 1) throw new Error(`${r.id}: insert ${ins.rowCount}`);
    }
    for (const c of cutIds) {
      const del = await pg.query('DELETE FROM course_practice_phrases WHERE course_code=$1 AND id=$2', [course, c]);
      if (del.rowCount !== 1) throw new Error(`${c}: delete ${del.rowCount}`);
    }
    if (toUnapprove.length) await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number = ANY($3)', [unEvent, course, toUnapprove]);
    await pg.query('COMMIT');
  } catch (err) { await pg.query('ROLLBACK'); throw err; }
  await require('../../services/shared/round-index-refresh.cjs').refreshNow();
  const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs');
  let queued = null;
  try { queued = await queueAudioPass(supabase, { courseCode: course, reason: `${SWEEP} (job ${JOB}): ${rows.length} practice phrases for ${ok.length} debut LEGO(s)`, requestedBy: SWEEP }); }
  catch (err) { queued = { error: err.message }; }
  return { written: rows.length, ids: rows.map((r) => r.id), cut: cutIds, insEvent, cutEvent, unapproved: toUnapprove, queued };
}

async function main() {
  const a = args(process.argv.slice(2));
  if (!a.course) { console.error('usage: regenerate-debut-practice.cjs <course> [--lego S0190L01] [--seeds a,b] [--from plan.json] [--cut ids]'); process.exit(64); }
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const p = a.from ? JSON.parse(fs.readFileSync(a.from, 'utf8')) : await plan(supabase, a);
  if (a.from && a.legos) p.entries = p.entries.filter((e) => a.legos.includes(e.lego_id));
  const dir = process.env.CS_SCRATCH || path.join(require('os').homedir(), 'ssi-evidence', 'ssi-dashboard-v7', 'tools', 'course-optimization');
  fs.mkdirSync(dir, { recursive: true });
  if (!a.from) { const f = path.join(dir, `${SWEEP}-${a.course}-${Date.now()}.json`); fs.writeFileSync(f, JSON.stringify(p, null, 2)); console.log(`plan: ${f}`); }
  const blocked = p.entries.filter((e) => e.blocked);
  console.log(`\n${p.entries.length} debut(s): ${p.entries.length - blocked.length} with a passing v3 set, ${blocked.length} v3 could not practise${blocked.length ? ': ' + blocked.map((e) => e.lego_id).join(', ') : ''}`);
  if (process.env.APPLY !== '1') return;
  const { Client } = require('pg');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  try { console.log('APPLIED', JSON.stringify(await apply(pg, supabase, p, a.cut, { p7: a.p7 }))); } finally { await pg.end(); }
}
module.exports = { normT };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
