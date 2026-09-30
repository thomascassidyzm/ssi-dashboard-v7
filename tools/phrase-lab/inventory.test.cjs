#!/usr/bin/env node
/**
 * A component's known gloss never blocks a LEGO (Tom, 2026-07-04: component
 * rows are exempt from ZUT in the known language, not the target language).
 * Shape taken from ita_for_eng: "to speak" -> parlare at seed 1, and a later
 * "who speak" -> "che parlano" whose component glosses "speak" -> parlano.
 *
 * Usage: node tools/phrase-lab/inventory.test.cjs
 */
const assert = require('assert');
const { buildInventory } = require('./inventory.cjs');

const LEGOS = [
  { lego_id: 'S0001L01', seed_number: 1, lego_index: 1, type: 'A', known_text: 'I want', target_text: 'voglio', components: null },
  { lego_id: 'S0001L02', seed_number: 1, lego_index: 2, type: 'A', known_text: 'to speak', target_text: 'parlare', components: null },
  { lego_id: 'S0001L04', seed_number: 1, lego_index: 4, type: 'M', known_text: 'with you', target_text: 'con te', components: null },
  { lego_id: 'S0022L03', seed_number: 22, lego_index: 3, type: 'M', known_text: 'who speak', target_text: 'che parlano',
    components: [{ known: 'who', target: 'che' }, { known: 'speak', target: 'parlano' }] },
  { lego_id: 'S0030L01', seed_number: 30, lego_index: 1, type: 'A', known_text: 'I want', target_text: 'voglio', components: null },
  { lego_id: 'S0031L01', seed_number: 31, lego_index: 1, type: 'A', known_text: 'I want', target_text: 'desidero', components: null }
];

function fakeSupabase(rows) {
  const q = { select: () => q, eq: () => q, order: () => q, range: async () => ({ data: rows, error: null }) };
  return { from: () => q };
}

(async () => {
  const inv = await buildInventory(fakeSupabase(LEGOS), 'ita_for_eng', 1, 4);
  const speak = inv.items.find((i) => i.legoId === 'S0001L02');
  assert.strictEqual(speak.deterministic, true, `"to speak" blocked by a component gloss: ${speak.detail}`);

  // LEGO-vs-LEGO ambiguity still blocks: "I want" reaches voglio and desidero.
  const want = inv.items.find((i) => i.legoId === 'S0001L01');
  assert.strictEqual(want.deterministic, false, 'a real LEGO collision must still block');

  // A component used as a tile is still judged against everything: "speak" -> parlano
  // collides with the LEGO "to speak" -> parlare, so it stays blocked.
  const later = await buildInventory(fakeSupabase(LEGOS), 'ita_for_eng', 23, 1);
  const comp = later.items.find((i) => i.kind === 'component' && i.target === 'parlano');
  assert.strictEqual(comp.deterministic, false, 'an ambiguous component stays blocked as a tile');

  console.log('inventory.test: 3 passed');
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
