'use strict';
// The rules behind job #576·I (Kai, 2026-09-28): each test fails on the BEFORE state and passes on the AFTER state.
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('./ita-seed-348-notnew-and-203-dup-2026-09-28.cjs');

test('the LEGO is a piece of its seed on both sides: the old L01 was not, the new L01 is', () => {
  assert.equal(T.legoInSeed(T.SEED_348, T.OLD_L01), false);
  assert.equal(T.legoInSeed(T.SEED_348, T.NEW_L01), true);
  assert.equal(T.componentsTile(T.NEW_L01), true);
});

test('L27(2): the new L01 duplicates S0201L03 on BOTH sides, so it is not new; the old one did not', () => {
  const S0201L03 = { known: 'what was going to happen', target: 'che cosa sarebbe successo' };
  assert.equal(T.sameLegoBothSides(T.OLD_L01, S0201L03), false);
  assert.equal(T.sameLegoBothSides(T.NEW_L01, S0201L03), true);
  assert.equal(T.NEW_L01.is_new, false);
  // same Italian under a different English is NOT a duplicate (Kai, 2026-09-23)
  assert.equal(T.sameLegoBothSides({ known: 'what would have happened', target: 'che cosa sarebbe successo' }, S0201L03), false);
});

test('O12: every non-component row contains the LEGO both sides after; before, none contained it on the English side', () => {
  for (const c of T.CHANGES.filter(c => c.role !== 'component')) {
    assert.equal(T.containsWords(c.after.known, T.NEW_L01.known) && T.containsWords(c.after.target, T.NEW_L01.target), true, c.id);
    assert.equal(T.containsWords(c.before.known, T.NEW_L01.known), false, `${c.id} before`);
  }
  assert.deepEqual(T.CHANGES.filter(c => c.role === 'component').map(c => c.after), T.NEW_L01.components);
});

test('L27 coverage: after the change the seed still has an untaught piece, and it is exactly "she didn\'t want to know"', () => {
  assert.deepEqual(T.uncovered(T.SEED_348, [T.NEW_L01]), { known: "she didn't want to know", target: 'non voleva sapere' });
});

test('seed 203: U02 and U03 are word-for-word duplicates and the HIGHER position is the one dropped', () => {
  assert.equal(T.sameRow(T.DUP_ROWS[0], T.DUP_ROWS[1]), true);
  assert.equal(T.rowToDrop(T.DUP_ROWS[0], T.DUP_ROWS[1]).id, 'S0203L01U03');
  assert.equal(T.rowToDrop(T.DUP_ROWS[1], T.DUP_ROWS[0]).id, 'S0203L01U03');
  assert.equal(T.rowToDrop(T.DUP_ROWS[0], { ...T.DUP_ROWS[1], known: 'I want to know what you would say' }), null);
});
