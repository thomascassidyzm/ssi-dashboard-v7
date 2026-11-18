'use strict';
// node --test tools/course-optimization/spa-kai-rulings-2026-10-30.test.cjs
// Scope and shape of Kai's 30 Oct spa_for_eng rulings (job #223): what is parked, ruled NO or not yet decided stays out.
const test = require('node:test');
const assert = require('node:assert');
const D = require('./spa-kai-rulings-2026-10-30.data.cjs');

const ids = Object.values(D.PHRASES).flat().map((r) => r[0]);

test('parked, NO and not-yet items are not touched: 44a (seeds 5-13), 127 (seed 200 L04U10), 77 (seed 148)', () => {
  for (const id of ids) {
    const seed = Number(id.slice(1, 5));
    assert.ok(seed > 13 || id.startsWith('S0007L0') || id.startsWith('S0012L01B01'), `${id}: seeds 5-13 are 44a, parked (only the intentar rows of 7 and 12 are in)`);
    assert.notStrictEqual(seed, 148, `${id}: seed 148 (item 77) waits for #221`);
  }
  assert.ok(!ids.includes('S0200L04U10'), 'item 127 was ruled NO');
  assert.ok(!D.SEEDS.some(([n]) => n === 148 || n === 200 || (n >= 5 && n <= 13)));
});

test('every row is listed once, and a row names something to change', () => {
  assert.strictEqual(new Set(ids).size, ids.length);
  for (const r of Object.values(D.PHRASES).flat()) assert.ok(r[1] != null || r[2] != null, r[0]);
});

test('the practicar revert is the pattern only: bare "practicar hablando", no English "speaking Spanish with"', () => {
  for (const [id, k, t] of D.PHRASES['44-revert']) {
    assert.ok(!/practicar el español hablando/i.test(t), id);
    assert.ok(/practicar hablando/i.test(t), id);
    assert.ok(!/speaking Spanish with/i.test(k), id);
  }
});

test('intentar: below seed 146 no "intentarlo"; from 146 the English says "it"', () => {
  for (const [id, k, t] of D.PHRASES[16]) {
    const seed = Number(id.slice(1, 5));
    if (seed < 146) assert.ok(!/intentarlo/i.test(t || ''), id);
    else assert.ok(/\btry(ing)? it\b/i.test(k), id);
  }
});

test('no LEGO is deleted: every re-cut keeps its LEGO, and the jugar-a pattern is a new LEGO after "different"', () => {
  assert.ok(D.LEGOS.every((l) => l.set && !l.delete));
  assert.deepStrictEqual([D.NEW_LEGO.row.seed_number, D.NEW_LEGO.row.lego_index, D.NEW_LEGO.row.target_text], [98, 5, 'jugar a algo']);
  assert.ok(D.NEW_BASKET.build.length >= 3 && D.NEW_BASKET.use.length >= 5, 'basket floor');
  for (const [, t] of [...D.NEW_BASKET.build, ...D.NEW_BASKET.use]) assert.ok(/jugar a algo/i.test(t), t);
});
