// node:test — run with: node --test tools/frame-layer/v4/quality-judge.test.cjs
const test = require('node:test');
const assert = require('node:assert');
const { parseCuts } = require('./quality-judge.cjs');

test('a reply carrying a second JSON object after the verdict still parses (#924, ara_eg crash)', () => {
  const m = parseCuts('{"cut":[{"n":2,"why":"calque {x}"}]}\n\n{"note":"extra"}', 5);
  assert.deepStrictEqual([...m.keys()], [2]);
});

test('a reply with no verdict at all is null, so the batch is cut rather than passed', () => {
  assert.strictEqual(parseCuts('I could not judge these.', 5), null);
});
