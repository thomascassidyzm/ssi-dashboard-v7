// node --test tools/north-s0264l01-rhai-170.test.cjs
const test = require('node:test');
const assert = require('node:assert');
const { plan } = require('./north-s0264l01-rhai-170.cjs');

const seg = (target, legoId) => ({ known: 'x', legoId, target, isGhost: false });
const lego = { id: 'u1', target_text: 'rhan o’r', known_text: 'part of the', components: null };
const seed = { id: 's1', target_text: 'rhan o’r problem ydy nad ydan ni ddim yn gwybod y ffeithiau', known_text: 'part of the problem is that we don’t know the facts' };
const ph = (id, s, i, text, decomposition) => ({ id: `c:${id}`, seed_number: s, lego_index: i, target_text: text, known_text: '', decomposition });

test('the LEGO changes; singular-noun phrases and the seed stay and are listed', () => {
  const { edits, left } = plan({ lego, seed, phrases: [ph('S0264L01U01', 264, 1, 'rhan o’r siop', [seg('rhan o’r', 'S0264L01'), seg(' siop', 'S0258L01')])] });
  assert.deepStrictEqual(edits.map((e) => [e.label, e.set.target_text, e.set.known_text]), [['S0264L01', 'rhai o’r', 'some of the']]);
  assert.deepStrictEqual(edits[0].set.components.map((c) => c.target), ['rhai', 'o’r']);
  assert.ok(left.some((l) => l.startsWith('seed S0264')));
  assert.ok(left.some((l) => l.startsWith('S0264L01U01')));
});

test('a rhan o’r tile from seed 1457 on moves to S1457L01; before 1457 it is listed, never guessed', () => {
  const { edits, left } = plan({ lego, seed, phrases: [
    ph('S1466L04B02', 1466, 4, 'rhan o’r wal', [seg('rhan o’r', 'S0264L01'), seg(' wal', 'S0261L04')]),
    ph('S0266L01B01', 266, 1, 'cynnig rhan o’r problem', [seg('cynnig', 'S0265L03'), seg(' rhan o’r', 'S0264L01'), seg(' problem', null)]),
  ] });
  const moved = edits.find((e) => e.label === 'S1466L04B02');
  assert.strictEqual(moved.set.decomposition[0].legoId, 'S1457L01');
  assert.strictEqual(moved.set.decomposition[1].legoId, 'S0261L04');
  assert.ok(!edits.some((e) => e.label === 'S0266L01B01'));
  assert.ok(left.some((l) => l.startsWith('S0266L01B01')));
});

test('S1457L02 rhai o’r tiles are checked, not rewritten', () => {
  const { edits, checks } = plan({ lego, seed, phrases: [ph('S1457L02B01', 1457, 2, 'rhai o’r ardaloedd', [seg('rhai o’r', 'S0264L01'), seg(' ardaloedd', 'S1457L02')])] });
  assert.strictEqual(edits.length, 1);
  assert.match(checks[0], /already right/);
});
