#!/usr/bin/env node
'use strict';
// tools/course-optimization/deu-s0534-weather-recut-2026-10-14.cjs  (job #499)
//
// STEP 1 of 2. Kai then re-ordered (weather before dreadful): the live order is set by deu-s0534-reorder-2026-10-14.cjs,
// whose `verify` supersedes this file's (this file's ORDER is the step-1 state).
//
// KAI'S RULING, 2026-10-14, deu_for_eng seed 534
//   "let's not go outside in this dreadful weather | lass uns bei diesem schrecklichen Wetter nicht nach draußen gehen"
// The Welsh courses are the model: every LEGO is a sayable piece, a preposition rides with its phrase ("to the city |
// i'r ddinas"), and LEGO ORDER = BUILD-UP ORDER, not sentence order — "the order you could start to build the sentence
// out of, then add more pieces, but you already have previous LEGOs to use as well" (canon: lego-order-is-build-up-order).
// "in | bei" (L04) and "to | nach" (L06) go; Kai allowed deleting those two LEGOs, for this seed only.
//
// THE NEW SEED, in build-up order (every word not named here is taught before seed 534: let's|lass uns 522,
// not|nicht 10, to go|gehen 25, bei 185, nach 95):
//   L01 weather | Wetter                                 unchanged (Wetter is new here; the M LEGO is built from it)
//   L02 outside | draußen                                unchanged
//   L03 go outside | nach draußen gehen                  was M "in this dreadful weather" — "go", not "to go": the seed
//                                                        says "go outside" (and "go home | nach Hause fahren" S0095L02)
//   L04 dreadful | schrecklichen                         was "in | bei" (deleted by re-texting the row)
//   L05 in this dreadful weather | bei diesem schrecklichen Wetter   was "dreadful"; its basket already drilled this
//   L06 to | nach                                        not new (its basket never plays, P25); the LEGO row itself
//                                                        waits for a lego.delete op the edit door does not have
// Popty's edit door can re-text a LEGO but cannot insert, delete or re-index one, so the three middle rows are
// re-texted in place and their clips move WITH their words (L05's "dreadful" clips → L04, L03's "in this dreadful
// weather" clips and intro → L05); only L03 "go outside" needs new clips, made through the one render route.
// Every basket is rebuilt so each row drills its own LEGO on both sides from words taught by then (diesem is first
// taught by L05, so nothing before L05 says it — L04 builds on "bei dem schrecklichen Wetter"). The "an diesem Tag"
// rows and the "by this" rows are gone; L06's dark drill rows are deleted (their good texts live on under L03).
// Knock-on (first occurrence wins, ZUT): S0567L02 drilled "go outside" as "draußen gehen" — now "nach draußen".
// Not touched: could/könnte rows (#489), yet/noch/schon rows (#494).
//
// Writes go ONLY through Popty's edit-batch door; audio ONLY through tools/audio/render.cjs (POST /api/audio/render).
// Reads come from the sanctioned dump (course-dump-readonly-2026-10-14.cjs). No SQL here.
//
//   node …/deu-s0534-weather-recut-2026-10-14.cjs check <dump.json>                  # plan clean? + ZUT before → after
//   node …/deu-s0534-weather-recut-2026-10-14.cjs verify <fresh-dump.json>           # the ruling holds on the live course
//   node …/deu-s0534-weather-recut-2026-10-14.cjs renders <dump.json> [--apply] --out map.json
//   node …/deu-s0534-weather-recut-2026-10-14.cjs ops <dump.json> --audio map.json --out ops.json

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const T = require('./p26-early-placement-sweep-2026-10-06.cjs');

const JOB = '#499';
const COURSE = 'deu_for_eng';
const P = (s) => `${COURSE}:${s}`;
const sid = (id) => id.slice(COURSE.length + 1);
const introLine = (known) => `The German for: '${known}', is:`;

// [lego, before, after]; clipsFrom = the LEGO whose current clips speak the new words
const LEGOS = [
  ['S0534L03', { known_text: 'in this dreadful weather', target_text: 'bei diesem schrecklichen Wetter', type: 'M' },
    { known_text: 'go outside', target_text: 'nach draußen gehen', type: 'M', components: [{ known: 'go outside', target: 'nach draußen gehen' }] }, null],
  ['S0534L04', { known_text: 'in', target_text: 'bei', type: 'A' },
    { known_text: 'dreadful', target_text: 'schrecklichen', type: 'A', components: [] }, 'S0534L05'],
  ['S0534L05', { known_text: 'dreadful', target_text: 'schrecklichen', type: 'A' },
    { known_text: 'in this dreadful weather', target_text: 'bei diesem schrecklichen Wetter', type: 'M',
      components: [{ known: 'in this dreadful weather', target: 'bei diesem schrecklichen Wetter' }] }, 'S0534L03'],
];
const DEAD_LEGOS = ['S0534L04', 'S0534L06']; // Kai's two deletions: L04 by re-texting, L06 awaits lego.delete
const ORDER = [['weather', 'Wetter'], ['outside', 'draußen'], ['go outside', 'nach draußen gehen'], ['dreadful', 'schrecklichen'],
  ['in this dreadful weather', 'bei diesem schrecklichen Wetter']];

// [phrase, from known, from target, to known, to target] — same ids, same positions
const REWRITES = [
  // L03 go outside | nach draußen gehen
  ['S0534L03B01', 'this', 'diesem', 'go outside', 'nach draußen gehen'],
  ['S0534L03B02', 'this problem', 'diesem Problem', "let's go outside", 'lass uns nach draußen gehen'],
  ['S0534L03B03', 'this game', 'diesem Spiel', "let's not go outside", 'lass uns nicht nach draußen gehen'],
  ['S0534L03U01', 'she found it on this day', 'sie hat das an diesem Tag gefunden', "she won't go outside", 'sie wird nicht nach draußen gehen'],
  ['S0534L03U02', 'she came on this day', 'sie ist an diesem Tag gekommen', 'I want to go outside', 'ich will nach draußen gehen'],
  ['S0534L03U03', 'she was here on this day', 'sie war an diesem Tag hier', 'we want to go outside now', 'wir wollen jetzt nach draußen gehen'],
  ['S0534L03U04', 'she tried it on this day', 'sie hat das an diesem Tag versucht', 'can we go outside?', 'können wir nach draußen gehen?'],
  ['S0534L03U05', 'she tried on this day', 'sie hat an diesem Tag versucht', "I don't want to go outside today", 'ich will heute nicht nach draußen gehen'],
  ['S0534L03U06', 'she went on this day', 'sie ist an diesem Tag gegangen', "let's go outside with the dog", 'lass uns mit dem Hund nach draußen gehen'],
  ['S0534L03U07', 'she went here on this day', 'sie ist an diesem Tag hier gegangen', 'do you want to go outside?', 'willst du nach draußen gehen?'],
  // L04 dreadful | schrecklichen — diesem is not taught yet, so "the": bei dem schrecklichen Wetter, nach dem schrecklichen Essen
  ['S0534L04B01', 'at', 'bei', 'dreadful', 'schrecklichen'],
  ['S0534L04B02', 'by this', 'bei diesem', 'in the dreadful weather', 'bei dem schrecklichen Wetter'],
  ['S0534L04B03', 'she is here by this', 'sie ist hier bei diesem', 'go outside in the dreadful weather', 'bei dem schrecklichen Wetter nach draußen gehen'],
  ['S0534L04U01', 'she is by this', 'sie ist bei diesem', 'after the dreadful meal', 'nach dem schrecklichen Essen'],
  ['S0534L04U02', 'she can be by this', 'sie kann bei diesem sein', 'she has to stay at home in the dreadful weather', 'sie muss bei dem schrecklichen Wetter zu Hause bleiben'],
  ['S0534L04U03', 'she wants to be by this', 'sie will bei diesem sein', "I don't want to go outside in the dreadful weather", 'ich will bei dem schrecklichen Wetter nicht nach draußen gehen'],
  ['S0534L04U04', 'she can stay at this', 'sie kann bei diesem bleiben', 'he said nothing after the dreadful meal', 'er hat nach dem schrecklichen Essen nichts gesagt'],
  ['S0534L04U05', 'she is by this place', 'sie ist bei diesem Ort', 'she wants to stay at home in the dreadful weather', 'sie will bei dem schrecklichen Wetter zu Hause bleiben'],
  ['S0534L04U06', 'she wants to be here by this', 'sie will hier bei diesem sein', 'do you want to go outside in the dreadful weather?', 'willst du bei dem schrecklichen Wetter nach draußen gehen?'],
  ['S0534L04U07', 'she wants to stay by this', 'sie will bei diesem bleiben', 'we can go outside after the dreadful meal', 'wir können nach dem schrecklichen Essen nach draußen gehen'],
  // L05 in this dreadful weather | bei diesem schrecklichen Wetter — builds lead with the LEGO; U02–U05, U07, U08 stand
  ['S0534L05B01', 'dreadful', 'schrecklichen', 'in this dreadful weather', 'bei diesem schrecklichen Wetter'],
  ['S0534L05B02', 'this dreadful', 'diesem schrecklichen', 'not in this dreadful weather', 'nicht bei diesem schrecklichen Wetter'],
  ['S0534L05B03', 'this dreadful weather', 'diesem schrecklichen Wetter', 'go outside in this dreadful weather', 'bei diesem schrecklichen Wetter nach draußen gehen'],
  ['S0534L05U01', 'in this dreadful weather', 'bei diesem schrecklichen Wetter', "we can't go outside in this dreadful weather", 'wir können bei diesem schrecklichen Wetter nicht nach draußen gehen'],
  ['S0534L05U06', 'she is not in this dreadful weather', 'sie ist nicht bei diesem schrecklichen Wetter', "she doesn't want to go outside in this dreadful weather", 'sie will bei diesem schrecklichen Wetter nicht nach draußen gehen'],
  // knock-on: "go outside" is nach draußen gehen from seed 534 on (S0567L02U02 also said "ist draußen gegangen"); in the
  // "outdoors | draußen" basket the English says the LEGO's own word, so the row drills it on both sides (P17)
  ['S0567L02U02', 'she went outside', 'sie ist draußen gegangen', 'she went outdoors', 'sie ist nach draußen gegangen'],
  ['S0567L02U03', 'she wants to go outside', 'sie will draußen gehen', 'she wants to go outdoors', 'sie will nach draußen gehen'],
  ['S0567L02U04', 'she can go outside', 'sie kann draußen gehen', 'she can go outdoors', 'sie kann nach draußen gehen'],
];
const DELETES = [
  ['S0534L03U08', "I don't move in this dreadful weather", 'ich bewege mich nicht bei diesem schrecklichen Wetter'], // stilted; L05 drills the M LEGO
  // L06 "to | nach" is dark (P25); its drill rows go, B01 stays with its LEGO until the LEGO itself can be deleted
  ['S0534L06B02', 'to outside', 'nach draußen'],
  ['S0534L06B03', "let's go to outside", 'lass uns nach draußen'],
  ['S0534L06U01', "let's not go outside in this dreadful weather", 'lass uns bei diesem schrecklichen Wetter nicht nach draußen gehen'],
  ['S0534L06U02', 'she wants to go outside', 'sie will nach draußen gehen'],
  ['S0534L06U03', 'she went outside', 'sie ist nach draußen gegangen'],
  ['S0534L06U04', 'she wants to go outside in this weather', 'sie will bei diesem schrecklichen Wetter nach draußen gehen'],
  ['S0534L06U05', "she won't go outside", 'sie wird nicht nach draußen gehen'],
  ['S0534L06U06', 'she went outside in this weather', 'sie ist bei diesem schrecklichen Wetter nach draußen gegangen'],
  ['S0534L06U07', "let's go outside", 'lass uns nach draußen gehen'],
];
const TOUCHED_SEEDS = [534, 567];

// ── helpers ──
const key = (s) => T.words(s).join(' ');
const legoOfPhrase = (p) => sid(p.id).slice(0, 8);
const before = (a, b) => a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);
const legoKey = (p) => `S${String(p.seed_number).padStart(4, '0')}L${String(p.lego_index).padStart(2, '0')}`;
function firstIntroKnown(legos) {
  const first = new Map();
  for (const l of legos) if (l.is_new !== false) for (const w of T.words(l.known_text)) { const q = [l.seed_number, l.lego_index]; if (!first.has(w) || before(q, first.get(w))) first.set(w, q); }
  return first;
}
// English contractions the LEGO-gloss tokeniser never sees whole: judged by their parts. do-support is structure.
const CONTRACTION_PARTS = { dont: ['not'], doesnt: ['not'], cant: ['can', 'not'], wont: ['will', 'not'] };
const DO_SUPPORT = new Set(['do', 'does', 'did']);
function untaughtKnown(text, lego, firstK) {
  const out = [];
  for (const w of new Set(T.words(text))) {
    if (DO_SUPPORT.has(w)) continue;
    for (const p of (firstK.has(w) ? [w] : CONTRACTION_PARTS[w] || [w])) if (!firstK.has(p) || before([lego.seed_number, lego.lego_index], firstK.get(p))) out.push(w);
  }
  return [...new Set(out)];
}

/** The plan applied to a dump (pure). */
function applyPlan(dump) {
  const lg = new Map(LEGOS.map(([id, , to]) => [id, to]));
  const legos = dump.legos.map((l) => (lg.has(l.lego_id) ? { ...l, ...lg.get(l.lego_id) } : l));
  const gone = new Set(DELETES.map((d) => P(d[0])));
  const rw = new Map(REWRITES.map(([s, , , k, t]) => [P(s), [k, t]]));
  const phrases = dump.phrases.filter((p) => !gone.has(p.id))
    .map((p) => (rw.has(p.id) ? { ...p, known_text: rw.get(p.id)[0], target_text: rw.get(p.id)[1] } : p));
  return { ...dump, legos, phrases };
}

/** Strict ZUT groups (the course-wide audit) keyed by normalised known. */
function zutGroups(d, audit = require('./audit-phrase-zut.cjs')) {
  return new Map(audit.auditRows(d).bidirectional.violationsStrict.map((v) => [v.known_norm, v]));
}

/** What must hold on the course once the ruling is applied — on the plan's post-state (check) and on a fresh dump
 *  after apply (verify: fails on the course as it stood on 2026-10-14, passes once the batch has landed). */
function invariants(d) {
  const problems = [];
  const legos = d.legos.filter((l) => l.seed_number === 534 && l.is_new !== false).sort((a, b) => a.lego_index - b.lego_index);
  const got = legos.map((l) => [l.known_text, l.target_text]);
  if (JSON.stringify(got) !== JSON.stringify(ORDER)) problems.push(`seed 534 new LEGOs are ${got.map((g) => g.join(' | ')).join(' · ')}`);
  const L06 = d.legos.find((l) => l.lego_id === 'S0534L06');
  if (L06 && L06.is_new !== false) problems.push('S0534L06 "to | nach" is new');
  for (const l of d.legos.filter((x) => x.seed_number === 534 && x.is_new !== false && ['in', 'to'].includes(x.known_text))) problems.push(`${l.lego_id} "${l.known_text} | ${l.target_text}" is still a new LEGO`);
  // every played row of seed 534 drills its own LEGO on both sides
  const byId = new Map(d.legos.map((l) => [l.lego_id, l]));
  for (const p of d.phrases.filter((x) => x.seed_number === 534 && x.phrase_role !== 'component')) {
    const l = byId.get(legoKey(p)); if (!l || l.is_new === false) continue;
    if (!T.containsWords(p.target_text, l.target_text) || !T.containsWords(p.known_text, l.known_text)) problems.push(`${sid(p.id)} "${p.known_text} | ${p.target_text}" does not drill ${l.lego_id}`);
  }
  // "go outside" is nach draußen gehen wherever a played row says it
  for (const p of d.phrases.filter((x) => x.phrase_role !== 'component' && /\bgo(ne)?\b.*\boutside\b|\bwent outside\b/i.test(x.known_text)))
    if (/draußen/.test(p.target_text) && !/nach draußen/.test(p.target_text)) problems.push(`${sid(p.id)} "${p.known_text} | ${p.target_text}": go outside without nach`);
  return problems;
}

function checkPlan(dump) {
  const problems = [];
  const live = new Map(dump.phrases.map((p) => [sid(p.id), p]));
  for (const [id, from] of LEGOS) {
    const l = dump.legos.find((x) => x.lego_id === id);
    if (!l || l.known_text !== from.known_text || l.target_text !== from.target_text || l.is_new !== true) problems.push(`${id} drifted`);
  }
  for (const [s, fk, ft] of [...REWRITES, ...DELETES]) {
    const p = live.get(s);
    if (!p) problems.push(`${s} not in dump`);
    else if (p.known_text !== fk || p.target_text !== ft) problems.push(`${s} drifted: "${p.known_text} | ${p.target_text}"`);
  }
  const post = applyPlan(dump);
  const byId = new Map(post.legos.map((l) => [l.lego_id, l]));
  const first = T.firstIntro(post.legos), firstK = firstIntroKnown(post.legos);
  // every rewritten row: under a new LEGO, contains it on both sides, uses only taught words there
  for (const [s] of REWRITES) {
    const p = post.phrases.find((x) => x.id === P(s)), l = byId.get(legoKey(p));
    if (!l || !l.is_new) { problems.push(`${s}: under ${l ? l.lego_id : '?'} which is not new (P25)`); continue; }
    if (!T.containsWords(p.target_text, l.target_text) || !T.containsWords(p.known_text, l.known_text)) problems.push(`${s}: "${p.known_text} | ${p.target_text}" does not contain ${l.lego_id} on both sides (P17)`);
    const ut = T.untaughtAt(p.target_text, l, first), uk = untaughtKnown(p.known_text, l, firstK);
    if (ut.length || uk.length) problems.push(`${s}: untaught at ${l.lego_id}: target [${ut}] known [${uk}]`);
  }
  // every LEGO of the new seed is built from words taught by its own place (build-up order)
  for (const [id] of LEGOS) {
    const l = byId.get(id), ut = T.untaughtAt(l.target_text, l, first);
    if (ut.length) problems.push(`${id} uses words not yet taught: ${ut}`);
  }
  // nothing anywhere in the course newly says a word before it is taught (first occurrence wins)
  const firstBefore = T.firstIntro(dump.legos);
  for (const w of ['diesem', 'schrecklichen', 'draußen', 'wetter']) {
    const a = firstBefore.get(w), b = first.get(w);
    if (String(a) !== String(b)) {
      for (const p of post.phrases.filter((x) => x.phrase_role !== 'component' && T.words(x.target_text).includes(w))) {
        const l = byId.get(legoKey(p)); if (l && l.is_new && before([l.seed_number, l.lego_index], b)) problems.push(`${sid(p.id)} says "${w}" before ${b}`);
      }
    }
  }
  // ZUT: no new strict group course-wide
  const zb = zutGroups(dump), za = zutGroups(post);
  for (const [k, v] of za) if (!zb.has(k)) problems.push(`ZUT: new group "${k}" → ${v.distinct_targets.map((t) => t.example.target).join(' / ')}`);
  // duplicates inside the baskets this plan touches
  const touched = new Set(REWRITES.map((r) => r[0].slice(0, 8)));
  const seen = new Map();
  for (const p of post.phrases.filter((x) => x.phrase_role !== 'component' && touched.has(legoOfPhrase(x)))) {
    const b = `${legoOfPhrase(p)}|${key(p.known_text)}|${key(p.target_text)}`;
    if (seen.has(b)) problems.push(`duplicate in basket: ${sid(p.id)} = ${seen.get(b)}`);
    seen.set(b, sid(p.id));
  }
  problems.push(...invariants(post));
  return { problems, zut: { before: zb.size, after: za.size } };
}

// ── audio: which slots need clips, which move with their words ──
/** Slots whose words change and whose clip does not simply move: [{target, id, slot, text}] */
function slotRequests() {
  const out = [];
  for (const [s, fk, ft, k, t] of REWRITES) {
    if (k !== fk) out.push({ target: 'phrase', id: P(s), slot: 'known', text: k });
    if (t !== ft) out.push({ target: 'phrase', id: P(s), slot: 'target1', text: t }, { target: 'phrase', id: P(s), slot: 'target2', text: t });
  }
  for (const [id, , to, clipsFrom] of LEGOS) {
    if (clipsFrom) continue;
    out.push({ target: 'lego', id, slot: 'known', text: to.known_text }, { target: 'lego', id, slot: 'target1', text: to.target_text },
      { target: 'lego', id, slot: 'target2', text: to.target_text }, { target: 'lego', id, slot: 'presentation', text: introLine(to.known_text) });
  }
  return out;
}
const SLOT_COL = { known: 'known_audio_id', target1: 'target1_audio_id', target2: 'target2_audio_id', presentation: 'presentation_audio_id' };

function editOps(dump, audioMap) {
  const ops = [];
  const legoById = new Map(dump.legos.map((l) => [l.lego_id, l]));
  for (const [id, from, to] of LEGOS) {
    const set = { known_text: to.known_text, target_text: to.target_text, type: to.type, components: to.components };
    ops.push({ op: 'lego.update', lego_id: id, expect: { known_text: from.known_text, target_text: from.target_text, is_new: true }, set });
  }
  for (const [s, fk, ft, k, t] of REWRITES) {
    const set = {}; if (k !== fk) set.known_text = k; if (t !== ft) set.target_text = t;
    ops.push({ op: 'phrase.update', phrase_id: P(s), expect: { known_text: fk, target_text: ft }, set });
  }
  for (const [s, fk, ft] of DELETES) ops.push({ op: 'phrase.delete', phrase_id: P(s), expect: { known_text: fk, target_text: ft } });
  // clips move with their words; the intro clip's own lego_id follows the link (the link is the truth, the key should agree)
  for (const [id, , , clipsFrom] of LEGOS) {
    if (!clipsFrom) continue;
    const src = legoById.get(clipsFrom);
    for (const [slot, col] of Object.entries(SLOT_COL)) {
      if (!src[col]) continue;
      ops.push({ op: 'audio.link', target: 'lego', lego_id: id, slot, audio_id: src[col] });
      if (slot === 'presentation') ops.push({ op: 'audio.update', audio_id: src[col], set: { lego_id: id } }); // some intro clips carry no lego_id at all
    }
  }
  for (const r of slotRequests()) {
    const a = audioMap[`${r.slot}|${r.text}`];
    if (!a) continue;
    ops.push(r.target === 'lego' ? { op: 'audio.link', target: 'lego', lego_id: r.id, slot: r.slot, audio_id: a } : { op: 'audio.link', target: 'phrase', phrase_id: r.id, slot: r.slot, audio_id: a });
    if (r.slot === 'presentation') ops.push({ op: 'audio.update', audio_id: a, set: { lego_id: r.id } });
  }
  return ops;
}

/** Clips already speaking a slot's new words on a row this plan deletes or re-texts in seed 534/567 — they move with
 *  their words (as a P25 move keeps its clips) rather than being rendered again. {"slot|text": audio_id} */
function clipsThatMove(dump) {
  const freed = new Set([...DELETES.map((d) => P(d[0])), ...REWRITES.map((r) => P(r[0]))]);
  const rows = [...dump.phrases.filter((p) => freed.has(p.id)), ...dump.legos.filter((l) => LEGOS.some(([id]) => id === l.lego_id))];
  const map = {};
  for (const r of rows) for (const slot of ['known', 'target1', 'target2']) {
    const text = slot === 'known' ? r.known_text : r.target_text, a = r[SLOT_COL[slot]];
    if (a && !map[`${slot}|${text}`]) map[`${slot}|${text}`] = a;
  }
  return map;
}

module.exports = { clipsThatMove, LEGOS, REWRITES, DELETES, ORDER, DEAD_LEGOS, TOUCHED_SEEDS, applyPlan, checkPlan, invariants, slotRequests, editOps, untaughtKnown, introLine };

if (require.main === module) {
  const [cmd, dumpPath, ...rest] = process.argv.slice(2);
  const opt = (f) => { const i = rest.indexOf(f); return i >= 0 ? rest[i + 1] : undefined; };
  if (!cmd || !dumpPath) { console.error('usage: check|verify|renders|ops <dump.json> [--audio map.json] [--out file] [--apply]'); process.exit(1); }
  const dump = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));
  if (cmd === 'check') {
    const { problems, zut } = checkPlan(dump);
    console.log(problems.length ? problems.join('\n') : 'plan clean'); console.log(`ZUT strict groups ${zut.before} → ${zut.after}`);
    process.exit(problems.length ? 2 : 0);
  } else if (cmd === 'verify') {
    const pr = invariants(dump); console.log(pr.length ? pr.join('\n') : 'course holds the ruling'); process.exit(pr.length ? 2 : 0);
  } else if (cmd === 'ops') {
    const audio = opt('--audio') ? JSON.parse(fs.readFileSync(opt('--audio'), 'utf8')) : {};
    const ops = editOps(dump, audio);
    const missing = slotRequests().filter((r) => !audio[`${r.slot}|${r.text}`]);
    fs.writeFileSync(opt('--out') || 'ops.json', JSON.stringify({ ops }, null, 1));
    console.log(`${ops.length} ops; ${missing.length} changed slots without a clip${missing.length ? ': ' + missing.map((m) => `${sid(m.id.includes(':') ? m.id : P(m.id))}.${m.slot}`).join(', ') : ''}`);
  } else if (cmd === 'renders') {
    const apply = rest.includes('--apply');
    const moving = clipsThatMove(dump);
    const reqs = slotRequests().filter((r, i, a) => a.findIndex((x) => x.slot === r.slot && x.text === r.text) === i);
    const map = {}; let chars = 0, refused = 0;
    for (const r of reqs) {
      if (moving[`${r.slot}|${r.text}`]) { map[`${r.slot}|${r.text}`] = moving[`${r.slot}|${r.text}`]; console.log(`moves ${r.slot} "${r.text}" ${map[`${r.slot}|${r.text}`]}`); continue; }
      // presentation clips are rendered unbound and linked by the edit batch, so text and intro change in one transaction
      const args = [path.join(__dirname, '..', 'audio', 'render.cjs'), '--course', COURSE, '--role', r.slot, '--text', r.text, '--purpose', `${JOB} deu seed 534 re-cut: ${r.id.replace(COURSE + ':', '')}`, '--job', JOB];
      if (!apply) args.push('--dry-run');
      const res = spawnSync('node', args, { encoding: 'utf8', env: { ...process.env, AGENT_ID: 'kai-watson-499' } });
      let out = {}; try { out = JSON.parse(res.stdout); } catch (_) { out = { ok: false, error: (res.stdout || res.stderr || '').slice(-300) }; }
      if (!out.ok) { refused++; console.log(`REFUSED ${r.slot} "${r.text}": ${JSON.stringify(out).slice(0, 300)}`); continue; }
      const c = out.charsSpent || out.wouldSpendChars || 0; chars += c;
      if (out.audioId) map[`${r.slot}|${r.text}`] = out.audioId;
      console.log(`${out.source}${out.dryRun ? ' (dry)' : ''} ${r.slot} "${r.text}" ${c} chars ${out.audioId || ''}`);
    }
    console.log(`TOTAL ${apply ? 'spent' : 'would spend'} ${chars} chars over ${reqs.length} clips, ${refused} refused`);
    if (opt('--out')) fs.writeFileSync(opt('--out'), JSON.stringify(map, null, 1));
  }
}
