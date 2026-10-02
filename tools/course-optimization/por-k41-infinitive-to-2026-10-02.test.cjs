'use strict';
// por_for_eng K41 (job #357): a bare-verb gloss over a Portuguese infinitive gets "to"; gerund/noun glosses and
// look-alike non-infinitives do not; a re-gloss that duplicates an earlier NEW LEGO, or clashes by ZUT, is held;
// after the fix the plan is empty for that row; a row is written only with a verified library known clip.
const test = require('node:test');
const assert = require('node:assert');
const T = require('./por-k41-infinitive-to-2026-10-02.cjs');

test('the rule: infinitive + bare verb owes "to"; gerunds, nouns and "to X" do not', () => {
  assert.strictEqual(T.owesTo('tell me', 'dizer-me'), true);
  assert.strictEqual(T.owesTo('to tell me', 'dizer-me'), false);
  assert.strictEqual(T.owesTo('waking up', 'acordar'), false);
  assert.strictEqual(T.owesTo('supper', 'jantar'), false);
  assert.strictEqual(T.owesTo('please', 'por favor'), false);
  assert.strictEqual(T.owesTo('want to tell me', 'quer dizer-me'), false);
});
const L = (id, seed, idx, known, target, is_new = true) => ({ lego_id: id, seed_number: seed, lego_index: idx, is_new, known_text: known, target_text: target, components: [] });
const db = (legos, phrases = []) => ({ legos, phrases });
test('pre-fix S0070L02 "tell me" is planned as "to tell me"; post-fix it is not', () => {
  const pre = T.plan(db([L('S0070L02', 70, 2, 'tell me', 'dizer-me')]));
  assert.deepStrictEqual(pre.changes.map((c) => [c.id, c.after.known]), [['S0070L02', 'to tell me']]);
  assert.strictEqual(T.plan(db([L('S0070L02', 70, 2, 'to tell me', 'dizer-me')])).changes.length, 0);
});
test('a re-gloss equal to an earlier NEW LEGO pair (S0005L02 to practise speaking) is held, not written', () => {
  const p = T.plan(db([L('S0005L02', 5, 2, 'to practise speaking', 'praticar a falar'), L('S0228L01', 228, 1, 'practise speaking', 'praticar a falar')],
    [{ id: 'por_for_eng:S0005L02B01', seed_number: 5, lego_index: 2, phrase_role: 'build', known_text: 'to practise speaking', target_text: 'praticar a falar' }]));
  assert.strictEqual(p.changes.length, 0);
  assert.match(p.held.find((h) => h.id === 'S0228L01').why, /duplicate/);
});
test('only rows with a verified library known clip are writable; tiles follow their LEGO', () => {
  const changes = [{ kind: 'lego', id: 'S0070L02', audio: { known: { audioId: 'x' } } }, { kind: 'lego', id: 'S0062L02', audio: { known: { audioId: null } } },
    { kind: 'tile', id: 'S0062L02C01', lego: 'S0062L02' }, { kind: 'build', id: 'S0070L03B02', audio: { known: { audioId: null } } }];
  assert.deepStrictEqual(T.writable(changes).map((c) => c.id), ['S0070L02']);
});
