'use strict';
// node --test tools/course-optimization/ita-couldnt-potere-2026-09-29.test.cjs
// Job #889·I: plain "couldn't" is potere. The rule FAILS on the pre-fix rows (S0311L01 "he couldn't | non riusciva a" beside
// S0313L01's "non poteva"; S0148L02 "I couldn't | non riuscivo a" beside S0384L01's "non potevo") and PASSES once the plan is applied.
// Managed-to seeds (433, 518…) are never judged.
const test = require('node:test');
const assert = require('node:assert');
const T = require('./ita-couldnt-potere-2026-09-29.cjs');

const R = (kind, sn, id, known, target) => ({ kind, sn, id, known, target });
const pre = () => [
  R('lego', 311, 'S0311L01', "he couldn't", 'non riusciva a'),
  R('build', 311, 'S0311L01B01', "he couldn't", 'non riusciva a'),
  R('component', 311, 'S0311L01C02', 'he managed', 'riusciva'),
  R('component', 311, 'S0311L01C03', 'to', 'a'),
  R('use', 311, 'S0311L01U01', "he couldn't speak Italian very well", 'non riusciva a parlare italiano molto bene'),
  R('build', 313, 'S0313L01B02', "he couldn't", 'non poteva'),
  R('component', 148, 'S0148L02C01', "I couldn't", 'non riuscivo a'),
  R('use', 148, 'S0148L02U01', "I couldn't answer this", 'non riuscivo a rispondere a questo'),
  R('build', 384, 'S0384L01B01', "I couldn't", 'non potevo'),
  R('build', 433, 'S0433L01B02', "they couldn't find out", 'non sono riusciti a scoprire'),
  R('use', 518, 'S0518L04B02', "I couldn't imagine", 'non riuscivo a immaginarmi'),
];

test('the rule fails on the pre-fix rows', () => {
  const probs = T.endStateProblems(pre());
  assert.ok(probs.some((p) => p.startsWith('S0311L01B01')), probs.join('\n'));
  assert.ok(probs.some((p) => p.startsWith('S0148L02U01')));
  assert.ok(probs.some((p) => p.startsWith('ZUT: "he couldn\'t"')));
});
test('the rule holds once the plan is applied, and managed-to rows are left alone', () => {
  const after = T.applyPlanToRows(pre());
  assert.deepStrictEqual(T.endStateProblems(after), []);
  assert.ok(after.find((r) => r.id === 'S0433L01B02').target.includes('riusciti'));
  assert.ok(after.find((r) => r.id === 'S0518L04B02').target.includes('riuscivo'));
  assert.ok(!after.some((r) => r.id === 'S0311L01C03'), 'the "to|a" tile goes');
  assert.strictEqual(after.find((r) => r.id === 'S0311L01C02').target, 'poteva');
});
test('swap forms and the new sentences', () => {
  assert.strictEqual(T.toPotere('non era paziente quando non riuscivo a rispondere'), 'non era paziente quando non potevo rispondere');
  assert.strictEqual(T.toPotere('non riusciva a credere ai fatti'), 'non poteva credere ai fatti');
  assert.ok(!/riusc/.test(T.SPECIAL.S0311L01U01.target) && !/remember|ricordare/.test(T.SPECIAL.S0311L02B02.target));
  assert.strictEqual(T.femaleReading('mi sentivo nervoso'), 'mi sentivo nervosa');
});
