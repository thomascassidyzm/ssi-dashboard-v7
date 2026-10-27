const { test } = require('node:test');
const assert = require('node:assert');
const { practiseVerbs, jesd } = require('./practise-jesd-apply-341.cjs');

test('verb practice → practise, forms and case kept', () => {
  assert.strictEqual(practiseVerbs('I want to practice speaking'), 'I want to practise speaking');
  assert.strictEqual(practiseVerbs('instead of practicing'), 'instead of practising');
  assert.strictEqual(practiseVerbs('Practice so I can remember'), 'Practise so I can remember');
  assert.strictEqual(practiseVerbs('he practiced hard'), 'he practised hard');
});
test('noun practice is left alone and listed', () => {
  const un = [];
  assert.strictEqual(practiseVerbs('a practice session', un), null);
  assert.strictEqual(practiseVerbs('I need more practice', un), null);
  assert.strictEqual(un.length, 2);
  assert.strictEqual(practiseVerbs('already practise'), null);
});
test('jyst → jesd, capital kept, whole words only', () => {
  assert.strictEqual(jesd('Jyst un'), 'Jesd un');
  assert.strictEqual(jesd('dw i jyst eisiau'), 'dw i jesd eisiau');
  assert.strictEqual(jesd('jesd'), null);
});
