'use strict';
// The proving test for job #639·I (the #632·I clear fixes). The rules on paper: a later exact duplicate goes not-new
// and every row in its basket is moved under a NEW LEGO it contains or listed; blu/hai fatto go new; 204 L02's
// components tile the Italian with aiutasse on its own; the five single components carry their LEGO's pronoun.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const T = require('./ita-632-clear-fixes-2026-09-28.cjs');

test('paper guards hold on the plan as written', () => {
  const problems = []; T.paperGuards(problems);
  assert.deepEqual(problems, []);
});
test('the six later duplicates go not-new and each is an exact BOTH-sides duplicate of an EARLIER new LEGO', () => {
  const dark = T.IS_NEW_FLIPS.filter(f => f.to === false);
  assert.equal(dark.length, 6);
  for (const f of dark) {
    const l = T.LEGOS[f.id], tw = T.LEGOS[l.twin];
    assert.ok(T.isExactDuplicate(l, tw), f.id);
    assert.ok(tw.seed < l.seed && tw.is_new, `${l.twin} must be earlier and new`);
  }
  // "kind|gentile" vs "kind|gentili" would NOT be a duplicate — both sides must match (Kai 2026-09-23)
  assert.equal(T.isExactDuplicate({ known: 'kind', target: 'gentile' }, { known: 'kind', target: 'gentili' }), false);
});
test('blu and hai fatto go new (a first occurrence cannot be familiar, L17)', () => {
  assert.deepEqual(T.IS_NEW_FLIPS.filter(f => f.to === true).map(f => f.id).sort(), ['S0207L01', 'S0257L01']);
});
test('P25: every moved row was under a LEGO this pass darkens and lands PLAYED under a NEW LEGO it contains', () => {
  const after = Object.fromEntries(Object.entries(T.LEGOS).map(([id, l]) => [id, { is_new: 'to_is_new' in l ? l.to_is_new : l.is_new }]));
  for (const m of T.MOVES) {
    assert.equal(T.phraseIsPlayed({ lego: m.from.slice(0, 8) }, after), false, `${m.from} still plays where it was`);
    assert.equal(T.phraseIsPlayed({ lego: m.lego }, after), true, `${m.to} lands dark`);
  }
  for (const r of T.LANDING) assert.ok(T.rowContainsLego(r, T.LEGOS[r.lego]), `${r.id} lacks ${r.lego}`);
  // the one that fails containment on the known side is a STAY, not a move
  assert.equal(T.rowContainsLego({ known: 'I can only do this', target: 'posso solo farlo' }, T.LEGOS.S0357L01), false);
  assert.ok(T.STAYS.some(s => s.id === 'S0562L01U04'));
});
test('204 L02 components tile the Italian with aiutasse standing alone (K29); pronoun components tile both sides (K26)', () => {
  const c204 = T.COMPONENT_EDITS.find(c => c.id === 'S0204L02');
  assert.ok(T.componentsTileTarget(c204.to, T.LEGOS.S0204L02.target));
  assert.ok(c204.to.some(x => x.target === 'aiutasse' && x.known === 'help'));
  assert.equal(T.componentsTileTarget(c204.from, T.LEGOS.S0204L02.target), true, 'the old cut tiled too — the change is the split, not the words');
  for (const c of T.COMPONENT_EDITS.filter(c => c.id !== 'S0204L02')) {
    assert.equal(c.to.length, 1);
    assert.ok(T.componentsTileKnown(c.to, T.LEGOS[c.id].known), `${c.id} component must equal its LEGO's English`);
    assert.ok(!T.componentsTileKnown(c.from, T.LEGOS[c.id].known), `${c.id} pre-fix component lacked the pronoun`);
  }
});
test('no sibling seed is touched; ids unique and use-shaped', () => {
  for (const s of T.SEEDS_WITH_CONTENT_CHANGE) assert.ok(!T.SIBLING_SEEDS.includes(s), `seed ${s}`);
  const ids = T.LANDING.map(r => r.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^S\d{4}L\d{2}U\d{2}$/);
});
