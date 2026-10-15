'use strict';
// Job #449: fra_for_eng seed 18 — "to meet | nous rencontrer" grows to "we want to meet | nous voulons nous rencontrer"
// (K40). The fixture is seed 18's live rows as they stood on 2026-10-14 before the edit, cut down to what the rule reads.
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('./fra-seed-18-we-want-to-meet-2026-10-14.cjs');

const L = (seed, idx, known, target, round, components = null) => ({ lego_id: `S${String(seed).padStart(4, '0')}L0${idx}`, seed_number: seed, lego_index: idx, known_text: known, target_text: target, round_index: round, components });
const Ph = (id, role, known, target) => ({ id: `fra_for_eng:${id}`, seed_number: +id.slice(1, 5), lego_index: +id.slice(7, 8), phrase_role: role, known_text: known, target_text: target });

const PRE = {
  seeds: [{ seed_number: 18, known_text: "we want to meet at six o'clock this evening", target_text: 'nous voulons nous rencontrer à six heures ce soir' }],
  legos: [
    L(18, 1, 'we want', 'nous voulons', 56, [{ known: 'we', target: 'nous' }, { known: 'want', target: 'voulons' }]),
    L(18, 2, 'to meet', 'nous rencontrer', 57, [{ known: 'meet', target: 'rencontrer' }, { known: 'to meet', target: 'nous rencontrer' }]),
    L(18, 3, "at six o'clock", 'à six heures', 58), L(18, 4, 'this evening', 'ce soir', 59),
    L(1, 1, 'I want', 'je veux', 1), L(16, 3, 'later on', 'plus tard', 50),
  ],
  phrases: [
    Ph('S0018L02B01', 'build', 'to meet', 'nous rencontrer'),
    Ph('S0018L02B02', 'build', 'we want to meet', 'nous voulons nous rencontrer'),
    Ph('S0018L02B04', 'build', 'to meet tomorrow', 'nous rencontrer demain'),
    Ph('S0018L02B05', 'build', 'to meet later on', 'nous rencontrer plus tard'),
    Ph('S0018L03B02', 'build', "to meet at six o'clock", 'nous rencontrer à six heures'),
  ],
};

test('pre-fix seed 18 teaches the reflexive "nous rencontrer" without its "nous voulons" (K40 finding)', () => {
  const ids = T.bareReflexiveMeet(T.promptRows(PRE)).map((r) => r.id);
  assert.ok(ids.includes('S0018L02'), 'the LEGO itself is bare');
  assert.ok(ids.includes('fra_for_eng:S0018L02B04') && ids.includes('fra_for_eng:S0018L03B02'));
});

test('post-fix: the LEGO is "we want to meet | nous voulons nous rencontrer" and no prompt in the fixture is bare', () => {
  const post = T.applyPlan(PRE);
  const lego = post.legos.find((l) => l.lego_id === 'S0018L02');
  assert.equal(lego.known_text, 'we want to meet');
  assert.equal(lego.target_text, 'nous voulons nous rencontrer');
  assert.ok(!lego.components.some((c) => c.target === 'nous rencontrer'), 'the ruled-out pair is not re-offered as a tile');
  assert.deepEqual(T.bareReflexiveMeet(T.promptRows(post)), []);
  assert.ok(!post.phrases.some((p) => p.id.endsWith('S0018L02B01')), 'B01 (exact duplicate of B02 after the growth) is deleted');
  // P17: every remaining row under L02 contains the whole grown LEGO
  for (const p of post.phrases.filter((x) => x.seed_number === 18 && x.lego_index === 2)) assert.ok(T.containsWords(p.target_text, lego.target_text), p.id);
});

test('L01 "we want" is kept, never deleted, and seed 154 is held rather than changed', () => {
  assert.ok(T.applyPlan(PRE).legos.some((l) => l.lego_id === 'S0018L01' && l.target_text === 'nous voulons'));
  assert.ok(!T.REWRITES.some(([s]) => s.startsWith('S015')));
  assert.ok(T.HELD.seed154.rows.includes('seed 154'));
});
