'use strict';
// The rules behind job #579·I (Kai, 2026-09-28): each test fails on the BEFORE cut and passes on the AFTER cut.
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('./ita-seed-609-recut-2026-09-28.cjs');

test('K28 limit: a LEGO carrying "stata" must carry the noun it agrees with — the old L02 did not, the new one does', () => {
  assert.equal(T.agreementCarriesItsNoun(T.OLD_L02, T.AGREEMENT_609), false);
  assert.equal(T.agreementCarriesItsNoun(T.NEW_L02, T.AGREEMENT_609), true);
  // the rejected smaller cut: a bare "would have been | sarebbe stata" LEGO has the same defect
  assert.equal(T.agreementCarriesItsNoun({ known: 'would have been', target: 'sarebbe stata' }, T.AGREEMENT_609), false);
});

test('the LEGO is a piece of its seed on both sides: "it would have been to ask" was not, the new L02 is; components tile', () => {
  assert.equal(T.legoInSeed(T.SEED_609, T.OLD_L02), false);
  assert.equal(T.legoInSeed(T.SEED_609, T.NEW_L02), true);
  assert.equal(T.componentsTile(T.NEW_L02), true);
});

test('L01 + new L02 cover the whole seed, both sides', () => {
  assert.deepEqual(T.uncovered(T.SEED_609, [T.NEW_L02, T.L01]), { known: '', target: '' });
});

test('O12: every non-component row under L02 contains the new LEGO contiguously on both sides; before, none did', () => {
  for (const c of T.CHANGES.filter(c => c.role !== 'component')) {
    assert.equal(T.containsChunk(c.after.known, T.NEW_L02.known) && T.containsChunk(c.after.target, T.NEW_L02.target), true, c.id);
    assert.equal(T.containsChunk(c.before.known, T.NEW_L02.known), false, `${c.id} before`);
  }
  for (const k of T.KEPT) assert.equal(T.containsChunk(k.known, T.NEW_L02.known) && T.containsChunk(k.target, T.NEW_L02.target), true, k.id);
  assert.deepEqual(T.CHANGES.filter(c => c.role === 'component').map(c => c.after), T.NEW_L02.components);
});
