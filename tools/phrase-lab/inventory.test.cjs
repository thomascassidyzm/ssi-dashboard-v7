#!/usr/bin/env node
/**
 * A component's known gloss never blocks a LEGO (job #903).
 *
 * ita_for_eng seed 22's M-LEGO "who speak -> che parlano" carries the literal
 * component "speak -> parlano". Folded into the same known->target table as the
 * LEGOs, it made seed 1's "to speak -> parlare" an ambiguous known, so the v3
 * generator was told parlare was BLOCKED at seed 1 and could not write
 * "voglio parlare con te". The component itself stays blocked (its gloss really
 * does clash with a LEGO); the LEGO does not.
 *
 * Usage: node tools/phrase-lab/inventory.test.cjs   (no DB, no vitest)
 */

const { buildInventory } = require('./inventory.cjs');

const LEGOS = [
  { lego_id: 'S0001L01', seed_number: 1, lego_index: 1, type: 'A', known_text: 'I want', target_text: 'voglio', components: null },
  { lego_id: 'S0001L02', seed_number: 1, lego_index: 2, type: 'A', known_text: 'to speak', target_text: 'parlare', components: null },
  { lego_id: 'S0001L03', seed_number: 1, lego_index: 3, type: 'A', known_text: 'Italian', target_text: 'italiano', components: null },
  { lego_id: 'S0001L04', seed_number: 1, lego_index: 4, type: 'M', known_text: 'with you', target_text: 'con te', components: [{ known: 'with', target: 'con' }, { known: 'you', target: 'te' }] },
  { lego_id: 'S0022L03', seed_number: 22, lego_index: 3, type: 'M', known_text: 'who speak', target_text: 'che parlano', components: [{ known: 'who', target: 'che' }, { known: 'speak', target: 'parlano' }] },
  // A genuine LEGO-vs-LEGO clash must still block.
  { lego_id: 'S0030L01', seed_number: 30, lego_index: 1, type: 'A', known_text: 'Italian', target_text: 'italiana', components: null },
];

function fakeSupabase(rows) {
  const q = { select: () => q, eq: () => q, order: () => q, range: async () => ({ data: rows, error: null }) };
  return { from: () => q };
}

let fail = 0;
const ok = (name, cond) => { console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`); if (!cond) fail++; };

(async () => {
  const s1 = await buildInventory(fakeSupabase(LEGOS), 'ita_for_eng', 1, 4);
  const avail = new Set(s1.available.map((i) => `${i.known}|${i.target}`));
  ok('seed 1: "to speak -> parlare" is AVAILABLE despite a later component "speak -> parlano"', avail.has('to speak|parlare'));
  ok('seed 1: "I want -> voglio" is AVAILABLE', avail.has('I want|voglio'));
  ok('seed 1: a real LEGO clash ("Italian" -> italiano / italiana) still BLOCKS', !avail.has('Italian|italiano'));

  const s23 = await buildInventory(fakeSupabase(LEGOS), 'ita_for_eng', 23, 1);
  const comp = s23.items.find((i) => i.kind === 'component' && i.target === 'parlano');
  ok('seed 23: the component "speak -> parlano" itself is still BLOCKED', comp && comp.deterministic === false);

  console.log(fail ? `\n${fail} failed` : '\nall passed');
  process.exit(fail ? 1 : 0);
})();
