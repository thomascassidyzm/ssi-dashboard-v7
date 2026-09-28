'use strict';
// The proving test for job #590·I: the pure rules fail on the BEFORE rows and pass on the AFTER rows.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const T = require('./ita-seed-608-phrases-609-notnew-2026-09-28.cjs');

test('every BEFORE row carries a 608 defect (right-without-giusta, più-without-most, or seemed/era) and every AFTER row is clean', () => {
  for (const c of T.CHANGES) {
    const beforeDefect = T.rightWithoutGiusta(c.before) || T.piuWithoutMost(c.before) || /seemed/.test(c.before.known);
    assert.ok(beforeDefect, `${c.id} before "${c.before.known}" → "${c.before.target}" should read as defective`);
    assert.ok(!T.rightWithoutGiusta(c.after), `${c.id} after still says "right" without giusta`);
    assert.ok(!T.piuWithoutMost(c.after), `${c.id} after still has più without "most"`);
  }
});
test('rightWithoutGiusta accepts a row where the Italian really has giusta', () => {
  assert.equal(T.rightWithoutGiusta({ known: 'this is the right thing to do', target: 'questa è la cosa giusta da fare' }), false);
  assert.equal(T.rightWithoutGiusta({ known: 'this is the right thing to do', target: 'questa è la cosa da fare' }), true);
});
test('every AFTER row still contains its LEGO on both sides, contiguously', () => {
  for (const c of T.CHANGES) assert.ok(T.rowContainsLego(c.after, T.LEGOS[c.lego]), `${c.id} lost ${c.lego}`);
});
test('S0609L02 is NOT NEW: tiled by 608 L01+L03 and already met as a 608 phrase; a one-side match is not a duplicate', () => {
  const earlierLegos = [T.LEGOS.S0608L01, T.LEGOS.S0608L02, T.LEGOS.S0608L03];
  const met = [{ known: 'the sensible thing to do', target: 'la cosa sensata da fare' }];
  assert.equal(T.debutStatus(T.NOT_NEW, { earlierLegos, earlierPhrasePairs: met }), 'not-new');
  assert.equal(T.debutStatus(T.NOT_NEW, { earlierLegos, earlierPhrasePairs: [] }), 'new', 'tiled but never met as a phrase → still new');
  assert.equal(T.debutStatus(T.NOT_NEW, { earlierLegos: [...earlierLegos, { known: 'the sensible thing to do', target: 'la cosa sensata da fare' }], earlierPhrasePairs: met }), 'duplicate');
  assert.equal(T.debutStatus(T.NOT_NEW, { earlierLegos: [...earlierLegos, { known: 'the sensible thing to do', target: 'la cosa ragionevole da fare' }], earlierPhrasePairs: met }), 'not-new', 'same English, different Italian is not a duplicate');
  assert.equal(T.debutStatus({ known: 'the right thing to do', target: 'la cosa giusta da fare' }, { earlierLegos, earlierPhrasePairs: met }), 'new', 'a piece nobody taught (giusta) → new');
});
test('containment is the live gate rule: "the most sensible thing to do" carries "the thing to do" split, as every 608 L03 row does', () => {
  assert.equal(T.containsWords('it would have been the most sensible thing to do', 'the thing to do'), true);
  assert.equal(T.containsWords('it would have been the most sensible thing', 'the thing to do'), false);
  assert.equal(T.minusWords('the sensible thing to do', 'the thing to do'), 'sensible');
});
test('piuWithoutMost sees più (non-ASCII word boundary)', () => {
  assert.equal(T.piuWithoutMost({ known: "that's the sensible thing to say", target: 'è la cosa più sensata da dire' }), true);
  assert.equal(T.piuWithoutMost({ known: "that's the most sensible thing to say", target: 'è la cosa più sensata da dire' }), false);
});
