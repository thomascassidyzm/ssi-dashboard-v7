'use strict';
// Proves the rule of job #635·I (Kai, 2026-09-28 22:52Z): every seed sentence sits in a PLAYED basket — a phrase
// under a NEW LEGO (canon P25) — and the home is chosen own-last-new → nearest-earlier (vocabulary-checked) →
// earliest-later → listed. On the pre-fix ita_for_eng data (269 seed sentences in no played basket) `plan` returns
// rows; on the post-fix data it returns none for those seeds. The fixture below reproduces both states.
const test = require('node:test');
const assert = require('node:assert');
const T = require('./ita-seed-sentences-in-played-baskets-2026-09-28.cjs');

const legos = [
  { lego_id: 'S0001L01', seed_number: 1, lego_index: 1, is_new: true, known_text: 'I want', target_text: 'voglio' },
  { lego_id: 'S0001L02', seed_number: 1, lego_index: 2, is_new: true, known_text: 'now', target_text: 'adesso' },
  { lego_id: 'S0002L01', seed_number: 2, lego_index: 1, is_new: false, known_text: 'now', target_text: 'adesso' },   // 348-shaped: no new LEGO
  { lego_id: 'S0003L01', seed_number: 3, lego_index: 1, is_new: true, known_text: 'she should', target_text: 'dovrebbe' }, // gloss ≠ seed
];
const seeds = [
  { seed_number: 1, known_text: 'I want it now', target_text: 'lo voglio adesso', target1_audio_id: 'a' },
  { seed_number: 2, known_text: 'now I want it', target_text: 'adesso lo voglio', target1_audio_id: 'a' },
  { seed_number: 3, known_text: 'yes I think she ought to', target_text: 'sì, penso che dovrebbe', target1_audio_id: 'a' },
];
const dark = { id: 'ita_for_eng:S0002L01U01', seed_number: 2, lego_index: 1, position: 1, phrase_role: 'use', known_text: 'now I want it', target_text: 'adesso lo voglio', is_new: false, lego_id: 'S0002L01' };
const wordTaught = () => 1; // everything taught at seed 1

test('a seed sentence under a not-new LEGO is dark, not covered (P25)', () => {
  const cov = T.seedSentenceCoverage(seeds[1], [dark]);
  assert.deepStrictEqual(cov, { played: [], dark: ['ita_for_eng:S0002L01U01'] });
  assert.strictEqual(T.phraseIsPlayed(dark, { S0002L01: legos[2] }), false);
});

test('pre-fix: uncovered seeds get a row under a NEW LEGO they contain; post-fix: none', () => {
  const before = T.plan({ seeds, legos, phrases: [dark], wordTaught }, { skip: [] });
  assert.strictEqual(before.census.uncovered, 3);
  assert.deepStrictEqual(before.rows.map(r => [r.seed, r.lego_id, r.why]), [
    [1, 'S0001L02', 'own last new LEGO'],
    [2, 'S0001L02', 'nearest earlier new LEGO (2 candidates)'],   // the 348 → S0201L03 shape
  ]);
  assert.deepStrictEqual(before.rows.map(r => r.id), ['S0001L02U01', 'S0001L02U02']); // sequenced under one LEGO
  assert.strictEqual(before.listed.length, 1);
  assert.match(before.listed[0].why, /no NEW LEGO in the course whose pair the sentence contains/); // 328-shaped: listed, never invented
  // apply on paper, re-plan: nothing left
  const added = before.rows.map(r => ({ id: `ita_for_eng:${r.id}`, seed_number: r.lego_seed, lego_index: r.lego_index, position: r.position, phrase_role: 'use', known_text: r.known, target_text: r.target, is_new: true, lego_id: r.lego_id }));
  const after = T.plan({ seeds, legos, phrases: [dark, ...added], wordTaught }, { skip: [] });
  assert.strictEqual(after.rows.length, 0);
  assert.strictEqual(after.census.covered, 2);
});

test('a seed whose English already stands over a different Italian is listed as ZUT, not added (P16)', () => {
  const clash = { ...dark, id: 'ita_for_eng:S0001L01U01', seed_number: 1, lego_id: 'S0001L01', is_new: true, known_text: 'I want it now', target_text: 'voglio adesso' };
  const p = T.plan({ seeds: [seeds[0]], legos, phrases: [clash], wordTaught }, { skip: [] });
  assert.strictEqual(p.rows.length, 0);
  assert.match(p.listed[0].why, /^ZUT/);
});

test('sibling-job seeds are skipped and listed, never written', () => {
  const p = T.plan({ seeds, legos, phrases: [], wordTaught }, { skip: [1] });
  assert.deepStrictEqual(p.skipped.map(s => s.seed), [1]);
  assert.ok(!p.rows.some(r => r.seed === 1));
});

test('the other routes are reported, never relied on: seed-phase needs a new LEGO ≥144 rounds before the end; cups cap at 600', () => {
  const r = T.otherRoutes(seeds[1], legos);
  assert.deepStrictEqual(r, { seedPhase: false, cup: true });
  assert.strictEqual(T.SEED_PHASE_START_OFFSET, 144);
  assert.strictEqual(T.CUP_CAP, 600);
});
