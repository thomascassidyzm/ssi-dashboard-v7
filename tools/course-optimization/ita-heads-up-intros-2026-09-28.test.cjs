// node --test tools/course-optimization/ita-heads-up-intros-2026-09-28.test.cjs
const test = require('node:test');
const assert = require('node:assert');
const T = require('./ita-heads-up-intros-2026-09-28.cjs');
test("every heads-up line is in Kai's template, quotes its LEGO in full, and its example carries the reporting verb", () => {
  for (const l of T.LINES) {
    assert.deepEqual(T.lineRules(l), [], l.legoId);
    assert.equal(l.text, `The Italian for '${l.lego.known}' in phrases like '${l.example}' is:`);
  }
  assert.equal(T.LINES.find(l => l.legoId === 'S0544L02').text, "The Italian for 'it would be difficult' in phrases like 'he said it would be difficult' is:");
});
test('the rules catch a line with no reporting verb, brackets, or a grammar term', () => {
  const bad = { legoId: 'X', lego: { known: 'it would be difficult' }, example: 'it would be difficult to say', text: "The Italian for 'it would be difficult' (conditional) in phrases like 'it would be difficult to say' is:" };
  assert.deepEqual(T.lineRules(bad), ['example has no reporting verb', 'brackets', 'grammar term']);
});
