'use strict';
// A phrase using a word before the seed whose LEGO teaches it is a finding; once that LEGO is at or before it, it is not.
const test = require('node:test');
const assert = require('node:assert');
const T = require('./por-untaught-word-phrases-2026-10-02.cjs');
test('S0112L03U01 disso is a finding while disso is first taught at 162, not if taught at 100', () => {
  const d = T.DELETES.S0112L03U01;
  assert.strictEqual(T.violates([{ seed_number: 162, target_text: 'o que é que achas disso' }], 'S0112L03U01', d), true);
  assert.strictEqual(T.violates([{ seed_number: 100, target_text: 'disso' }], 'S0112L03U01', d), false);
});
