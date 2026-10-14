#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-ask-question-fare-2026-10-14.cjs
//
// ita_for_eng — "ask" and "ask a question". KAI APPROVED (2026-10-14, job #345, on #343·Q's evidence
// and census https://watson-1.tail4968cb.ts.net/d/f76d2340). The course rule, logged in the canon as K44:
//   ask (someone) something   = chiedere (+ qualcosa / una cosa)   — taught at seed 30, chiederti qualcosa
//   ask a question / questions = fare una domanda / delle domande  — seeds 190, 202, 422, 423, 597, 598
//   and the light verb never stands without its noun: no bare "ti faccio" glossed "I ask you".
// Natives avoid "chiedere una domanda" (Ngram: no result; italki: "non si dice").
//
// 1. SEED 190 RE-CUT. "do you mind if I ask you some questions? | ti dispiace se ti faccio alcune domande?"
//    was L01 "do you mind if I ask you | ti dispiace se ti faccio" (a bare light verb glossed as "ask")
//    + L02 "questions | domande". Both rows keep their slots and ids (never delete a LEGO) and are re-texted:
//      L01  do you mind if | ti dispiace se                          NEW (first positive "ti dispiace se")
//      L02  I ask you some questions | ti faccio alcune domande       NEW (first "fare" + domanda in the course)
//    Both baskets are rebuilt from words taught by seed 190. L01's phrases cannot use L02 (a later sibling),
//    so they say "do you mind if I speak / wait for you…". Old rows are re-texted in place where the role
//    fits and deleted otherwise, inside the same transaction as their replacements. The seed sentence
//    (U08) stays under L02, the seed's last new LEGO (P26).
// 2. L02's intro is Kai's shape (heads-up, PR1/PR3), marked human-authored before the clip is written:
//      When you talk about asking questions, we use a different word. The Italian for 'I ask you some questions' is:
//    L01 gets the course template "The Italian for: 'do you mind if', is:".
// 3. SEED 223 U05 "he's going to ask you a question | ti chiederà una domanda" — the course's only
//    chiedere + domanda. Kai's fix "he's going to ask you something | ti chiederà qualcosa" is ALREADY the
//    text of S0223L01U02, so U05 becomes "he's going to ask you something tomorrow | ti chiederà qualcosa domani"
//    (both words taught by 223; the seed itself says "ti chiederà domani").
// 4. Course-wide consistency (every phrase, LEGO, seed, intro): see `scan()` — after this pass it must find
//    no chiedere/domandare + domanda, no fare + domanda under an English without "question", and no bare
//    "ti faccio" phrase. Before the pass it finds exactly S0223L01U05 and the 8 bare S0190L01 rows.
//
//   node tools/course-optimization/ita-ask-question-fare-2026-10-14.cjs           # VERIFY + PLAN: exit 2 while a defect stands
//   APPLY=1 node …                                                                # back up, guard, write content, then verify
//   AUDIO=1 DRY=1 node …                                                          # dry run of every empty slot + both intros (chars)
//   AUDIO=1 node …                                                                # dry run, then render through POST :3470/api/audio/render
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'ita_for_eng';
const SWEEP = 'ita-ask-question-fare-2026-10-14';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const JOB = '#345';
const AGENT = 'kai-ita-ask-question-345';
const RENDER_URL = process.env.RENDER_URL || 'http://localhost:3470/api/audio/render';
const RULING = 'Kai, 2026-10-14 (job #345, on #343·Q d/f76d2340): ask (someone) something = chiedere (+ qualcosa); ask a question = fare una domanda; the light verb never stands without its noun. Seed 190 re-cut to "do you mind if | ti dispiace se" + "I ask you some questions | ti faccio alcune domande"; seed 223 U05 off chiedere + domanda.';
const AUTHOR = 'Kai, 2026-10-14 (his shape, applied by job #345)';

const SEED_190 = { known: 'do you mind if I ask you some questions?', target: 'ti dispiace se ti faccio alcune domande?' };

const OLD_LEGOS = [
  { idx: 1, type: 'M', known: 'do you mind if I ask you', target: 'ti dispiace se ti faccio' },
  { idx: 2, type: 'A', known: 'questions', target: 'domande' },
];
const NEW_LEGOS = [
  { idx: 1, id: 'S0190L01', type: 'M', is_new: true, known: 'do you mind if', target: 'ti dispiace se',
    components: [{ known: 'do you mind', target: 'ti dispiace' }, { known: 'if', target: 'se' }],
    intro: "The Italian for: 'do you mind if', is:" },
  { idx: 2, id: 'S0190L02', type: 'M', is_new: true, known: 'I ask you some questions', target: 'ti faccio alcune domande',
    components: [{ known: 'to you', target: 'ti' }, { known: 'I make', target: 'faccio' }, { known: 'some', target: 'alcune' }, { known: 'questions', target: 'domande' }],
    intro: "When you talk about asking questions, we use a different word. The Italian for 'I ask you some questions' is:", human: true },
];

/** Seed 190's phrase rows as this tool found them (live 2026-10-14). */
const OLD_190 = [
  ['S0190L01B01', 'do you mind if I ask you', 'ti dispiace se ti faccio'],
  ['S0190L01B05', 'yes but do you mind if I ask you', 'sì ma ti dispiace se ti faccio'],
  ['S0190L01B06', 'tomorrow morning do you mind if I ask you', 'domani mattina ti dispiace se ti faccio'],
  ['S0190L01B07', 'on Sunday afternoon do you mind if I ask you', 'domenica pomeriggio ti dispiace se ti faccio'],
  ['S0190L01B08', 'okay do you mind if I ask you', 'bene ti dispiace se ti faccio'],
  ['S0190L01B09', 'but do you mind if I ask you', 'ma ti dispiace se ti faccio'],
  ['S0190L01B10', 'now do you mind if I ask you', 'adesso ti dispiace se ti faccio'],
  ['S0190L01B11', 'so do you mind if I ask you', 'quindi ti dispiace se ti faccio'],
  ['S0190L02B01', 'questions', 'domande'],
  ['S0190L02B02', 'some questions', 'alcune domande'],
  ['S0190L02B03', 'I have some questions', 'ho alcune domande'],
  ['S0190L02U01', 'do you have any questions?', 'hai alcune domande?'],
  ['S0190L02U03', 'I have some questions for you', 'ho alcune domande per te'],
  ['S0190L02U04', 'I want to ask some questions', 'voglio fare alcune domande'],
  ['S0190L02U05', 'I have a few questions about this', 'ho alcune domande su questo'],
  ['S0190L02U07', 'I need to ask some questions', 'ho bisogno di fare alcune domande'],
  ['S0190L02U08', 'do you mind if I ask you some questions?', 'ti dispiace se ti faccio alcune domande?'],
].map(([id, known, target]) => ({ id, known, target }));

/** Seed 190 after the cut. `keep` = this id existed and is re-texted in place (or kept verbatim); no `keep` = new row. */
const NEW_190 = [
  // L01  do you mind if | ti dispiace se
  { id: 'S0190L01B01', keep: true, role: 'build', known: 'do you mind if', target: 'ti dispiace se' },
  { id: 'S0190L01B05', keep: true, role: 'build', known: 'do you mind if I speak', target: 'ti dispiace se parlo' },
  { id: 'S0190L01B06', keep: true, role: 'build', known: 'do you mind if I wait for you', target: 'ti dispiace se ti aspetto' },
  { id: 'S0190L01U08', role: 'use', known: 'do you mind if I speak Italian with you?', target: 'ti dispiace se parlo italiano con te?' },
  { id: 'S0190L01U09', role: 'use', known: 'do you mind if we speak Italian today?', target: 'ti dispiace se parliamo italiano oggi?' },
  { id: 'S0190L01U10', role: 'use', known: 'do you mind if I wait for you here?', target: 'ti dispiace se ti aspetto qui?' },
  { id: 'S0190L01U11', role: 'use', known: 'do you mind if I talk with her?', target: 'ti dispiace se parlo con lei?' },
  { id: 'S0190L01U12', role: 'use', known: 'tomorrow morning do you mind if I wait for you here?', target: 'domani mattina ti dispiace se ti aspetto qui?' },
  { id: 'S0190L01C01', role: 'component', known: 'do you mind', target: 'ti dispiace', component_index: 0 },
  { id: 'S0190L01C02', role: 'component', known: 'if', target: 'se', component_index: 1 },
  // L02  I ask you some questions | ti faccio alcune domande
  { id: 'S0190L02B01', keep: true, role: 'build', known: 'I ask you some questions', target: 'ti faccio alcune domande' },
  { id: 'S0190L02B02', keep: true, role: 'build', known: 'if I ask you some questions', target: 'se ti faccio alcune domande' },
  { id: 'S0190L02B03', keep: true, role: 'build', known: 'I ask you some questions in Italian', target: 'ti faccio alcune domande in italiano' },
  { id: 'S0190L02U01', keep: true, role: 'use', known: 'do you mind if I ask you some questions later?', target: 'ti dispiace se ti faccio alcune domande più tardi?' },
  { id: 'S0190L02U03', keep: true, role: 'use', known: 'do you mind if I ask you some questions now?', target: 'ti dispiace se ti faccio alcune domande adesso?' },
  { id: 'S0190L02U04', keep: true, role: 'use', known: 'do you mind if I ask you some questions about this?', target: 'ti dispiace se ti faccio alcune domande su questo?' },
  { id: 'S0190L02U05', keep: true, role: 'use', known: 'tomorrow morning do you mind if I ask you some questions?', target: 'domani mattina ti dispiace se ti faccio alcune domande?' },
  { id: 'S0190L02U07', keep: true, role: 'use', known: 'if I ask you some questions in Italian, can you answer?', target: 'se ti faccio alcune domande in italiano, puoi rispondere?' },
  { id: 'S0190L02U08', keep: true, role: 'use', known: 'do you mind if I ask you some questions?', target: 'ti dispiace se ti faccio alcune domande?' },
  { id: 'S0190L02C01', role: 'component', known: 'to you', target: 'ti', component_index: 0 },
  { id: 'S0190L02C02', role: 'component', known: 'I make', target: 'faccio', component_index: 1 },
  { id: 'S0190L02C03', role: 'component', known: 'some', target: 'alcune', component_index: 2 },
  { id: 'S0190L02C04', role: 'component', known: 'questions', target: 'domande', component_index: 3 },
];
/** Old rows not carried by NEW_190 are deleted — after their replacements are written, in the same transaction. */
const DELETES_190 = OLD_190.filter((o) => !NEW_190.some((n) => n.id === o.id));

const EDIT_223 = { id: 'S0223L01U05', before: ["he's going to ask you a question", 'ti chiederà una domanda'], after: ["he's going to ask you something tomorrow", 'ti chiederà qualcosa domani'] };

// ── The rules, as code ────────────────────────────────────────────────────────────────────
const norm = (s) => String(s || '').toLowerCase().replace(/’/g, "'").replace(/[.,!?;:"«»]+/g, ' ').replace(/\s+/g, ' ').trim();
const has = (hay, needle) => ` ${norm(hay)} `.includes(` ${norm(needle)} `);
const idxOf = (id) => Number(id.slice(6, 8));
const roleOf = (id) => ({ B: 'build', U: 'use', C: 'component' })[id[8]];

/** The defects K44 names, for ANY list of {id, known, target} rows (phrases, LEGOs, seeds, intro lines). */
function askDefects(rows) {
  const out = [];
  for (const r of rows) {
    const k = norm(r.known), t = norm(r.target);
    if (/\b(chied|chies|domand[ao]|domandat)\w*\b.*\bdomand[ae]\b/.test(t) && !/\bfa(re|ccio|tto|rti|i)\b/.test(t)) out.push(`${r.id} chiedere + domanda: "${r.known}" → "${r.target}"`);
    if (/\b(faccio|fare|fatto|farti|fai|fa|facciamo)\b.*\bdomand[ae]\b/.test(t) && !/\bquestions?\b/.test(k)) out.push(`${r.id} fare + domanda under an English without "question": "${r.known}" → "${r.target}"`);
    if (/\bask/.test(k) && /\bti faccio$/.test(t)) out.push(`${r.id} bare light verb "ti faccio" glossed as ask: "${r.known}" → "${r.target}"`);
  }
  return out;
}

function checkPlan() {
  const p = [];
  const legos = Object.fromEntries(NEW_LEGOS.map((l) => [l.idx, l]));
  // LEGOs tile the seed, in order, both sides (plus the question mark)
  if (norm(NEW_LEGOS.map((l) => l.known).join(' ')) !== norm(SEED_190.known)) p.push('LEGOs do not tile the seed (known)');
  if (norm(NEW_LEGOS.map((l) => l.target).join(' ')) !== norm(SEED_190.target)) p.push('LEGOs do not tile the seed (target)');
  for (const l of NEW_LEGOS) {
    if (norm(l.components.map((c) => c.target).join(' ')) !== norm(l.target)) p.push(`L0${l.idx} components do not tile its target`);
    if (!l.intro.includes(`'${l.known}'`)) p.push(`L0${l.idx} intro does not quote its LEGO`);
    if (/[()[\]]/.test(l.intro)) p.push(`L0${l.idx} intro has brackets`);
  }
  for (const r of NEW_190) {
    if (roleOf(r.id) !== r.role) p.push(`${r.id}: id says ${roleOf(r.id)}, row says ${r.role}`);
    const l = legos[idxOf(r.id)];
    if (r.role === 'component') {
      const c = l.components[r.component_index];
      if (!c || norm(c.known) !== norm(r.known) || norm(c.target) !== norm(r.target)) p.push(`${r.id} does not mirror component ${r.component_index}`);
      continue;
    }
    if (!has(r.known, l.known) || !has(r.target, l.target)) p.push(`${r.id} does not contain L0${l.idx} on both sides`);
    // never a later sibling: L01's rows must not say L02
    if (l.idx === 1 && (has(r.target, NEW_LEGOS[1].target) || /\bfaccio\b/.test(norm(r.target)))) p.push(`${r.id} uses L02 before it is taught`);
    if (r.keep && !OLD_190.some((o) => o.id === r.id)) p.push(`${r.id} marked keep but not in the old picture`);
    if (!r.keep && OLD_190.some((o) => o.id === r.id)) p.push(`${r.id} exists already but is not marked keep`);
  }
  const texts = new Map();
  for (const r of NEW_190.filter((r) => r.role !== 'component')) { const k = `${norm(r.known)}|${norm(r.target)}`; if (texts.has(k)) p.push(`${r.id} duplicates ${texts.get(k)}`); texts.set(k, r.id); }
  const knowns = new Map();
  for (const r of NEW_190.filter((r) => r.role !== 'component')) { const k = norm(r.known); if (knowns.has(k) && knowns.get(k) !== norm(r.target)) p.push(`ZUT inside seed 190: "${r.known}"`); knowns.set(k, norm(r.target)); }
  for (const l of NEW_LEGOS) {
    const b = NEW_190.filter((r) => idxOf(r.id) === l.idx && r.role === 'build').length, u = NEW_190.filter((r) => idxOf(r.id) === l.idx && r.role === 'use').length;
    if (b < 1 || u < 2) p.push(`L0${l.idx} basket thin: ${b} build / ${u} use`);
  }
  if (!NEW_190.some((r) => r.role === 'use' && idxOf(r.id) === 2 && norm(r.known) === norm(SEED_190.known) && norm(r.target) === norm(SEED_190.target))) p.push('seed sentence not a USE row under L02 (P26)');
  if (!NEW_190.some((r) => norm(r.target) === norm('ti dispiace se ti faccio alcune domande più tardi?'))) p.push('the "later" phrase Kai asked for is missing');
  p.push(...askDefects(NEW_190.map((r) => ({ id: r.id, known: r.known, target: r.target }))));
  p.push(...askDefects([{ id: EDIT_223.id, known: EDIT_223.after[0], target: EDIT_223.after[1] }]));
  for (const l of NEW_LEGOS) p.push(...askDefects([{ id: l.id, known: l.known, target: l.target }]));
  return p;
}

// ── Live ────────────────────────────────────────────────────────────────────────────────
async function load(pg) {
  const q = async (sql, a = [COURSE]) => (await pg.query(sql, a)).rows;
  return {
    phrases: await q("SELECT *, split_part(id,':',2) sid FROM course_practice_phrases WHERE course_code=$1"),
    legos: await q('SELECT * FROM course_legos WHERE course_code=$1'),
    seeds: await q('SELECT seed_number, known_text, target_text, approved_at FROM course_seeds WHERE course_code=$1'),
    intros: await q('SELECT l.lego_id, a.text FROM course_legos l JOIN course_audio a ON a.id = l.presentation_audio_id::uuid WHERE l.course_code=$1'),
  };
}

/** Course-wide scan (item 4): every phrase, LEGO, seed and linked intro line. */
function scan(db) {
  const rows = [
    ...db.phrases.filter((p) => p.phrase_role !== 'component').map((p) => ({ id: p.sid, known: p.known_text, target: p.target_text })),
    ...db.legos.map((l) => ({ id: l.lego_id, known: l.known_text, target: l.target_text })),
    ...db.seeds.map((s) => ({ id: `seed ${s.seed_number}`, known: s.known_text, target: s.target_text })),
  ];
  const out = askDefects(rows);
  // intro lines are English only: an intro may not tell the learner "ask a question" over a chiedere LEGO
  for (const i of db.intros) {
    const l = db.legos.find((x) => x.lego_id === i.lego_id);
    if (/\bquestions?\b/i.test(i.text) && /\bask/i.test(i.text) && l && /chied|chies/.test(l.target_text)) out.push(`${i.lego_id} intro says ask … question over chiedere: ${i.text}`);
  }
  return out;
}

function verify(db) {
  const out = scan(db);
  const L = (id) => db.legos.find((l) => l.lego_id === id);
  for (const l of NEW_LEGOS) {
    const r = L(l.id);
    if (!r || r.known_text !== l.known || r.target_text !== l.target || !r.is_new) out.push(`${l.id} is not "${l.known}" → "${l.target}" (new)`);
  }
  const live190 = db.phrases.filter((p) => p.seed_number === 190).map((p) => `${p.sid}|${p.known_text}|${p.target_text}`).sort();
  const want190 = NEW_190.map((r) => `${r.id}|${r.known}|${r.target}`).sort();
  if (JSON.stringify(live190) !== JSON.stringify(want190)) out.push('seed 190 phrases are not the planned basket');
  const u05 = db.phrases.find((p) => p.sid === EDIT_223.id);
  if (!u05 || u05.known_text !== EDIT_223.after[0] || u05.target_text !== EDIT_223.after[1]) out.push(`${EDIT_223.id} still reads "${u05?.known_text}" → "${u05?.target_text}"`);
  return out;
}

/** Words of a planned row not attested anywhere in the course at or before `seed` (seed 190's OLD rows excluded,
 *  so a row cannot vouch for itself). The seed's own new LEGOs are what it teaches. */
async function untaught(pg, seed, text, side, taughtHere) {
  const col = side === 'known' ? 'known_text' : 'target_text';
  const out = [];
  for (const w of new Set(norm(text).split(' ').filter(Boolean))) {
    if (taughtHere.has(w)) continue;
    const { rows } = await pg.query(
      `SELECT 1 FROM (SELECT seed_number, ${col} t FROM course_practice_phrases WHERE course_code=$1 AND seed_number<>$4
                      UNION ALL SELECT seed_number, ${col} FROM course_legos WHERE course_code=$1 AND seed_number<>$4
                      UNION ALL SELECT seed_number, ${col} FROM course_seeds WHERE course_code=$1 AND seed_number<>$4) x
        WHERE seed_number <= $2 AND ' '||regexp_replace(lower(replace(t,'’','''')), '[.,!?;:"]', ' ', 'g')||' ' LIKE '% '||$3||' %' LIMIT 1`, [COURSE, seed, w, seed === 190 ? 190 : -1]);
    if (!rows.length) out.push(w);
  }
  return out;
}

/** Every planned pair against the rest of the course: one English → one Italian (components exempt). */
async function zut(pg) {
  const pairs = [...NEW_LEGOS.map((l) => ({ id: l.id, known: l.known, target: l.target })), ...NEW_190.filter((r) => r.role !== 'component'), { id: EDIT_223.id, known: EDIT_223.after[0], target: EDIT_223.after[1] }];
  const clashes = [];
  for (const p of pairs) {
    const { rows } = await pg.query(
      `SELECT split_part(id,':',2) id, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND seed_number<>190 AND id<>$3 AND phrase_role<>'component' AND lower(trim(known_text))=lower(trim($2))
       UNION ALL SELECT lego_id, known_text, target_text FROM course_legos WHERE course_code=$1 AND seed_number<>190 AND lower(trim(known_text))=lower(trim($2))`, [COURSE, p.known, `${COURSE}:${EDIT_223.id}`]);
    for (const r of rows) if (norm(r.target_text) !== norm(p.target)) clashes.push(`${p.id} "${p.known}" → "${p.target}" vs ${r.id} → "${r.target_text}"`);
  }
  return clashes;
}

async function guardLive(pg, db) {
  const problems = [];
  const s = db.seeds.find((x) => x.seed_number === 190);
  if (s.known_text !== SEED_190.known || s.target_text !== SEED_190.target) problems.push('seed 190 text moved');
  const lg = db.legos.filter((l) => l.seed_number === 190).sort((a, b) => a.lego_index - b.lego_index);
  if (lg.length !== 2 || OLD_LEGOS.some((o, i) => lg[i].known_text !== o.known || lg[i].target_text !== o.target)) problems.push(`seed 190 LEGOs are not the picture this tool was written against: ${lg.map((l) => `${l.lego_id} ${l.known_text}|${l.target_text}`).join('; ')}`);
  const live = db.phrases.filter((p) => p.seed_number === 190).map((p) => `${p.sid}|${p.known_text}|${p.target_text}`).sort();
  const want = OLD_190.map((o) => `${o.id}|${o.known}|${o.target}`).sort();
  if (JSON.stringify(live) !== JSON.stringify(want)) problems.push('seed 190 phrases are not the picture this tool was written against');
  const u05 = db.phrases.find((p) => p.sid === EDIT_223.id);
  if (!u05 || u05.known_text !== EDIT_223.before[0] || u05.target_text !== EDIT_223.before[1]) problems.push(`${EDIT_223.id} does not hold its BEFORE text`);
  // new ids must never have been used (progress and history are keyed on ids)
  const { rows: ev } = await pg.query('SELECT scope, detail FROM content_edit_events WHERE course_code=$1 AND surface<>$2', [COURSE, SURFACE]); // this tool's own events (a rolled-back attempt) do not count
  const used = new Set(); for (const r of ev) for (const m of JSON.stringify([r.scope, r.detail]).match(/S0190L0[12][BUC]\d{2}/g) || []) used.add(m);
  for (const r of NEW_190.filter((x) => !x.keep)) if (used.has(r.id) || db.phrases.some((p) => p.sid === r.id)) problems.push(`${r.id} was used before — pick another id`);
  const { rows: marks } = await pg.query("SELECT lego_id FROM human_authored_presentations WHERE course_code=$1 AND lego_id LIKE 'S0190%'", [COURSE]);
  if (marks.length) problems.push(`unexpected human-authored marks: ${marks.map((m) => m.lego_id)}`);
  // vocabulary: every word of every planned row is taught by its seed
  const taught190 = { known: new Set(NEW_LEGOS.flatMap((l) => norm(l.known).split(' '))), target: new Set(NEW_LEGOS.flatMap((l) => norm(l.target).split(' '))) };
  for (const r of NEW_190.filter((x) => x.role !== 'component')) for (const side of ['known', 'target']) {
    const miss = await untaught(pg, 190, r[side], side, taught190[side]);
    if (miss.length) problems.push(`${r.id} ${side} words not taught by seed 190: ${miss.join(', ')}`);
  }
  for (const [i, side] of [[0, 'known'], [1, 'target']]) {
    const miss = await untaught(pg, 223, EDIT_223.after[i], side, new Set());
    if (miss.length) problems.push(`${EDIT_223.id} ${side} words not taught by seed 223: ${miss.join(', ')}`);
  }
  problems.push(...(await zut(pg)).map((c) => `ZUT: ${c}`));
  return problems;
}

// ── Apply ───────────────────────────────────────────────────────────────────────────────
function lego_position(r, lego) {
  const t = norm(r.target), l = norm(lego.target);
  return t.startsWith(l) ? 'start' : t.endsWith(l) ? 'end' : 'middle';
}

async function apply(pg, db) {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });

  // BACKUP every row this pass touches, before anything is written.
  const backup = {
    taken: new Date().toISOString(), ruling: RULING,
    seeds: db.seeds.filter((s) => [190, 223].includes(s.seed_number)),
    legos: db.legos.filter((l) => l.seed_number === 190),
    phrases: db.phrases.filter((p) => p.seed_number === 190 || p.sid === EDIT_223.id),
    intros: db.intros.filter((i) => i.lego_id.startsWith('S0190')),
    lego_introductions: (await pg.query("SELECT * FROM lego_introductions WHERE course_code=$1 AND lego_id LIKE 'S0190%'", [COURSE])).rows,
  };
  const bf = evidencePath(`tools/course-optimization/${SWEEP}/backup-${backup.taken.replace(/[:.]/g, '-')}.json`);
  fs.mkdirSync(path.dirname(bf), { recursive: true }); fs.writeFileSync(bf, JSON.stringify(backup, null, 2));
  console.log(`backup: ${bf}`);

  const oldById = Object.fromEntries(db.phrases.map((p) => [p.sid, p]));
  const keep = NEW_190.filter((r) => r.keep), adds = NEW_190.filter((r) => !r.keep);
  const retexted = keep.filter((r) => oldById[r.id].known_text !== r.known || oldById[r.id].target_text !== r.target);
  const approved = db.seeds.filter((s) => [190, 223].includes(s.seed_number) && s.approved_at);

  const ev = {};
  ev.lego = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'lego-recut', scope: { seed_numbers: [190], lego_ids: NEW_LEGOS.map((l) => l.id), rows: 2 },
    detail: { job: JOB, ruling: RULING, from: OLD_LEGOS, to: NEW_LEGOS.map(({ intro, human, ...l }) => l), intros: Object.fromEntries(NEW_LEGOS.map((l) => [l.id, { to: l.intro, human_authored: !!l.human }])) } });
  ev.edit = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-edit', scope: { seed_numbers: [190, 223], phrase_ids: [...retexted.map((r) => `${COURSE}:${r.id}`), `${COURSE}:${EDIT_223.id}`], rows: retexted.length + 1 },
    detail: { job: JOB, ruling: RULING, edits: [...retexted.map((r) => ({ id: r.id, before: [oldById[r.id].known_text, oldById[r.id].target_text], after: [r.known, r.target] })), { id: EDIT_223.id, before: EDIT_223.before, after: EDIT_223.after }] } });
  ev.add = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-add', scope: { seed_numbers: [190], phrase_ids: adds.map((r) => `${COURSE}:${r.id}`), rows: adds.length },
    detail: { job: JOB, ruling: RULING, rows: adds.map((r) => ({ id: r.id, known: r.known, target: r.target, role: r.role })) } });
  ev.del = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-delete', scope: { seed_numbers: [190], phrase_ids: DELETES_190.map((d) => `${COURSE}:${d.id}`), rows: DELETES_190.length },
    detail: { job: JOB, ruling: RULING, why: 'bare "ti faccio" rows (K44) and rows that no longer contain a seed-190 LEGO; replacements written in the same transaction', deleted: DELETES_190.map((d) => ({ ...d, audio: (({ known_audio_id, target1_audio_id, target2_audio_id }) => ({ known_audio_id, target1_audio_id, target2_audio_id }))(oldById[d.id]) })) } });
  ev.unapprove = approved.length ? await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'unapprove', scope: { seed_numbers: approved.map((a) => a.seed_number), rows: approved.length },
    detail: { job: JOB, why: 'rows re-texted for the ask / ask-a-question rule; they arrive unchecked', approved_at_before: approved } }) : null;

  const positions = {};
  for (const l of NEW_LEGOS) NEW_190.filter((r) => idxOf(r.id) === l.idx).forEach((r, i) => { positions[r.id] = i + 1; });
  const legoOf = (r) => NEW_LEGOS[idxOf(r.id) - 1];

  await pg.query('BEGIN');
  try {
    // 1. LEGOs re-texted in place (never deleted). Every audio link is cleared explicitly; old intro clips are kept as assets.
    for (const l of NEW_LEGOS) {
      const old = db.legos.find((x) => x.lego_id === l.id);
      const u = await pg.query(`UPDATE course_legos SET type=$1, is_new=true, known_text=$2, target_text=$3, components=$4, known_audio_id=NULL, target1_audio_id=NULL, target2_audio_id=NULL, presentation_audio_id=NULL,
          target1_duration_ms=NULL, target2_duration_ms=NULL, last_edit_event_id=$5, updated_at=now() WHERE course_code=$6 AND lego_id=$7 AND known_text=$8 AND target_text=$9`,
        [l.type, l.known, l.target, JSON.stringify(l.components), ev.lego, COURSE, l.id, old.known_text, old.target_text]);
      if (u.rowCount !== 1) throw new Error(`${l.id}: lego update ${u.rowCount}`);
      if (old.presentation_audio_id) {
        await pg.query('UPDATE course_audio SET lego_id=NULL WHERE id::text=$1 AND lego_id=$2', [old.presentation_audio_id, l.id]);
        await pg.query('UPDATE lego_introductions SET presentation_audio_id=NULL, audio_uuid=NULL, updated_at=now() WHERE course_code=$1 AND lego_id=$2', [COURSE, l.id]);
        const oldText = db.intros.find((i) => i.lego_id === l.id)?.text || null;
        await pg.query(`INSERT INTO content_audio_link_drops (table_name, row_id, course_code, seed_number, column_name, role, old_audio_id, old_text, old_voice_id, new_text, reason) VALUES ('course_legos',$1,$2,190,'presentation_audio_id','presentation',$3,$4,NULL,$5,$6)`,
          [l.id, COURSE, old.presentation_audio_id, oldText, l.intro, `${SWEEP}: LEGO re-cut (job ${JOB}, event ${ev.lego}); clip detached, asset kept`]);
      }
    }
    // Park seed 190's rows clear of the final positions ((seed, lego_index, position) is unique).
    await pg.query('UPDATE course_practice_phrases SET position=position+1000 WHERE course_code=$1 AND seed_number=190', [COURSE]);
    // 2. Replacements first: new rows, then in-place re-texts (a side whose words did not change keeps its clip).
    for (const r of adds) {
      const lego = legoOf(r);
      const metadata = r.role === 'component' ? { buildup: 'component', component_index: r.component_index, source: SWEEP, job: JOB } : { format: 'build_use', source: SWEEP, job: JOB };
      const ins = await pg.query(`INSERT INTO course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count, metadata, status, phrase_role, connected_lego_ids, lego_position, lego_id, introduce, last_edit_event_id)
          VALUES ($1,$2,190,$3,$4,$5,$6,$7,$8,$9,'draft',$10,'{}',$11,$12,true,$13)`,
        [`${COURSE}:${r.id}`, COURSE, lego.idx, positions[r.id], r.known, r.target, r.target.split(/\s+/).length, 1, JSON.stringify(metadata), r.role, r.role === 'component' ? 'middle' : lego_position(r, lego), r.role === 'component' ? null : lego.id, ev.add]);
      if (ins.rowCount !== 1) throw new Error(`${r.id}: insert`);
    }
    for (const r of keep) {
      const o = oldById[r.id], lego = legoOf(r);
      const kc = o.known_text !== r.known, tc = o.target_text !== r.target;
      const u = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, target_text=$2, known_audio_id=$3, target1_audio_id=$4, target2_audio_id=$5, word_count=$6, position=$7, lego_position=$8, lego_id=$9,
            qa_checked=NULL, decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL, last_edit_event_id=$10, updated_at=now()
          WHERE course_code=$11 AND id=$12 AND known_text=$13 AND target_text=$14`,
        [r.known, r.target, kc ? null : o.known_audio_id, tc ? null : o.target1_audio_id, tc ? null : o.target2_audio_id, r.target.split(/\s+/).length, positions[r.id], lego_position(r, lego), lego.id,
          (kc || tc) ? ev.edit : o.last_edit_event_id, COURSE, `${COURSE}:${r.id}`, o.known_text, o.target_text]);
      if (u.rowCount !== 1) throw new Error(`${r.id}: update ${u.rowCount}`);
    }
    // 3. Only now the old rows go.
    for (const d of DELETES_190) {
      const del = await pg.query('DELETE FROM course_practice_phrases WHERE course_code=$1 AND id=$2 AND known_text=$3 AND target_text=$4', [COURSE, `${COURSE}:${d.id}`, d.known, d.target]);
      if (del.rowCount !== 1) throw new Error(`${d.id}: delete ${del.rowCount}`);
    }
    // 4. Seed 223 U05.
    const u5 = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, target_text=$2, known_audio_id=NULL, target1_audio_id=NULL, target2_audio_id=NULL, word_count=$3, qa_checked=NULL, decomposition=NULL, decomposition_course_version=NULL,
          display_tiling=NULL, display_tiling_version=NULL, last_edit_event_id=$4, updated_at=now() WHERE course_code=$5 AND id=$6 AND known_text=$7 AND target_text=$8`,
      [EDIT_223.after[0], EDIT_223.after[1], EDIT_223.after[1].split(/\s+/).length, ev.edit, COURSE, `${COURSE}:${EDIT_223.id}`, ...EDIT_223.before]);
    if (u5.rowCount !== 1) throw new Error(`${EDIT_223.id}: update ${u5.rowCount}`);
    // 5. Approval goes.
    if (approved.length) await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number = ANY($3) AND approved_at IS NOT NULL', [ev.unapprove, COURSE, approved.map((a) => a.seed_number)]);
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }

  // Kai's line is marked BEFORE any clip is written (the DB trigger then refuses other words on L02's intro).
  const humanAuthored = require('../../services/shared/human-authored-presentations.cjs');
  const l2 = NEW_LEGOS.find((l) => l.human);
  const { rows: [l2row] } = await pg.query('SELECT * FROM course_legos WHERE course_code=$1 AND lego_id=$2', [COURSE, l2.id]);
  const mark = await humanAuthored.markHumanAuthored(supabase, { courseCode: COURSE, legoId: l2.id, text: l2.intro, author: AUTHOR, authoredOn: '2026-10-14', source: `job ${JOB} — Kai's heads-up shape`, lego: l2row, by: SWEEP, why: RULING });

  await require('../../services/shared/round-index-refresh.cjs').refreshNow();
  const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs');
  await queueAudioPass(supabase, { courseCode: COURSE, requestedBy: `@${SWEEP}`, reason: `job ${JOB}: seed 190 re-cut + seed 223 U05 (ask = chiedere qualcosa / ask a question = fare una domanda); slots rendered by the tool through /api/audio/render`, metadata: { job: JOB }, append: true, metadataKey: SWEEP });
  return { events: ev, mark: mark?.id || mark, retexted: retexted.map((r) => r.id), added: adds.map((r) => r.id), deleted: DELETES_190.map((d) => d.id), unapproved: approved.map((a) => a.seed_number), backup: bf };
}

// ── Audio: the one route ─────────────────────────────────────────────────────────────────
async function render(body) {
  const res = await fetch(RENDER_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify({ courseCode: COURSE, purpose: `kai ${JOB}: ita seed 190 re-cut + 223 U05 (ask / ask a question)`, job: JOB, ...body }) });
  return res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
}

/** One short-lived connection per write: the pooler drops a connection left idle while a render runs. */
async function q1(sql, args) {
  const { Client } = require('pg');
  const c = new Client({ connectionString: process.env.DATABASE_URL }); await c.connect();
  try { return await c.query(sql, args); } finally { await c.end(); }
}

async function audio(pg, { dry }) {
  const log = [];
  const { rows: ph } = await q1("SELECT id, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND (seed_number=190 OR id=$2) ORDER BY id", [COURSE, `${COURSE}:${EDIT_223.id}`]);
  const { rows: lg } = await q1('SELECT lego_id, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id FROM course_legos WHERE course_code=$1 AND seed_number=190 ORDER BY lego_id', [COURSE]);
  const slots = [];
  const push = (table, key, r) => { for (const [role, col, textCol] of [['known', 'known_audio_id', 'known_text'], ['target1', 'target1_audio_id', 'target_text'], ['target2', 'target2_audio_id', 'target_text']]) if (!r[col]) slots.push({ table, key, keyVal: r[key], role, col, text: r[textCol], textCol }); };
  for (const r of ph) push('course_practice_phrases', 'id', r);
  for (const r of lg) push('course_legos', 'lego_id', r);
  for (const s of slots) {
    const out = await render({ role: s.role, text: s.text, dryRun: dry });
    let linked = null;
    if (!dry && out.ok && out.audioId) {
      const u = await q1(`UPDATE ${s.table} SET ${s.col}=$1 WHERE course_code=$2 AND ${s.key}=$3 AND ${s.col} IS NULL AND ${s.textCol}=$4`, [out.audioId, COURSE, s.keyVal, s.text]);
      linked = u.rowCount === 1 ? 'linked' : 'slot already filled (autolink)';
    }
    log.push({ slot: `${s.keyVal.replace(`${COURSE}:`, '')} ${s.role}`, text: s.text, source: out.source, chars: out.wouldSpendChars || out.charsSpent || 0, audioId: out.audioId || null, linked, error: out.ok ? undefined : (out.code || out.error) });
  }
  for (const l of NEW_LEGOS) {
    const row = lg.find((x) => x.lego_id === l.id);
    if (row?.presentation_audio_id) { log.push({ slot: `${l.id} presentation`, text: l.intro, source: 'already linked', chars: 0, audioId: row.presentation_audio_id }); continue; }
    const out = await render({ role: 'presentation', text: l.intro, legoId: l.id, dryRun: dry });
    if (!dry && out.ok && out.audioId) {
      const { rows: [a] } = await q1('SELECT duration_ms FROM course_audio WHERE id::text=$1', [out.audioId]);
      await q1(`INSERT INTO lego_introductions (course_code, lego_id, presentation_audio_id, audio_uuid, duration_ms, updated_at) VALUES ($1,$2,$3,$3,$4,now())
        ON CONFLICT (course_code, lego_id) DO UPDATE SET presentation_audio_id=EXCLUDED.presentation_audio_id, audio_uuid=EXCLUDED.audio_uuid, duration_ms=COALESCE(EXCLUDED.duration_ms, lego_introductions.duration_ms), updated_at=now()`, [COURSE, l.id, out.audioId, a?.duration_ms || null]);
      await q1('UPDATE course_audio SET lego_id=$1 WHERE id::text=$2 AND (lego_id IS NULL OR lego_id<>$1)', [l.id, out.audioId]);
    }
    log.push({ slot: `${l.id} presentation`, text: l.intro, source: out.source, chars: out.wouldSpendChars || out.charsSpent || 0, audioId: out.audioId || null, legoLinked: out.legoLinked, error: out.ok ? undefined : (out.code || out.error) });
  }
  return log;
}

async function main() {
  const { Client } = require('pg');
  let pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  pg.on('error', (e) => console.error(`pg: ${e.message}`));
  try {
    const plan = checkPlan();
    console.log(plan.length ? `PLAN BREAKS ITS OWN RULES:\n  ${plan.join('\n  ')}` : 'plan: LEGOs tile seed 190, components tile, every row contains its LEGO both sides, no later sibling, no duplicates, baskets fed, seed sentence + "later" phrase present, no K44 defect');
    let db = await load(pg);
    if (process.env.APPLY === '1') {
      if (plan.length) throw new Error('plan fails its own rules — nothing written');
      const g = await guardLive(pg, db);
      if (g.length) { console.log(`GUARDS REFUSE:\n  ${g.join('\n  ')}`); process.exitCode = 3; return; }
      console.log('guards hold: live picture matches, new ids unused, every word taught by its seed, no ZUT clash');
      console.log(JSON.stringify(await apply(pg, db), null, 1));
      db = await load(pg);
    } else if (process.env.GUARD === '1') {
      const g = await guardLive(pg, db); console.log(g.length ? `GUARDS:\n  ${g.join('\n  ')}` : 'guards hold');
    }
    if (process.env.AUDIO === '1') {
      const dry = await audio(pg, { dry: true });
      for (const x of dry) console.log(`  dry ${x.slot.padEnd(22)} ${String(x.source).padEnd(12)} ${String(x.chars).padStart(4)}  "${x.text}"${x.error ? `  ERROR ${x.error}` : ''}`);
      console.log(`would spend ${dry.reduce((n, x) => n + (x.chars || 0), 0)} chars over ${dry.length} slots`);
      if (process.env.DRY !== '1') {
        const real = await audio(pg, { dry: false });
        for (const x of real) console.log(`  ${x.slot.padEnd(22)} ${String(x.source).padEnd(12)} ${String(x.chars).padStart(4)}  ${x.audioId || ''} ${x.linked || (x.legoLinked ? 'lego linked' : '')}${x.error ? `  ERROR ${x.error}` : ''}`);
        console.log(`spent ${real.reduce((n, x) => n + (x.source === 'rendered' ? x.chars || 0 : 0), 0)} chars`);
      }
      await pg.end().catch(() => {});
      pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
      db = await load(pg);
    }
    const problems = verify(db);
    console.log(problems.length ? `VERIFY: ${problems.length} defect(s) stand:\n  ${problems.join('\n  ')}` : 'VERIFY: K44 holds course-wide and seed 190 / 223 are as planned');
    process.exitCode = process.exitCode || (problems.length ? 2 : 0);
  } finally { await pg.end(); }
}
module.exports = { NEW_LEGOS, OLD_LEGOS, NEW_190, OLD_190, DELETES_190, EDIT_223, askDefects, checkPlan };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
