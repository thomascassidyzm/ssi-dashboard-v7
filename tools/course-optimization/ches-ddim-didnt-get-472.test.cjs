const { test } = require('node:test');
const assert = require('node:assert');
const { didntGet } = require('./ches-ddim-didnt-get-472.cjs');

test("negative past of cael: 'didn't have' → 'didn't get', rest kept", () => {
  assert.strictEqual(didntGet('I didn’t have time', 'ches i ddim amser'), 'I didn’t get time');
  assert.strictEqual(didntGet("I didn't have time, although I wanted to see you", 'ches i ddim amser, er bo’ fi isio gweld chdi'), "I didn't get time, although I wanted to see you");
  assert.strictEqual(didntGet('you didn’t have', 'chest ti ddim'), 'you didn’t get');
  assert.strictEqual(didntGet('I heard that you didn’t have time', 'clywes i na chest ti amser'), 'I heard that you didn’t get time');
});
test('other didn’t-have lines and already-get lines are untouched', () => {
  assert.strictEqual(didntGet('I didn’t have a book', 'doedd gen i ddim llyfr'), null);
  assert.strictEqual(didntGet('I didn’t have anywhere', 'doedd ’da ni ddim unman'), null);
  assert.strictEqual(didntGet('you didn’t get', 'chest ti ddim'), null);
  assert.strictEqual(didntGet('I had time', 'ces i amser'), null); // positive: not part of this ruling
});
test('two didn’t-have clauses are left for a human', () => {
  assert.strictEqual(didntGet('I didn’t have time and I didn’t have money', 'ches i ddim amser a doedd gen i ddim arian'), null);
});
