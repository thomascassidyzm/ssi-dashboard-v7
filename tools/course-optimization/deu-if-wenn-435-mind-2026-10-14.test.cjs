'use strict';
// job #513: S0435L01 is "if | wenn", not new; no conditional wenn row says "when". Fails on the pre-fix course, passes after the plan.
const test = require('node:test');
const assert = require('node:assert');
const M = require('./deu-if-wenn-435-mind-2026-10-14.cjs');

const pre = {
  seeds: [],
  legos: [
    { lego_id: 'S0413L03', seed_number: 413, lego_index: 3, known_text: 'if', target_text: 'wenn', is_new: true },
    { lego_id: 'S0435L01', seed_number: 435, lego_index: 1, known_text: 'when', target_text: 'wenn', is_new: true },
  ],
  phrases: [{ id: 'deu_for_eng:S0435L01B03', seed_number: 435, lego_index: 1, position: 3, phrase_role: 'build', known_text: 'they could when they wanted', target_text: 'sie könnten, wenn sie wollten' }],
};
test('pre-fix course breaks the ruling', () => {
  assert.ok(M.invariants(pre).some((p) => /S0435L01 must be/.test(p)));
  assert.ok(M.invariants(pre).some((p) => /conditional wenn glossed "when"/.test(p)));
});
test('applying the plan makes the ruling hold', () => {
  const l = M.applyPlan(pre).legos.find((x) => x.lego_id === 'S0435L01');
  assert.deepStrictEqual([l.known_text, l.is_new], ['if', false]);
  const post = { ...M.applyPlan(pre), phrases: M.applyPlan(pre).phrases };
  assert.ok(!M.invariants(post).some((p) => /S0435L01 must be|conditional wenn/.test(p)));
});
