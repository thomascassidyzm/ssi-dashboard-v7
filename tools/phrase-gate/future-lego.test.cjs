/**
 * futureLego (Tom, 2026-09-27): a phrase may never use a LEGO the learner has
 * not met — strictly earlier in course order, including later LEGOs of the SAME
 * seed. The specimen is ita S0002L01 "I'm trying to learn", which borrowed
 * S0002L02 "imparare" and passed the seed-wide vocab gate.
 *
 * Run: node --test tools/phrase-gate/future-lego.test.cjs
 */
const test = require('node:test');
const assert = require('node:assert');
const { futureTileViolations, isAfter } = require('./gate-check.cjs');

test('a later LEGO of the same seed is a future LEGO', () => {
  assert.strictEqual(isAfter('ita_for_eng:S0002L02', 2, 1), true);
  assert.strictEqual(isAfter('S0002L01', 2, 1), false, 'the LEGO itself is not in its own future');
  assert.strictEqual(isAfter('S0001L03', 2, 1), false);
  assert.strictEqual(isAfter('S0003L01', 2, 5), true);
});

test('the ita S0002L01 specimen is caught by its tiles', () => {
  const v = futureTileViolations([
    { known: "I'm trying to learn Italian", target: 'sto provando a imparare italiano',
      tiles: [{ legoId: 'S0002L01' }, { legoId: 'S0002L02' }, { legoId: 'S0001L03' }] },
    { known: "I'm trying to speak", target: 'sto provando a parlare',
      tiles: [{ legoId: 'S0002L01' }, { legoId: 'S0001L02' }] },
  ], 2, 1);
  assert.strictEqual(v.length, 1);
  assert.deepStrictEqual(v[0].later, ['S0002L02']);
});
