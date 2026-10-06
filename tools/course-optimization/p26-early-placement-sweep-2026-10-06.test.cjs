'use strict';
// node tools/course-optimization/p26-early-placement-sweep-2026-10-06.test.cjs — the rule that decides the P26 moves (job #363)
const assert = require('assert');
const T = require('./p26-early-placement-sweep-2026-10-06.cjs');
const L = (seed, i, isNew, known, target) => ({ lego_id: `S${String(seed).padStart(4, '0')}L0${i}`, seed_number: seed, lego_index: i, is_new: isNew, known_text: known, target_text: target });
const legos = [
  L(10, 1, true, 'the money', 'el dinero'), L(10, 2, true, 'I left', 'dejé'),
  L(195, 1, true, 'the money', 'el dinero'), L(195, 2, true, 'that I left on the table', 'que dejé en la mesa'),
  L(300, 1, true, 'already', 'ya'), L(301, 1, true, 'happy', 'contento'),
  L(400, 1, false, 'to eat', 'comer'),
];
const row = (id, seed, known, target) => ({ id, seed_sentence_of: seed, phrase_role: 'use', known_text: known, target_text: target });
const sentence = row('S0195L01U11', 195, "I'm trying to find the money I left on the table", 'el dinero que dejé en la mesa');
const run = (p26, extra = []) => T.plan({ course: 'spa_for_eng', legos, phrases: [...p26, ...extra, { id: 'S0195L01B02', phrase_role: 'build', known_text: 'the money is here', target_text: 'el dinero está aquí' }], p26 });

// spa S0195: the seed sentence sat under L01 though L02 teaches "dejé … mesa" → it moves to the seed's last new LEGO
assert.deepStrictEqual(run([sentence]).moves.map((m) => [m.id, m.to, m.kind]), [['S0195L01U11', 'S0195L02', 'early']]);
// already under its home → nothing to do
assert.deepStrictEqual(run([{ ...sentence, id: 'S0195L02U09' }]).moves, []);
// home's German only inflected in the sentence (P17) → held, never moved
const inflected = run([{ ...sentence, target_text: 'el dinero que dejé sobre las mesas' }]);
assert.deepStrictEqual([inflected.moves.length, inflected.held.length], [0, 1]);
// a seed with no NEW LEGO of its own has no home (P25) → held
assert.strictEqual(run([row('S0010L01U09', 400, 'to eat the money', 'comer el dinero')]).held[0].why.includes('no NEW LEGO'), true);
// the move would leave the source debut with no practice phrase → held
const bare = T.plan({ course: 'x', legos, phrases: [sentence], p26: [sentence] });
assert.ok(bare.held[0].why.includes('no practice phrase'));
// moving EARLIER may never add an untaught word: seed 300's sentence under seed 301 says contento, taught only at 301
const late = run([row('S0301L01U05', 300, 'why are you not happy any more', 'ya no estás contento')]);
assert.ok(late.held[0] && late.held[0].why.includes('contento'), JSON.stringify(late));
assert.strictEqual(T.nextFreeId('S0195L02', 'use', new Set(['S0195L02U01']), new Set(['S0195L02U02'])), 'S0195L02U03');
console.log('ok');
