'use strict';
// The rules behind job #650·I (Kai, 2026-09-28, P27 applied to l'ho / l'hai / te l'ho): each test fails on the
// BEFORE texts and passes on the AFTER texts.
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('./ita-early-clitics-lho-lhai-telho-2026-09-28.cjs');

// What the live course teaches (read 2026-09-28): l'ho at S0309L02; l'hai and te l'ho in no LEGO at all.
const taughtAt = new Map([["l'ho", 309], ["l'avrei", 153], ["me l'ha", 367], ["me l'avessi", 599]]);
const rows = (side) => T.CHANGES.map(c => ({ id: c.id, seed: Number(c.id.slice(1, 5)), target: c[side].target }));

test("P27: all 12 rows use l'ho / l'hai / te l'ho before their teaching seed BEFORE; none AFTER", () => {
  assert.equal(T.CHANGES.length, 12);
  const before = T.usedBeforeTaught(rows('before'), taughtAt);
  assert.equal(before.length, 12);
  assert.deepEqual(new Set(before.map(b => b.token)), new Set(T.FORMS));
  assert.equal(before.filter(b => b.token === "l'ho").length, 10);
  assert.equal(before.find(b => b.token === "l'hai").taughtAt, null);
  assert.equal(before.find(b => b.token === "te l'ho").taughtAt, null);
  assert.deepEqual(T.usedBeforeTaught(rows('after'), taughtAt), []);
  // a use AT or after the teaching seed is fine
  assert.deepEqual(T.usedBeforeTaught([{ id: 'x', seed: 309, target: "non l'ho mai vista prima" }, { id: 'y', seed: 519, target: "non l'ho ancora visto" }], taughtAt), []);
  assert.deepEqual(T.cliticTokens("te l'ho già detto"), ["te l'ho"]);
  assert.deepEqual(T.cliticTokens('ti ho già detto tutto'), []);
});

test('P17: every rewritten row still contains its LEGO on both sides, and no row was deleted', () => {
  for (const c of T.CHANGES) {
    const l = T.LEGOS[c.lego];
    assert.equal(T.containsChunk(c.after.target, l.target), true, `${c.id} target`);
    assert.equal(T.containsChunk(c.after.known, l.known), true, `${c.id} known`);
  }
  // The bound spelling hid the LEGO: "l'hai sentito?" under "hai sentito" failed strict containment BEFORE (L28), and passes AFTER.
  const b03 = T.CHANGES.find(c => c.id === 'S0196L01B03');
  assert.equal(T.containsChunk(b03.before.target, T.LEGOS.S0196L01.target), false);
  assert.equal(T.containsChunk(b03.after.target, T.LEGOS.S0196L01.target), true);
});

test('the rewrites reach for objects the learner already has, never a new clitic; sibling seeds untouched', () => {
  const objects = ['quello', 'tutto', 'qualcosa', 'i soldi', 'il libro', 'il tuo amico'];
  for (const c of T.CHANGES) {
    const after = T.norm(c.after.target);
    assert.equal(/(^|\s)(gliel|me l|te l|ce l|ve l|se l|l)'/.test(after), false, `${c.id} still bound: "${after}"`);
    assert.equal(objects.some(o => T.containsChunk(after, o)), true, `${c.id}: "${after}" reaches for no taught object`);
  }
  for (const n of T.SEED_NUMBERS) assert.equal(T.SIBLING_SEEDS.includes(n), false, `seed ${n} belongs to a sibling job`);
});
