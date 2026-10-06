'use strict';
// node tools/course-optimization/deu-deborah-oct-findings-2026-10-06.test.cjs — the rule that decides the P26 moves (job #327)
const assert = require('assert');
const T = require('./deu-deborah-oct-findings-2026-10-06.cjs');
const legos = [
  { seed_number: 378, lego_index: 1, lego_id: 'S0378L01', is_new: true, target_text: 'nein' },
  { seed_number: 378, lego_index: 2, lego_id: 'S0378L02', is_new: true, target_text: 'Geld' },
  { seed_number: 378, lego_index: 3, lego_id: 'S0378L03', is_new: true, target_text: 'Urlaub' },
  { seed_number: 195, lego_index: 2, lego_id: 'S0195L02', is_new: true, target_text: 'der Tisch' },
];
// Deborah S0378 R737: the seed-sentence row sat under Geld (L02) but says Urlaub (L03) → it moves to L03
assert.deepStrictEqual(T.planP26Moves([{ id: 'S0378L02U07', target_text: 'nein, ich hatte nicht genug Geld für Urlaub' }], legos).map((m) => m.to), ['S0378L03']);
// a row already under its seed's last contained LEGO stays
assert.deepStrictEqual(T.planP26Moves([{ id: 'S0378L03U07', target_text: 'nein, ich hatte nicht genug Geld für Urlaub' }], legos), []);
// inflected later sibling (dem Tisch ≠ der Tisch) is HELD for Kai, never moved
assert.deepStrictEqual(T.planP26Moves([{ id: 'S0195L01U09', target_text: 'das ich auf dem Tisch gelassen habe' }], legos), []);
assert.ok(T.containsWords('dass sie etwas hatten', 'sie hatten'), 'verb-final order still contains the grown LEGO (word multiset)');
assert.ok(!T.containsWords('ich habe gefragt', 'gefragt, ob'));
assert.strictEqual(T.nextFreeId('S0343L02', 'use', new Set(['S0343L02U01']), new Set(['S0343L02U02'])), 'S0343L02U03', 'an id ever named in an edit event is never re-issued');
// E: no two rows in the plan share English over different German
const k = new Map(); for (const e of T.EDITS) { const o = k.get(e.after[0]); assert.ok(!o || o === e.after[1], e.id); k.set(e.after[0], e.after[1]); }
console.log('ok');
