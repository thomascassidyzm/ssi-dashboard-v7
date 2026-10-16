'use strict';
// Job #188: fra_for_eng seed 154 keeps its French; English = "where do you want us to meet on Saturday night?"; new LEGO
// S0154L03 "do you want us to meet | voulez-vous nous rencontrer". Pure plan invariants (no DB). Run: node --test <this file>
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('./fra-seed-154-want-us-to-meet-2026-10-16.cjs');

test('the LEGO is a contiguous slice of the new seed, and every basket row contains it whole (P17)', () => {
  assert.ok(T.NEW_SEED_KNOWN.includes(T.LEGO.known));
  assert.ok('où voulez-vous nous rencontrer samedi soir?'.includes(T.LEGO.target));
  for (const [s, , k, t] of T.BASKET) {
    assert.ok(k.includes(T.LEGO.known), `${s} known`);
    assert.ok(t.includes(T.LEGO.target), `${s} target`);
  }
  assert.ok(T.BASKET.some(([s, , k]) => s === 'U08' && k === T.NEW_SEED_KNOWN), 'seed sentence is in the basket (P26)');
});

test('the five twins: French of the three later rows is unchanged, English now says "want us to meet"', () => {
  for (const [s, , ft, k, t] of T.REWRITES.slice(2)) { assert.equal(t, ft, s); assert.match(k, /want us to meet/, s); }
  // the two rows under LEGOs taught before L03 no longer lean on "us to meet" (untaught there)
  for (const [s, , , k, t] of T.REWRITES.slice(0, 2)) { assert.doesNotMatch(k, /meet/, s); assert.doesNotMatch(t, /rencontrer/, s); }
});

test('no basket row repeats another, and no old "want to meet | nous rencontrer" pairing survives in the plan', () => {
  const keys = T.BASKET.map(([, , k, t]) => `${k}|${t}`);
  assert.equal(new Set(keys).size, keys.length);
  for (const [, , , k, t] of T.REWRITES) assert.ok(!(/want to meet/.test(k) && /nous rencontrer/.test(t)));
});
