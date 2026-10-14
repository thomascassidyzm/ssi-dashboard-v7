const test = require('node:test');
const assert = require('node:assert');
const { regloss } = require('./cat-s0176-able-to-help-325.cjs');

test('re-glosses only the S0176L01 tile', () => {
  const d = [{ known: 'if', legoId: 'S0010L03' }, { known: 'will manage to help', legoId: 'S0176L01', isSalient: true }];
  const out = regloss(d);
  assert.strictEqual(out[1].known, 'will be able to help');
  assert.strictEqual(out[1].isSalient, true);
  assert.strictEqual(out[0].known, 'if');
});
test('leaves unrelated or already-fixed decompositions alone', () => {
  assert.strictEqual(regloss([{ known: 'will manage to help', legoId: 'S0999L01' }]), null);
  assert.strictEqual(regloss([{ known: 'will be able to help', legoId: 'S0176L01' }]), null);
});
