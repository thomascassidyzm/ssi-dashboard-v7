'use strict';
// job #504: S0540L04's basket opens on the build-up ladder; fails on the pre-fix basket, passes once the plan is applied.
const test = require('node:test');
const assert = require('node:assert');
const M = require('./deu-ausmachen-540-2026-10-14.cjs');

const row = (n, known, target, position) => ({ id: `deu_for_eng:S0540L04B${String(n).padStart(2, '0')}`, seed_number: 540, lego_index: 4, position, phrase_role: 'build', known_text: known, target_text: target, introduce: true });
const pre = {
  legos: [{ lego_id: 'S0540L04', seed_number: 540, lego_index: 4, known_text: 'to mind', target_text: 'ausmachen', is_new: true }],
  phrases: [row(1, "she doesn't mind", 'es macht ihr nichts aus', 1), row(2, "if you don't mind", 'wenn es dir nichts ausmacht', 2)],
};

test('pre-fix basket does not open with the ladder', () => {
  assert.ok(M.invariants(pre).length > 0);
});
test('applied plan opens with the ladder, positions 1..n, old rows kept and shifted', () => {
  const post = M.applyPlan(pre);
  assert.deepStrictEqual(M.invariants(post), []);
  assert.strictEqual(post.phrases.find((p) => p.id.endsWith('B01')).position, 4);
});
test('ops shift top-down so no two rows share a position', () => {
  const ops = M.textOps(pre).filter((o) => o.op === 'phrase.update');
  assert.deepStrictEqual(ops.map((o) => o.set.position), [5, 4]);
});

test('audio linking refuses a render map missing a required clip before a batch can be emitted', () => {
  const complete = Object.fromEntries(M.wanted(pre).map((r) => [`${r.role}|${r.text}`, '11111111-1111-4111-8111-111111111111']));
  delete complete['target2|ausmachen'];
  assert.throws(() => M.linkOps(pre, complete));
});
