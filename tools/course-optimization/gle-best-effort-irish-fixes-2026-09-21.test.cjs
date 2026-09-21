// The best-effort gle_for_eng pass of 2026-09-21, pinned. Fails on the pre-fix
// shapes and passes on the post-fix ones; the try zone is asserted untouched.
// Run alone: node --test tools/course-optimization/gle-best-effort-irish-fixes-2026-09-21.test.cjs
const test = require('node:test');
const assert = require('node:assert');
const { SEEDS, LEGOS, PHRASES, MAITH_RULE } = require('./gle-best-effort-irish-fixes-2026-09-21.cjs');

test('the copula relative: a bhfuil sé maith leo -> ar maith leo, and ar daoine lenites', () => {
  const pre = 'tá aithne agam ar daoine a bhfuil sé maith leo Gaeilge a fhoghlaim';
  assert.match(pre, /bhfuil sé maith leo/);
  assert.strictEqual(MAITH_RULE(pre), 'tá aithne agam ar dhaoine ar maith leo Gaeilge a fhoghlaim');
  assert.strictEqual(MAITH_RULE('a bhfuil sé maith ag cabhrú'), 'a bhfuil sé maith ag cabhrú', '"good at" is a different construction and stays');
});
test('no bare "X a fhios agam" survives; every replacement is one of the two taught shapes', () => {
  for (const p of PHRASES) {
    assert.match(p.tb, /a fhios ag/);
    assert.ok(/a fhios a bheith ag(am|at)\b/.test(p.ta) || /a bheith ar eolas ag(am|at)\b/.test(p.ta) || /atá ar eolas agat/.test(p.ta), p.id);
    assert.doesNotMatch(p.ta.replace(/a fhios a bheith ag/g, ''), /a fhios ag/, p.id);
  }
});
test('the try zone is untouched: seeds 2, 6, 146, 236, 407, 541, 579 absent; no try form changes in any phrase', () => {
  for (const n of [2, 6, 146, 236, 407, 541, 579, 39, 41, 147, 354, 455, 542, 548, 555, 575, 576, 550, 272]) assert.ok(!SEEDS.some(s => s.n === n), `seed ${n} must not be edited`);
  for (const p of PHRASES) assert.deepStrictEqual(p.ta.match(/ag triail|ag iarraidh/g), p.tb.match(/ag triail|ag iarraidh/g), p.id);
});
test('seed grammar: masculine comhartha, plural áille, sular bhog, copula b\'é, and the cuma-ar shape on 551-553', () => {
  const by = n => SEEDS.find(s => s.n === n).after;
  assert.strictEqual(by(459), 'Ní raibh sé os comhair an chomhartha ghoirm');
  assert.match(by(486), /áille$/);
  assert.match(by(506), /sular bhog muid$/);
  assert.match(by(608), /^b'é sin/);
  for (const n of [551, 552, 553]) assert.match(by(n), /cuma (an-)?ghránna ar an séipéal/);
  assert.ok(LEGOS.every(l => !/bhfuil sé maith|a fhios agam$/.test(l.after.target)));
});
