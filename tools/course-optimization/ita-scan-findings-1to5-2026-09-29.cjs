#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-scan-findings-1to5-2026-09-29.cjs
//
// ita_for_eng — Kai's rulings on five scan findings (job #887·I, 2026-09-29). Nothing here is rendered: every
// clip already exists and is kept.
//
//  1. S0626L01U06 "are you thirsty? would you like something to drink?" joins two questions in one phrase. The SEED
//     is one statement ("no, I'm not thirsty, thank you"), so the cut is fine and the phrase is the defect; S0626L01
//     keeps eight others → DELETE (Kai: "if the LEGO has enough other phrases, delete the phrase").
//  2. Used before taught — each row MOVES forward under the NEW LEGO that teaches the missing word (P25: a not-new
//     basket is never played; all three destinations are is_new), same text, same clips:
//        question  S0190L01 U02 U03 U05 U06 U07 → S0202L03 "question | domanda"
//        hour      S0254L01U04                  → S0256L01 "an hour | un'ora"
//        a while   S0091L01U02                  → S0180L02 "for a while | per un po'"  (target gains the apostrophe its
//                  LEGO has — "per un po" cannot contain "per un po'" under the live word rule; case/punctuation-only,
//                  the write REFUSES if any audio id changes)
//  4. S0126L01U03 "I think this is going to work well | penso che questo funzionerà bene" — funzioni (subjunctive) is
//     not taught yet, so the indicative is wrong and the subjunctive is untaught → DELETE (Kai).
//  5. S0647L01B01 "you speak | lei lo parla" is a bare formal LEGO fragment that clashes with S0013 "you speak | parli".
//     K32: a formal LEGO is CUT and sir/madam is ALWAYS added at the end, both sides. B01 becomes the LEGO itself,
//     "you speak it madam | lei lo parla, signora" — exactly S0647L01U01, so its clips are copied from U01 (no render).
//     (S0654 is NOT written — its LEGO row is itself the clash; see the report.)
//
// Every touched seed is unapproved (an edit unapproves). Seeds 311, 313, 148, 384 are never touched.
//
//   node tools/course-optimization/ita-scan-findings-1to5-2026-09-29.cjs          # dry run: guards + plan
//   APPLY=1 node tools/course-optimization/ita-scan-findings-1to5-2026-09-29.cjs  # write
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'ita_for_eng';
const SWEEP = 'ita-scan-findings-1to5-2026-09-29';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const JOB = '#887·I';
const RULING = 'Kai, 2026-09-29 (job #887·I): scan findings 1-5 — delete the two-question phrase S0626L01U06 and the untaught-subjunctive S0126L01U03; move used-before-taught phrases forward under the new LEGO that teaches the word; formal S0647L01B01 gets its madam back (K32)';
const FORBIDDEN_SEEDS = [311, 313, 148, 384];

const norm = (s) => String(s || '').toLowerCase().replace(/’/g, "'").replace(/[.,!?;:"«»]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => norm(s).split(' ').filter(Boolean);
/** The live gate's containment rule: every word of the needle is in the hay, as a multiset. */
function containsWords(hay, needle) {
  const have = {}; for (const w of words(hay)) have[w] = (have[w] || 0) + 1;
  for (const w of words(needle)) { if (!have[w]) return false; have[w]--; }
  return true;
}
const rowContainsLego = (row, lego) => containsWords(row.known, lego.known) && containsWords(row.target, lego.target);
function legoPosition(known, legoKnown) {
  const k = norm(known), l = norm(legoKnown);
  if (k === l || k.startsWith(l + ' ')) return 'start';
  if (k.endsWith(' ' + l)) return 'end';
  return 'middle';
}

const LEGOS = {
  S0202L03: { seed: 202, lego_index: 3, known: 'question', target: 'domanda' },
  S0256L01: { seed: 256, lego_index: 1, known: 'an hour', target: "un'ora" },
  S0180L02: { seed: 180, lego_index: 2, known: 'for a while', target: "per un po'" },
};
const DELETES = [
  { id: 'S0626L01U06', known: 'are you thirsty? would you like something to drink?', target: 'hai sete? vuoi qualcosa da bere?', keepsAtLeast: 6, why: 'two questions in one phrase; the seed is one statement, so the phrase (not the cut) is the defect' },
  { id: 'S0126L01U03', known: 'I think this is going to work well', target: 'penso che questo funzionerà bene', keepsAtLeast: 6, why: 'penso che + funzionerà: the subjunctive (funzioni) is not taught yet' },
];
const M = (from, to, lego, known, target, edit) => ({ from, to, lego, known, target, edit });
const MOVES = [
  M('S0190L01U02', 'S0202L03U10', 'S0202L03', 'do you mind if I ask you a question now?', 'ti dispiace se ti faccio una domanda adesso?'),
  M('S0190L01U03', 'S0202L03U11', 'S0202L03', 'do you mind if I ask you an important question?', 'ti dispiace se ti faccio una domanda importante?'),
  M('S0190L01U05', 'S0202L03U12', 'S0202L03', 'do you mind if I ask you a question?', 'ti dispiace se ti faccio una domanda?'),
  M('S0190L01U06', 'S0202L03U13', 'S0202L03', 'do you mind if I ask you a question today?', 'ti dispiace se ti faccio una domanda oggi?'),
  M('S0190L01U07', 'S0202L03U14', 'S0202L03', 'do you mind if I ask you a question later on?', 'ti dispiace se ti faccio una domanda più tardi?'),
  M('S0254L01U04', 'S0256L01U06', 'S0256L01', "I've been ready for an hour", "sono pronto da un'ora"),
  M('S0091L01U02', 'S0180L02U10', 'S0180L02', 'do you want to think about it for a while?', 'vuoi pensare a questo per un po?', { target: "vuoi pensare a questo per un po'?" }),
];
const B01_EDIT = {
  id: 'S0647L01B01', copyClipsFrom: 'S0647L01U01', legoId: 'S0647L01',
  before: { known: 'you speak', target: 'lei lo parla' }, after: { known: 'you speak it madam', target: 'lei lo parla, signora' },
};
for (const m of MOVES) { const l = LEGOS[m.lego]; m.seed = l.seed; m.lego_index = l.lego_index; m.after = { known: m.known, target: m.edit?.target ?? m.target }; m.lego_position = legoPosition(m.after.known, l.known); }
const seedOf = (id) => +id.slice(1, 5);
const SEEDS = [...new Set([...DELETES.map((d) => seedOf(d.id)), ...MOVES.flatMap((m) => [seedOf(m.from), m.seed]), seedOf(B01_EDIT.id)])].sort((a, b) => a - b);

async function plan(pg) {
  const problems = [], log = { notes: [] };
  for (const s of SEEDS) if (FORBIDDEN_SEEDS.includes(s)) problems.push(`seed ${s} is forbidden for this job`);
  const { rows: legos } = await pg.query('SELECT lego_id, seed_number, lego_index, is_new, known_text, target_text FROM course_legos WHERE course_code=$1 AND lego_id = ANY($2)', [COURSE, Object.keys(LEGOS)]);
  for (const [id, l] of Object.entries(LEGOS)) {
    const r = legos.find((x) => x.lego_id === id);
    if (!r || r.known_text !== l.known || r.target_text !== l.target || r.seed_number !== l.seed || r.lego_index !== l.lego_index) problems.push(`${id} reads "${r?.known_text}" → "${r?.target_text}" — not "${l.known}" → "${l.target}"`);
    else if (r.is_new !== true) problems.push(`${id} is not new — a phrase moved under it would never play (P25)`);
  }
  const srcIds = [...DELETES.map((d) => d.id), ...MOVES.map((m) => m.from), B01_EDIT.id, B01_EDIT.copyClipsFrom].map((i) => `${COURSE}:${i}`);
  const { rows: src } = await pg.query('SELECT id, phrase_role, lego_index, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2)', [COURSE, srcIds]);
  log.src = Object.fromEntries(src.map((r) => [r.id.replace(`${COURSE}:`, ''), r]));
  const check = (id, known, target) => { const r = log.src[id]; if (!r || r.known_text !== known || r.target_text !== target) problems.push(`${id} reads "${r?.known_text}" → "${r?.target_text}" — expected "${known}" → "${target}"`); else if (r.phrase_role === 'component') problems.push(`${id} is a component`); };
  DELETES.forEach((d) => check(d.id, d.known, d.target));
  MOVES.forEach((m) => check(m.from, m.known, m.target));
  check(B01_EDIT.id, B01_EDIT.before.known, B01_EDIT.before.target);
  check(B01_EDIT.copyClipsFrom, B01_EDIT.after.known, B01_EDIT.after.target);
  // Deleted rows must leave their LEGO a real basket.
  log.remaining = {};
  for (const d of DELETES) {
    const lego = d.id.slice(0, 8);
    const { rows: [c] } = await pg.query(`SELECT count(*)::int n FROM course_practice_phrases WHERE course_code=$1 AND id LIKE $2 AND phrase_role IN ('build','use') AND id <> $3`, [COURSE, `${COURSE}:${lego}%`, `${COURSE}:${d.id}`]);
    log.remaining[lego] = c.n;
    if (c.n < d.keepsAtLeast) problems.push(`${lego} would keep only ${c.n} phrases after deleting ${d.id}`);
  }
  // Moves land under a new LEGO that they contain, on both sides; positions and ids are free.
  for (const m of MOVES) {
    if (!rowContainsLego({ known: m.after.known, target: m.after.target }, LEGOS[m.lego])) problems.push(`${m.to} "${m.after.known}" → "${m.after.target}" does not contain ${m.lego}`);
    if (seedOf(m.from) >= m.seed) problems.push(`${m.from} → ${m.to} does not move FORWARD`);
  }
  const { rows: taken } = await pg.query('SELECT id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2)', [COURSE, MOVES.map((m) => `${COURSE}:${m.to}`)]);
  taken.forEach((t) => problems.push(`${t.id} already exists`));
  log.positions = {};
  for (const key of Object.keys(LEGOS)) {
    const rows = MOVES.filter((m) => m.lego === key); if (!rows.length) continue;
    const l = LEGOS[key];
    const { rows: [mx] } = await pg.query('SELECT max(position) p FROM course_practice_phrases WHERE course_code=$1 AND seed_number=$2 AND lego_index=$3', [COURSE, l.seed, l.lego_index]);
    let p = mx?.p ?? 0; for (const m of rows) m.position = ++p;
    log.positions[key] = rows.map((m) => `${m.to}@${m.position}`);
  }
  // Nothing is untaught at the destination (moves go forward, so this holds; checked anyway for the one edited target).
  // ZUT: every landing/edited pair against the whole course.
  log.zut = [];
  const pairs = [...MOVES.map((m) => ({ id: m.to, own: [m.from], ...m.after })), { id: B01_EDIT.id, own: [B01_EDIT.id, B01_EDIT.copyClipsFrom], ...B01_EDIT.after }];
  for (const r of pairs) {
    const { rows } = await pg.query(`SELECT id, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND phrase_role<>'component' AND lower(trim(known_text))=lower(trim($2))
      UNION ALL SELECT lego_id, known_text, target_text FROM course_legos WHERE course_code=$1 AND lower(trim(known_text))=lower(trim($2))`, [COURSE, r.known]);
    for (const x of rows) { const xid = x.id.replace(`${COURSE}:`, ''); if (r.own.includes(xid)) continue; if (norm(x.target_text) !== norm(r.target)) log.zut.push(`${r.id} "${r.known}" → "${r.target}" vs ${xid} "${x.known_text}" → "${x.target_text}"`); }
  }
  problems.push(...log.zut.map((z) => `ZUT: ${z}`));
  // The clash the B01 edit is meant to clear.
  const { rows: [gone] } = await pg.query(`SELECT count(*)::int n FROM course_practice_phrases WHERE course_code=$1 AND phrase_role<>'component' AND lower(trim(known_text))='you speak' AND id <> $2`, [COURSE, `${COURSE}:${B01_EDIT.id}`]);
  log.youSpeakElsewhere = gone.n;
  // Concurrency: nobody else wrote these seeds in the last 10 minutes.
  const { rows: ev } = await pg.query(`SELECT id, surface, operation, scope->'seed_numbers' AS seeds FROM content_edit_events WHERE course_code=$1 AND occurred_at > now() - interval '10 minutes' AND surface NOT LIKE '%' || $2 || '%'`, [COURSE, SWEEP]);
  for (const e of ev) { const s = (e.seeds || []).map(Number); const hit = s.filter((x) => SEEDS.includes(x)); if (hit.length) problems.push(`another surface touched seeds ${hit} in the last 10 min: ${e.surface} ${e.operation} (${e.id})`); }
  const { rows: seeds } = await pg.query('SELECT seed_number, approved_at FROM course_seeds WHERE course_code=$1 AND seed_number = ANY($2) ORDER BY 1', [COURSE, SEEDS]);
  log.approved = Object.fromEntries(seeds.map((s) => [s.seed_number, s.approved_at]));
  return { problems, log };
}

async function apply(pg, log) {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const rec = (operation, scope, detail) => recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation, scope, detail: { ruling: RULING, job: JOB, ...detail } });
  const delEvent = await rec('phrase-delete', { seed_numbers: DELETES.map((d) => seedOf(d.id)), phrase_ids: DELETES.map((d) => `${COURSE}:${d.id}`), rows: DELETES.length }, { rows: DELETES.map((d) => ({ id: `${COURSE}:${d.id}`, known: d.known, target: d.target, why: d.why })) });
  const moveEvent = await rec('phrase-move', { seed_numbers: SEEDS, phrase_ids: MOVES.map((m) => `${COURSE}:${m.to}`), rows: MOVES.length }, { moves: MOVES.map((m) => ({ from: `${COURSE}:${m.from}`, to: `${COURSE}:${m.to}`, lego: m.lego, known_from: m.known, target_from: m.target, target_to: m.after.target, clips_kept: true })) });
  const editEvent = await rec('phrase-edit', { seed_numbers: [seedOf(B01_EDIT.id)], phrase_ids: [`${COURSE}:${B01_EDIT.id}`], rows: 1 }, { rows: [{ id: `${COURSE}:${B01_EDIT.id}`, before: B01_EDIT.before, after: B01_EDIT.after, clips_from: `${COURSE}:${B01_EDIT.copyClipsFrom}`, rule: 'K32' }] });
  const toUnapprove = SEEDS.filter((s) => log.approved[s]);
  const unapproveEvent = toUnapprove.length ? await rec('unapprove', { seed_numbers: toUnapprove, rows: toUnapprove.length }, { why: 'phrases deleted/moved/edited; edits unapprove their seed', approved_at_before: log.approved }) : null;
  const audioIds = async (ids) => JSON.stringify((await pg.query('SELECT id, known_audio_id, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE id = ANY($1) ORDER BY id', [ids])).rows);
  await pg.query('BEGIN');
  try {
    for (const m of MOVES) {
      const s = log.src[m.from];
      const ins = await pg.query(`INSERT INTO course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count, metadata, status, phrase_role, connected_lego_ids, lego_position, lego_id, introduce, known_audio_id, target1_audio_id, target2_audio_id, last_edit_event_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'draft','use','{}',$11,$12,true,$13,$14,$15,$16)`,
        [`${COURSE}:${m.to}`, COURSE, m.seed, m.lego_index, m.position, m.after.known, m.after.target, m.after.target.length, m.after.target.split(/\s+/).length, JSON.stringify({ format: 'build_use', source: SWEEP, job: JOB, moved_from: `${COURSE}:${m.from}` }), m.lego_position, m.lego, s.known_audio_id, s.target1_audio_id, s.target2_audio_id, moveEvent]);
      if (ins.rowCount !== 1) throw new Error(`${m.to}: insert ${ins.rowCount}`);
      const after = (await pg.query('SELECT known_audio_id, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE id=$1', [`${COURSE}:${m.to}`])).rows[0];
      if (after.known_audio_id !== s.known_audio_id || after.target1_audio_id !== s.target1_audio_id || after.target2_audio_id !== s.target2_audio_id) throw new Error(`${m.to}: audio ids changed on insert (${JSON.stringify(after)}) — rolled back`);
      const del = await pg.query('DELETE FROM course_practice_phrases WHERE course_code=$1 AND id=$2 AND known_text=$3 AND target_text=$4', [COURSE, `${COURSE}:${m.from}`, m.known, m.target]);
      if (del.rowCount !== 1) throw new Error(`${m.from}: delete ${del.rowCount}`);
    }
    for (const d of DELETES) {
      const del = await pg.query('DELETE FROM course_practice_phrases WHERE course_code=$1 AND id=$2 AND known_text=$3 AND target_text=$4', [COURSE, `${COURSE}:${d.id}`, d.known, d.target]);
      if (del.rowCount !== 1) throw new Error(`${d.id}: delete ${del.rowCount}`);
    }
    const from = log.src[B01_EDIT.copyClipsFrom];
    const up = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, target_text=$2, word_count=$3, lego_count=$4, qa_checked=NULL, decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL,
        known_audio_id=$5, target1_audio_id=$6, target2_audio_id=$7, target1_duration_ms=NULL, target2_duration_ms=NULL, last_edit_event_id=$8, updated_at=now()
        WHERE id=$9 AND known_text=$10 AND target_text=$11`,
      [B01_EDIT.after.known, B01_EDIT.after.target, B01_EDIT.after.target.length, B01_EDIT.after.target.split(/\s+/).length, from.known_audio_id, from.target1_audio_id, from.target2_audio_id, editEvent, `${COURSE}:${B01_EDIT.id}`, B01_EDIT.before.known, B01_EDIT.before.target]);
    if (up.rowCount !== 1) throw new Error(`B01 update ${up.rowCount}`);
    const chk = (await pg.query('SELECT known_audio_id, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE id=$1', [`${COURSE}:${B01_EDIT.id}`])).rows[0];
    if (chk.known_audio_id !== from.known_audio_id || chk.target1_audio_id !== from.target1_audio_id || chk.target2_audio_id !== from.target2_audio_id) throw new Error('B01 clips did not stick — rolled back');
    if (toUnapprove.length) {
      const un = await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number = ANY($3)', [unapproveEvent, COURSE, toUnapprove]);
      if (un.rowCount !== toUnapprove.length) throw new Error('seed unapprove');
    }
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  await require('../../services/shared/round-index-refresh.cjs').refreshNow();
  return { delEvent, moveEvent, editEvent, unapproveEvent, unapproved: toUnapprove };
}

async function main() {
  const APPLY = process.env.APPLY === '1';
  const { Client } = require('pg');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const { problems, log } = await plan(pg);
  console.log(`\n══ ${COURSE} scan findings 1-5 — ${APPLY ? 'APPLY' : 'DRY RUN'} ══  seeds ${SEEDS.join(', ')}`);
  DELETES.forEach((d) => console.log(`  DELETE ${d.id}  "${d.known}" | "${d.target}"  (${log.remaining[d.id.slice(0, 8)]} phrases stay under ${d.id.slice(0, 8)})`));
  MOVES.forEach((m) => console.log(`  MOVE   ${m.from} → ${m.to}@${m.position} [${m.lego}]  "${m.after.known}" | "${m.after.target}"${m.edit ? '   (target apostrophe)' : ''}`));
  console.log(`  EDIT   ${B01_EDIT.id}  "${B01_EDIT.before.known}" | "${B01_EDIT.before.target}"  →  "${B01_EDIT.after.known}" | "${B01_EDIT.after.target}"  (clips from ${B01_EDIT.copyClipsFrom}; other rows still "you speak": ${log.youSpeakElsewhere})`);
  console.log(problems.length ? 'PROBLEMS:\n  ' + problems.join('\n  ') : 'guards hold');
  if (!APPLY || problems.length) { await pg.end(); process.exit(problems.length ? 2 : 0); }
  console.log('APPLIED', JSON.stringify(await apply(pg, log)));
  await pg.end();
}
module.exports = { norm, containsWords, rowContainsLego, legoPosition, LEGOS, MOVES, DELETES, B01_EDIT, SEEDS, FORBIDDEN_SEEDS };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
