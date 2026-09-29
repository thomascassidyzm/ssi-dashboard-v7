'use strict';
// Proves the S0228 re-cut: the rules it applies FAIL on the pre-fix LEGOs (which no longer sit in the edited seed)
// and PASS on the new cut. Run: node --test tools/course-optimization/eus-edited-seeds-fix-2026-09-29.test.cjs
const test = require('node:test');
const assert = require('node:assert');
const M = require('./eus-edited-seeds-fix-2026-09-29.cjs');

test('pre-fix S0228 LEGOs are not in the edited seed (the defect)', () => {
  const old = M.OLD_228.legos.map(l => ({ ...l, components: [] }));
  assert.ok(old.every(l => !M.legoInSeed(l, M.SEED_228)), 'both old LEGOs are absent from the seed text');
  assert.ok(M.problems228(old, []).length >= 2);
});
test('post-fix S0228 cut tiles the seed and every phrase carries its LEGO', () => {
  assert.deepStrictEqual(M.checkPlan(), []);
  assert.ok(M.NEW_228_LEGOS.every(l => M.legoInSeed(l, M.SEED_228)));
});
test('component fixes: the new components tile their LEGO, the old ones do not', () => {
  const lego = { 'S0234L03': 'zure anaiarekin', 'S0006L02': 'gogoratzen saiatzen ari naiz', 'S0029L02': 'gogoa dut' };
  for (const f of M.COMPONENT_FIXES) {
    const target = lego[f.lego];
    assert.ok(!M.componentsTile({ target, components: f.fromComponents }), `${f.lego} old components must not tile`);
    assert.ok(M.componentsTile({ target, components: f.toComponents }), `${f.lego} new components must tile`);
  }
});
