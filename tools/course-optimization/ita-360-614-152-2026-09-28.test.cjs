'use strict';
// The rules behind job #626·I (Kai, 2026-09-28 22:30Z): each test fails on the BEFORE state and passes on the AFTER.
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('./ita-360-614-152-2026-09-28.cjs');

test("seed 152: l'avrei is taught at 153 and used at 152 BEFORE; no row uses it early AFTER", () => {
  const taughtAt = new Map([["l'avrei", 153]]);
  const rows152 = T.CHANGES.filter(c => c.id.startsWith('S0152'));
  assert.equal(rows152.length, 15);
  const before = T.usedBeforeTaught(rows152.map(c => ({ id: c.id, seed: 152, target: c.before.target })), taughtAt);
  assert.equal(before.length, 15);
  const after = T.usedBeforeTaught(rows152.map(c => ({ id: c.id, seed: 152, target: c.after.target })), taughtAt);
  assert.deepEqual(after, []);
  // a use AT the teaching seed is fine; one before it is not; a never-taught token is always early
  assert.deepEqual(T.usedBeforeTaught([{ id: 'x', seed: 153, target: "non l'avrei detto" }], taughtAt), []);
  assert.equal(T.usedBeforeTaught([{ id: 'y', seed: 130, target: "l'ho fatto" }], taughtAt)[0].taughtAt, null);
  assert.deepEqual(T.cliticTokens("se me l'avessi detto, l'avrei fatto"), ["me l'avessi", "l'avrei"]);
});

test('every phrase under a LEGO still contains the whole LEGO on both sides (Italian contiguous; English or K28 noun-for-pronoun over the same Italian)', () => {
  for (const c of T.CHANGES.filter(c => c.role !== 'component')) {
    const l = T.LEGOS_AFTER[c.lego];
    assert.equal(T.containsChunk(c.after.target, l.target.replace(/\?$/, '')), true, `${c.id} target`);
    assert.equal(T.ENGLISH_CONTAINS_OR_K28({ ...c.after, sameItalian: c.sameItalian }, l), true, `${c.id} known`);
  }
  // BEFORE: the 614 phrases did not contain the grown LEGO
  const b01 = T.CHANGES.find(c => c.id === 'S0614L01B01');
  assert.equal(T.containsChunk(b01.before.target, T.NEW_LEGOS.S0614L01.target), false);
  // K28: "did your friend say anything else?" is kept over the LEGO's own Italian; a row with a different Italian would not be
  const l360 = T.NEW_LEGOS.S0360L01;
  assert.equal(T.ENGLISH_CONTAINS_OR_K28({ known: 'did your friend say anything else?', target: "il tuo amico ha detto qualcos'altro?", sameItalian: true }, l360), true);
  assert.equal(T.ENGLISH_CONTAINS_OR_K28({ known: 'did your friend say anything else?', target: "il tuo amico ha detto qualcosa?", sameItalian: true }, l360), false);
  assert.equal(T.ENGLISH_CONTAINS_OR_K28({ known: 'did your friend say anything else?', target: "il tuo amico ha detto qualcos'altro?" }, l360), false);
});

test('K26: S0360L01U04 said "he" over "il tuo amico" BEFORE; the Italian drops the noun AFTER', () => {
  const c = T.CHANGES.find(c => c.id === 'S0360L01U04');
  assert.equal(/il tuo amico/.test(c.before.target) && !/friend/.test(c.before.known), true);
  assert.equal(/il tuo amico/.test(c.after.target), false);
  assert.equal(c.after.known, c.before.known);
});

test('the two re-cut LEGOs are pieces of their seed on both sides and their components tile (L4); the old cut did not', () => {
  for (const l of Object.values(T.NEW_LEGOS)) {
    assert.equal(T.legoInSeedK28(T.SEEDS[l.seed], l), true, l.id);
    if (l.id === 'S0360L01') assert.equal(T.legoInSeed(T.SEEDS[l.seed], l), false, 'K28: the pronoun is the one word the seed does not say');
    assert.equal(T.componentsTile(l), true, l.id);
    const KEPT_COMPONENTS = { S0360L01C02: "anything else|qualcos'altro" }; // unchanged live row (asserted by the tool's live guard)
    const rows = [...T.CHANGES, ...T.INSERTS, ...T.KEPT.filter(k => KEPT_COMPONENTS[k.id]).map(k => ({ id: k.id, lego: k.lego, role: 'component', known: KEPT_COMPONENTS[k.id].split('|')[0], target: KEPT_COMPONENTS[k.id].split('|')[1] }))]
      .filter(r => r.role === 'component' && r.lego === l.id).sort((a, b) => a.id.localeCompare(b.id)).map(r => `${(r.after || r).known}|${(r.after || r).target}`);
    assert.deepEqual(rows, l.components.map(c => `${c.known}|${c.target}`), `${l.id} component rows`);
  }
  assert.equal(T.componentsTile({ ...T.NEW_LEGOS.S0360L01, components: T.OLD_LEGOS.S0360L01.components }), false, 'old "said" components no longer tile "did he say anything else?"');
  assert.equal(T.containsChunk(T.OLD_LEGOS.S0614L01.target, 'la tua famiglia'), false);
});

test('is_new is never set by this pass and no LEGO is deleted', () => {
  for (const l of Object.values(T.NEW_LEGOS)) assert.equal('is_new' in l, false, l.id);
  assert.deepEqual(Object.keys(T.NEW_LEGOS).sort(), ['S0360L01', 'S0614L01']);
});
