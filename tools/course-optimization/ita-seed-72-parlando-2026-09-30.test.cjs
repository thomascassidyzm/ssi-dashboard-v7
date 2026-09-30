'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { SEED_TO, L02, L03, EDITS, planProblems, containsWords } = require('./ita-seed-72-parlando-2026-09-30.cjs');

test('the plan holds: LEGOs tile the seed, every basket row holds the whole L02, subjunctive, no idiom', () => {
  assert.deepStrictEqual(planProblems(), []);
  assert.strictEqual(`${L02.to.target} ${L03.target}`, SEED_TO.target);
});
test('the pre-fix rows (andare bene) fail the same containment guard', () => {
  for (const e of EDITS) assert.strictEqual(containsWords(e.before.target, L02.to.target), false, e.id);
});
