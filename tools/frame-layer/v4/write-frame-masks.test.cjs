const test = require('node:test');
const assert = require('node:assert');
const { MemoryCache } = require('../frame-tagger.cjs');
const { maskOf, plan } = require('./write-frame-masks.cjs');

test('P1 is bit 0 and P31 is bit 30, so every mask fits a signed integer', () => {
  assert.strictEqual(maskOf(['P1']), 1);
  assert.strictEqual(maskOf(['P31']), 1 << 30);
  assert.ok(maskOf(['P1', 'P31']) > 0);
  assert.strictEqual(maskOf([]), 0);
  assert.strictEqual(maskOf(null), null);
  assert.strictEqual(maskOf(['P0', 'P32', 'O', 'x']), 0);
});

test('a cached text gets its mask, an uncached one stays NULL and is counted, components are never written', () => {
  const cache = new MemoryCache({ 'I want to go': ['P1'], 'to go': ['P5'], 'I want to go tomorrow': ['P1', 'P28'] });
  const rows = {
    seeds: [{ seed_number: 1, known_text: 'I want to go tomorrow', frame_mask: null }],
    phrases: [
      { id: 'c:S0001L01B01', phrase_role: 'build', known_text: 'I  WANT to go', frame_mask: null },
      { id: 'c:S0001L01U01', phrase_role: 'use', known_text: 'not in the cache', frame_mask: null },
      { id: 'c:S0001L01C01', phrase_role: 'component', known_text: 'to go', frame_mask: null },
    ],
  };
  const { ops, count } = plan(rows, cache);
  assert.deepStrictEqual(ops, [
    { op: 'seed.update', seed_number: 1, set: { frame_mask: 1 | (1 << 27) }, expect: { frame_mask: null, known_text: 'I want to go tomorrow' } },
    { op: 'phrase.update', phrase_id: 'c:S0001L01B01', set: { frame_mask: 1 }, expect: { frame_mask: null, known_text: 'I  WANT to go' } },
  ]);
  assert.strictEqual(count.use.stay_null, 1);
  assert.strictEqual(count.component.covered, 1);
  assert.strictEqual(count.component.to_write, 0);
});

test('a row already right is not rewritten, and a non-null mask is never set to NULL', () => {
  const cache = new MemoryCache({ 'hello': ['P2'] });
  const { ops, count } = plan({ seeds: [], phrases: [
    { id: 'a', phrase_role: 'use', known_text: 'hello', frame_mask: 2 },
    { id: 'b', phrase_role: 'use', known_text: 'gone from the cache', frame_mask: 8 },
  ] }, cache);
  assert.deepStrictEqual(ops, []);
  assert.strictEqual(count.use.unchanged, 1);
  assert.strictEqual(count.use.stay_null, 1);
});

// cs #984 (lane review #977 P2): the tool read 'I work' (mask null, cached P1) and planned mask 1; an editor then
// changed the text to 'I worked', mask still null. The op must carry the read text so the drift check refuses it.
test('every planned write asserts the exact known_text it was derived from, for seeds and BUILD/USE phrases', () => {
  const cache = new MemoryCache({ 'I work': ['P1'] });
  const { ops } = plan({
    seeds: [{ seed_number: 9, known_text: 'I work', frame_mask: null }],
    phrases: [
      { id: 'b', phrase_role: 'build', known_text: 'I work', frame_mask: null },
      { id: 'u', phrase_role: 'use', known_text: 'I work', frame_mask: null },
    ],
  }, cache);
  assert.strictEqual(ops.length, 3);
  for (const op of ops) assert.deepStrictEqual(op.expect, { frame_mask: null, known_text: 'I work' });
  // What the drift check sees after the edit: the asserted text no longer matches the locked row.
  const lockedRow = { known_text: 'I worked', frame_mask: null };
  assert.ok(Object.entries(ops[0].expect).some(([c, v]) => lockedRow[c] !== v));
});
