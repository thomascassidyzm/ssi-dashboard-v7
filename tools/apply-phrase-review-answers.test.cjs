const test = require('node:test');
const assert = require('node:assert/strict');
const { planAnswers } = require('./apply-phrase-review-answers.cjs');
test('quoted instructions retain internal apostrophes in both languages', () => {
  const result = planAnswers([{ id: 'x', choice: 'own', text: "change Welsh to 'mae'n dda' and the English to 'it's good'" }], [{ id: 'x' }]);
  assert.deepEqual(result.map(x => x.to), ['mae’n dda', 'it’s good']);
});
test('English-first instructions keep each replacement within its own field', () => {
  const result = planAnswers([{ id: 'x', choice: 'own', text: "change English to 'good' and change Welsh to 'da'" }], [{ id: 'x' }]);
  assert.deepEqual(result.map(({ field, to }) => ({ field, to })), [
    { field: 'target_text', to: 'da' },
    { field: 'known_text', to: 'good' },
  ]);
});
