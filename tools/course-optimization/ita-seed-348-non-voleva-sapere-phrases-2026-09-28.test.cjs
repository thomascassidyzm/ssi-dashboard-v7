'use strict';
// The proving test for job #621·I: the rule (a taught-pieces span is covered by MANY phrases in its seed, each still
// containing the seed's LEGO) FAILS on the BEFORE rows of seed 348 and PASSES on the AFTER rows.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const T = require('./ita-seed-348-non-voleva-sapere-phrases-2026-09-28.cjs');

test('seed 348 did NOT cover "non voleva sapere" with phrases before this pass, and DOES after it', () => {
  assert.equal(T.spanCoveredByPhrases(T.BEFORE_348), false, `before: only ${T.BEFORE_348.filter(T.coversSpan).length} rows carried the span`);
  assert.equal(T.spanCoveredByPhrases(T.AFTER_348), true);
  assert.ok(T.AFTER_348.filter(T.coversSpan).length >= T.MANY_MIN + 3, 'comfortably many, not just at the threshold');
});
test('every new row contains its own LEGO on both sides (build/use rule: all of them, not at least one)', () => {
  for (const r of T.NEW_ROWS) assert.ok(T.rowContainsLego(r, T.LEGOS[r.lego]), `${r.id} "${r.known}" → "${r.target}" lacks ${r.lego}`);
});
test('every new row carries the span on both sides — a past "didn\'t want to know" over the imperfect "non volev- sapere"', () => {
  for (const r of T.NEW_ROWS) assert.ok(T.coversSpan(r), r.id);
  assert.equal(T.coversSpan({ known: "she doesn't want to know", target: 'non vuole sapere' }), false, 'present tense is not the span');
  assert.equal(T.coversSpan({ known: "she didn't want to know", target: 'non ha voluto sapere' }), false, 'passato prossimo is not the course form');
});
test('earlier seeding stays after seed 71 (all three pieces taught) and out of the sibling jobs\' seeds', () => {
  for (const r of T.NEW_ROWS) {
    assert.ok(r.seed >= T.EARLIEST_SEED_FOR_SPAN, `${r.id} too early`);
    assert.ok(!T.OUT_OF_SCOPE_SEEDS.includes(r.seed), `${r.id} in an out-of-scope seed`);
  }
});
test('ids are unique, well-formed use ids, and none collide with the live BEFORE rows of 348', () => {
  const ids = T.NEW_ROWS.map(r => r.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^S\d{4}L\d{2}U\d{2}$/);
  for (const b of T.BEFORE_348) assert.ok(!ids.includes(b.id), b.id);
});
test('no two new rows put the same English over different Italian (ZUT inside the pass)', () => {
  const byKnown = {};
  for (const r of T.NEW_ROWS) { const k = T.norm(r.known); byKnown[k] = byKnown[k] || new Set(); byKnown[k].add(T.norm(r.target)); }
  for (const [k, ts] of Object.entries(byKnown)) assert.equal(ts.size, 1, k);
});
test('legoPosition reads where the LEGO sits in the English', () => {
  assert.equal(T.legoPosition("she didn't want to know what was going to happen", 'what was going to happen'), 'end');
  assert.equal(T.legoPosition("she didn't want to know what was going to happen next", 'what was going to happen'), 'middle');
  assert.equal(T.legoPosition("I didn't want to know why", "I didn't want to"), 'start');
  assert.equal(T.legoPosition("I didn't want to", "I didn't want to"), 'start');
});
test('containment is the live gate rule (word multiset, any order)', () => {
  assert.equal(T.containsWords("she didn't want to know what you think about it", 'about it'), true);
  assert.equal(T.containsWords('non voleva sapere che cosa ne pensi', 'ne'), true);
  assert.equal(T.containsWords('non voleva sapere che cosa ne pensi', 'ne pensa'), false);
});
