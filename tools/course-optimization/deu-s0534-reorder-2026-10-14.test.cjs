'use strict';
// Job #499 step 2: Kai's refined order for deu_for_eng seed 534 — outside · go outside · weather · dreadful ·
// in this dreadful weather. The fixture is seed 534's three rotated LEGOs and a two-row basket each, shaped as they
// stood live after step 1. Run: node --test <this file>
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('./deu-s0534-reorder-2026-10-14.cjs');

const C = 'deu_for_eng';
const L = (i, known, target, a) => ({ lego_id: `S0534L0${i}`, seed_number: 534, lego_index: i, known_text: known, target_text: target, is_new: true, type: 'A', components: [],
  known_audio_id: `${a}k`, target1_audio_id: `${a}t1`, target2_audio_id: `${a}t2`, presentation_audio_id: `${a}p` });
const Ph = (id, known, target, a) => ({ id: `${C}:${id}`, seed_number: 534, lego_index: +id[7], phrase_role: id[8] === 'B' ? 'build' : 'use', known_text: known, target_text: target,
  known_audio_id: `${a}k`, target1_audio_id: `${a}t1`, target2_audio_id: `${a}t2` });

function afterStep1() {
  const earlier = { lego_id: 'S0001L01', seed_number: 1, lego_index: 1, known_text: 'that is she I want', target_text: 'das ist sie ich will', is_new: true };
  return { legos: [earlier, L(1, 'weather', 'Wetter', 'w'), L(2, 'outside', 'draußen', 'o'), L(3, 'go outside', 'nach draußen gehen', 'g'),
    L(4, 'dreadful', 'schrecklichen', 'd'), L(5, 'in this dreadful weather', 'bei diesem schrecklichen Wetter', 'm')],
  phrases: [Ph('S0534L01B01', 'the weather', 'das Wetter', 'w1'), Ph('S0534L01U01', 'that is the weather', 'das ist das Wetter', 'w2'),
    Ph('S0534L02B01', 'outside', 'draußen', 'o1'), Ph('S0534L02U01', 'she is outside', 'sie ist draußen', 'o2'),
    Ph('S0534L03B01', 'go outside', 'nach draußen gehen', 'g1'), Ph('S0534L03U01', 'I want to go outside', 'ich will nach draußen gehen', 'g2')] };
}

test('the course after step 1 fails the refined order; the rotation passes it', () => {
  assert.ok(R.invariants(afterStep1()).some((p) => /seed 534 new LEGOs are weather/.test(p)));
  assert.deepEqual(R.checkPlan(afterStep1()), []);
  const post = R.rotated(afterStep1());
  assert.deepEqual(post.legos.slice(1).map((l) => l.known_text), ['outside', 'go outside', 'weather', 'dreadful', 'in this dreadful weather']);
});

test('baskets, clips and intros travel with their LEGO', () => {
  const ops = R.editOps(afterStep1());
  const link = (k, s) => ops.find((o) => o.op === 'audio.link' && (o.lego_id === k || o.phrase_id === `${C}:${k}`) && o.slot === s)?.audio_id;
  assert.equal(link('S0534L03', 'presentation'), 'wp', 'weather intro now on L03');
  assert.equal(link('S0534L01', 'target1'), 'ot1');
  assert.equal(link('S0534L03U01', 'known'), 'w2k');
  const u = ops.find((o) => o.op === 'phrase.update' && o.phrase_id === `${C}:S0534L02B01`);
  assert.deepEqual(u.set, { known_text: 'go outside', target_text: 'nach draußen gehen' });
});
