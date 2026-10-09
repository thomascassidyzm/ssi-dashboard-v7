// Pins Tom's 2026-10-09 ruling (r-2026-10-09-phrase-vocabulary-is-checked-at-the): a
// conjugated form is vocabulary only if THAT form has appeared. An earlier infinitive
// does not license it, in the target language or when the target is English.
const test = require('node:test');
const assert = require('node:assert');
const { exactFormCheck } = require('./exact-form.cjs');

const FRENCH_TAUGHT = ['espérer', 'vendre l\'entreprise', 'nous', 'je veux'];

test('"nous espérions" is rejected when only "espérer" has been taught', () => {
  const r = exactFormCheck('nous espérions vendre l\'entreprise', FRENCH_TAUGHT);
  assert.strictEqual(r.ok, false);
  assert.deepStrictEqual(r.offending, ['espérions']);
  assert.match(r.reason, /espérions/);
});

test('"nous espérions" is accepted once that exact form was taught (fra_for_eng seed 107)', () => {
  const r = exactFormCheck('nous espérions vendre l\'entreprise', [...FRENCH_TAUGHT, 'nous espérions']);
  assert.strictEqual(r.ok, true);
});

test('a different conjugation of a taught verb does not license this one', () => {
  const r = exactFormCheck('j\'espérais vendre l\'entreprise', [...FRENCH_TAUGHT, 'nous espérions']);
  assert.strictEqual(r.ok, false);
  assert.ok(r.offending.includes('j\'espérais'));
});

test('English as target: "we hoped" needs "hoped", not "hope"', () => {
  assert.strictEqual(exactFormCheck('we hoped to sell it', ['we', 'to sell it', 'hope']).ok, false);
  assert.strictEqual(exactFormCheck('we hoped to sell it', ['we', 'to sell it', 'we hoped']).ok, true);
});

test('accents are not folded: "espere" is not "espéré"', () => {
  assert.strictEqual(exactFormCheck('j\'espère', ['j\'espere']).ok, false);
});

test('known words in an untaught chunk order still fail the whole-chunk tiling', () => {
  const r = exactFormCheck('vendre nous', ['nous', 'vendre l\'entreprise']);
  assert.strictEqual(r.ok, false);
});
