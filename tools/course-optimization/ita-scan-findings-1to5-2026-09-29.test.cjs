// node --test tools/course-optimization/ita-scan-findings-1to5-2026-09-29.test.cjs
const test = require('node:test');
const assert = require('node:assert');
const t = require('./ita-scan-findings-1to5-2026-09-29.cjs');

test("the apostrophe-less 'per un po' cannot sit under the LEGO \"per un po'\" — the edit is what makes the move legal", () => {
  const lego = t.LEGOS.S0180L02;
  assert.strictEqual(t.rowContainsLego({ known: 'do you want to think about it for a while?', target: 'vuoi pensare a questo per un po?' }, lego), false);
  const m = t.MOVES.find((x) => x.from === 'S0091L01U02');
  assert.strictEqual(t.rowContainsLego(m.after, lego), true);
});
test('every move lands under a LEGO it contains, on both sides, and goes forward', () => {
  for (const m of t.MOVES) {
    assert.ok(t.rowContainsLego(m.after, t.LEGOS[m.lego]), m.to);
    assert.ok(+m.from.slice(1, 5) < m.seed, m.to);
  }
});
test('the untouchable seeds are not in scope', () => {
  for (const s of t.SEEDS) assert.ok(!t.FORBIDDEN_SEEDS.includes(s), String(s));
});
test('S0647L01B01 is the LEGO itself, madam on both sides (K32)', () => {
  assert.strictEqual(t.B01_EDIT.after.known, 'you speak it madam');
  assert.strictEqual(t.B01_EDIT.after.target, 'lei lo parla, signora');
});
