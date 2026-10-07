/**
 * THE RULE (review #119): the words a cut indexes are the SAME words the cache
 * key is built from. The key folds tabs, newlines and carriage returns into
 * spaces (frame-tagger keyOf), so "I go\rif you go" shares the cut cached for
 * "I go if you go"; the split must then read the same five words, or the cut
 * lands on the wrong one.
 *
 * Run: node --test tools/frame-layer/clause-cut.test.cjs
 */
const test = require('node:test');
const assert = require('node:assert');
const C = require('./clause-cut.cjs');
const T = require('./frame-tagger.cjs');
const { installCuts } = require('./tag-fixtures.cjs');

test('a text that shares a cache key with another splits at the same word', () => {
  installCuts({ 'I go if you go': 3 });
  for (const text of ['I go if you go', 'I go\rif you go', 'I go\r\nif you go', 'I go\tif you go']) {
    assert.strictEqual(T.keyOf(text), T.keyOf('I go if you go'));
    assert.deepStrictEqual(C.splitAtCut(text), { matrix: 'I go', connective: 'if', rest: 'you go' }, JSON.stringify(text));
  }
});

test('the numbered words the model sees are the words the cut indexes', () => {
  assert.ok(C.render(['I go\rif you go']).includes('I(1) go(2) if(3) you(4) go(5)'));
});
