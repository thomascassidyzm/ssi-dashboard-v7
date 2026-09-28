'use strict';
// The proving test for ita-608p8-618p8-ten-calls-2026-09-28.cjs: every rule fails on the BEFORE state and passes on the AFTER state.
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('./ita-608p8-618p8-ten-calls-2026-09-28.cjs');

test('P17: the three penso-che phrases did not contain their LEGO before and do after', () => {
  for (const id of ['S0112L01U03', 'S0126L03U02', 'S0520L01U02']) {
    const c = T.CHANGES.find(x => x.id === id);
    assert.equal(T.phraseContainsLego(c.before, T.LEGOS[c.lego]), false, `${id} before`);
    assert.equal(T.phraseContainsLego(c.after, T.LEGOS[c.lego]), true, `${id} after`);
  }
});
test('608 pos 8: the sensata insertion still contains "the thing to do | la cosa da fare" under the live gate', () => {
  const c = T.CHANGES.find(x => x.id === 'S0608L03U03');
  assert.equal(T.phraseContainsLego(c.after, T.LEGOS.S0608L03), true);
});
test('618 pos 8: "il modo da fare" flagged before, gone after, LEGO still contained', () => {
  const c = T.CHANGES.find(x => x.id === 'S0618L01U03');
  assert.equal(T.modoDaFare(c.before.target), true);
  assert.equal(T.modoDaFare(c.after.target), false);
  assert.equal(T.phraseContainsLego(c.after, T.LEGOS.S0618L01), true);
});
test('396: ancora after the adjective before, before it after', () => {
  const c = T.CHANGES.find(x => x.id === 'S0396L05U05');
  assert.equal(T.ancoraAfterAdjective(c.before.target), true);
  assert.equal(T.ancoraAfterAdjective(c.after.target), false);
});
test('K29 (Kai\'s component rule): bare "successo" is unsettled by the old 201 components and settled by the new; speravo settled as is', () => {
  const lego201 = { lego_id: 'S0201L03', ...T.LEGOS.S0201L03 };
  assert.equal(T.bareWordSettled('successo', 'target', [{ ...lego201, components: T.OLD_COMPONENTS }]), false);
  assert.equal(T.bareWordSettled('successo', 'target', [{ ...lego201, components: T.NEW_COMPONENTS }]), true);
  assert.equal(T.bareWordSettled('speravo', 'target', [{ components: [{ known: 'I was hoping', target: 'speravo' }, { known: 'would happen', target: 'succedesse' }] }]), true);
  assert.equal(T.bareWordSettled('speravo', 'target', [{ components: [{ known: 'I was hoping would happen', target: 'speravo succedesse' }] }]), false);
});
test('L4: the new components tile both LEGOs', () => {
  for (const r of T.RECUT) assert.equal(T.componentsTile({ ...T.LEGOS[r.lego_id], components: T.NEW_COMPONENTS }), true, r.lego_id);
});
