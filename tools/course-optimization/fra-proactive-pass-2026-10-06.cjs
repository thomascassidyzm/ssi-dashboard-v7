#!/usr/bin/env node
'use strict';
// tools/course-optimization/fra-proactive-pass-2026-10-06.cjs — job #329, fra_for_eng, before Kai's whole-course proofread.
//
// Kai, 6 Oct 2026: "fix clear-cut defects yourself and keep only genuine taste forks" (he does not speak French; this
// grant is for THIS pass only, canon R0.10). Two passes, one engine, every row hand-reviewed and listed below:
//
//   PASS=lego   finish job #355's LEGO-level holds, MAKE-BEFORE-BREAK (canon A4/A6/O13):
//                 K41 — a bare English verb over a French infinitive gets "to" on the LEGO, its intro, and its bare BUILD
//                       fragments; K32 — a formal LEGO keeps monsieur/madame on BOTH sides (646 L01, 654 L02, 655 L01).
//   PASS=sweep  the forum findings (S114 "I'm doing better" over "j'ai l'impression de…", S134 "I was working" over
//               "je travaille…") and the high-confidence rows of the course-wide known/target meaning sweep.
//
// THE ENGINE, per change:
//   1. every clip the new text needs is asked of the ONE audio route (POST /api/audio/render) — dry run first, then ONE
//      real call; a refusal stops the pass and is reported as it is (never retried, never re-routed);
//   2. only then is the text switched: a LEGO in ONE UPDATE that carries its new clip ids (course_legos honours a link
//      set in the same UPDATE as the text); a phrase's text and its new clip ids in one transaction;
//   3. a LEGO's intro is re-rendered with its new words (the route binds it to the LEGO) and lego_introductions, which
//      the player's script cache reads, is pointed at the same clip;
//   4. cached decomposition / display tiling / gloss segments are dropped on every re-texted phrase AND on every phrase
//      whose decomposition carries a re-texted LEGO (the cat_for_eng K42 lesson, commit 499ca6377);
//   5. ZUT strict is simulated over the whole course first (audit-phrase-zut auditRows) — a change that would open a new
//      strict group is HELD, never written;
//   6. every touched seed that was approved is unapproved, with an event (canon O5).
//
//   node tools/course-optimization/fra-proactive-pass-2026-10-06.cjs                 # PASS=lego dry run (default)
//   PASS=sweep node …                                                                  # dry run of the sweep fixes
//   APPLY=1 PASS=lego node …                                                           # render, then write

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'fra_for_eng';
const JOB = '#329';
const SWEEP = 'fra-proactive-pass-2026-10-06';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = 'Kai, 6 Oct 2026 (job #329): proactive pass before his fra_for_eng proofread — fix clear-cut defects, keep only taste forks; K41/K32 (canon) for the LEGO pass';
const full = (id) => `${COURSE}:${id}`;
const norm = (s) => String(s || '').toLowerCase().replace(/[’‘]/g, "'").replace(/[.,!?;:"«»“”]+/g, ' ').replace(/\s+/g, ' ').trim();

// ─── PASS lego ────────────────────────────────────────────────────────────────────────────────────
// K41: the held #355 LEGOs (report d/b1e6a883) + the three whose "to" only repeats an earlier LEGO (12 guess, 211 explain,
// 276 stay — a repeat debut is reported by check-debut-practice, never blocking; is_new is never flipped, P25).
// HELD, for Kai: 91 "think | penser", 95 "go home | rentrer à la maison", 251 "find out | savoir" — with "to", each
// would stand over a second French form already taught (to think | réfléchir 638, to go home | rentrer 401,
// to find out | découvrir 17/433). Which French owns the gloss is his call.
const K41_LEGOS = ['S0010L05', 'S0012L02', 'S0065L03', 'S0074L02', 'S0098L02', 'S0099L02', 'S0100L02', 'S0113L02', 'S0136L02',
  'S0168L02', 'S0200L03', 'S0211L04', 'S0212L01', 'S0213L04', 'S0219L02', 'S0242L01', 'S0250L01', 'S0269L01', 'S0276L01',
  'S0396L05', 'S0466L02', 'S0469L03', 'S0470L02', 'S0493L02', 'S0512L02'];
// Bare BUILD fragments under those LEGOs (read one by one): English gets "to". Governed rows ("I want to…", "can you…",
// "let me…") and English commands with "please" are left alone and listed.
const K41_BUILDS = {
  S0010L05B01: 'remember the whole sentence', S0098L02B01: 'consider doing', S0098L02B02: 'consider doing',
  S0099L02B01: 'ask yourself', S0099L02B02: 'ask yourself', S0100L02B01: 'worry about doing', S0100L02B02: 'worry about doing',
  S0113L02B01: 'remember what', S0113L02B02: 'remember what', S0136L02B01: 'ask her', S0136L02B02: 'ask her',
  S0168L02B01: 'come', S0200L03B01: 'make sure', S0200L03B03: 'make sure that', S0211L04B01: 'explain',
  S0212L01B01: 'ask for', S0212L01B02: 'ask for', S0212L01B04: 'ask for help', S0213L04B01: 'achieve',
  S0219L02B01: 'relax for a while', S0219L02B02: 'relax for a while', S0219L02B04: 'relax for a while at',
  S0250L01B01: 'tell me something else', S0250L01B02: 'tell me something else', S0269L01B01: 'wait for',
  S0269L01B03: 'wait for your father', S0269L01B04: 'wait for my friend', S0276L01B01: 'stay', S0396L05B01: 'stay standing',
  S0466L02B01: 'throw it', S0466L02B03: 'throw it now', S0469L03B01: 'change it', S0512L02B01: 'hold the door open',
};
// K32: the LEGO and its B01 (which IS the LEGO) get the honorific on the French side too; 654 B02's English
// "not sure to be able to help you sir" was not English — it now mirrors seed 654's own gloss.
const K32_LEGOS = {
  S0646L01: ['vous faites', 'vous faites monsieur'],
  S0654L02: ['de pouvoir vous aider', 'de pouvoir vous aider monsieur'],
  S0655L01: ['vous vous en sortez très bien', 'vous vous en sortez très bien madame'],
};
const LEGO_PASS_PHRASES = {
  S0646L01B01: { from: ['you are doing sir', 'vous faites'], to: ['you are doing sir', 'vous faites monsieur'], why: 'K32: the LEGO itself, honorific on both sides' },
  S0654L02B01: { from: ['to be able to help you sir', 'de pouvoir vous aider'], to: ['to be able to help you sir', 'de pouvoir vous aider monsieur'], why: 'K32: the LEGO itself, honorific on both sides' },
  S0654L02B02: { from: ['not sure to be able to help you sir', 'pas sûr de pouvoir vous aider'], to: ['not sure if I can help you sir', 'pas sûr de pouvoir vous aider monsieur'], why: 'K32 + K9: honorific on both sides; English mirrors seed 654 ("not sure if I can help you, sir")' },
  S0655L01B01: { from: ['you are doing very well madam', 'vous vous en sortez très bien'], to: ['you are doing very well madam', 'vous vous en sortez très bien madame'], why: 'K32: the LEGO itself, honorific on both sides' },
};
const LEGO_PASS_DELETES = {
  // after the LEGO becomes "to ask her | lui demander", this row's "to ask her" would stand over a second French form
  S0136L02B03: { from: ['to ask her', 'de lui demander'], why: 'ZUT once the LEGO reads "to ask her | lui demander"; B01/B02 already drill that pair' },
};

// ─── PASS sweep (filled from the hand-checked sweep; see the report) ─────────────────────────────
const SWEEP_PHRASES = require('./fra-proactive-pass-2026-10-06.sweep.cjs');

// ─── PLAN ─────────────────────────────────────────────────────────────────────────────────────────
const demoOf = (intro) => { const m = /as in — '(.*)', is:$/.exec(intro || ''); return m ? m[1] : null; };
const wholeWords = (hay, chunk) => new RegExp(`(^|[^a-z'])${norm(chunk).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z']|$)`).test(norm(hay));
/** The new intro: same template; the "as in" demo is kept if it still contains the new gloss as whole words, else the
 *  shortest USE sentence of the LEGO's own basket that does, else no demo (the mirror rule, services/shared/intro-mirror.cjs). */
function introFor(newKnown, oldIntro, basket = []) {
  const demo = demoOf(oldIntro);
  const pick = demo && wholeWords(demo, newKnown) ? demo
    : basket.filter((s) => wholeWords(s, newKnown) && !/'/.test(s)).sort((a, b) => a.length - b.length)[0];
  return pick ? `The French for: '${newKnown}', as in — '${pick}', is:` : `The French for: '${newKnown}', is:`;
}

function planLego(db) {
  const L = Object.fromEntries(db.legos.map((l) => [l.lego_id, l]));
  const P = Object.fromEntries(db.phrases.map((p) => [p.sid, p]));
  const legoChanges = [], phraseChanges = [], deletes = [], held = [];
  for (const id of K41_LEGOS) {
    const l = L[id];
    if (!l) { held.push({ id, why: 'LEGO not found live' }); continue; }
    if (/^to /i.test(l.known_text)) continue; // already done
    const known = `to ${l.known_text}`;
    const basket = db.phrases.filter((p) => p.lego_id === id && p.phrase_role === 'use').map((p) => p.known_text);
    legoChanges.push({ id, seed: l.seed_number, uuid: l.id, rule: 'K41', before: { known: l.known_text, target: l.target_text }, after: { known, target: l.target_text }, intro: { before: l.intro, after: introFor(known, l.intro, basket) } });
  }
  for (const [id, [from, to]] of Object.entries(K32_LEGOS)) {
    const l = L[id];
    if (!l) { held.push({ id, why: 'LEGO not found live' }); continue; }
    if (l.target_text === to) continue;
    if (l.target_text !== from) throw new Error(`${id}: live French "${l.target_text}" is not the reviewed "${from}"`);
    legoChanges.push({ id, seed: l.seed_number, uuid: l.id, presentation: l.presentation_audio_id, rule: 'K32', before: { known: l.known_text, target: from }, after: { known: l.known_text, target: to } });
  }
  for (const [id, was] of Object.entries(K41_BUILDS)) {
    const p = P[id];
    if (!p) { held.push({ id, why: 'row not found live' }); continue; }
    if (p.known_text === `to ${was}`) continue;
    if (p.known_text !== was) throw new Error(`${id}: live English "${p.known_text}" is not the reviewed "${was}"`);
    phraseChanges.push({ id, seed: p.seed_number, rule: 'K41', why: 'K41: French infinitive glossed with "to"', before: [p.known_text, p.target_text], after: [`to ${was}`, p.target_text] });
  }
  phrasesFrom(LEGO_PASS_PHRASES, P, phraseChanges, held);
  deletesFrom(LEGO_PASS_DELETES, P, deletes);
  return { legoChanges, phraseChanges, deletes, held };
}
function phrasesFrom(table, P, out, held) {
  for (const [id, e] of Object.entries(table)) {
    if (e.delete) continue;
    const p = P[id];
    if (!p) { held.push({ id, why: 'row not found live' }); continue; }
    if (p.known_text === e.to[0] && p.target_text === e.to[1]) continue;
    if (p.known_text !== e.from[0] || p.target_text !== e.from[1]) throw new Error(`${id}: live "${p.known_text} | ${p.target_text}" is not the reviewed "${e.from.join(' | ')}"`);
    out.push({ id, seed: p.seed_number, rule: e.rule || 'K32', why: e.why, before: e.from, after: e.to });
  }
}
function deletesFrom(table, P, out) {
  for (const [id, e] of Object.entries(table)) {
    if (table !== LEGO_PASS_DELETES && !e.delete) continue;
    const p = P[id];
    if (!p) continue; // already gone
    if (p.known_text !== e.from[0] || p.target_text !== e.from[1]) throw new Error(`${id}: live "${p.known_text} | ${p.target_text}" is not the reviewed "${e.from.join(' | ')}"`);
    out.push({ id, seed: p.seed_number, why: e.why, role: p.phrase_role, before: e.from });
  }
}
function planSweep(db, table = SWEEP_PHRASES) {
  const P = Object.fromEntries(db.phrases.map((p) => [p.sid, p]));
  const phraseChanges = [], deletes = [], held = [];
  phrasesFrom(table, P, phraseChanges, held);
  deletesFrom(table, P, deletes);
  return { legoChanges: [], phraseChanges, deletes, held };
}

/** The course after the plan, in the shape audit-phrase-zut's auditRows reads. */
function simulate(db, p) {
  const del = new Set(p.deletes.map((d) => d.id));
  const ed = Object.fromEntries(p.phraseChanges.map((c) => [c.id, c]));
  const le = Object.fromEntries(p.legoChanges.map((c) => [c.id, c]));
  const phrases = db.phrases.filter((x) => !del.has(x.sid)).map((x) => (ed[x.sid] ? { ...x, known_text: ed[x.sid].after[0], target_text: ed[x.sid].after[1] } : x));
  const legos = db.legos.map((l) => (le[l.lego_id] ? { ...l, id: l.lego_id, known_text: le[l.lego_id].after.known, target_text: le[l.lego_id].after.target } : { ...l, id: l.lego_id }));
  return { legos, phrases, seeds: db.seeds };
}
function zutGate(db, p) {
  const { auditRows, nk } = require('./audit-phrase-zut.cjs');
  const groups = (rows) => new Map(auditRows(rows).bidirectional.violationsStrict.map((v) => [v.known_norm, v]));
  const before = groups(simulate(db, { legoChanges: [], phraseChanges: [], deletes: [] }));
  for (let round = 0; round < 5; round++) {
    const after = groups(simulate(db, p));
    const fresh = [...after.keys()].filter((k) => !before.has(k));
    if (!fresh.length) return { before: before.size, after: after.size };
    const hit = (k) => fresh.includes(nk(k));
    const forms = (k) => after.get(nk(k)).distinct_targets.map((t) => t.example.target).join(' / ');
    for (const c of p.legoChanges.filter((x) => hit(x.after.known))) p.held.push({ id: c.id, why: `ZUT: "${c.after.known}" would stand over ${forms(c.after.known)}` });
    for (const c of p.phraseChanges.filter((x) => hit(x.after[0]))) p.held.push({ id: c.id, why: `ZUT: "${c.after[0]}" would stand over ${forms(c.after[0])}`, known: c.after[0], target: c.after[1] });
    p.legoChanges = p.legoChanges.filter((x) => !hit(x.after.known));
    p.phraseChanges = p.phraseChanges.filter((x) => !hit(x.after[0]));
  }
  throw new Error('ZUT gate did not converge');
}

// ─── LIVE ─────────────────────────────────────────────────────────────────────────────────────────
async function load(pg) {
  const q = async (s, a) => (await pg.query(s, a)).rows;
  const seeds = await q('SELECT seed_number, known_text, target_text, approved_at FROM course_seeds WHERE course_code=$1 ORDER BY seed_number', [COURSE]);
  const legos = await q(`SELECT l.id, l.lego_id, l.seed_number, l.lego_index, l.is_new, l.known_text, l.target_text, l.presentation_audio_id, a.text AS intro
    FROM course_legos l LEFT JOIN course_audio a ON a.id::text = l.presentation_audio_id WHERE l.course_code=$1 ORDER BY l.seed_number, l.lego_index`, [COURSE]);
  const phrases = await q(`SELECT id, split_part(id, ':', 2) AS sid, substr(split_part(id, ':', 2), 1, 8) AS lego_id, seed_number, lego_index, position, phrase_role, known_text, target_text,
    known_audio_id, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 ORDER BY seed_number, lego_index, position`, [COURSE]);
  return { seeds, legos, phrases };
}

/** ONE route, dry run then ONE real call. Returns the clip id, verified to speak these words; throws on any refusal. */
async function clip(pg, { role, text, legoId, purpose, voiceId }, log) {
  const call = async (dryRun) => {
    const r = await fetch(`${(process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '')}/api/audio/render`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': `${SWEEP} (job ${JOB})` },
      body: JSON.stringify({ courseCode: COURSE, role, text, purpose, job: JOB, dryRun, ...(legoId ? { legoId } : {}), ...(voiceId ? { voiceId } : {}) }) });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  };
  const dry = await call(true);
  if (dry.status !== 200 || !dry.body.ok) throw Object.assign(new Error(`route refused (dry) ${role} "${text}": ${dry.status} ${JSON.stringify(dry.body)}`), { refusal: dry });
  const real = await call(false);
  if (real.status !== 200 || !real.body.ok || !real.body.audioId) throw Object.assign(new Error(`route refused ${role} "${text}": ${real.status} ${JSON.stringify(real.body)}`), { refusal: real });
  const { rows: [a] } = await pg.query('SELECT id, text, voice_id, role FROM course_audio WHERE id=$1', [real.body.audioId]);
  if (!a || norm(a.text) !== norm(text)) throw new Error(`clip ${real.body.audioId} does not speak "${text}" (it says "${a && a.text}")`);
  log.clips.push({ role, text, audioId: a.id, voice: a.voice_id, source: real.body.source, chars: real.body.charsSpent || 0, legoId: legoId || null });
  return a.id;
}

/** The clip ids a LEGO's text UPDATE must carry. The lego trigger NULLs presentation_audio_id on ANY text change
 *  ("not text-addressable"), and honours a link set in the same UPDATE — so a change whose ENGLISH stands (K32 adds
 *  monsieur to the French only) carries its existing intro, or the debut goes silent. Job #329 left 646/654/655 L01/L02
 *  silent for a minute before this existed. A change whose English moves gets a new intro after the switch. */
function legoLinks(c) {
  const out = {};
  if (c.clips?.known) out.known_audio_id = c.clips.known;
  if (c.clips?.target1) out.target1_audio_id = c.clips.target1;
  if (c.clips?.target2) out.target2_audio_id = c.clips.target2;
  // an English change carries the NEW intro, rendered before BEGIN (a refusal must leave the LEGO untouched)
  if (c.intro) { if (c.clips?.presentation) out.presentation_audio_id = c.clips.presentation; }
  else if (c.presentation) out.presentation_audio_id = c.presentation;
  return out;
}

/** fra_for_eng's intro voice of record: voice_config.voices.presentation = tom_001 (Tom, 2026-09-10). Named, because the
 *  route's "voice the course already speaks English in" lookup counts only Azure/Cartesia clips: fra's 1,499 Tom intros
 *  are on the retired xAI clone, so 6 Charlotte intros outvoted them and job #329's first 25 intros came out Charlotte. */
const INTRO_VOICE = 'cartesia_8fef4d59-0a7e-4ad2-a261-6a3bb50734d2';

/** PASS=intro-voice: re-render, on INTRO_VOICE, every K41 intro this job made in another voice (make-before-break: the
 *  route binds the new clip to the LEGO; the old clip is kept, never deleted). */
async function introVoice(pg, APPLY, log) {
  const { rows } = await pg.query(`SELECT l.lego_id, a.text, a.voice_id FROM course_legos l JOIN course_audio a ON a.id::text = l.presentation_audio_id
    WHERE l.course_code=$1 AND l.lego_id = ANY($2) AND a.voice_id <> $3 ORDER BY l.lego_id`, [COURSE, K41_LEGOS, INTRO_VOICE]);
  console.log(`INTRO-VOICE: ${rows.length} intros not on ${INTRO_VOICE}`);
  if (!APPLY) return;
  log.clips = [];
  for (const r of rows) {
    const id = await clip(pg, { role: 'presentation', text: r.text, legoId: r.lego_id, voiceId: INTRO_VOICE, purpose: `job ${JOB}: intro on the course's intro voice (tom_001), ${r.lego_id}` }, log);
    const { rows: [a] } = await pg.query('SELECT voice_id FROM course_audio WHERE id=$1', [id]);
    if (a.voice_id !== INTRO_VOICE) throw new Error(`${r.lego_id}: route answered in ${a.voice_id}`);
    await pg.query('UPDATE course_legos SET presentation_audio_id=$1 WHERE course_code=$2 AND lego_id=$3', [id, COURSE, r.lego_id]);
    await pg.query('UPDATE lego_introductions SET presentation_audio_id=$1, audio_uuid=$1, updated_at=now() WHERE course_code=$2 AND lego_id=$3', [id, COURSE, r.lego_id]);
  }
  console.log(`INTRO-VOICE: ${log.clips.length} re-rendered (${log.clips.reduce((s, c) => s + c.chars, 0)} chars)`);
}

/** services/phrase-decomposer.cjs stores each block's legoId as the lego_id string (S0276L01), never the row uuid. */
const decompositionNeedle = (c) => JSON.stringify([{ legoId: c.id }]);

const CACHE_NULL = 'decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL, known_gloss_segments=NULL, qa_checked=NULL';

async function apply(pg, supabase, p, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const ev = (operation, scope, detail) => recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation, scope, detail: { ruling: RULING, job: JOB, ...detail } });
  const uniq = (xs) => [...new Set(xs)].sort((a, b) => a - b);
  log.clips = [];
  const E = {};

  // 1. MAKE: every clip first. A refusal throws here, before any text has moved.
  for (const c of p.legoChanges) {
    c.clips = {};
    // NO legoId: with one the route writes course_legos.presentation_audio_id at once, so a later refusal (the known clip below)
    // would leave the old text under the new intro. Without it the route only returns the clip; the transactional UPDATE binds it.
    if (c.intro) c.clips.presentation = await clip(pg, { role: 'presentation', text: c.intro.after, voiceId: INTRO_VOICE, purpose: `job ${JOB}: ${c.rule} intro ${c.id}` }, log);
    if (c.before.known !== c.after.known) c.clips.known = await clip(pg, { role: 'known', text: c.after.known, purpose: `job ${JOB}: ${c.rule} LEGO ${c.id} known` }, log);
    if (c.before.target !== c.after.target) {
      c.clips.target1 = await clip(pg, { role: 'target1', text: c.after.target, purpose: `job ${JOB}: ${c.rule} LEGO ${c.id} target1` }, log);
      c.clips.target2 = await clip(pg, { role: 'target2', text: c.after.target, purpose: `job ${JOB}: ${c.rule} LEGO ${c.id} target2` }, log);
    }
  }
  for (const c of p.phraseChanges) {
    c.clips = {};
    if (c.before[0] !== c.after[0]) c.clips.known_audio_id = await clip(pg, { role: 'known', text: c.after[0], purpose: `job ${JOB}: ${c.rule} ${c.id}` }, log);
    if (c.before[1] !== c.after[1]) {
      c.clips.target1_audio_id = await clip(pg, { role: 'target1', text: c.after[1], purpose: `job ${JOB}: ${c.rule} ${c.id}` }, log);
      c.clips.target2_audio_id = await clip(pg, { role: 'target2', text: c.after[1], purpose: `job ${JOB}: ${c.rule} ${c.id}` }, log);
    }
  }

  // 2. events
  const seedsTouched = uniq([...p.legoChanges, ...p.phraseChanges, ...p.deletes].map((c) => c.seed));
  if (p.legoChanges.length) E.lego = await ev('lego-edit', { seed_numbers: uniq(p.legoChanges.map((c) => c.seed)), lego_ids: p.legoChanges.map((c) => c.id), rows: p.legoChanges.length }, { changes: p.legoChanges.map((c) => ({ id: c.id, rule: c.rule, from: c.before, to: c.after, intro: c.intro || null })) });
  if (p.phraseChanges.length) E.phrase = await ev('phrase-edit', { seed_numbers: uniq(p.phraseChanges.map((c) => c.seed)), phrase_ids: p.phraseChanges.map((c) => full(c.id)), rows: p.phraseChanges.length }, { changes: p.phraseChanges.map((c) => ({ id: full(c.id), rule: c.rule, why: c.why, known_from: c.before[0], target_from: c.before[1], known_to: c.after[0], target_to: c.after[1] })) });
  if (p.deletes.length) E.delete = await ev('phrase-delete', { seed_numbers: uniq(p.deletes.map((d) => d.seed)), phrase_ids: p.deletes.map((d) => full(d.id)), rows: p.deletes.length }, { deleted: p.deletes.map((d) => ({ id: full(d.id), why: d.why, role: d.role, known: d.before[0], target: d.before[1] })) });
  const { rows: appr } = await pg.query('SELECT seed_number, approved_at FROM course_seeds WHERE course_code=$1 AND seed_number = ANY($2) AND approved_at IS NOT NULL', [COURSE, seedsTouched]);
  if (appr.length) E.unapprove = await ev('unapprove', { seed_numbers: appr.map((x) => x.seed_number), rows: appr.length }, { why: 'edited in the job #329 proactive pass — Kai should read them', approved_at_before: appr });
  log.events = E; log.unapproved = appr.map((x) => x.seed_number);

  // 3. SWITCH: text and its new clip ids together.
  await pg.query('BEGIN');
  try {
    for (const c of p.legoChanges) {
      const set = ['known_text=$1', 'target_text=$2', 'known_gloss_segments=NULL', 'last_edit_event_id=$3', 'updated_at=now()'];
      const args = [c.after.known, c.after.target, E.lego];
      for (const [col, id] of Object.entries(legoLinks(c))) { args.push(id); set.push(`${col}=$${args.length}`); }
      args.push(COURSE, c.id, c.before.known, c.before.target);
      const n = args.length;
      const r = await pg.query(`UPDATE course_legos SET ${set.join(', ')} WHERE course_code=$${n - 3} AND lego_id=$${n - 2} AND known_text=$${n - 1} AND target_text=$${n}`, args);
      if (r.rowCount !== 1) throw new Error(`${c.id}: live text moved (${r.rowCount})`);
      // phrases whose cached decomposition carries this LEGO describe its old words
      const d = await pg.query(`UPDATE course_practice_phrases SET ${CACHE_NULL}, updated_at=now() WHERE course_code=$1 AND decomposition IS NOT NULL AND decomposition::jsonb @> $2::jsonb`, [COURSE, decompositionNeedle(c)]);
      if (c.clips.presentation) await pg.query('UPDATE lego_introductions SET presentation_audio_id=$1, audio_uuid=$1, updated_at=now() WHERE course_code=$2 AND lego_id=$3', [c.clips.presentation, COURSE, c.id]);
      c.cacheCarriers = d.rowCount;
    }
    for (const c of p.phraseChanges) {
      const r = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, target_text=$2, word_count=$3, ${CACHE_NULL}, last_edit_event_id=$4, updated_at=now()
        WHERE course_code=$5 AND id=$6 AND known_text=$7 AND target_text=$8`, [c.after[0], c.after[1], c.after[1].length, E.phrase, COURSE, full(c.id), c.before[0], c.before[1]]);
      if (r.rowCount !== 1) throw new Error(`${c.id}: live text moved (${r.rowCount})`);
      // the text trigger has already re-resolved the slots; the clips made for these words are linked now
      for (const [col, id] of Object.entries(c.clips)) await pg.query(`UPDATE course_practice_phrases SET ${col}=$1 WHERE course_code=$2 AND id=$3`, [id, COURSE, full(c.id)]);
    }
    for (const d of p.deletes) {
      const r = await pg.query('DELETE FROM course_practice_phrases WHERE course_code=$1 AND id=$2 AND known_text=$3 AND target_text=$4', [COURSE, full(d.id), d.before[0], d.before[1]]);
      if (r.rowCount !== 1) throw new Error(`${d.id}: live text moved (delete ${r.rowCount})`);
    }
    if (appr.length) await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$3 WHERE course_code=$1 AND seed_number = ANY($2)', [COURSE, appr.map((x) => x.seed_number), E.unapprove]);
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }

  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  await refreshNow();
}

/** PASS=cache355: job #355 re-texted 146 rows before the cache rule existed (commit 499ca6377); their cached
 *  decomposition / display tiling / gloss segments still describe the old words. Drop them (NULL = "rebuild me"). */
async function cache355(pg, supabase, APPLY) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const { rows: evs } = await pg.query(`SELECT detail FROM content_edit_events WHERE course_code=$1 AND surface LIKE '%fra-italian-rules-apply-2026-10-02%' AND operation='phrase-edit'`, [COURSE]);
  const ids = [...new Set(evs.flatMap((e) => (e.detail.changes || []).map((c) => c.id)))];
  const { rows } = await pg.query(`SELECT id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2) AND (decomposition IS NOT NULL OR display_tiling IS NOT NULL OR known_gloss_segments IS NOT NULL)`, [COURSE, ids]);
  console.log(`CACHE355: ${ids.length} rows re-texted by #355; ${rows.length} still hold a cache`);
  if (!APPLY || !rows.length) return;
  const ev = await recordContentEdit(supabase, { identity: serviceIdentity(SWEEP, { role: 'content-sweep' }), courseCode: COURSE, surface: SURFACE, operation: 'phrase-cache-clear',
    scope: { phrase_ids: rows.map((r) => r.id), rows: rows.length }, detail: { job: JOB, why: 'job #355 re-texted these rows and left decomposition/display_tiling caches describing the pre-edit words' } });
  const r = await pg.query(`UPDATE course_practice_phrases SET decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL, known_gloss_segments=NULL, last_edit_event_id=$1, updated_at=now()
    WHERE course_code=$2 AND id = ANY($3)`, [ev, COURSE, rows.map((x) => x.id)]);
  console.log(`CACHE355: cleared ${r.rowCount}`);
}

async function main() {
  const APPLY = process.env.APPLY === '1';
  const PASS = process.env.PASS || 'lego';
  const { Client } = require('pg'); const { createClient } = require('@supabase/supabase-js'); const { evidencePath } = require('../lib/evidence-path.cjs');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const log = { sweep: SWEEP, job: JOB, pass: PASS, apply: APPLY, started: new Date().toISOString() };
  if (PASS === 'intro-voice') { await introVoice(pg, APPLY, log); await pg.end(); return; }
  if (PASS === 'cache355') { await cache355(pg, supabase, APPLY); await pg.end(); return; }
  const db = await load(pg);
  const p = PASS === 'sweep' ? planSweep(db) : PASS === 'followup' ? planSweep(db, require('./fra-proactive-pass-2026-10-06.followup.cjs')) : planLego(db);
  log.zut = zutGate(db, p);
  log.plan = p;
  console.log(`${PASS.toUpperCase()} ${APPLY ? 'APPLY' : 'DRY RUN'}: LEGOs ${p.legoChanges.length}, phrases ${p.phraseChanges.length}, deletes ${p.deletes.length}, held ${p.held.length}; ZUT strict simulated ${log.zut.before} → ${log.zut.after}`);
  for (const c of p.legoChanges) console.log(`  LEGO ${c.id} ${c.rule}: "${c.before.known} | ${c.before.target}" → "${c.after.known} | ${c.after.target}"${c.intro ? `\n       intro: ${c.intro.after}` : ''}`);
  for (const c of p.phraseChanges) console.log(`  ${c.id} ${c.rule}: "${c.before.join(' | ')}" → "${c.after.join(' | ')}"`);
  for (const d of p.deletes) console.log(`  DELETE ${d.id}: "${d.before.join(' | ')}" — ${d.why}`);
  for (const h of p.held) console.log(`  HELD ${h.id}: ${h.why}`);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const out = (n) => { const f = evidencePath(`tools/course-optimization/${SWEEP}/${PASS}-${n}-${stamp}.json`); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(log, null, 2)); return f; };
  if (APPLY) {
    try { await apply(pg, supabase, p, log); } catch (e) { log.error = String(e.message); console.error(`STOPPED: ${e.message}`); console.log(`Wrote ${out('stopped')}`); await pg.end(); process.exitCode = 2; return; }
    console.log(`APPLIED. clips ${log.clips.length} (${log.clips.reduce((s, c) => s + c.chars, 0)} chars rendered); unapproved ${log.unapproved.length}: ${log.unapproved.join(',')}`);
  }
  console.log(`Wrote ${out(APPLY ? 'applied' : 'dryrun')}`);
  await pg.end();
}
module.exports = { apply, decompositionNeedle, introFor, legoLinks, planLego, planSweep, simulate, zutGate, K41_LEGOS, K41_BUILDS, K32_LEGOS, LEGO_PASS_PHRASES, LEGO_PASS_DELETES, SWEEP_PHRASES };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
