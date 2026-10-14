'use strict';
// job #520: S0593L01 is "no matter | egal", not new; no egal row says "regardless" / "all the same"; personal egal is never "matter".
// Fails on the pre-fix course, passes after the plan.
const test = require('node:test');
const assert = require('node:assert');
const M = require('./deu-egal-divide-2026-10-14.cjs');

const L = (id, s, i, k, t, n) => ({ lego_id: id, seed_number: s, lego_index: i, known_text: k, target_text: t, is_new: n });
const pre = {
  seeds: [],
  legos: [L('S0409L01', 409, 1, 'no matter', 'egal', true), L('S0593L01', 593, 1, 'regardless', 'egal', true)],
  phrases: [{ id: 'deu_for_eng:S0409L01B03', seed_number: 409, lego_index: 1, position: 3, phrase_role: 'build', known_text: 'it is all the same', target_text: 'es ist egal' },
    { id: 'deu_for_eng:S0048L01B02', seed_number: 48, lego_index: 1, position: 2, phrase_role: 'build', known_text: 'It is all the same to me', target_text: 'Mir ist es egal' }],
};
test('pre-fix course breaks the divide', () => {
  const p = M.invariants(pre);
  assert.ok(p.some((x) => /S0593L01 must be/.test(x)));
  assert.ok(p.some((x) => /retired gloss of egal/.test(x)));
});
test('applying the plan makes the divide hold', () => {
  const post = M.applyPlan(pre);
  assert.deepStrictEqual(post.legos.find((x) => x.lego_id === 'S0593L01').is_new, false);
  assert.ok(!M.invariants(post).some((x) => /S0593L01 must be|retired gloss/.test(x)));
});
test('a personal egal glossed "matter" is caught, an impersonal one glossed "care" too', () => {
  const mk = (k, t) => ({ ...pre, legos: [], phrases: [{ id: 'deu_for_eng:S0001L01B01', phrase_role: 'build', known_text: k, target_text: t }] });
  assert.ok(M.invariants(mk('it doesn\'t matter to me', 'es ist mir egal')).some((x) => /personal egal/.test(x)));
  assert.ok(M.invariants(mk("I don't care", 'es ist egal')).some((x) => /impersonal egal/.test(x)));
  assert.ok(!M.invariants(mk('she told me it did not matter', 'sie hat mir gesagt, dass es egal war')).some((x) => /egal glossed/.test(x)));
});

test('rewritten German requests both target clips, including a moved row', () => {
  const rewrites = M.REWRITES.filter((r) => r[2] !== r[4]);
  const dump = {
    seeds: [],
    legos: [...pre.legos, L('S0001L01', 1, 1,
      'I don\'t care about that she said no matter what',
      'Das ist mir egal sie hat gesagt was', true)],
    phrases: rewrites.map(([id, known_text, target_text]) => ({
      id: `deu_for_eng:${id}`, seed_number: Number(id.slice(1, 5)),
      lego_index: 1, position: 4, phrase_role: 'use', known_text, target_text,
      target1_audio_id: '11111111-1111-4111-8111-111111111111',
      target2_audio_id: '22222222-2222-4222-8222-222222222222',
    })),
  };
  const post = M.applyPlan(dump);
  assert.ok(post.inserts.some((i) => i.from === 'S0593L01U04'));
  const expected = rewrites.flatMap(([id, , , , text]) => {
    const moved = post.inserts.find((i) => i.from === id);
    return ['target1', 'target2'].map((role) => ({
      role, text, phrase: moved ? moved.row.id : `deu_for_eng:${id}`,
    }));
  });
  assert.deepStrictEqual(M.wanted(dump).filter((r) => r.role.startsWith('target')), expected);
});
