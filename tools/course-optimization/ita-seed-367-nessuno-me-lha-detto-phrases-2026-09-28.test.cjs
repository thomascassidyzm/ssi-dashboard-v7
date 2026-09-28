'use strict';
// Proves the 367 fix (job #638·I): FAILS on the BEFORE rows, PASSES on the AFTER rows.
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('./ita-seed-367-nessuno-me-lha-detto-phrases-2026-09-28.cjs');

test('BEFORE: six use rows double the object ("me l\'ha detto che/di …") — the defect Kai named', () => {
  const doubled = T.BEFORE_367.filter(r => T.doublesTheObject(r.target)).map(r => r.id);
  assert.deepEqual(doubled, ['S0367L01U01', 'S0367L01U02', 'S0367L01U03', 'S0367L01U04', 'S0367L01U05', 'S0367L01U06']);
});
test('AFTER: no row under S0367L01 doubles the object or states an object beside l\'', () => {
  for (const r of T.AFTER_367) {
    assert.equal(T.doublesTheObject(r.target), false, `${r.id} "${r.target}"`);
    assert.equal(T.statesAnObjectBesideLo(r.target), false, `${r.id} "${r.target}"`);
  }
});
test('every row under S0367L01, before and after, contains the whole LEGO on both sides (P17)', () => {
  for (const r of [...T.BEFORE_367, ...T.AFTER_367]) assert.ok(T.rowContainsLego(r, T.LEGOS.S0367L01), `${r.id} "${r.known}" → "${r.target}"`);
});
test('every edited or added row contains its own LEGO; the knock-on rows use the natural "nessuno mi ha detto"', () => {
  for (const r of [...T.EDITS, ...T.NEW_ROWS]) assert.ok(T.rowContainsLego(r, T.LEGOS[r.lego]), r.id);
  for (const r of T.EDITS.filter(e => e.seed !== 367)) {
    assert.ok(T.doublesTheObject(r.before.target) || /nessuno mi ha detto$/.test(T.norm(r.before.target)), `${r.id} before was not defective`);
    assert.match(T.norm(r.target), /\bnessuno mi ha detto (che|niente)\b/);
  }
});
test('Kai\'s limit is a rule, not a feeling: "nobody told me anything" must not be written with me l\'ha detto', () => {
  assert.equal(T.statesAnObjectBesideLo("nessuno me l'ha detto niente"), true);
  assert.equal(T.statesAnObjectBesideLo("nessuno me l'ha detto prima di oggi"), false);
});
test('the seed sentence and the bare LEGO are untouched; the LEGO components tile the Italian', () => {
  assert.deepEqual(T.AFTER_367.find(r => r.id === 'S0367L01B03'), T.BEFORE_367.find(r => r.id === 'S0367L01B03'));
  assert.equal(T.LEGOS.S0367L01.components.map(c => c.target).join(' '), T.LEGOS.S0367L01.target);
});
