#!/usr/bin/env node
'use strict';
// tools/course-optimization/deu-s0534-reorder-2026-10-14.cjs  (job #499, step 2)
//
// KAI, 2026-10-14, after step 1 (deu-s0534-weather-recut-2026-10-14.cjs) went live: teach "weather | Wetter" BEFORE
// "dreadful", because dreadful alone is hard to build phrases with — the order is go outside · weather · dreadful ·
// in this dreadful weather. Wetter is first taught here (seed 534), so it stays. "outside | draußen" is not in his list
// but is not one of the two LEGOs he allowed deleting, so it stays as the first step towards "go outside" (his first
// brief: outside → go outside). Final order:
//   L01 outside | draußen · L02 go outside | nach draußen gehen · L03 weather | Wetter · L04 dreadful | schrecklichen ·
//   L05 in this dreadful weather | bei diesem schrecklichen Wetter        (L06 "to | nach" not new, awaits lego.delete)
// The edit door cannot re-index a LEGO, so the three rows ROTATE: each LEGO's words, clips, intro and whole basket
// (same suffix B01…U07 → same suffix) move to their new index. No text is new, so no audio is rendered.
//
// Writes ONLY through Popty's edit-batch door. Reads from the sanctioned dump. No SQL here.
//   node …/deu-s0534-reorder-2026-10-14.cjs check  <dump.json>     # the rotation is well-formed on this dump
//   node …/deu-s0534-reorder-2026-10-14.cjs verify <dump.json>     # the live course holds the final order
//   node …/deu-s0534-reorder-2026-10-14.cjs ops    <dump.json> --out ops.json

const fs = require('fs');
const T = require('./p26-early-placement-sweep-2026-10-06.cjs');

const COURSE = 'deu_for_eng';
const P = (s) => `${COURSE}:${s}`;
// [destination, source]: the destination takes the source's LEGO, intro, clips and basket
const ROTATE = [['S0534L01', 'S0534L02'], ['S0534L02', 'S0534L03'], ['S0534L03', 'S0534L01']];
const BEFORE = { S0534L01: ['weather', 'Wetter'], S0534L02: ['outside', 'draußen'], S0534L03: ['go outside', 'nach draußen gehen'] };
const ORDER = [['outside', 'draußen'], ['go outside', 'nach draußen gehen'], ['weather', 'Wetter'], ['dreadful', 'schrecklichen'],
  ['in this dreadful weather', 'bei diesem schrecklichen Wetter']];
const SLOT_COL = { known: 'known_audio_id', target1: 'target1_audio_id', target2: 'target2_audio_id', presentation: 'presentation_audio_id' };
const LEGO_COLS = ['known_text', 'target_text', 'type', 'components'];
const suffix = (p) => p.id.slice(P('S0534L01').length);
const basket = (d, lego) => d.phrases.filter((p) => p.id.startsWith(P(lego)));
const legoKey = (p) => `S${String(p.seed_number).padStart(4, '0')}L${String(p.lego_index).padStart(2, '0')}`;

/** Final state holds: seed 534's new LEGOs in Kai's order, each basket drills its own LEGO, no word of a LEGO's basket
 *  is first taught by a later LEGO of the seed. */
function invariants(d) {
  const problems = [];
  const legos = d.legos.filter((l) => l.seed_number === 534 && l.is_new !== false).sort((a, b) => a.lego_index - b.lego_index);
  const got = legos.map((l) => [l.known_text, l.target_text]);
  if (JSON.stringify(got) !== JSON.stringify(ORDER)) problems.push(`seed 534 new LEGOs are ${got.map((g) => g.join(' | ')).join(' · ')}`);
  const byId = new Map(d.legos.map((l) => [l.lego_id, l]));
  const first = T.firstIntro(d.legos);
  for (const p of d.phrases.filter((x) => x.seed_number === 534 && x.phrase_role !== 'component')) {
    const l = byId.get(legoKey(p)); if (!l || l.is_new === false) continue;
    if (!T.containsWords(p.target_text, l.target_text) || !T.containsWords(p.known_text, l.known_text)) problems.push(`${p.id} does not drill ${l.lego_id}`);
    const ut = T.untaughtAt(p.target_text, l, first);
    if (ut.length) problems.push(`${p.id} says ${ut} before it is taught`);
  }
  return problems;
}

function rotated(dump) {
  const src = new Map(ROTATE);
  const legos = dump.legos.map((l) => {
    if (!src.has(l.lego_id)) return l;
    const s = dump.legos.find((x) => x.lego_id === src.get(l.lego_id));
    const out = { ...l }; for (const c of [...LEGO_COLS, ...Object.values(SLOT_COL)]) out[c] = s[c]; return out;
  });
  const phrases = dump.phrases.map((p) => {
    const dest = p.id.slice(COURSE.length + 1, COURSE.length + 9);
    if (!src.has(dest)) return p;
    const s = dump.phrases.find((x) => x.id === P(src.get(dest)) + suffix(p));
    return { ...p, known_text: s.known_text, target_text: s.target_text, known_audio_id: s.known_audio_id, target1_audio_id: s.target1_audio_id, target2_audio_id: s.target2_audio_id };
  });
  return { ...dump, legos, phrases };
}

function checkPlan(dump) {
  const problems = [];
  for (const [id, [k, t]] of Object.entries(BEFORE)) {
    const l = dump.legos.find((x) => x.lego_id === id);
    if (!l || l.known_text !== k || l.target_text !== t || !l.is_new) problems.push(`${id} drifted`);
  }
  for (const [dest, src] of ROTATE) {
    const a = basket(dump, dest).map(suffix).sort().join(), b = basket(dump, src).map(suffix).sort().join();
    if (a !== b) problems.push(`${dest} basket [${a}] and ${src} basket [${b}] differ in shape`);
  }
  if (!problems.length) problems.push(...invariants(rotated(dump)));
  return problems;
}

function editOps(dump) {
  const ops = [];
  const lego = (id) => dump.legos.find((x) => x.lego_id === id);
  for (const [dest, src] of ROTATE) {
    const d = lego(dest), s = lego(src);
    const set = {}; for (const c of LEGO_COLS) set[c] = s[c];
    ops.push({ op: 'lego.update', lego_id: dest, expect: { known_text: d.known_text, target_text: d.target_text }, set });
  }
  for (const [dest, src] of ROTATE) {
    const s = lego(src);
    for (const [slot, col] of Object.entries(SLOT_COL)) if (s[col]) ops.push({ op: 'audio.link', target: 'lego', lego_id: dest, slot, audio_id: s[col] });
    if (s.presentation_audio_id) ops.push({ op: 'audio.update', audio_id: s.presentation_audio_id, set: { lego_id: dest } });
    for (const p of basket(dump, dest)) {
      const q = dump.phrases.find((x) => x.id === P(src) + suffix(p));
      ops.push({ op: 'phrase.update', phrase_id: p.id, expect: { known_text: p.known_text, target_text: p.target_text }, set: { known_text: q.known_text, target_text: q.target_text } });
      for (const slot of ['known', 'target1', 'target2']) if (q[SLOT_COL[slot]]) ops.push({ op: 'audio.link', target: 'phrase', phrase_id: p.id, slot, audio_id: q[SLOT_COL[slot]] });
    }
  }
  return ops;
}

module.exports = { ROTATE, ORDER, invariants, rotated, checkPlan, editOps };

if (require.main === module) {
  const [cmd, dumpPath, ...rest] = process.argv.slice(2);
  if (!cmd || !dumpPath) { console.error('usage: check|verify|ops <dump.json> [--out ops.json]'); process.exit(1); }
  const dump = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));
  if (cmd === 'check' || cmd === 'verify') {
    const pr = cmd === 'check' ? checkPlan(dump) : invariants(dump);
    console.log(pr.length ? pr.join('\n') : cmd === 'check' ? 'rotation clean' : 'course holds the order'); process.exit(pr.length ? 2 : 0);
  } else if (cmd === 'ops') {
    const i = rest.indexOf('--out'); const out = i >= 0 ? rest[i + 1] : 'ops.json';
    const ops = editOps(dump); fs.writeFileSync(out, JSON.stringify({ ops }, null, 1)); console.log(`${ops.length} ops → ${out}`);
  }
}
