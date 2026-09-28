'use strict';
// The rules behind job #579·I (Kai, 2026-09-28): each test fails on a BEFORE cut and passes on the final cut.
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('./ita-seed-609-recut-2026-09-28.cjs');

test('K28 limit / K27: a row carrying "stata" carries the noun it agrees with — #577·I\'s L02 did not; every row after does', () => {
  assert.equal(T.agreementCarriesItsNoun(T.ORIGINAL_L02, T.AGREEMENT_609), false);
  assert.equal(T.agreementCarriesItsNoun({ known: 'would have been', target: 'sarebbe stata' }, T.AGREEMENT_609), false);
  for (const c of T.CHANGES) assert.equal(T.agreementCarriesItsNoun(c.after, T.AGREEMENT_609), true, c.id);
  assert.equal(T.agreementCarriesItsNoun({ target: 'la prima cosa sarebbe stata chiedere' }, T.AGREEMENT_609), true);
});

test('Kai 19:00Z: two LEGOs, no would-have-been LEGO; L02 is the S0243L02 shape and its components tile', () => {
  assert.equal(T.legoInSeed(T.SEED_609, T.ORIGINAL_L02), false);
  assert.equal(T.legoInSeed(T.SEED_609, T.NEW_L02), true);
  assert.equal(T.componentsTile(T.NEW_L02), true);
  for (const l of [T.L01, T.NEW_L02]) assert.equal(T.containsChunk(l.known, 'would have been') || T.containsChunk(l.target, 'sarebbe stata'), false, l.id);
  // before this pass L02 carried "sarebbe stata"
  assert.equal(T.containsChunk(T.OLD_L02.target, 'sarebbe stata'), true);
});

test('coverage: the only piece of the seed in no LEGO is the phrase-carried "would have been / sarebbe stata"', () => {
  assert.deepEqual(T.uncovered(T.SEED_609, [T.NEW_L02, T.L01]), T.CARRIED_BY_PHRASES);
});

test('O12: every changed non-component row contains its LEGO contiguously on both sides; L01 gains would-have-been rows and the full seed', () => {
  for (const c of T.CHANGES.filter(c => c.role !== 'component')) {
    const l = T.LEGOS_AFTER[c.lego];
    assert.equal(T.containsChunk(c.after.known, l.known) && T.containsChunk(c.after.target, l.target), true, c.id);
  }
  const l01 = T.CHANGES.filter(c => c.lego === 'S0609L01').map(c => c.after);
  assert.ok(l01.filter(r => T.containsChunk(r.target, 'sarebbe stata chiedere')).length >= 3);
  assert.ok(l01.some(r => r.known === T.SEED_609.known && r.target === T.SEED_609.target));
  assert.deepEqual(T.CHANGES.filter(c => c.role === 'component').map(c => c.after), T.NEW_L02.components);
});
