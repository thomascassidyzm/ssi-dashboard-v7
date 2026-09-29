#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-esserci-use-2026-09-29.cjs
//
// ita_for_eng — job #863·I inserts the esserci USE phrases drafted by #861 (one per seed, under a host LEGO that
// is new and played), after a strict native-level check of BOTH sides. Kai: "pick all the definitely safe ones".
// Two of the eleven drafts are NOT inserted, and a row not certain is dropped, never fixed:
//   S0526 "trovo difficile esserci" — Kai's own doubt about naturalness (excluded by his word);
//   S0363 "aveva voglia di esserci con te" — "he felt like being there with you": the English is stilted for a
//         phrase a native would say more plainly (aveva voglia di stare lì con te), so not certain → dropped.
// All nine survivors use esserci (taught S0157) or ci sarò (S0165/S0176) — no ci sarà/ci saranno (untaught).
// USE rows are inserted the way the existing tools do it (ita-sicuro-di-wh-2026-09-29.cjs): next U number under
// the host, position after the seed's last row, lego_position from the LEGO, introduce=true, draft, edit event
// recorded, the seed UNAPPROVED (Kai reads it), round index refreshed. Audio is NOT rendered here — see
// ita-esserci-audio-2026-09-29.cjs (one role per run, through POST /api/audio/render only).

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'ita_for_eng';
const JOB = '#863·I';
const SWEEP = 'ita-esserci-use-2026-09-29';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = 'Kai, 2026-09-29: pick all the definitely safe ones of the #861·I esserci USE drafts (S0526 excluded; anything not certain dropped)';

const norm = (s) => String(s || '').toLowerCase().replace(/’/g, "'").replace(/[.,!?;:"]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => norm(s).split(' ').filter(Boolean);
function containsWords(hay, needle) { const h = words(hay); for (const w of words(needle)) { const i = h.indexOf(w); if (i < 0) return false; h.splice(i, 1); } return true; }
function legoPosition(phraseTarget, legoTarget) {
  const p = norm(phraseTarget), l = norm(legoTarget);
  if (p === l) return null;
  if (p.startsWith(l + ' ')) return 'start';
  if (p.endsWith(' ' + l)) return 'end';
  return 'middle';
}
const full = (id) => `${COURSE}:${id}`;
const seedOf = (id) => Number(String(id).slice(1, 5));

// host LEGO id → { known/target of the LEGO as live, the row }
const ROWS = [
  { lego: 'S0208L01', known: "I didn't want to be there", target: 'non volevo esserci' },
  { lego: 'S0280L01', known: 'I had to be there on Sunday morning', target: 'dovevo esserci domenica mattina' },
  { lego: 'S0291L01', known: 'I hope to be there tomorrow night', target: 'spero di esserci domani sera' },
  { lego: 'S0316L02', known: "I'll be there on Monday", target: 'ci sarò lunedì' },
  { lego: 'S0320L01', known: "he doesn't need to be there tomorrow", target: 'non ha bisogno di esserci domani' },
  { lego: 'S0404L01', known: "we shouldn't be there tomorrow", target: 'non dovremmo esserci domani' },
  { lego: 'S0412L01', known: "we couldn't be there yesterday", target: 'non potevamo esserci ieri' },
  { lego: 'S0448L01', known: "they'll be happy to be there with you", target: 'saranno felici di esserci con te' },
  { lego: 'S0579L02', known: "we've often tried to be there", target: 'abbiamo spesso provato a esserci' },
];
const DROPPED = [
  { lego: 'S0526L01', known: "I'm finding it hard to be there", target: 'trovo difficile esserci', why: "excluded by Kai (naturalness in doubt)" },
  { lego: 'S0363L01', known: 'he felt like being there with you', target: 'aveva voglia di esserci con te', why: 'not certain: the English is stilted and a native would say aveva voglia di stare lì con te — dropped, not fixed' },
];
const SEEDS = [...new Set(ROWS.map((r) => seedOf(r.lego)))];
const hasEsserci = (t) => /\besserci\b|\bci sarò(?= |$)/.test(norm(t));

/** The rule the plan must hold (tested): every row says esserci / ci sarò and contains its host LEGO on both sides. */
function planProblems(legos) {
  const out = [];
  for (const r of ROWS) {
    const l = legos[r.lego];
    if (!l) { out.push(`${r.lego}: host LEGO missing`); continue; }
    if (!l.is_new) out.push(`${r.lego}: host LEGO is not new (its basket would not be played — P25)`);
    if (!hasEsserci(r.target)) out.push(`${r.lego}: "${r.target}" has no esserci / ci sarò`);
    if (!containsWords(r.known, l.known_text) || !containsWords(r.target, l.target_text)) out.push(`${r.lego}: "${r.known}" | "${r.target}" does not contain the LEGO "${l.known_text}" | "${l.target_text}"`);
  }
  for (const d of DROPPED) if (ROWS.some((r) => r.lego === d.lego)) out.push(`${d.lego} is dropped but planned`);
  return out;
}

async function untaught(pg, seed, text, side) {
  const col = side === 'known' ? 'known_text' : 'target_text';
  const out = [];
  for (const w of new Set(words(text))) {
    const { rows } = await pg.query(
      `SELECT 1 FROM (SELECT seed_number, ${col} AS t FROM course_practice_phrases WHERE course_code=$1 UNION ALL SELECT seed_number, ${col} FROM course_legos WHERE course_code=$1 UNION ALL SELECT seed_number, ${col} FROM course_seeds WHERE course_code=$1) x
       WHERE seed_number <= $2 AND ' '||regexp_replace(lower(replace(t,'’','''')), '[.,!?;:"]', ' ', 'g')||' ' LIKE '% '||$3||' %' LIMIT 1`, [COURSE, seed, w]);
    if (!rows.length) out.push(`${side === 'known' ? 'en' : 'it'}:${w}`);
  }
  return out;
}
async function vocabularyGuards(pg) {
  const probs = [];
  for (const r of ROWS) {
    const u = [...await untaught(pg, seedOf(r.lego), r.known, 'known'), ...await untaught(pg, seedOf(r.lego), r.target, 'target')];
    if (u.length) probs.push(`${r.lego} at seed ${seedOf(r.lego)} uses untaught words: ${u.join(', ')}`);
  }
  return probs;
}
/** Same English → different Italian anywhere in the course (rows, LEGOs, seeds) is a HOLD; also the P17 shape: same Italian already in the seed's basket. */
async function zutGuards(pg) {
  const clashes = [];
  for (const r of ROWS) {
    const { rows } = await pg.query(
      `SELECT id::text AS id, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND phrase_role<>'component' AND lower(trim(known_text))=lower($2) AND lower(trim(target_text))<>lower($3)
       UNION ALL SELECT lego_id, known_text, target_text FROM course_legos WHERE course_code=$1 AND lower(trim(known_text))=lower($2) AND lower(trim(target_text))<>lower($3)
       UNION ALL SELECT seed_id, known_text, target_text FROM course_seeds WHERE course_code=$1 AND lower(trim(known_text))=lower($2) AND lower(trim(target_text))<>lower($3)`, [COURSE, r.known, r.target]);
    for (const c of rows) clashes.push(`ZUT: ${r.lego} "${r.known}" → "${r.target}" vs ${c.id} → "${c.target_text}"`);
    const dup = await pg.query(`SELECT id FROM course_practice_phrases WHERE course_code=$1 AND phrase_role<>'component' AND lower(trim(target_text))=lower($2)`, [COURSE, r.target]);
    for (const d of dup.rows) clashes.push(`already in the course: ${r.lego} "${r.target}" = ${d.id}`);
  }
  return clashes;
}
async function loadLegos(pg) {
  const { rows } = await pg.query('SELECT lego_id, known_text, target_text, is_new FROM course_legos WHERE course_code=$1 AND lego_id = ANY($2)', [COURSE, ROWS.map((r) => r.lego)]);
  return Object.fromEntries(rows.map((r) => [r.lego_id, r]));
}
async function nextId(pg, lego, taken) {
  const { rows } = await pg.query(`SELECT id FROM course_practice_phrases WHERE course_code=$1 AND id LIKE $2`, [COURSE, `${COURSE}:${lego}U%`]);
  const max = Math.max(0, ...rows.map((r) => Number(r.id.split(':')[1].slice(lego.length + 1))), ...(taken[lego] || []));
  (taken[lego] = taken[lego] || []).push(max + 1);
  return `${lego}U${String(max + 1).padStart(2, '0')}`;
}

async function applyContent(pg, supabase, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const ev = (op, scope, detail) => recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: op, scope, detail });
  log.approvedBefore = Object.fromEntries((await pg.query('SELECT seed_number, approved_at FROM course_seeds WHERE course_code=$1 AND seed_number = ANY($2)', [COURSE, SEEDS])).rows.map((r) => [r.seed_number, r.approved_at]));
  const taken = {}; const planned = [];
  for (const r of ROWS) planned.push({ ...r, id: await nextId(pg, r.lego, taken) });
  const legos = await loadLegos(pg);
  const Ev = {};
  Ev.add = await ev('phrase-add', { seed_numbers: SEEDS, phrase_ids: planned.map((p) => full(p.id)), rows: planned.length }, { ruling: RULING, job: JOB, rows: planned.map((p) => ({ id: full(p.id), lego: p.lego, known: p.known, target: p.target })), dropped: DROPPED });
  Ev.unapprove = await ev('unapprove', { seed_numbers: SEEDS, rows: SEEDS.length }, { why: 'seeds that gained an esserci USE phrase — Kai should read them', job: JOB, approved_at_before: log.approvedBefore });
  log.events = Ev; log.inserted = [];
  await pg.query('BEGIN');
  try {
    for (const p of planned) {
      const sn = seedOf(p.lego);
      const { rows: [m] } = await pg.query('SELECT coalesce(max(position),0) AS m FROM course_practice_phrases WHERE course_code=$1 AND seed_number=$2', [COURSE, sn]);
      const ins = await pg.query(`INSERT INTO course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count, metadata, status, phrase_role, connected_lego_ids, lego_position, lego_id, introduce, last_edit_event_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'draft','use','{}',$11,$12,true,$13)`,
        [full(p.id), COURSE, sn, Number(p.lego.slice(6)), Number(m.m) + 1, p.known, p.target, p.target.length, p.target.split(/\s+/).length, JSON.stringify({ format: 'build_use', source: SWEEP, job: JOB }), legoPosition(p.target, legos[p.lego].target_text), p.lego, Ev.add]);
      if (ins.rowCount !== 1) throw new Error(`${p.id}: insert ${ins.rowCount}`);
      log.inserted.push(p.id);
    }
    const un = await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number = ANY($3)', [Ev.unapprove, COURSE, SEEDS]);
    log.unapproved = { seeds: SEEDS, rows: un.rowCount };
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  await refreshNow();
  const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs');
  log.audioPass = await queueAudioPass(supabase, { courseCode: COURSE, requestedBy: `@${SWEEP}`, reason: `job ${JOB}: ${planned.length} esserci USE phrases added; slots filled through /api/audio/render, one role per run`, metadata: { job: JOB, seeds: SEEDS } });
}

async function main() {
  const { Client } = require('pg');
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const { createClient } = require('@supabase/supabase-js');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const log = { sweep: SWEEP, job: JOB, ruling: RULING, started: new Date().toISOString(), dropped: DROPPED };
  const save = (tag) => { const f = evidencePath(`tools/course-optimization/${SWEEP}/${tag}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`); fs.writeFileSync(f, JSON.stringify(log, null, 2)); console.log(`Wrote ${f}`); };
  try {
    const APPLY = process.env.APPLY === '1';
    const probs = [...planProblems(await loadLegos(pg)), ...(await vocabularyGuards(pg)), ...(await zutGuards(pg))];
    log.problems = probs;
    console.log(`\n══ ${COURSE} — esserci USE rows — ${APPLY ? 'APPLY' : 'DRY RUN'} ══`);
    console.log(probs.length ? 'PROBLEMS:\n  ' + probs.join('\n  ') : `guards hold: ${ROWS.length} rows, each contains its new host LEGO and esserci/ci sarò, no untaught word, no ZUT clash, none already in the course`);
    if (APPLY && !probs.length) {
      await applyContent(pg, createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } }), log);
      console.log(`APPLIED. inserted=${log.inserted.join(',')} unapproved=${JSON.stringify(log.unapproved)}`);
    }
    save(APPLY ? 'applied' : 'dryrun');
    if (probs.length) process.exitCode = 2;
  } finally { await pg.end(); }
}
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { ROWS, DROPPED, SEEDS, planProblems, hasEsserci, legoPosition, containsWords };
