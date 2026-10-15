const test = require('node:test');
const assert = require('node:assert/strict');
const { planAnswers } = require('./apply-phrase-review-answers.cjs');

const plan = text => planAnswers([{ id: 'S0001L01B01', choice: 'own', text }], [{ id: 'S0001L01B01' }]);

test('an English replacement preserves an apostrophe inside the quoted sentence', () => {
  const edits = plan("Change the English to 'I don't know'");
  assert.equal(edits[0].to, 'I don’t know');
});

test('a Welsh rhai swap preserves an explicit English replacement', () => {
  const edits = plan("change rhai to unrhyw and the English to 'anything'");
  assert.equal(edits.find(e => e.field === 'known_text').to, 'anything');
});
