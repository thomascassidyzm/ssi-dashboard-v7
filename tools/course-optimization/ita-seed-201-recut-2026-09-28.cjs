#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-seed-201-recut-2026-09-28.cjs
//
// ita_for_eng seed 201 — "we wanted to know what was going to happen" → "volevamo sapere che cosa
// sarebbe successo". KAI RULED (2026-09-28, job #572·I): the seed stays; the LEGOs are re-cut.
//
// THE DEFECT: L01 "wanted → volevamo" (the English lacked its pronoun), L02 "what was going to →
// che cosa sarebbe" (a fragment on both sides), L03 "happen → successo" (WRONG: successo is
// "happened"). L02's phrases practised "what was going to be different → che cosa sarebbe diverso"
// etc., which after a past frame is also wrong Italian (it must be "sarebbe stato diverso").
//
// THE CUT (every slot re-textured IN PLACE — never delete a LEGO; the phrases→legos FK is not
// deferrable so slot numbers cannot move under live phrases):
//   L01  we wanted → volevamo                 NOT NEW: S0054L01 already teaches exactly this pair
//                                             on both sides (a LEGO is a duplicate only if BOTH
//                                             sides match — Kai, 2026-09-23). Phrases stay as
//                                             practice; B01 gains its pronoun so every row
//                                             contains the LEGO.
//   L02  to know → sapere                     NOT NEW: S0045L02 teaches it. Every phrase under
//                                             the slot is rewritten to practise "to know / sapere"
//                                             with words taught by seed 201 (checked live); no
//                                             "sarebbe X" row survives.
//   L03  what was going to happen → che cosa sarebbe successo   NEW; components "what → che
//                                             cosa" + "was going to happen → sarebbe successo"
//                                             tile it on both sides. Rows that already contained
//                                             the LEGO under a past frame are kept; the three
//                                             that did not are rewritten with a past frame.
// Kai's rule (canon, 2026-09-28): "would / was going to" after a past frame = conditional
// perfect; standalone = conditional simple. Every L03 phrase therefore carries a past frame.
//
// INTROS. A not-new LEGO carries no introduction in this course (S0519L04 "yet → ancora", re-cut
// today under Kai's design, is the precedent: is_new=false, presentation NULL, old clip detached
// and kept). So L01's old-template clip and L02's heads-up clip from job #546·I are DETACHED (kept,
// logged in content_audio_link_drops) and L02's human-authored mark is retired (its full row goes
// into the edit event). L03 gets Kai's template — "The Italian for '<LEGO>' in phrases like
// '<example>' is:" — MARKED human-authored through services/shared/human-authored-presentations.cjs
// before the clip is written (the DB trigger enforces that order), rendered on the temporary Azure
// Sonia presentation route (#557·I / #559·I), cast restored byte-identical in a finally block.
//
// AUDIO. Italian on the course cast, Azure Elsa (target1) / Benigno (target2), through the one
// TTS door with the spend guard and the cast gate in the way; an existing clip in the right voice
// is linked, never re-rendered. English prompts are NOT rendered here: the silent known slots are
// printed for ita-sonia-temporary-fill-2026-09-28.cjs SCOPE=ids (every Sonia clip is on the
// Charlotte re-voice list by construction — ita-intro-mirror-fix --revoice-list reads it live).
// Make-before-break: nothing is deleted.
//
//   node tools/course-optimization/ita-seed-201-recut-2026-09-28.cjs            # dry run: guards + plan
//   APPLY=1 node tools/course-optimization/ita-seed-201-recut-2026-09-28.cjs    # write content, Italian audio, L03 intro
//   AUDIO_ONLY=1 APPLY=1 node …                                                 # re-run the audio + intro fill only
//   then: SCOPE=ids IDS=<printed> APPLY=1 node tools/course-optimization/ita-sonia-temporary-fill-2026-09-28.cjs
//   then: node tools/course-optimization/audit-phrase-zut.cjs ita_for_eng ; node tools/check-intro-mirror.cjs ita_for_eng --strict

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'ita_for_eng';
const SEED = 201;
const SWEEP = 'ita-seed-201-recut-2026-09-28';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const JOB = '#572·I';
const RULING = 'Kai, 2026-09-28 (job #572·I): seed 201 re-cut — "we wanted → volevamo" (not new, S0054L01), "to know → sapere" (not new, S0045L02), "what was going to happen → che cosa sarebbe successo" (new); "happen → successo" was wrong (successo = happened); would/was going to after a past frame = conditional perfect';
const AUTHOR = 'Kai (template, 2026-09-28) — line written by job #572·I';

const SEED_TEXT = { known: 'we wanted to know what was going to happen', target: 'volevamo sapere che cosa sarebbe successo' };
const ELSA = { voiceId: 'azure_it-IT-ElsaNeural', voiceName: 'it-IT-ElsaNeural' };
const BENIGNO = { voiceId: 'azure_it-IT-BenignoNeural', voiceName: 'it-IT-BenignoNeural' };
const AZURE_VOICE_IDS = { target1: ['azure_it-IT-ElsaNeural', 'it-IT-ElsaNeural'], target2: ['azure_it-IT-BenignoNeural', 'it-IT-BenignoNeural'] };
const SONIA = { voiceId: 'azure_en-GB-SoniaNeural', castVoiceId: 'en-GB-SoniaNeural', voiceName: 'en-GB-SoniaNeural' };
const SONIA_IDS = ['azure_en-GB-SoniaNeural', 'en-GB-SoniaNeural'];
const TEMP_PRES_ROW = { slot: 'presentation', language: 'eng', gender: 'f', rank: 1, voice_id: SONIA.castVoiceId };

// ── The picture this tool was written against (live 2026-09-28 18:00Z) ─────────────────
const OLD = {
  legos: [
    { idx: 1, type: 'A', is_new: true, known: 'wanted', target: 'volevamo', components: null, intro: 'ccb48997-2601-4240-af98-600b79a628a5' },
    { idx: 2, type: 'M', is_new: true, known: 'what was going to', target: 'che cosa sarebbe', components: [{ known: 'what was going to', target: 'che cosa sarebbe' }], intro: '5759c575-1502-4fdc-b4b9-844528ae4c35' },
    { idx: 3, type: 'A', is_new: true, known: 'happen', target: 'successo', components: null, intro: '8c68883b-f96f-41a1-9710-d5bd5589f9b1' },
  ],
  phrases: [
    { id: 'S0201L01B01', known: 'wanted', target: 'volevamo' },
    { id: 'S0201L01B02', known: 'we wanted', target: 'volevamo' },
    { id: 'S0201L01B03', known: 'we wanted to know', target: 'volevamo sapere' },
    { id: 'S0201L01U01', known: 'we wanted to understand the idea', target: "volevamo capire l'idea" },
    { id: 'S0201L01U02', known: 'we wanted to see the book', target: 'volevamo vedere il libro' },
    { id: 'S0201L01U03', known: 'we wanted to do it this morning', target: 'volevamo farlo stamattina' },
    { id: 'S0201L01U04', known: 'we wanted to be at home today', target: 'volevamo essere a casa oggi' },
    { id: 'S0201L01U05', known: 'we wanted to learn Italian', target: "volevamo imparare l'italiano" },
    { id: 'S0201L01U06', known: 'we wanted to help you with the work', target: 'volevamo aiutarti con il lavoro' },
    { id: 'S0201L01U07', known: 'we wanted to talk to you about that', target: 'volevamo parlare con te di quello' },
    { id: 'S0201L01U08', known: 'we wanted to meet you at the restaurant', target: 'volevamo incontrarti al ristorante' },
    { id: 'S0201L01U09', known: 'we wanted to finish that before tomorrow', target: 'volevamo finire quello prima di domani' },
    { id: 'S0201L02B01', known: 'what was going to', target: 'che cosa sarebbe' },
    { id: 'S0201L02B02', known: 'what was going to', target: 'che cosa sarebbe' },
    { id: 'S0201L02B03', known: 'what was going to be', target: 'che cosa sarebbe' },
    { id: 'S0201L02B04', known: 'know what was going to', target: 'sapere che cosa sarebbe' },
    { id: 'S0201L02U01', known: 'what was going to be different?', target: 'che cosa sarebbe diverso?' },
    { id: 'S0201L02U02', known: 'what was going to be easier for you?', target: 'che cosa sarebbe più facile per te?' },
    { id: 'S0201L02U03', known: 'she wanted to know what was going to be better', target: 'voleva sapere che cosa sarebbe meglio' },
    { id: 'S0201L02U06', known: 'I wanted to know what was going to be the best thing', target: 'volevo sapere che cosa sarebbe la cosa migliore' },
    { id: 'S0201L02U07', known: 'we talked about what was going to be a problem', target: 'abbiamo parlato di che cosa sarebbe un problema' },
    { id: 'S0201L02U08', known: 'I wanted to understand what was going to be the best way', target: 'volevo capire che cosa sarebbe il modo migliore' },
    { id: 'S0201L02U09', known: "it wasn't easy to know what was going to be important", target: 'non era facile sapere che cosa sarebbe importante' },
    { id: 'S0201L03B01', known: 'happen', target: 'successo' },
    { id: 'S0201L03B02', known: 'going to happen', target: 'sarebbe successo' },
    { id: 'S0201L03B03', known: 'was going to happen', target: 'sarebbe successo' },
    { id: 'S0201L03U01', known: 'what was going to happen next?', target: 'che cosa sarebbe successo dopo?' },
    { id: 'S0201L03U02', known: 'nothing was going to happen that day', target: 'niente sarebbe successo quel giorno' },
    { id: 'S0201L03U03', known: 'something was going to happen that day', target: 'qualcosa sarebbe successo quel giorno' },
    { id: 'S0201L03U04', known: 'I wanted to know what was going to happen', target: 'volevo sapere che cosa sarebbe successo' },
    { id: 'S0201L03U05', known: 'she wanted to know what was going to happen', target: 'voleva sapere che cosa sarebbe successo' },
    { id: 'S0201L03U06', known: 'we wanted to understand what was going to happen', target: 'volevamo capire che cosa sarebbe successo' },
    { id: 'S0201L03U07', known: "it wasn't easy to understand what was going to happen", target: 'non era facile capire che cosa sarebbe successo' },
    { id: 'S0201L03U10', known: "I think it wasn't easy to know what was going to happen", target: 'penso che non fosse facile sapere che cosa sarebbe successo' },
  ],
};

// ── The new cut ─────────────────────────────────────────────────────────────────────────
const NEW_LEGOS = [
  { idx: 1, type: 'A', is_new: false, known: 'we wanted', target: 'volevamo', components: [], taughtBy: 'S0054L01' },
  { idx: 2, type: 'A', is_new: false, known: 'to know', target: 'sapere', components: [], taughtBy: 'S0045L02' },
  { idx: 3, type: 'M', is_new: true, known: 'what was going to happen', target: 'che cosa sarebbe successo',
    components: [{ known: 'what', target: 'che cosa' }, { known: 'was going to happen', target: 'sarebbe successo' }] },
];
/** L03's intro, in Kai's template. The example is short, carries a past frame ("wanted to know"),
 *  contains the LEGO English, uses only words taught by seed 201, and is not the seed verbatim. */
const L03_EXAMPLE = 'I wanted to know what was going to happen';
const L03_INTRO = `The Italian for '${NEW_LEGOS[2].known}' in phrases like '${L03_EXAMPLE}' is:`;
/** New component rows under L03 (positions 1 and 2; every existing L03 row shifts by +2). */
const NEW_COMPONENTS = [
  { id: 'S0201L03C01', position: 1, known: 'what', target: 'che cosa', component_index: 0 },
  { id: 'S0201L03C02', position: 2, known: 'was going to happen', target: 'sarebbe successo', component_index: 1 },
];

/** Every phrase row after the cut, by its EXISTING id (rows keep id and position; text moves). */
const PHRASES = [
  // L01 we wanted → volevamo: B01 gains its pronoun; B02 no longer duplicates B01
  { id: 'S0201L01B01', known: 'we wanted', target: 'volevamo' },
  { id: 'S0201L01B02', known: 'we wanted to see', target: 'volevamo vedere' },
  { id: 'S0201L01B03', known: 'we wanted to know', target: 'volevamo sapere' },
  ...['U01', 'U02', 'U03', 'U04', 'U05', 'U06', 'U07', 'U08', 'U09'].map(s => ({ id: `S0201L01${s}` })),
  // L02 to know → sapere: every row rewritten; no "sarebbe X" survives
  { id: 'S0201L02B01', known: 'to know', target: 'sapere' },
  { id: 'S0201L02B02', known: 'we wanted to know', target: 'volevamo sapere' },
  { id: 'S0201L02B03', known: 'we wanted to know if', target: 'volevamo sapere se' },
  { id: 'S0201L02B04', known: 'we wanted to know why', target: 'volevamo sapere perché' },
  { id: 'S0201L02U01', known: 'I wanted to know why', target: 'volevo sapere perché' },
  { id: 'S0201L02U02', known: 'we wanted to know if it was easy', target: 'volevamo sapere se era facile' },
  { id: 'S0201L02U03', known: 'she wanted to know what you said', target: 'voleva sapere quello che hai detto' },
  { id: 'S0201L02U06', known: 'we wanted to know what to do', target: 'volevamo sapere che cosa fare' },
  { id: 'S0201L02U07', known: "it wasn't easy to know", target: 'non era facile sapere' },
  { id: 'S0201L02U08', known: 'I wanted to know everything', target: 'volevo sapere tutto' },
  { id: 'S0201L02U09', known: "it's important to know", target: 'è importante sapere' },
  // L03 what was going to happen → che cosa sarebbe successo: builds reach the seed; every row has a past frame
  { id: 'S0201L03B01', known: 'what was going to happen', target: 'che cosa sarebbe successo' },
  { id: 'S0201L03B02', known: 'to know what was going to happen', target: 'sapere che cosa sarebbe successo' },
  { id: 'S0201L03B03', known: 'we wanted to know what was going to happen', target: 'volevamo sapere che cosa sarebbe successo' },
  { id: 'S0201L03U01', known: 'I wanted to know what was going to happen next', target: 'volevo sapere che cosa sarebbe successo dopo' },
  { id: 'S0201L03U02', known: 'we wanted to see what was going to happen', target: 'volevamo vedere che cosa sarebbe successo' },
  { id: 'S0201L03U03', known: 'she wanted to see what was going to happen that day', target: 'voleva vedere che cosa sarebbe successo quel giorno' },
  ...['U04', 'U05', 'U06', 'U07', 'U10'].map(s => ({ id: `S0201L03${s}` })),
];

// ── The rules, as code ──────────────────────────────────────────────────────────────────
const norm = (s) => String(s || '').toLowerCase().replace(/’/g, "'").replace(/[.,!?;:"«»]+/g, ' ').replace(/\s+/g, ' ').trim();
const squash = (s) => norm(s).replace(/\s+/g, '');
const idParts = (id) => ({ seed: Number(id.slice(1, 5)), idx: Number(id.slice(6, 8)), role: { B: 'build', U: 'use', C: 'component' }[id[8]], n: Number(id.slice(9)) });

/** Resolve every phrase row to full text (inheriting from the OLD row where unchanged). */
function resolvedPhrases() {
  const old = Object.fromEntries(OLD.phrases.map(p => [p.id, p]));
  return PHRASES.map(p => {
    const src = old[p.id];
    if (!src) throw new Error(`${p.id}: not in the OLD picture`);
    const known = p.known ?? src.known, target = p.target ?? src.target;
    return { ...p, ...idParts(p.id), known, target, before: src, knownChanged: src.known !== known, targetChanged: src.target !== target };
  });
}
/** Both sides of a phrase carry both sides of its LEGO, as a contiguous span. */
function phraseContainsLego(lego, phrase) {
  return ` ${norm(phrase.target)} `.includes(` ${norm(lego.target)} `) && ` ${norm(phrase.known)} `.includes(` ${norm(lego.known)} `);
}
/** The three LEGOs, in order, ARE the seed on both sides. */
const legosTileSeed = (legos, seed) => squash(legos.map(l => l.target).join(' ')) === squash(seed.target) && squash(legos.map(l => l.known).join(' ')) === squash(seed.known);
/** A LEGO's components tile it on both sides (a LEGO with no components tiles trivially). */
const componentsTile = (l) => !l.components.length || (squash(l.components.map(c => c.target).join(' ')) === squash(l.target) && squash(l.components.map(c => c.known).join(' ')) === squash(l.known));
/** Kai's rule: the conditional perfect "sarebbe successo" only ever sits under a past frame. USE phrases
 *  replay cold and must carry the frame themselves; BUILD rows are the staged fragments (bare LEGO,
 *  then "to know …", then the seed) and are played once in context, so the fragments are exempt. */
const PAST_FRAME = /\b(volevo|volevamo|voleva|volevi|volevate|volevano|era|ero|eravamo|fosse|sapevo|sapeva|sapevamo|pensavo|pensava|ha detto|hanno detto|avevo|aveva)\b/;
const pastFrameRule = (phrases) => phrases.filter(p => p.role === 'use' && /\bsarebbe\b/.test(norm(p.target)) && !PAST_FRAME.test(norm(p.target))).map(p => `${p.id} "${p.target}" carries sarebbe with no past frame`);
/** No "sarebbe <adjective/noun>" (the wrong simple conditional after a past frame) survives anywhere in the seed. */
const noWrongSarebbe = (phrases) => phrases.filter(p => /\bsarebbe\b(?!\s+(successo|stato|stata))/.test(norm(p.target))).map(p => `${p.id} "${p.target}" keeps a wrong "sarebbe X"`);
/** L03 build phrases reach the full seed. */
const buildsUpToSeed = (phrases) => phrases.some(p => p.idx === 3 && p.role === 'build' && norm(p.known) === norm(SEED_TEXT.known) && norm(p.target) === norm(SEED_TEXT.target));
/** Kai's template line rules (job #546·I): quotes the LEGO, example contains it, past frame, no brackets, no grammar terms, short. */
function introRules(lego, example, text) {
  const p = [];
  if (!` ${norm(example)} `.includes(` ${norm(lego.known)} `)) p.push('example does not contain the LEGO English');
  if (!text.includes(`'${lego.known}'`)) p.push('line does not quote the LEGO English (mirror)');
  if (!/\b(wanted to know|said|thought|knew|told)\b/i.test(example)) p.push('example has no past frame');
  if (/[()\[\]]/.test(text)) p.push('brackets');
  if (/\b(conditional|perfect|tense|subjunctive|clause|verb)\b/i.test(text)) p.push('grammar term');
  if (example.split(/\s+/).length > 10) p.push('example too long');
  if (norm(example) === norm(SEED_TEXT.known)) p.push('example is the seed verbatim');
  return p;
}

function checkOffline() {
  const phrases = resolvedPhrases();
  const problems = [];
  if (!legosTileSeed(NEW_LEGOS, SEED_TEXT)) problems.push('LEGOs do not tile the seed');
  for (const l of NEW_LEGOS) if (!componentsTile(l)) problems.push(`L0${l.idx} components do not tile the LEGO`);
  for (const p of phrases) {
    const lego = NEW_LEGOS.find(l => l.idx === p.idx);
    if (!phraseContainsLego(lego, p)) problems.push(`${p.id} "${p.known}" → "${p.target}" does not contain LEGO ${lego.idx} "${lego.known}" → "${lego.target}" on both sides`);
  }
  problems.push(...pastFrameRule(phrases), ...noWrongSarebbe(phrases));
  if (!buildsUpToSeed(phrases)) problems.push('L03 build phrases do not reach the full seed');
  const ids = phrases.map(p => p.id);
  if (new Set(ids).size !== ids.length) problems.push('duplicate phrase ids');
  const missing = OLD.phrases.filter(o => !ids.includes(o.id));
  if (missing.length) problems.push(`old rows not carried forward: ${missing.map(o => o.id).join(', ')}`);
  problems.push(...introRules(NEW_LEGOS[2], L03_EXAMPLE, L03_INTRO).map(x => `L03 intro: ${x}`));
  return { problems, phrases };
}

// ── Live ────────────────────────────────────────────────────────────────────────────────
async function newVocabulary(pg, seed, text, side) {
  const col = side === 'known' ? 'known_text' : 'target_text';
  const out = [];
  for (const w of new Set(norm(text).split(' ').filter(Boolean))) {
    const { rows } = await pg.query(
      `SELECT 1 FROM (SELECT seed_number, ${col} AS t FROM course_practice_phrases WHERE course_code=$1 UNION ALL SELECT seed_number, ${col} FROM course_legos WHERE course_code=$1 UNION ALL SELECT seed_number, ${col} FROM course_seeds WHERE course_code=$1) x
       WHERE seed_number <= $2 AND ' '||regexp_replace(lower(replace(t,'’','''')), '[.,!?;:"]', ' ', 'g')||' ' LIKE '% '||$3||' %' LIMIT 1`, [COURSE, seed, w]);
    if (!rows.length) out.push(w);
  }
  return out;
}
async function guardLive(pg) {
  const problems = [];
  const { rows: [seed] } = await pg.query('SELECT known_text, target_text FROM course_seeds WHERE course_code=$1 AND seed_number=$2', [COURSE, SEED]);
  if (!seed || seed.known_text !== SEED_TEXT.known || seed.target_text !== SEED_TEXT.target) problems.push(`seed reads "${seed?.known_text}" → "${seed?.target_text}"`);
  const { rows: legos } = await pg.query('SELECT * FROM course_legos WHERE course_code=$1 AND seed_number=$2 ORDER BY lego_index', [COURSE, SEED]);
  const live = legos.map(l => `${l.lego_index}|${l.type}|${l.is_new}|${l.known_text}|${l.target_text}|${JSON.stringify(l.components)}|${l.presentation_audio_id}`).join('\n');
  const want = OLD.legos.map(l => `${l.idx}|${l.type}|${l.is_new}|${l.known}|${l.target}|${JSON.stringify(l.components)}|${l.intro}`).join('\n');
  if (live !== want) problems.push(`LEGOs are not the picture this tool was written against:\n${live}`);
  const { rows: phrases } = await pg.query('SELECT * FROM course_practice_phrases WHERE course_code=$1 AND seed_number=$2 ORDER BY lego_index, position', [COURSE, SEED]);
  const liveP = phrases.map(p => `${p.id.split(':')[1]}|${p.known_text}|${p.target_text}`).sort().join('\n');
  const wantP = OLD.phrases.map(p => `${p.id}|${p.known}|${p.target}`).sort().join('\n');
  if (liveP !== wantP) problems.push(`phrases are not the picture this tool was written against:\n${liveP}`);
  for (const c of NEW_COMPONENTS) if (phrases.some(p => p.id === `${COURSE}:${c.id}`)) problems.push(`${c.id} already exists`);
  // the two earlier LEGOs that make L01 / L02 not-new must still read as they did
  for (const l of NEW_LEGOS.filter(l => l.taughtBy)) {
    const { rows: [e] } = await pg.query('SELECT known_text, target_text FROM course_legos WHERE course_code=$1 AND lego_id=$2', [COURSE, l.taughtBy]);
    if (!e || norm(e.known_text) !== norm(l.known) || norm(e.target_text) !== norm(l.target)) problems.push(`${l.taughtBy} reads "${e?.known_text}" → "${e?.target_text}", so L0${l.idx} "${l.known}" → "${l.target}" is not a duplicate of it`);
  }
  // the marks job #546·I left on L02 / L03
  const { rows: marks } = await pg.query('SELECT * FROM human_authored_presentations WHERE course_code=$1 AND lego_id = ANY($2)', [COURSE, ['S0201L01', 'S0201L02', 'S0201L03']]);
  const markIds = marks.map(m => m.lego_id).sort().join(',');
  if (markIds !== 'S0201L02,S0201L03') problems.push(`human-authored marks on seed 201 are ${markIds || '(none)'}, expected S0201L02,S0201L03`);
  // concurrency: another surface on these rows in the last 12 hours (job #546·I's heads-up pass is the state this builds on)
  const { rows: ev } = await pg.query(`SELECT id, surface, operation FROM content_edit_events WHERE course_code=$1 AND occurred_at > now() - interval '12 hours' AND surface NOT LIKE '%' || $2 || '%' AND (scope->'seed_numbers' ? $3 OR scope->'lego_ids' ?| $4::text[])`,
    [COURSE, SWEEP, String(SEED), ['S0201L01', 'S0201L02', 'S0201L03']]);
  for (const e of ev) {
    if (e.surface.includes('ita-heads-up-intros')) continue;
    problems.push(`another surface touched seed ${SEED} today: ${e.surface} ${e.operation} (${e.id})`);
  }
  return { problems, legos, phrases, marks };
}

/** Every new pair vs the course: the live gate's rule is known → one target (component rows exempt
 *  on the known side). Same target under a different English is NOT a defect (Kai) — listed only. */
async function zutAgainstCourse(pg, phrases) {
  const pairs = [...NEW_LEGOS.map(l => ({ id: `S0201L0${l.idx}`, known: l.known, target: l.target })), ...phrases.map(p => ({ id: p.id, known: p.known, target: p.target })), ...NEW_COMPONENTS.map(c => ({ id: c.id, known: c.known, target: c.target, component: true }))];
  const clashes = [], targetSide = [];
  for (const p of pairs) {
    if (p.component) continue;
    const { rows } = await pg.query(
      `SELECT id, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND seed_number<>$2 AND phrase_role<>'component' AND (lower(trim(known_text))=lower($3) OR lower(trim(target_text))=lower($4))
       UNION ALL SELECT lego_id, known_text, target_text FROM course_legos WHERE course_code=$1 AND seed_number<>$2 AND (lower(trim(known_text))=lower($3) OR lower(trim(target_text))=lower($4))`,
      [COURSE, SEED, p.known, p.target]);
    for (const r of rows) {
      const sameK = norm(r.known_text) === norm(p.known), sameT = norm(r.target_text) === norm(p.target);
      if (sameK && !sameT) clashes.push(`${p.id} "${p.known}" → "${p.target}" vs ${r.id} "${r.known_text}" → "${r.target_text}"`);
      else if (sameT && !sameK) targetSide.push(`${p.id} "${p.known}" → "${p.target}" shares its Italian with ${r.id} "${r.known_text}"`);
    }
  }
  return { clashes, targetSide: [...new Set(targetSide)] };
}

/** Anything OUTSIDE seed 201 that leaned on the old LEGO pairs: the old English chunks "what was going
 *  to" / bare "happen → successo" — their Italian ("che cosa sarebbe …", "successo") stays taught by
 *  the new L03, so this is a census, not a gate. */
async function downstream(pg) {
  const { rows } = await pg.query(
    `SELECT split_part(id,':',2) id, seed_number, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND seed_number<>$2 AND (target_text ILIKE '%che cosa sarebbe%' OR known_text ILIKE '%what was going to%' OR (known_text ~* '\\mhappen\\M' AND target_text ~* '\\msuccesso\\M'))
     UNION ALL SELECT lego_id, seed_number, known_text, target_text FROM course_legos WHERE course_code=$1 AND seed_number<>$2 AND (target_text ILIKE '%che cosa sarebbe%' OR known_text ILIKE '%what was going to%' OR (known_text ~* '\\mhappen\\M' AND target_text ~* '\\msuccesso\\M'))
     UNION ALL SELECT seed_number::text, seed_number, known_text, target_text FROM course_seeds WHERE course_code=$1 AND seed_number<>$2 AND (target_text ILIKE '%che cosa sarebbe%' OR known_text ILIKE '%what was going to%')
     ORDER BY 2, 1`, [COURSE, SEED]);
  return rows;
}

// ── Apply ───────────────────────────────────────────────────────────────────────────────
async function applyContent(pg, supabase, liveLegos, livePhrases, marks, phrases, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const oldL = Object.fromEntries(liveLegos.map(l => [l.lego_index, l]));
  const oldP = Object.fromEntries(livePhrases.map(p => [p.id.split(':')[1], p]));
  const mark02 = marks.find(m => m.lego_id === 'S0201L02');
  const changed = phrases.filter(p => p.knownChanged || p.targetChanged);

  const legoEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'lego-recut',
    scope: { seed_numbers: [SEED], lego_ids: NEW_LEGOS.map(l => `S0201L0${l.idx}`), rows: 3 },
    detail: { ruling: RULING, job: JOB, from: OLD.legos, to: NEW_LEGOS, newComponentRows: NEW_COMPONENTS,
      intros: { S0201L01: { from: OLD.legos[0].intro, to: null, why: 'not new (S0054L01) — no intro, clip detached and kept' }, S0201L02: { from: OLD.legos[1].intro, to: null, why: 'not new (S0045L02) — no intro, heads-up clip detached and kept; human-authored mark retired', retiredMark: mark02 }, S0201L03: { from: OLD.legos[2].intro, to: L03_INTRO, why: 'Kai\'s template, marked human-authored' } } } });
  const phraseEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-edit',
    scope: { seed_numbers: [SEED], phrase_ids: changed.map(p => `${COURSE}:${p.id}`), rows: changed.length },
    detail: { ruling: RULING, job: JOB, changes: changed.map(p => ({ id: `${COURSE}:${p.id}`, known_from: p.before.known, target_from: p.before.target, known_to: p.known, target_to: p.target })), inserted: NEW_COMPONENTS } });
  const seedEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'unapprove',
    scope: { seed_numbers: [SEED], rows: 1 }, detail: { why: 'seed 201 re-cut under Kai\'s ruling; needs his read', job: JOB } });
  log.events = { legoEvent, phraseEvent, seedEvent };

  await pg.query('BEGIN');
  try {
    // 1. LEGO slots re-textured in place. Links are set EXPLICITLY in the same UPDATE so the
    //    text-change trigger respects them: a side whose words did not move keeps its clips.
    for (const l of NEW_LEGOS) {
      const src = oldL[l.idx];
      const targetSame = norm(src.target_text) === norm(l.target), knownSame = norm(src.known_text) === norm(l.known);
      const r = await pg.query(
        `UPDATE course_legos SET type=$1, is_new=$2, known_text=$3, target_text=$4, components=$5, known_audio_id=$6, target1_audio_id=$7, target2_audio_id=$8, presentation_audio_id=NULL, target1_duration_ms=$9, target2_duration_ms=$10, last_edit_event_id=$11, updated_at=now()
          WHERE course_code=$12 AND seed_number=$13 AND lego_index=$14`,
        [l.type, l.is_new, l.known, l.target, JSON.stringify(l.components), knownSame ? src.known_audio_id : null, targetSame ? src.target1_audio_id : null, targetSame ? src.target2_audio_id : null,
          targetSame ? src.target1_duration_ms : null, targetSame ? src.target2_duration_ms : null, legoEvent, COURSE, SEED, l.idx]);
      if (r.rowCount !== 1) throw new Error(`lego slot ${l.idx}: ${r.rowCount} rows`);
      // the old intro clip is detached (kept, never deleted) and the drop logged
      await pg.query('UPDATE course_audio SET lego_id=NULL WHERE id::text=$1 AND lego_id=$2', [src.presentation_audio_id, `S0201L0${l.idx}`]);
      await pg.query('UPDATE lego_introductions SET presentation_audio_id=NULL, audio_uuid=NULL, updated_at=now() WHERE course_code=$1 AND lego_id=$2', [COURSE, `S0201L0${l.idx}`]);
      const { rows: [oldClip] } = await pg.query('SELECT text, voice_id FROM course_audio WHERE id::text=$1', [src.presentation_audio_id]);
      await pg.query(`INSERT INTO content_audio_link_drops (table_name, row_id, course_code, seed_number, column_name, role, old_audio_id, old_text, old_voice_id, new_text, reason) VALUES ('course_legos',$1,$2,$3,'presentation_audio_id','presentation',$4,$5,$6,$7,$8)`,
        [`S0201L0${l.idx}`, COURSE, SEED, src.presentation_audio_id, oldClip?.text || null, oldClip?.voice_id || null, l.idx === 3 ? L03_INTRO : null,
          `${SWEEP}: LEGO re-cut (job ${JOB}, event ${legoEvent}); ${l.is_new ? 'intro re-authored in Kai\'s template' : `not new (${l.taughtBy}) — carries no intro`}; clip detached, asset kept`]);
    }
    // 2. L02's human-authored mark is retired: the LEGO it guarded no longer exists (full row is in the edit event).
    if (mark02) await pg.query('DELETE FROM human_authored_presentations WHERE course_code=$1 AND lego_id=$2', [COURSE, 'S0201L02']);
    // 3. L03 rows shift +2 (descending) to make room for the two component rows at positions 1 and 2.
    const { rows: l3 } = await pg.query('SELECT position FROM course_practice_phrases WHERE course_code=$1 AND seed_number=$2 AND lego_index=3 ORDER BY position DESC', [COURSE, SEED]);
    for (const { position } of l3) await pg.query('UPDATE course_practice_phrases SET position=$1 WHERE course_code=$2 AND seed_number=$3 AND lego_index=3 AND position=$4', [position + 2, COURSE, SEED, position]);
    for (const c of NEW_COMPONENTS) {
      await pg.query(`INSERT INTO course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count, metadata, status, phrase_role, connected_lego_ids, lego_position, lego_id, introduce, last_edit_event_id)
        VALUES ($1,$2,$3,3,$4,$5,$6,$7,$8,$9,'draft','component','{}','middle','S0201L03',true,$10)`,
        [`${COURSE}:${c.id}`, COURSE, SEED, c.position, c.known, c.target, c.target.length, c.target.split(/\s+/).length, JSON.stringify({ buildup: 'component', component_index: c.component_index }), phraseEvent]);
    }
    // 4. Phrase rows re-textured in place; a side whose words did not move keeps its clip.
    for (const p of changed) {
      const src = oldP[p.id];
      const r = await pg.query(
        `UPDATE course_practice_phrases SET known_text=$1, target_text=$2, known_audio_id=$3, target1_audio_id=$4, target2_audio_id=$5, word_count=$6, lego_count=$7,
           qa_checked=NULL, decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL, last_edit_event_id=$8, updated_at=now()
         WHERE course_code=$9 AND id=$10 AND known_text=$11 AND target_text=$12`,
        [p.known, p.target, p.knownChanged ? null : src.known_audio_id, p.targetChanged ? null : src.target1_audio_id, p.targetChanged ? null : src.target2_audio_id,
          p.target.length, p.target.split(/\s+/).length, phraseEvent, COURSE, `${COURSE}:${p.id}`, p.before.known, p.before.target]);
      if (r.rowCount !== 1) throw new Error(`${p.id}: ${r.rowCount} rows`);
    }
    // 5. The seed loses its approval.
    const s = await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number=$3', [seedEvent, COURSE, SEED]);
    if (s.rowCount !== 1) throw new Error('seed unapprove');
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  await refreshNow();
  const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs');
  log.audioPass = await queueAudioPass(supabase, { courseCode: COURSE, requestedBy: `@${SWEEP}`, reason: `job ${JOB}: seed 201 re-cut; Italian rendered on Elsa/Benigno by the tool, English prompts on temporary Sonia (ita-sonia-temporary-fill SCOPE=ids), L03 intro on Sonia`, metadata: { job: JOB, seeds: [SEED], rows: changed.length + NEW_COMPONENTS.length } });
}

// ── Audio ───────────────────────────────────────────────────────────────────────────────
function ttsDeps() {
  process.env.PHASE8_NO_LISTEN = '1';
  return {
    phase8: require('../../services/phases/phase8-audio-v13.cjs'), ttsService: require('../../services/tts-service.cjs'), veracity: require('../../services/audio-veracity.cjs'),
    voiceConfigService: require('../../services/voice-config-service.cjs'), writeOrSwapClip: require('../../services/shared/audio-revision-swap.cjs').writeOrSwapClip,
    normalizeForAudio: require('../../services/shared/text-normalize.cjs').normalizeForAudio, S3: require('@aws-sdk/client-s3'), uuidv4: require('uuid').v4,
  };
}
async function renderClip(supabase, { text, language, role, voice, voiceIds, intro }) {
  const d = ttsDeps();
  const s3 = new d.S3.S3Client({ region: process.env.AWS_REGION || 'eu-west-1' });
  const renderAndMaster = async () => {
    const out = await d.ttsService.generateWithRetry(text, 'azure', { door: { courseCode: COURSE, intro: !!intro, language, voiceBound: true }, subscriptionKey: process.env.AZURE_SPEECH_KEY, region: process.env.AZURE_SPEECH_REGION || 'westeurope', voiceName: voice.voiceName, speed: 1 });
    if (out.existingClip && !voiceIds.includes(out.existingClip.voice_id)) throw new Error(`door offered ${out.existingClip.voice_id}; ${voice.voiceName} only`);
    const { buffer, durationMs } = await d.phase8.masterAudio(out.audioBuffer, text, await d.voiceConfigService.masteringOptsFor(voice.voiceName, 'azure'));
    return { buffer, durationMs, wordBoundaries: out.wordBoundaries };
  };
  const gated = await d.veracity.renderChecked({ render: renderAndMaster, expectedText: text, language, sampler: d.veracity.ALWAYS_SAMPLER, logger: console, meta: { courseCode: COURSE, role, voiceId: voice.voiceName, originalText: text } });
  if (!gated.published) throw new Error(`veracity gate: quarantined after ${gated.attempts} attempts (${gated.verdict?.reason})`);
  const newAudioId = d.uuidv4().toUpperCase(), newS3Key = `mastered/${newAudioId}.mp3`;
  await s3.send(new d.S3.PutObjectCommand({ Bucket: d.phase8.S3_BUCKET, Key: newS3Key, Body: gated.buffer, ContentType: 'audio/mpeg', CacheControl: 'public, max-age=31536000, immutable' }));
  const verdictColumns = d.veracity.verdictColumns(gated.verdict, { checker: SWEEP, attempts: gated.attempts });
  const textNormalized = d.normalizeForAudio(text);
  const base = { course_code: COURSE, text, text_normalized: textNormalized, language, role, voice_id: voice.voiceId, origin: 'tts' };
  const out = await d.writeOrSwapClip({ supabase, identity: { course_code: COURSE, text_normalized: textNormalized, language, role, voice_id: voice.voiceId }, insertRow: { ...base, s3_key: newS3Key, duration_ms: gated.durationMs, word_boundaries: gated.wordBoundaries || null, ...verdictColumns }, swapPatch: { voice_id: voice.voiceId, origin: 'tts', word_boundaries: gated.wordBoundaries || null, text, ...verdictColumns }, newS3Key, durationMs: gated.durationMs, source: SWEEP, acceptedBy: `${SWEEP} (${role}, ${voice.voiceName})`, reason: RULING, logger: console });
  return { audioId: out.audioId, durationMs: gated.durationMs };
}
/** Every NULL Italian slot on seed 201: link an existing Elsa/Benigno clip, else render. */
async function fillItalian(pg, supabase, log) {
  const { rows } = await pg.query(
    `SELECT 'course_legos' AS tbl, lego_id AS id, target_text, target1_audio_id, target2_audio_id FROM course_legos WHERE course_code=$1 AND seed_number=$2
     UNION ALL SELECT 'course_practice_phrases', id, target_text, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND seed_number=$2 ORDER BY 2`, [COURSE, SEED]);
  const idCol = (tbl) => tbl === 'course_legos' ? 'lego_id' : 'id';
  for (const r of rows) for (const role of ['target1', 'target2']) {
    if (r[`${role}_audio_id`]) continue;
    const entry = { tbl: r.tbl, id: r.id, role, text: r.target_text }; log.audio.push(entry);
    const voice = role === 'target1' ? ELSA : BENIGNO;
    try {
      const { rows: have } = await pg.query(`SELECT id, voice_id FROM course_audio WHERE language='ita' AND text_normalized=normalize_text($1) AND s3_key IS NOT NULL AND s3_key NOT LIKE 'pending/%' AND voice_id = ANY($2) ORDER BY (course_code=$3) DESC, (role=$4) DESC, created_at DESC LIMIT 1`, [r.target_text, AZURE_VOICE_IDS[role], COURSE, role]);
      let audioId = have[0]?.id;
      if (audioId) entry.result = `linked existing ${have[0].voice_id} clip ${audioId}`;
      else { const out = await renderClip(supabase, { text: r.target_text, language: 'ita', role, voice, voiceIds: AZURE_VOICE_IDS[role] }); audioId = out.audioId; entry.result = `rendered ${voice.voiceName} clip ${audioId} (${out.durationMs} ms)`; }
      await pg.query(`UPDATE ${r.tbl} SET ${role}_audio_id=$1 WHERE course_code=$2 AND ${idCol(r.tbl)}=$3 AND target_text=$4 AND ${role}_audio_id IS NULL`, [audioId, COURSE, r.id, r.target_text]);
      const { rows: [now] } = await pg.query(`SELECT a.id, a.voice_id FROM ${r.tbl} x LEFT JOIN course_audio a ON a.id=x.${role}_audio_id WHERE x.course_code=$1 AND x.${idCol(r.tbl)}=$2`, [COURSE, r.id]);
      entry.linked = now?.id || null; entry.linkedVoice = now?.voice_id || null;
      if (!now?.id || !AZURE_VOICE_IDS[role].includes(now.voice_id)) entry.result += ` — SLOT NOT ON CAST VOICE (${now?.voice_id})`;
    } catch (e) { entry.result = `REFUSED/FAILED: ${e.message}`; }
  }
}
/** L03's intro: mark first (the trigger enforces it), then render on Sonia under a temporary presentation cast row, then link at all three places the learner path reads. */
async function fillIntro(pg, supabase, log) {
  const humanAuthored = require('../../services/shared/human-authored-presentations.cjs');
  const { rows: [l] } = await pg.query('SELECT * FROM course_legos WHERE course_code=$1 AND lego_id=$2', [COURSE, 'S0201L03']);
  if (norm(l.known_text) !== norm(NEW_LEGOS[2].known)) throw new Error('S0201L03 is not the new LEGO');
  if (l.presentation_audio_id) { log.intro = { skipped: `already linked ${l.presentation_audio_id}` }; return; }
  const mark = await humanAuthored.markHumanAuthored(supabase, { courseCode: COURSE, legoId: 'S0201L03', text: L03_INTRO, author: AUTHOR, authoredOn: '2026-09-28', source: `job ${JOB}`, lego: l, by: SWEEP, why: RULING });
  log.intro = { mark: mark.id, text: L03_INTRO };
  const castKey = (r) => `${r.slot}|${r.language}|${r.gender}|${r.rank}|${r.voice_id}|${r.notes ?? ''}|${r.assigned_by ?? ''}|${r.created_at?.toISOString?.() ?? r.created_at}|${r.updated_at?.toISOString?.() ?? r.updated_at}`;
  const engCast = async () => (await pg.query(`SELECT slot, language, gender, rank, voice_id, notes, assigned_by, created_at, updated_at FROM voice_language_roles WHERE language='eng' ORDER BY slot, gender, rank, voice_id`)).rows;
  const before = await engCast();
  let audioId = null, durationMs = null;
  const { rows: have } = await pg.query(`SELECT id, duration_ms FROM course_audio WHERE course_code=$1 AND language='eng' AND role='presentation' AND text_normalized=normalize_text($2) AND s3_key IS NOT NULL AND s3_key NOT LIKE 'pending/%' AND voice_id = ANY($3) ORDER BY created_at DESC LIMIT 1`, [COURSE, L03_INTRO, SONIA_IDS]);
  if (have[0]) { audioId = have[0].id; durationMs = have[0].duration_ms; log.intro.result = `linked existing Sonia intro clip ${audioId}`; }
  else {
    const { rows: theirs } = await pg.query(`SELECT assigned_by FROM voice_language_roles WHERE slot='presentation' AND language='eng' AND voice_id=$1`, [SONIA.castVoiceId]);
    const ownRow = !theirs.length;
    try {
      if (ownRow) await pg.query(`INSERT INTO voice_language_roles (slot, language, gender, rank, voice_id, notes, assigned_by) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [TEMP_PRES_ROW.slot, TEMP_PRES_ROW.language, TEMP_PRES_ROW.gender, TEMP_PRES_ROW.rank, TEMP_PRES_ROW.voice_id, `TEMPORARY — ${RULING}. Removed by the same run.`, SWEEP]);
      const out = await renderClip(supabase, { text: L03_INTRO, language: 'eng', role: 'presentation', voice: SONIA, voiceIds: SONIA_IDS, intro: true });
      audioId = out.audioId; durationMs = out.durationMs; log.intro.result = `rendered Sonia intro clip ${audioId} (${durationMs} ms)`; log.intro.castRow = ownRow ? 'own temporary row' : `rode ${theirs[0].assigned_by}'s temporary row`;
    } finally {
      if (ownRow) await pg.query(`DELETE FROM voice_language_roles WHERE slot=$1 AND language=$2 AND gender=$3 AND rank=$4 AND voice_id=$5 AND assigned_by=$6`, [TEMP_PRES_ROW.slot, TEMP_PRES_ROW.language, TEMP_PRES_ROW.gender, TEMP_PRES_ROW.rank, TEMP_PRES_ROW.voice_id, SWEEP]);
      const after = await engCast();
      log.castRestored = before.length === after.length && before.every((r, i) => castKey(r) === castKey(after[i]));
      if (ownRow && !log.castRestored) throw new Error('eng cast NOT byte-identical after the temporary Sonia presentation row was removed');
    }
  }
  await pg.query('UPDATE course_legos SET presentation_audio_id=$1, last_edit_event_id=COALESCE($2, last_edit_event_id) WHERE course_code=$3 AND lego_id=$4 AND presentation_audio_id IS NULL', [audioId, log.events?.legoEvent || null, COURSE, 'S0201L03']);
  await pg.query(`INSERT INTO lego_introductions (course_code, lego_id, presentation_audio_id, audio_uuid, duration_ms, updated_at) VALUES ($1,$2,$3,$3,$4,now()) ON CONFLICT (course_code, lego_id) DO UPDATE SET presentation_audio_id=EXCLUDED.presentation_audio_id, audio_uuid=EXCLUDED.audio_uuid, duration_ms=COALESCE(EXCLUDED.duration_ms, lego_introductions.duration_ms), updated_at=now()`, [COURSE, 'S0201L03', audioId, durationMs]);
  await pg.query('UPDATE course_audio SET lego_id=$1 WHERE id=$2 AND (lego_id IS NULL OR lego_id<>$1)', ['S0201L03', audioId]);
  log.intro.audioId = audioId;
}
/** Every slot on seed 201 after the fill, with the voice it holds: the phrase trigger re-links a changed
 *  row to a SAME-VOICE clip for the new words where one exists, so a slot can end up filled by the
 *  trigger rather than by this tool — either way it must sit on the cast (Italian: Elsa / Benigno). */
async function voiceCensus(pg) {
  const { rows } = await pg.query(
    `SELECT x.id, r.role, a.voice_id FROM (
       SELECT lego_id AS id, known_audio_id, target1_audio_id, target2_audio_id FROM course_legos WHERE course_code=$1 AND seed_number=$2
       UNION ALL SELECT id, known_audio_id, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND seed_number=$2) x
     CROSS JOIN LATERAL (VALUES ('known', x.known_audio_id), ('target1', x.target1_audio_id), ('target2', x.target2_audio_id)) r(role, audio_id)
     LEFT JOIN course_audio a ON a.id = r.audio_id ORDER BY 1, 2`, [COURSE, SEED]);
  const off = rows.filter(r => r.role !== 'known' && r.voice_id && !AZURE_VOICE_IDS[r.role].includes(r.voice_id));
  const silent = rows.filter(r => !r.voice_id);
  return { rows, offCast: off.map(r => `${r.id} ${r.role} holds ${r.voice_id}`), silent: silent.map(r => `${r.id} ${r.role}`) };
}
/** English prompt slots left silent — for ita-sonia-temporary-fill SCOPE=ids. */
async function silentEnglish(pg) {
  const { rows } = await pg.query(`SELECT id FROM course_practice_phrases WHERE course_code=$1 AND seed_number=$2 AND known_audio_id IS NULL UNION ALL SELECT lego_id FROM course_legos WHERE course_code=$1 AND seed_number=$2 AND known_audio_id IS NULL ORDER BY 1`, [COURSE, SEED]);
  return rows.map(r => r.id);
}

async function main() {
  const APPLY = process.env.APPLY === '1', AUDIO_ONLY = process.env.AUDIO_ONLY === '1';
  const { Client } = require('pg');
  const { createClient } = require('@supabase/supabase-js');
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const log = { sweep: SWEEP, ruling: RULING, job: JOB, apply: APPLY, started: new Date().toISOString(), problems: [], audio: [] };
  console.log(`\n══ ${COURSE} seed ${SEED} re-cut — ${AUDIO_ONLY ? 'AUDIO ONLY' : APPLY ? 'APPLY' : 'DRY RUN'} ══`);
  const { problems: offline, phrases } = checkOffline();
  log.problems.push(...offline);
  console.log(`offline rules: ${offline.length ? '\n  ' + offline.join('\n  ') : 'LEGOs tile the seed, components tile L03, every phrase contains its LEGO both sides, sarebbe only under a past frame, no wrong "sarebbe X", L03 builds reach the seed, intro line in Kai\'s template — all hold'}`);
  if (!AUDIO_ONLY) {
    const live = await guardLive(pg);
    log.problems.push(...live.problems);
    if (!live.problems.length) {
      log.vocab = {};
      for (const p of phrases.filter(p => p.knownChanged || p.targetChanged)) {
        const nk = await newVocabulary(pg, SEED, p.known, 'known'), nt = await newVocabulary(pg, SEED, p.target, 'target');
        if (nk.length || nt.length) { log.vocab[p.id] = { known: nk, target: nt }; log.problems.push(`${p.id} introduces vocabulary not taught by seed ${SEED}: ${[...nk, ...nt].join(', ')}`); }
      }
      const nvI = await newVocabulary(pg, SEED, L03_EXAMPLE, 'known');
      if (nvI.length) log.problems.push(`L03 intro example uses untaught words: ${nvI.join(', ')}`);
      log.zut = await zutAgainstCourse(pg, phrases);
      log.problems.push(...log.zut.clashes);
      log.downstream = await downstream(pg);
    }
    console.log('\nPLAN:');
    for (const l of NEW_LEGOS) { const o = OLD.legos[l.idx - 1]; console.log(`  L0${l.idx}  "${o.known}" → "${o.target}" [new]  ⇒  "${l.known}" → "${l.target}" [${l.is_new ? 'NEW' : `not new: ${l.taughtBy}`}]${l.components.length ? '  components ' + l.components.map(c => `${c.known}→${c.target}`).join(' | ') : ''}`); }
    for (const c of NEW_COMPONENTS) console.log(`  +${c.id}  "${c.known}" → "${c.target}" (position ${c.position})`);
    for (const p of phrases) console.log(`  ${p.id.padEnd(12)} ${p.knownChanged || p.targetChanged ? `"${p.before.known}" → "${p.before.target}"  ⇒  "${p.known}" → "${p.target}"` : `(kept) "${p.known}" → "${p.target}"`}`);
    console.log(`  intro L01: detached (not new)  |  intro L02: detached, mark retired (not new)  |  intro L03: "${L03_INTRO}" (human-authored mark)`);
    console.log(`  unapprove seed ${SEED}`);
    if (log.zut?.targetSide?.length) { console.log('\nsame Italian under a different English elsewhere (not a defect — listed):'); for (const t of log.zut.targetSide) console.log('  ' + t); }
    if (log.downstream) { console.log(`\ndownstream rows outside seed ${SEED} carrying "che cosa sarebbe" / "what was going to" / happen→successo (${log.downstream.length}; their Italian is still taught by the new L03):`); for (const d of log.downstream) console.log(`  ${String(d.id).padEnd(12)} "${d.known_text}" → "${d.target_text}"`); }
    console.log(log.problems.length ? '\nPROBLEMS:\n  ' + log.problems.join('\n  ') : '\nguards hold: live picture matches, no untaught vocabulary, no known→target ZUT clash');
    if (APPLY && !log.problems.length) { await applyContent(pg, supabase, live.legos, live.phrases, live.marks, phrases, log); console.log(`APPLIED. events=${JSON.stringify(log.events)} audioPass=${JSON.stringify(log.audioPass)}`); }
  }
  if (APPLY && !log.problems.length) {
    await fillItalian(pg, supabase, log);
    console.log('ITALIAN AUDIO:'); for (const a of log.audio) console.log(`  ${a.tbl}.${a.id} ${a.role} "${a.text}": ${a.result}`);
    try { await fillIntro(pg, supabase, log); console.log(`INTRO: ${JSON.stringify(log.intro)} castRestored=${log.castRestored}`); } catch (e) { log.problems.push(`intro: ${e.message}`); console.log(`INTRO FAILED: ${e.message}`); }
    log.silentEnglish = await silentEnglish(pg);
    console.log(`ENGLISH prompts to fill on temporary Sonia (${log.silentEnglish.length}):\n  SCOPE=ids IDS=${log.silentEnglish.join(',')} APPLY=1 node tools/course-optimization/ita-sonia-temporary-fill-2026-09-28.cjs`);
    if (log.audio.some(a => /REFUSED|FAILED|NOT ON CAST/.test(a.result))) log.problems.push('some Italian slots were not filled — see audio');
    log.voices = await voiceCensus(pg);
    console.log(`VOICE CENSUS: ${log.voices.rows.length} slots; off-cast Italian: ${log.voices.offCast.length}; silent: ${log.voices.silent.length}${log.voices.silent.length ? ' (' + log.voices.silent.join(', ') + ')' : ''}`);
    for (const o of log.voices.offCast) { console.log('  OFF-CAST ' + o); log.problems.push('off-cast Italian slot: ' + o); }
  }
  const f = evidencePath(`tools/course-optimization/${SWEEP}/${AUDIO_ONLY ? 'audio' : APPLY ? 'applied' : 'dryrun'}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(log, null, 2)); console.log(`Wrote ${f}`);
  await pg.end(); process.exit(log.problems.length ? 2 : 0);
}
module.exports = { OLD, NEW_LEGOS, NEW_COMPONENTS, PHRASES, SEED_TEXT, L03_INTRO, L03_EXAMPLE, resolvedPhrases, phraseContainsLego, legosTileSeed, componentsTile, pastFrameRule, noWrongSarebbe, buildsUpToSeed, introRules, checkOffline };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
