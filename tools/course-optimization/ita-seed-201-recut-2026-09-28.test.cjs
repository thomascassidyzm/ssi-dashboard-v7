'use strict';
// The rules behind job #572·I (Kai, 2026-09-28): each test fails on the BEFORE state (the OLD picture
// of seed 201) and passes on the AFTER state (the new cut). Pure rules only — no DB.
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('./ita-seed-201-recut-2026-09-28.cjs');

const oldLegos = T.OLD.legos.map(l => ({ ...l, components: l.components || [] }));
const idParts = (id) => ({ idx: Number(id.slice(6, 8)), role: { B: 'build', U: 'use', C: 'component' }[id[8]] });
const oldPhrases = T.OLD.phrases.map(p => ({ ...p, ...idParts(p.id) }));

test('seed 201: the new LEGOs tile the seed on both sides; the old three did not (no "we", no "to know")', () => {
  assert.equal(T.legosTileSeed(oldLegos, T.SEED_TEXT), false);
  assert.equal(T.legosTileSeed(T.NEW_LEGOS, T.SEED_TEXT), true);
  for (const l of T.NEW_LEGOS) assert.equal(T.componentsTile(l), true, `L0${l.idx}`);
});

test('seed 201: no "sarebbe X" (the wrong simple conditional after a past frame) survives; the old L02 rows carried eleven (four fragments, seven use rows)', () => {
  assert.equal(T.noWrongSarebbe(oldPhrases).length, 11);
  assert.deepEqual(T.noWrongSarebbe(T.resolvedPhrases()), []);
});

test('seed 201: every USE phrase with "sarebbe" carries a past frame; the old L02/L03 rows had bare questions and "niente/qualcosa sarebbe successo"', () => {
  assert.ok(T.pastFrameRule(oldPhrases).length >= 4);
  assert.deepEqual(T.pastFrameRule(T.resolvedPhrases()), []);
});

test('seed 201: every phrase contains its LEGO on both sides after the cut; before it, L01B01 "wanted" lacked the pronoun and L03 rows lacked "what"', () => {
  for (const p of T.resolvedPhrases()) assert.equal(T.phraseContainsLego(T.NEW_LEGOS[p.idx - 1], p), true, p.id);
  assert.equal(T.phraseContainsLego(T.NEW_LEGOS[0], oldPhrases.find(p => p.id === 'S0201L01B01')), false);
  assert.equal(T.phraseContainsLego(T.NEW_LEGOS[2], oldPhrases.find(p => p.id === 'S0201L03U02')), false);
  assert.equal(T.buildsUpToSeed(T.resolvedPhrases()), true);
  assert.equal(T.buildsUpToSeed(oldPhrases), false);
});

test('seed 201: L03 intro is in Kai\'s template — quotes the LEGO, example has a past frame and is not the seed; the #546·I line for "happen" no longer quotes a LEGO that exists', () => {
  assert.deepEqual(T.introRules(T.NEW_LEGOS[2], T.L03_EXAMPLE, T.L03_INTRO), []);
  const old = "The Italian for 'happen' in phrases like 'I wanted to know what was going to happen' is:";
  assert.ok(T.introRules(T.NEW_LEGOS[2], T.L03_EXAMPLE, old).includes('line does not quote the LEGO English (mirror)'));
  assert.equal(T.checkOffline().problems.length, 0);
});
