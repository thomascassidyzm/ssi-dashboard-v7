// node:test — run with: node --test tools/frame-layer/v4/apply-gap-fill.test.cjs
const test = require('node:test');
const assert = require('node:assert');
const { planInsert } = require('./apply-gap-fill.cjs');

const live = [
  { id: 'fra_for_eng:S0351L02B03', seed_number: 351, lego_index: 2, position: 3, known_text: 'b', target_text: 'b' },
  { id: 'fra_for_eng:S0351L02U07', seed_number: 351, lego_index: 2, position: 10, known_text: 'I am here', target_text: 'je suis ici' },
];
const row = (role, k, t) => ({ seed_number: 351, lego_index: 2, phrase_role: role, known_text: k, target_text: t, lego_target: 'suis', window: '351-360', frames: [] });

test('ids and positions continue past the highest existing ones — never reuse an id', () => {
  const { rows } = planInsert('fra_for_eng', [row('use', 'I am new', 'je suis nouveau'), row('build', 'am new', 'suis nouveau')], live);
  assert.deepStrictEqual(rows.map(r => r.id), ['fra_for_eng:S0351L02U08', 'fra_for_eng:S0351L02B04']);
  assert.deepStrictEqual(rows.map(r => r.position), [11, 12]);
  assert.ok(rows.every(r => !live.some(e => e.id === r.id)));
});

test('a row already on the LEGO is skipped, so a second apply adds nothing', () => {
  const { rows, skipped } = planInsert('fra_for_eng', [row('use', 'I am here', 'je suis ici')], live);
  assert.strictEqual(rows.length, 0);
  assert.strictEqual(skipped.length, 1);
});
