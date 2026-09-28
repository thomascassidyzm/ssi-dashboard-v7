'use strict';
// The proving test for the second half of job #621·I: the player's rule (a phrase plays only under an is_new LEGO)
// FAILS on every source row (all under not-new LEGOs) and PASSES on every landing row (all under new LEGOs, containing them).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const T = require('./ita-rehome-drill-phrases-under-new-legos-2026-09-28.cjs');

test('every moved row was UNPLAYED before (not-new LEGO) and is PLAYED after (new LEGO)', () => {
  for (const m of T.MOVES) {
    assert.equal(T.phraseIsPlayed({ lego: m.from.slice(0, 8) }, T.LEGOS), false, `${m.from} was already played`);
    assert.equal(T.phraseIsPlayed({ lego: m.lego }, T.LEGOS), true, `${m.to} still unplayed`);
  }
  for (const a of T.ADDS) assert.equal(T.phraseIsPlayed({ lego: a.lego }, T.LEGOS), true, a.id);
  for (const d of T.DELETES) assert.equal(T.phraseIsPlayed({ lego: d.id.slice(0, 8) }, T.LEGOS), false, `${d.id} deleted although it played`);
});
test('every landing row contains its NEW LEGO on both sides (live gate word rule)', () => {
  for (const r of T.LANDING) assert.ok(T.rowContainsLego(r, T.LEGOS[r.lego]), `${r.id} "${r.known}" → "${r.target}" lacks ${r.lego}`);
});
test('the one edited row changed only its English, and only to bring the LEGO in', () => {
  const edited = T.MOVES.filter(m => m.edit);
  assert.equal(edited.length, 1);
  const m = edited[0];
  assert.equal(m.to, 'S0340L01U07');
  assert.equal(T.rowContainsLego({ known: m.known, target: m.target }, T.LEGOS.S0340L01), false, 'the pre-edit English did not contain "I\'m sure that"');
  assert.equal(T.rowContainsLego(m.after, T.LEGOS.S0340L01), true);
  assert.equal(m.after.target, m.target, 'Italian unchanged');
});
test('"non l\'ho ancora visto" is correctly left behind: the bound l\'ho does not contain "ho" under the word rule', () => {
  assert.equal(T.rowContainsLego({ known: "I haven't seen it yet", target: "non l'ho ancora visto" }, T.LEGOS.S0519L03), false);
  assert.equal(T.rowContainsLego({ known: "I haven't seen the film yet", target: 'non ho ancora visto il film' }, T.LEGOS.S0519L03), true);
});
test('ids unique, use-shaped, no landing id is also a source id, no seed out of scope', () => {
  const ids = T.LANDING.map(r => r.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^S\d{4}L\d{2}U\d{2}$/);
  const src = new Set([...T.MOVES.map(m => m.from), ...T.DELETES.map(d => d.id)]);
  for (const id of ids) assert.ok(!src.has(id));
  for (const r of T.LANDING) assert.ok(!T.OUT_OF_SCOPE_SEEDS.includes(r.seed), r.id);
});
test('playedCount reads the rule the way the player does', () => {
  const legos = { A: { is_new: true }, B: { is_new: false } };
  assert.equal(T.playedCount([{ lego: 'A', role: 'use' }, { lego: 'B', role: 'use' }, { lego: 'A', role: 'component' }], legos), 1);
});
