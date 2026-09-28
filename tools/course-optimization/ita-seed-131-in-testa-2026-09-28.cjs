#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-seed-131-in-testa-2026-09-28.cjs
//
// ita_for_eng seed 131 — "there are too many ideas going around in my head | ci sono troppe idee che mi
// girano in testa". KAI'S RULINGS (2026-09-28 22:42Z, job #630·I):
//
//   (1) S0131L04 "going around | mi girano" becomes "they're going around in my head | mi girano in testa"
//       — the K28 pronoun (the seed's subject "too many ideas" sits outside the LEGO and the Italian
//       verb carries the person), and the LEGO grows to take "in testa" (L2 bigger chunk; "che" is a
//       taught piece, L30, and stays outside). Re-textured IN PLACE (progress filed under the slot
//       stays true), is_new stays true, components tile it, and every phrase under it contains it.
//   (2) S0131L03 "in my head | in testa" is literally "in head": its presentation carries an EXAMPLE
//       that shows the frame the form is correct in, under Kai's PR3 template — "The Italian for
//       'in my head' in phrases like 'I have too many ideas in my head' is:" — marked human-authored
//       so no rebuild template-overwrites it. The old line's example was "I don't know what ideas are
//       in my head", whose Italian ("non so che idee sono in testa") is one of the rows (3) rewrites.
//   (3) HARD RULE: a phrase uses "in testa" ONLY where "in testa" is the correct Italian for "in my
//       head" — never "nella mia testa" or any other form (the learner has just been taught "in
//       testa"; anything else confuses them). "in testa" means "in MY head" only when the sentence
//       says whose head: "ho … in testa", "mi girano in testa". A bare "… sono in testa" / "è in
//       testa" says nothing about whose head ("è in testa" is "is in the lead"), so those rows are
//       rewritten onto the "ho … in testa" frame the seed's own L03U01 already uses — same LEGO,
//       same meaning, no new vocabulary. Written into the canon in general form (P28; written as P25 on the branch, renumbered at merge): once a form
//       is taught for a meaning, every phrase with that meaning uses that exact form, in a frame
//       where it is correct.
//
// The rule as a function is IN_TESTA_ANCHORED below; the test proves it fails on the BEFORE rows and
// passes on the AFTER rows. Course-wide: no row outside seed 131 says "in my head" or "in testa"
// (checked live, listed in the evidence); seed 513 "my head | la testa" is a different LEGO and a
// different meaning, listed for Kai (its "la testa fa male" rows lack "mi"), not touched.
//
// AFTER THE EDIT: seed 131 unapproved; Italian slots of every changed row re-voiced on Elsa (target1)
// / Benigno (target2) through the one TTS door (existing clip by text first); the L03 heads-up line
// marked then rendered on the temporary-Sonia route (cast restored byte-identical, checked); the L04
// intro re-mirrored by ita-intro-mirror-fix (O13); English prompts listed for the Sonia fill tool;
// audio-pass queued; round index refreshed. Then: audit-phrase-zut strict must stay ≤ 56 and
// check-intro-mirror --strict must exit 0.
//
//   node tools/course-optimization/ita-seed-131-in-testa-2026-09-28.cjs            # dry run
//   APPLY=1 node tools/course-optimization/ita-seed-131-in-testa-2026-09-28.cjs    # write + voice

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'ita_for_eng';
const JOB = '#630·I';
const SEED = 131;
const SWEEP = 'ita-seed-131-in-testa-2026-09-28';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = "Kai, 2026-09-28 22:42Z (job #630·I): S0131L04 = 'they're going around in my head | mi girano in testa' (K28 pronoun, grown to the chunk); the L03 'in my head | in testa' intro shows an example; phrases use 'in testa' ONLY where it is the correct Italian for 'in my head' — never 'nella mia testa' or any other form";
const AUTHOR = "Kai (template PR3, 2026-09-28) — line written by job #630·I";

const norm = (s) => String(s || '').toLowerCase().replace(/’/g, "'").replace(/[.,!?;:"«»“”]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => norm(s).split(' ').filter(Boolean);
/** Live gate's phrase-contains-LEGO rule: word multiset. */
function containsWords(hay, needle) {
  const h = words(hay);
  for (const w of words(needle)) { const i = h.indexOf(w); if (i < 0) return false; h.splice(i, 1); }
  return true;
}
const sameWords = (a, b) => containsWords(a, b) && words(a).length === words(b).length;

/**
 * THE RULE as a function (Kai, ruling 3). An Italian sentence carrying "in testa" for "in my head"
 * must say WHOSE head in the way the course teaches: a first-person "ho" (I have … in my head) or the
 * seed's "mi girano" (they're going around in my head) before it. "nella mia testa" / "nella testa" /
 * "in testa mia" are refused outright; a bare "sono in testa" / "è in testa" / "ci sono … in testa"
 * with no anchor is refused too. A fragment with no verb at all ("in testa", "idee in testa",
 * "in testa adesso") is a BUILD piece, not a sentence, and passes.
 */
const FORBIDDEN_FORMS = /\bnella\s+(mia\s+)?testa\b|\bin\s+testa\s+mia\b/i;
const VERBS = new Set(['sono', 'è', 'ci', 'ho', 'girano', 'siamo', 'hai', 'ha', 'hanno', 'abbiamo', 'sei']);
const ANCHORS = ['ho', 'girano']; // "ho … in testa" / "mi girano … in testa" — the two owners the course teaches
function inTestaAnchored(target) {
  const t = norm(target); const w = words(t);
  if (FORBIDDEN_FORMS.test(t)) return false;
  const at = w.findIndex((x, i) => x === 'in' && w[i + 1] === 'testa');
  if (at < 0) return true;                           // the rule is about "in testa"
  if (!w.some(x => VERBS.has(x))) return true;       // fragment, no clause
  const before = w.slice(0, at);
  return ANCHORS.some(a => before.includes(a)) && (!before.includes('girano') || before.includes('mi'));
}

// ── Seed 131 as it stands (BEFORE) and as ruled (AFTER) — every row quoted so Kai can read it ──
const LEGO_L03 = { id: 'S0131L03', known: 'in my head', target: 'in testa' };
const L04_BEFORE = { id: 'S0131L04', known: 'going around', target: 'mi girano', components: [{ known: 'going around', target: 'mi girano' }] };
const L04_AFTER = { id: 'S0131L04', known: "they're going around in my head", target: 'mi girano in testa', components: [{ known: "they're going around", target: 'mi girano' }, { known: 'in my head', target: 'in testa' }] };

// [id, lego, role, before known, before target, after known, after target, why]
const PHRASES = [
  // ruling 3 — "in testa" only where it is the Italian for "in MY head": the "ho … in testa" frame (L03U01's own)
  ['S0131L03U02', 'S0131L03', 'use', 'too many things are in my head', 'troppe cose sono in testa', 'I have too many things in my head', 'ho troppe cose in testa', '"troppe cose sono in testa" says nothing about whose head'],
  ['S0131L03U03', 'S0131L03', 'use', 'there are many things in my head', 'ci sono molte cose in testa', 'I have many things in my head', 'ho molte cose in testa', '"ci sono … in testa" has no owner of the head'],
  ['S0131L03U04', 'S0131L03', 'use', "I don't know what ideas are in my head", 'non so che idee sono in testa', "I don't know what ideas I have in my head", 'non so che idee ho in testa', '"sono in testa" has no owner of the head'],
  ['S0131L03U05', 'S0131L03', 'use', 'there are too many things in my head now', 'ci sono troppe cose in testa adesso', 'I have too many things in my head now', 'ho troppe cose in testa adesso', '"ci sono … in testa" has no owner of the head'],
  ['S0131L03U06', 'S0131L03', 'use', 'there are too many different ideas in my head', 'ci sono troppe idee diverse in testa', 'I have too many different ideas in my head', 'ho troppe idee diverse in testa', '"ci sono … in testa" has no owner of the head'],
  ['S0131L03U07', 'S0131L03', 'use', "I need to write this because it's in my head now", 'devo scrivere questo perché è in testa adesso', 'I need to write this because I have too many ideas in my head', 'devo scrivere questo perché ho troppe idee in testa', '"è in testa" is "is in the lead", not "is in my head"'],
  ['S0131L03U08', 'S0131L03', 'use', "I can't think because there are too many words in my head", 'non riesco a pensare perché ci sono troppe parole in testa', "I can't think because I have too many words in my head", 'non riesco a pensare perché ho troppe parole in testa', '"ci sono … in testa" has no owner of the head'],
  // ruling 1 — every phrase under L04 contains the grown LEGO "mi girano in testa"; fragments take the pronoun (K28)
  ['S0131L04B01', 'S0131L04', 'build', 'going around', 'mi girano', "they're going around in my head", 'mi girano in testa', 'the LEGO itself'],
  ['S0131L04B02', 'S0131L04', 'build', 'going around', 'mi girano', "they're going around in my head", 'mi girano in testa', 'the LEGO itself (B02 was already a twin of B01)'],
  ['S0131L04B03', 'S0131L04', 'build', 'going around in my head', 'mi girano in testa', "they're going around in my head now", 'mi girano in testa adesso', 'pronoun (K28); "now" so it is not a third twin'],
  ['S0131L04B04', 'S0131L04', 'build', 'ideas going around', 'idee che mi girano', 'ideas going around in my head', 'idee che mi girano in testa', 'takes "in testa" so it contains the grown LEGO; the seed\'s own "idee che mi girano" shape'],
  ['S0131L04U06', 'S0131L04', 'use', 'I need to stop because too many ideas are going around', 'devo smettere perché troppe idee mi girano', 'I need to stop because too many ideas are going around in my head', 'devo smettere perché troppe idee mi girano in testa', 'takes "in testa" so it contains the grown LEGO'],
  ['S0131L04U07', 'S0131L04', 'use', "I can't think because too many things are going around", 'non riesco a pensare perché troppe cose mi girano', "I can't think because too many things are going around in my head", 'non riesco a pensare perché troppe cose mi girano in testa', 'takes "in testa" so it contains the grown LEGO'],
].map(([id, lego, role, bk, bt, ak, at, why]) => ({ id, lego, role, before: { known: bk, target: bt }, after: { known: ak, target: at }, why }));

// Rows under L03/L04 that are KEPT, with the reason (the seed's noun before the chunk — the K28 precedent of job #577·I)
const KEPT = [
  ['S0131L03B01', 'in my head', 'in testa', 'fragment'], ['S0131L03B02', 'in my head', 'in testa', 'fragment'], ['S0131L03B03', 'ideas in my head', 'idee in testa', 'fragment'], ['S0131L03B04', 'in my head now', 'in testa adesso', 'fragment'],
  ['S0131L03U01', 'I have too many ideas in my head', 'ho troppe idee in testa', 'the frame the rule wants — and the intro\'s example'],
  ['S0131L04U01', 'too many ideas are going around in my head', 'troppe idee mi girano in testa', 'carries the seed\'s noun before the chunk'],
  ['S0131L04U02', 'I know that many ideas are going around in my head', 'so che molte idee mi girano in testa', 'carries the noun before the chunk'],
  ['S0131L04U03', 'too many different things are going around in my head', 'troppe cose diverse mi girano in testa', 'carries the noun before the chunk'],
  ['S0131L04U04', 'too many words are going around in my head now', 'troppe parole mi girano in testa adesso', 'carries the noun before the chunk'],
  ['S0131L04U05', 'there are many things going around in my head', 'ci sono molte cose che mi girano in testa', 'the seed\'s own shape'],
  ['S0131L04U08', 'there are too many new words going around in my head', 'ci sono troppe parole nuove che mi girano in testa', 'the seed\'s own shape'],
].map(([id, known, target, why]) => ({ id, known, target, why }));

const INTRO_L03 = { legoId: 'S0131L03', example: 'I have too many ideas in my head', text: "The Italian for 'in my head' in phrases like 'I have too many ideas in my head' is:" };

const BEFORE_ROWS = () => [...PHRASES.map(p => ({ id: p.id, lego: p.lego, ...p.before })), ...KEPT.map(k => ({ id: k.id, lego: k.id.slice(0, 8), known: k.known, target: k.target }))];
const AFTER_ROWS = () => [...PHRASES.map(p => ({ id: p.id, lego: p.lego, ...p.after })), ...KEPT.map(k => ({ id: k.id, lego: k.id.slice(0, 8), known: k.known, target: k.target }))];
const legoAfter = (id) => (id === 'S0131L04' ? L04_AFTER : LEGO_L03);
const legoBefore = (id) => (id === 'S0131L04' ? L04_BEFORE : LEGO_L03);

/** Static guards — decidable without the DB; the test runs these. */
function staticProblems() {
  const p = [];
  for (const r of AFTER_ROWS()) {
    const L = legoAfter(r.lego);
    if (!containsWords(r.target, L.target)) p.push(`${r.id}: Italian "${r.target}" does not contain its LEGO "${L.target}"`);
    if (!inTestaAnchored(r.target)) p.push(`${r.id}: "${r.target}" breaks the in-testa rule`);
    if (r.lego === 'S0131L04' && !containsWords(r.known, L.known) && !/\b(ideas|things|words)\b.*\bgoing around in my head\b/.test(norm(r.known))) p.push(`${r.id}: English "${r.known}" neither contains "${L.known}" nor carries the seed's noun before the chunk`);
    if (r.lego === 'S0131L03' && !containsWords(r.known, L.known)) p.push(`${r.id}: English lacks "in my head"`);
  }
  if (!sameWords(L04_AFTER.components.map(c => c.known).join(' '), L04_AFTER.known) || !sameWords(L04_AFTER.components.map(c => c.target).join(' '), L04_AFTER.target)) p.push('L04 components do not tile the LEGO');
  const byKnown = {};
  for (const r of AFTER_ROWS()) { const k = norm(r.known); (byKnown[k] = byKnown[k] || new Set()).add(norm(r.target)); }
  for (const [k, ts] of Object.entries(byKnown)) if (ts.size > 1) p.push(`ZUT inside the seed: "${k}" → ${[...ts].join(' / ')}`);
  if (!INTRO_L03.text.includes(`'${LEGO_L03.known}'`)) p.push('L03 intro does not quote its LEGO');
  if (!containsWords(INTRO_L03.example, LEGO_L03.known)) p.push('L03 intro example does not contain the LEGO');
  if (/[()\[\]]/.test(INTRO_L03.text) || /\b(preposition|article|grammar|literally|noun)\b/i.test(INTRO_L03.text)) p.push('L03 intro has brackets or a grammar term');
  return p;
}

// ── Live ──────────────────────────────────────────────────────────────────────────────────
async function guardLive(pg, log) {
  const problems = [];
  const { rows: legos } = await pg.query('SELECT lego_id, known_text, target_text, is_new, components, presentation_audio_id FROM course_legos WHERE course_code=$1 AND seed_number=$2 ORDER BY lego_id', [COURSE, SEED]);
  const byLego = Object.fromEntries(legos.map(l => [l.lego_id, l]));
  for (const L of [LEGO_L03, L04_BEFORE]) {
    const live = byLego[L.id];
    if (!live || live.known_text !== L.known || live.target_text !== L.target) problems.push(`${L.id} reads "${live?.known_text}" → "${live?.target_text}", expected "${L.known}" → "${L.target}"`);
  }
  log.legosBefore = legos;
  const { rows: phrases } = await pg.query('SELECT id, phrase_role, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND seed_number=$2 ORDER BY id', [COURSE, SEED]);
  const byId = Object.fromEntries(phrases.map(r => [r.id.replace(`${COURSE}:`, ''), r]));
  for (const p of PHRASES) { const r = byId[p.id]; if (!r || r.known_text !== p.before.known || r.target_text !== p.before.target) problems.push(`${p.id} reads "${r?.known_text}" → "${r?.target_text}", expected "${p.before.known}" → "${p.before.target}"`); }
  for (const k of KEPT) { const r = byId[k.id]; if (!r || r.known_text !== k.known || r.target_text !== k.target) problems.push(`${k.id} (kept) reads "${r?.known_text}" → "${r?.target_text}", expected "${k.known}" → "${k.target}"`); }
  // every non-component row of 131 is either changed or kept — nothing overlooked
  for (const r of phrases.filter(r => r.phrase_role !== 'component' && /S0131L0[34]/.test(r.id))) { const id = r.id.replace(`${COURSE}:`, ''); if (!PHRASES.some(p => p.id === id) && !KEPT.some(k => k.id === id)) problems.push(`${id} under L03/L04 is neither changed nor kept`); }
  log.phrasesBefore = phrases;
  // course-wide: the rule everywhere else (ruling 3 + the standing knock-on check)
  const { rows: elsewhere } = await pg.query(`SELECT 'phrase' AS kind, id, seed_number, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND seed_number<>$2 AND (target_text ~* '\\mtesta\\M' OR known_text ~* '\\mhead\\M')
    UNION ALL SELECT 'lego', lego_id, seed_number, known_text, target_text FROM course_legos WHERE course_code=$1 AND seed_number<>$2 AND (target_text ~* '\\mtesta\\M' OR known_text ~* '\\mhead\\M')
    UNION ALL SELECT 'seed', seed_number::text, seed_number, known_text, target_text FROM course_seeds WHERE course_code=$1 AND seed_number<>$2 AND (target_text ~* '\\mtesta\\M' OR known_text ~* '\\mhead\\M') ORDER BY 3, 2`, [COURSE, SEED]);
  log.elsewhere = elsewhere.map(r => ({ ...r, id: r.id.replace(`${COURSE}:`, ''), inMyHead: /\bin my head\b/i.test(r.known_text), breaks: /\bin my head\b/i.test(r.known_text) && !inTestaAnchored(r.target_text) }));
  for (const r of log.elsewhere.filter(r => r.breaks)) problems.push(`${r.id} (seed ${r.seed_number}) says "in my head" with "${r.target_text}" — not in this tool's list`);
  const { rows: girano } = await pg.query(`SELECT id, seed_number, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND seed_number<>$2 AND target_text ~* '\\mgiran'`, [COURSE, SEED]);
  log.giranoElsewhere = girano;
  // vocabulary: every word in the AFTER rows and the intro example is taught by seed 131
  const { newVocabulary } = require('./ita-future-in-past-2026-09-28.cjs');
  for (const r of [...PHRASES.map(p => ({ id: p.id, ...p.after })), { id: 'L04', ...L04_AFTER }]) {
    const nk = (await newVocabulary(pg, SEED, r.known, 'known')).filter(w => w !== "they're"); // K28: the pronoun is the person the Italian verb carries, not new vocabulary ("they are" is taught at seed 87)
    const nt = await newVocabulary(pg, SEED, r.target, 'target');
    if (nk.length) problems.push(`${r.id}: English words not taught by seed ${SEED}: ${nk.join(', ')}`);
    if (nt.length) problems.push(`${r.id}: Italian words not taught by seed ${SEED}: ${nt.join(', ')}`);
  }
  const ni = await newVocabulary(pg, SEED, INTRO_L03.example, 'known'); if (ni.length) problems.push(`intro example uses untaught words: ${ni.join(', ')}`);
  // intro state: L03 must not already be guarded by someone else's words (report, never overwrite)
  const { rows: marks } = await pg.query('SELECT lego_id, text, author FROM human_authored_presentations WHERE course_code=$1 AND lego_id LIKE $2', [COURSE, 'S0131%']);
  log.marksBefore = marks;
  for (const m of marks) if (m.lego_id === 'S0131L03' && norm(m.text) !== norm(INTRO_L03.text)) problems.push(`S0131L03 is already guarded with another author's line: "${m.text}" (${m.author}) — report, do not overwrite`);
  const { rows: intros } = await pg.query(`SELECT l.lego_id, a.id, a.text, a.voice_id, a.s3_key FROM course_legos l LEFT JOIN course_audio a ON a.id::text=l.presentation_audio_id WHERE l.course_code=$1 AND l.seed_number=$2 ORDER BY 1`, [COURSE, SEED]);
  log.introsBefore = intros;
  // ZUT against the course for every AFTER pair (K2: one known → two targets is a hold; the other direction is listed)
  const clashes = [];
  for (const r of [...PHRASES.map(p => ({ id: p.id, ...p.after })), { id: 'S0131L04', ...L04_AFTER }]) {
    const { rows } = await pg.query(`SELECT id, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND phrase_role<>'component' AND seed_number<>$4 AND ((lower(trim(known_text))=lower($2) AND lower(trim(target_text))<>lower($3)) OR (lower(trim(target_text))=lower($3) AND lower(trim(known_text))<>lower($2)))
      UNION ALL SELECT lego_id, known_text, target_text FROM course_legos WHERE course_code=$1 AND seed_number<>$4 AND ((lower(trim(known_text))=lower($2) AND lower(trim(target_text))<>lower($3)) OR (lower(trim(target_text))=lower($3) AND lower(trim(known_text))<>lower($2)))`, [COURSE, r.known, r.target, SEED]);
    for (const x of rows) clashes.push({ ours: `${r.id} "${r.known}" → "${r.target}"`, vs: `${x.id.replace(`${COURSE}:`, '')} "${x.known_text}" → "${x.target_text}"`, k2: x.known_text.trim().toLowerCase() === r.known.toLowerCase() });
  }
  log.zutClashes = clashes;
  for (const c of clashes.filter(c => c.k2)) problems.push(`ZUT K2: ${c.ours} vs ${c.vs}`);
  const { rows: [seed] } = await pg.query('SELECT approved_at FROM course_seeds WHERE course_code=$1 AND seed_number=$2', [COURSE, SEED]);
  log.seedApprovedBefore = seed?.approved_at || null;
  return problems;
}

async function applyContent(pg, supabase, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const ev = (op, scope, detail) => recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: op, scope, detail });
  const legoEvent = await ev('lego-edit', { seed_numbers: [SEED], lego_ids: [L04_AFTER.id], rows: 1 }, { ruling: RULING, job: JOB, changes: [{ id: L04_AFTER.id, known_from: L04_BEFORE.known, known_to: L04_AFTER.known, target_from: L04_BEFORE.target, target_to: L04_AFTER.target, components: L04_AFTER.components }] });
  const phraseEvent = await ev('phrase-edit', { seed_numbers: [SEED], phrase_ids: PHRASES.map(p => `${COURSE}:${p.id}`), rows: PHRASES.length }, { ruling: RULING, job: JOB, changes: PHRASES.map(p => ({ id: `${COURSE}:${p.id}`, known_from: p.before.known, target_from: p.before.target, known_to: p.after.known, target_to: p.after.target, why: p.why })) });
  const unapproveEvent = await ev('unapprove', { seed_numbers: [SEED], rows: 1 }, { why: 'L04 re-textured, 13 phrases rewritten, L03 intro re-authored under Kai\'s 2026-09-28 rulings; needs his read', job: JOB });
  log.events = { legoEvent, phraseEvent, unapproveEvent };
  await pg.query('BEGIN');
  try {
    const l = await pg.query(`UPDATE course_legos SET known_text=$1, target_text=$2, components=$3, is_new=true, known_audio_id=NULL, target1_audio_id=NULL, target2_audio_id=NULL, target1_duration_ms=NULL, target2_duration_ms=NULL, last_edit_event_id=$4, updated_at=now() WHERE course_code=$5 AND lego_id=$6 AND known_text=$7 AND target_text=$8`,
      [L04_AFTER.known, L04_AFTER.target, JSON.stringify(L04_AFTER.components), legoEvent, COURSE, L04_AFTER.id, L04_BEFORE.known, L04_BEFORE.target]);
    if (l.rowCount !== 1) throw new Error(`L04: ${l.rowCount} rows`);
    for (const p of PHRASES) {
      const targetChanged = p.before.target !== p.after.target;
      const u = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, target_text=$2, known_audio_id=NULL, target1_audio_id=CASE WHEN $8 THEN NULL ELSE target1_audio_id END, target2_audio_id=CASE WHEN $8 THEN NULL ELSE target2_audio_id END, qa_checked=NULL, last_edit_event_id=$3, updated_at=now() WHERE course_code=$4 AND id=$5 AND known_text=$6 AND target_text=$7`,
        [p.after.known, p.after.target, phraseEvent, COURSE, `${COURSE}:${p.id}`, p.before.known, p.before.target, targetChanged]);
      if (u.rowCount !== 1) throw new Error(`${p.id}: ${u.rowCount} rows`);
    }
    const un = await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number=$3', [unapproveEvent, COURSE, SEED]);
    log.unapproved = { seed: SEED, rows: un.rowCount };
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
}

// ── Audio: Italian on Elsa/Benigno (the #579·I/#580·I/#621·I route, unchanged) ─────────────
const ELSA = { voiceId: 'azure_it-IT-ElsaNeural', voiceName: 'it-IT-ElsaNeural' };
const BENIGNO = { voiceId: 'azure_it-IT-BenignoNeural', voiceName: 'it-IT-BenignoNeural' };
const AZURE_VOICE_IDS = { target1: ['azure_it-IT-ElsaNeural', 'it-IT-ElsaNeural'], target2: ['azure_it-IT-BenignoNeural', 'it-IT-BenignoNeural'] };
function ttsDeps() {
  process.env.PHASE8_NO_LISTEN = '1';
  return {
    phase8: require('../../services/phases/phase8-audio-v13.cjs'), ttsService: require('../../services/tts-service.cjs'), veracity: require('../../services/audio-veracity.cjs'),
    voiceConfigService: require('../../services/voice-config-service.cjs'), writeOrSwapClip: require('../../services/shared/audio-revision-swap.cjs').writeOrSwapClip,
    normalizeForAudio: require('../../services/shared/text-normalize.cjs').normalizeForAudio, S3: require('@aws-sdk/client-s3'), uuidv4: require('uuid').v4,
  };
}
async function renderClip(supabase, { text, role, voice, voiceIds, language, legoId = null }) {
  const d = ttsDeps();
  const s3 = new d.S3.S3Client({ region: process.env.AWS_REGION || 'eu-west-1' });
  const renderAndMaster = async () => {
    const out = await d.ttsService.generateWithRetry(text, 'azure', { door: { courseCode: COURSE, intro: false, language, voiceBound: true }, subscriptionKey: process.env.AZURE_SPEECH_KEY, region: process.env.AZURE_SPEECH_REGION || 'westeurope', voiceName: voice.voiceName, speed: 1 });
    if (out.existingClip && !voiceIds.includes(out.existingClip.voice_id)) throw new Error(`door offered ${out.existingClip.voice_id}; ${voice.voiceName} only`);
    const { buffer, durationMs } = await d.phase8.masterAudio(out.audioBuffer, text, await d.voiceConfigService.masteringOptsFor(voice.voiceName, 'azure'));
    return { buffer, durationMs, wordBoundaries: out.wordBoundaries };
  };
  const gated = await d.veracity.renderChecked({ render: renderAndMaster, expectedText: text, language, sampler: d.veracity.ALWAYS_SAMPLER, logger: console, meta: { courseCode: COURSE, role, voiceId: voice.voiceName, originalText: text, lego_id: legoId } });
  if (!gated.published) throw new Error(`veracity gate: quarantined after ${gated.attempts} attempts (${gated.verdict?.reason})`);
  const newAudioId = d.uuidv4().toUpperCase(), newS3Key = `mastered/${newAudioId}.mp3`;
  await s3.send(new d.S3.PutObjectCommand({ Bucket: d.phase8.S3_BUCKET, Key: newS3Key, Body: gated.buffer, ContentType: 'audio/mpeg', CacheControl: 'public, max-age=31536000, immutable' }));
  const verdictColumns = d.veracity.verdictColumns(gated.verdict, { checker: SWEEP, attempts: gated.attempts });
  const textNormalized = d.normalizeForAudio(text);
  if (legoId) { // a presentation row is keyed to its LEGO; the guard trigger checks its words against the mark
    const { data, error } = await supabase.from('course_audio').insert({ course_code: COURSE, text, text_normalized: textNormalized, language, role, voice_id: voice.voiceId, origin: 'tts', s3_key: newS3Key, duration_ms: gated.durationMs, word_boundaries: gated.wordBoundaries || null, lego_id: legoId, ...verdictColumns }).select('id').single();
    if (error) throw new Error(`course_audio insert refused: ${error.message}`);
    return { audioId: data.id, durationMs: gated.durationMs };
  }
  const base = { course_code: COURSE, text, text_normalized: textNormalized, language, role, voice_id: voice.voiceId, origin: 'tts' };
  const out = await d.writeOrSwapClip({ supabase, identity: { course_code: COURSE, text_normalized: textNormalized, language, role, voice_id: voice.voiceId }, insertRow: { ...base, s3_key: newS3Key, duration_ms: gated.durationMs, word_boundaries: gated.wordBoundaries || null, ...verdictColumns }, swapPatch: { voice_id: voice.voiceId, origin: 'tts', word_boundaries: gated.wordBoundaries || null, text, ...verdictColumns }, newS3Key, durationMs: gated.durationMs, source: SWEEP, acceptedBy: `${SWEEP} (${role}, ${voice.voiceName})`, reason: RULING, logger: console });
  return { audioId: out.audioId, durationMs: gated.durationMs };
}
async function fillItalian(pg, supabase, log) {
  const targets = [
    { tbl: 'course_legos', key: 'lego_id', id: L04_AFTER.id },
    ...PHRASES.filter(p => p.before.target !== p.after.target).map(p => ({ tbl: 'course_practice_phrases', key: 'id', id: `${COURSE}:${p.id}` })),
  ];
  for (const t of targets) {
    const { rows: [r] } = await pg.query(`SELECT target_text, target1_audio_id, target2_audio_id FROM ${t.tbl} WHERE course_code=$1 AND ${t.key}=$2`, [COURSE, t.id]);
    for (const role of ['target1', 'target2']) {
      if (r[`${role}_audio_id`]) { log.audio.push({ id: t.id, role, text: r.target_text, result: 'already linked (trigger re-pointed to an owned clip)' }); continue; }
      const entry = { id: t.id, role, text: r.target_text }; log.audio.push(entry);
      const voice = role === 'target1' ? ELSA : BENIGNO;
      try {
        const { rows: have } = await pg.query(`SELECT id, voice_id FROM course_audio WHERE language='ita' AND text_normalized=normalize_text($1) AND s3_key IS NOT NULL AND s3_key NOT LIKE 'pending/%' AND voice_id = ANY($2) ORDER BY (course_code=$3) DESC, (role=$4) DESC, created_at DESC LIMIT 1`, [r.target_text, AZURE_VOICE_IDS[role], COURSE, role]);
        let audioId = have[0]?.id;
        if (audioId) entry.result = `linked existing ${have[0].voice_id} clip ${audioId}`;
        else { const out = await renderClip(supabase, { text: r.target_text, role, voice, voiceIds: AZURE_VOICE_IDS[role], language: 'ita' }); audioId = out.audioId; entry.result = `rendered ${voice.voiceName} clip ${audioId} (${out.durationMs} ms)`; }
        const u = await pg.query(`UPDATE ${t.tbl} SET ${role}_audio_id=$1 WHERE course_code=$2 AND ${t.key}=$3 AND target_text=$4 AND ${role}_audio_id IS NULL`, [audioId, COURSE, t.id, r.target_text]);
        const { rows: [now] } = await pg.query(`SELECT a.id, a.voice_id FROM ${t.tbl} x LEFT JOIN course_audio a ON a.id=x.${role}_audio_id WHERE x.course_code=$1 AND x.${t.key}=$2`, [COURSE, t.id]);
        if (u.rowCount !== 1 && now?.id === audioId) entry.result += ' — linked by the audio_autolink trigger on insert';
        entry.linked = now?.id || null; entry.linkedVoice = now?.voice_id || null;
        if (!now?.id || !AZURE_VOICE_IDS[role].includes(now.voice_id)) entry.result += ` — SLOT NOT ON CAST VOICE (${now?.voice_id})`;
      } catch (e) { entry.result = `REFUSED/FAILED: ${e.message}`; }
    }
  }
}

// ── The L03 heads-up intro: mark, detach, render on temporary Sonia, link (the #546·I route) ──
const SONIA = { voiceId: 'azure_en-GB-SoniaNeural', voiceName: 'en-GB-SoniaNeural', castVoiceId: 'en-GB-SoniaNeural' };
const SONIA_IDS = ['azure_en-GB-SoniaNeural', 'en-GB-SoniaNeural'];
// The door checks the cast PER SLOT: a presentation render needs a 'presentation' row (the first APPLY used 'known' and was refused 403; INTRO_ONLY=1 re-runs just this step).
const TEMP_ROW = { slot: 'presentation', language: 'eng', gender: 'f', rank: 1, voice_id: SONIA.castVoiceId };
async function introL03(pg, supabase, log) {
  const humanAuthored = require('../../services/shared/human-authored-presentations.cjs');
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const { sameCast } = require('./ita-sonia-temporary-fill-2026-09-28.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const { rows: [live] } = await pg.query('SELECT lego_id, seed_number, known_text, target_text, presentation_audio_id FROM course_legos WHERE course_code=$1 AND lego_id=$2', [COURSE, INTRO_L03.legoId]);
  const { rows: [old] } = await pg.query('SELECT id, text FROM course_audio WHERE id::text=$1', [live.presentation_audio_id || '']);
  const entry = { legoId: INTRO_L03.legoId, from: old?.text || null, text: INTRO_L03.text }; log.intro = entry;
  entry.event = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'presentation-edit', scope: { seed_numbers: [SEED], lego_ids: [INTRO_L03.legoId], rows: 1 }, detail: { ruling: RULING, job: JOB, from: old?.text || null, to: INTRO_L03.text, old_audio_id: old?.id || null } });
  const engCast = async () => (await pg.query(`SELECT slot, language, gender, rank, voice_id, notes, assigned_by, created_at, updated_at FROM voice_language_roles WHERE language='eng' ORDER BY slot, gender, rank, voice_id`)).rows;
  entry.castBefore = await engCast();
  if (entry.castBefore.some(r => SONIA_IDS.includes(r.voice_id))) throw new Error('Sonia already in the English cast — a previous run did not restore it');
  let castRow = false;
  try {
    await pg.query(`INSERT INTO voice_language_roles (slot, language, gender, rank, voice_id, notes, assigned_by) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [TEMP_ROW.slot, TEMP_ROW.language, TEMP_ROW.gender, TEMP_ROW.rank, TEMP_ROW.voice_id, `TEMPORARY — ${RULING}. Removed by the same run.`, SWEEP]);
    castRow = true;
    const { rows: [haveMark] } = await pg.query('SELECT lego_id, text FROM human_authored_presentations WHERE course_code=$1 AND lego_id=$2', [COURSE, INTRO_L03.legoId]);
    if (haveMark && norm(haveMark.text) === norm(INTRO_L03.text)) entry.markId = `${haveMark.lego_id} (already marked)`;
    else { const mark = await humanAuthored.markHumanAuthored(supabase, { courseCode: COURSE, legoId: INTRO_L03.legoId, text: INTRO_L03.text, author: AUTHOR, authoredOn: '2026-09-28', source: `job ${JOB}`, lego: live, by: SWEEP, why: RULING }); entry.markId = mark.id || mark.lego_id; }
    await pg.query('BEGIN');
    try {
      if (old) await pg.query('UPDATE course_audio SET lego_id=NULL WHERE id=$1 AND lego_id=$2', [old.id, INTRO_L03.legoId]);
      await pg.query('UPDATE course_legos SET presentation_audio_id=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND lego_id=$3', [entry.event, COURSE, INTRO_L03.legoId]);
      await pg.query('UPDATE lego_introductions SET presentation_audio_id=NULL, audio_uuid=NULL, updated_at=now() WHERE course_code=$1 AND lego_id=$2', [COURSE, INTRO_L03.legoId]);
      await pg.query('COMMIT');
    } catch (e) { await pg.query('ROLLBACK'); throw e; }
    try {
      const { rows: have } = await pg.query(`SELECT id FROM course_audio WHERE language='eng' AND text_normalized=normalize_text($1) AND s3_key IS NOT NULL AND s3_key NOT LIKE 'pending/%' AND voice_id = ANY($2) AND role='presentation' AND lego_id IS NULL ORDER BY (course_code=$3) DESC, created_at DESC LIMIT 1`, [INTRO_L03.text, SONIA_IDS, COURSE]);
      let audioId;
      if (have[0]) { audioId = have[0].id; await pg.query('UPDATE course_audio SET lego_id=$1 WHERE id=$2', [INTRO_L03.legoId, audioId]); entry.result = `reused Sonia clip ${audioId}`; }
      else { const out = await renderClip(supabase, { text: INTRO_L03.text, role: 'presentation', voice: SONIA, voiceIds: SONIA_IDS, language: 'eng', legoId: INTRO_L03.legoId }); audioId = out.audioId; entry.result = `rendered Sonia clip ${audioId} (${out.durationMs} ms)`; }
      await pg.query('UPDATE course_legos SET presentation_audio_id=$1 WHERE course_code=$2 AND lego_id=$3 AND presentation_audio_id IS NULL', [audioId, COURSE, INTRO_L03.legoId]);
      await pg.query('UPDATE lego_introductions SET presentation_audio_id=$1, audio_uuid=$1, updated_at=now() WHERE course_code=$2 AND lego_id=$3', [audioId, COURSE, INTRO_L03.legoId]);
      entry.audioId = audioId;
    } catch (e) { entry.result = `SILENT — render refused: ${e.message}`; }
    const { rows: [chk] } = await pg.query('SELECT l.presentation_audio_id, a.text FROM course_legos l LEFT JOIN course_audio a ON a.id::text=l.presentation_audio_id WHERE l.course_code=$1 AND l.lego_id=$2', [COURSE, INTRO_L03.legoId]);
    entry.linkedText = chk?.text || null; entry.mirrors = !!chk?.text && chk.text === INTRO_L03.text;
  } finally {
    if (castRow) await pg.query(`DELETE FROM voice_language_roles WHERE slot=$1 AND language=$2 AND gender=$3 AND rank=$4 AND voice_id=$5 AND assigned_by=$6`, [TEMP_ROW.slot, TEMP_ROW.language, TEMP_ROW.gender, TEMP_ROW.rank, TEMP_ROW.voice_id, SWEEP]);
    entry.castAfter = await engCast(); entry.castRestored = sameCast(entry.castBefore, entry.castAfter);
  }
}
function reMirrorIntros(log) {
  const { spawnSync } = require('child_process');
  const script = path.join(__dirname, 'ita-intro-mirror-fix-2026-09-28.cjs');
  const r = spawnSync(process.execPath, [script], { encoding: 'utf8', env: { ...process.env, APPLY: '1', INTRO_MIRROR_AT_EXIT: '0' }, timeout: 20 * 60 * 1000 });
  log.introFix = { status: r.status, tail: String(r.stdout || '').split('\n').slice(-30).join('\n'), stderr: String(r.stderr || '').slice(-3000) };
  return r.status;
}

async function main() {
  const APPLY = process.env.APPLY === '1';
  const { Client } = require('pg');
  const { createClient } = require('@supabase/supabase-js');
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const log = { sweep: SWEEP, job: JOB, ruling: RULING, apply: APPLY, started: new Date().toISOString(), problems: [], audio: [] };
  if (process.env.INTRO_ONLY === '1') { // re-run only the L03 intro step (mark → detach → render on temporary Sonia → link)
    await introL03(pg, supabase, log);
    console.log(`L03 INTRO: ${log.intro.result}${log.intro.mirrors ? ' → linked, mirrors the mark' : ' → NOT LINKED'}; cast ${log.intro.castRestored ? 'RESTORED byte-for-byte' : 'NOT RESTORED — fix by hand'}`);
    const f = evidencePath(`tools/course-optimization/${SWEEP}/intro-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(f, JSON.stringify(log, null, 2)); console.log(`Wrote ${f}`); await pg.end(); process.exit(log.intro.mirrors && log.intro.castRestored ? 0 : 2);
  }
  console.log(`\n══ ${COURSE} seed ${SEED} — L04 "they're going around in my head | mi girano in testa", L03 intro example, the in-testa rule — ${APPLY ? 'APPLY' : 'DRY RUN'} ══`);
  log.problems.push(...staticProblems());
  log.problems.push(...await guardLive(pg, log));
  console.log(`LEGO  ${L04_BEFORE.id}: "${L04_BEFORE.known}" | "${L04_BEFORE.target}"  →  "${L04_AFTER.known}" | "${L04_AFTER.target}"   components ${L04_AFTER.components.map(c => `${c.known}=${c.target}`).join(' + ')}`);
  for (const p of PHRASES) console.log(`  ${p.role.padEnd(5)} ${p.id}  "${p.before.known}" | "${p.before.target}"  →  "${p.after.known}" | "${p.after.target}"   (${p.why})`);
  console.log(`INTRO ${INTRO_L03.legoId}: "${log.introsBefore?.find(i => i.lego_id === INTRO_L03.legoId)?.text}"  →  "${INTRO_L03.text}"`);
  console.log(`kept: ${KEPT.length} rows; elsewhere in the course with testa/head: ${log.elsewhere?.length} rows (${log.elsewhere?.filter(r => r.inMyHead).length} say "in my head"); "giran-" outside 131: ${log.giranoElsewhere?.length}`);
  console.log(`ZUT against the course: ${log.zutClashes?.length ? log.zutClashes.map(c => `${c.k2 ? 'K2 HOLD' : 'two Englishes, one Italian (listed)'}: ${c.ours} vs ${c.vs}`).join('\n  ') : 'no clash'}`);
  console.log(log.problems.length ? '\nPROBLEMS:\n  ' + log.problems.join('\n  ') : '\nguards hold: live text matches, every AFTER row contains its LEGO and obeys the in-testa rule, components tile, no new vocabulary, no K2 clash, L03 not guarded by another hand');
  if (APPLY && !log.problems.length) {
    await applyContent(pg, supabase, log); console.log(`APPLIED. events=${JSON.stringify(log.events)} unapproved=${JSON.stringify(log.unapproved)}`);
    await fillItalian(pg, supabase, log);
    console.log('ITALIAN AUDIO:'); for (const a of log.audio) console.log(`  ${a.id} ${a.role} "${a.text}": ${a.result}`);
    await introL03(pg, supabase, log);
    console.log(`L03 INTRO: ${log.intro.result}${log.intro.mirrors ? ' → linked, mirrors the mark' : ' → NOT LINKED'}; cast ${log.intro.castRestored ? 'RESTORED byte-for-byte' : 'NOT RESTORED — fix by hand'}`);
    const st = reMirrorIntros(log); console.log(`intro re-mirror (L04): exit ${st}\n${log.introFix.tail}`);
    const { refreshNow } = require('../../services/shared/round-index-refresh.cjs'); await refreshNow();
    const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs');
    log.audioPass = await queueAudioPass(supabase, { courseCode: COURSE, requestedBy: `@${SWEEP}`, reason: `job ${JOB}: seed 131 L04 grown to "mi girano in testa" (K28 pronoun), ${PHRASES.length} phrases rewritten under the in-testa rule, L03 intro example; Italian on Elsa/Benigno by the tool, English on temporary Sonia`, metadata: { job: JOB, seeds: [SEED], rows: PHRASES.length + 1 } });
    const { rows: silent } = await pg.query(`SELECT id FROM course_practice_phrases WHERE course_code=$1 AND seed_number=$2 AND known_audio_id IS NULL UNION ALL SELECT lego_id FROM course_legos WHERE course_code=$1 AND seed_number=$2 AND known_audio_id IS NULL ORDER BY 1`, [COURSE, SEED]);
    log.silentEnglish = silent.map(r => r.id);
    console.log(`ENGLISH prompts to fill on temporary Sonia (${log.silentEnglish.length}):\n  SCOPE=ids IDS=${log.silentEnglish.join(',')} APPLY=1 node tools/course-optimization/ita-sonia-temporary-fill-2026-09-28.cjs`);
    if (log.audio.some(a => /REFUSED|FAILED|NOT ON CAST/.test(a.result))) log.problems.push('some Italian slots were not filled — see audio');
    if (!log.intro.mirrors || !log.intro.castRestored) log.problems.push('L03 intro not linked or cast not restored');
    if (st !== 0) log.problems.push(`intro re-mirror exited ${st}`);
  }
  const f = evidencePath(`tools/course-optimization/${SWEEP}/${APPLY ? 'applied' : 'dryrun'}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(log, null, 2)); console.log(`Wrote ${f}`);
  await pg.end(); process.exit(log.problems.length ? 2 : 0);
}
module.exports = { inTestaAnchored, containsWords, sameWords, norm, staticProblems, PHRASES, KEPT, L04_BEFORE, L04_AFTER, LEGO_L03, INTRO_L03, BEFORE_ROWS, AFTER_ROWS };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
