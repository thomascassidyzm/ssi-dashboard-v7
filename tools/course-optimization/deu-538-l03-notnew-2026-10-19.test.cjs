'use strict';
// node --test tools/course-optimization/deu-538-l03-notnew-2026-10-19.test.cjs
// Proof: on 19 Oct S0538L03 "as though | als ob" is NEW and duplicates S0497L04 on both sides; after the plan it is not new,
// has no intro, its sentence row lives under S0538L01 (new, which it contains) with its clips, and no LEGO is deleted.
const test = require('node:test');
const assert = require('node:assert');
const T = require('./deu-538-l03-notnew-2026-10-19.cjs');

const row = (id, known_text, target_text, role = 'use', pos = 1) => ({ id: `deu_for_eng:${id}`, phrase_role: role, known_text, target_text, position: pos, known_audio_id: `k-${id}`, target1_audio_id: `t1-${id}`, target2_audio_id: `t2-${id}`, metadata: {} });
const db = () => ({
  seeds: [],
  legos: [
    { lego_id: 'S0497L04', seed_number: 497, lego_index: 4, is_new: true, known_text: 'as though', target_text: 'als ob' },
    { lego_id: 'S0538L01', seed_number: 538, lego_index: 1, is_new: true, known_text: 'to seem as though', target_text: 'so wirken, als ob' },
    { lego_id: 'S0538L03', seed_number: 538, lego_index: 3, is_new: true, known_text: 'as though', target_text: 'als ob', presentation_audio_id: 'intro-l03' },
  ],
  phrases: [
    row('S0538L01U21', "I don't want to seem as though I don't care", 'ich will nicht so wirken, als ob es mir egal ist', 'use', 11),
    row('S0538L03U01', 'as though she could', 'als ob sie könnte'),
    row('S0538L03U21', "she doesn't want to seem as though she doesn't care", 'sie will nicht so wirken, als ob es ihr egal ist', 'use', 11),
  ],
});

test('BEFORE: L03 is new and a both-sides duplicate of the earlier S0497L04', () => {
  const d = db(); const [early, , l3] = d.legos;
  assert.strictEqual(l3.is_new, true);
  assert.strictEqual(l3.known_text, early.known_text); assert.strictEqual(l3.target_text, early.target_text);
});

test('AFTER: not new, intro unlinked, sentence row moved under L01 with its clips, fragment left dark, nothing deleted but the moved row', () => {
  const p = T.plan(db()); const ops = T.editOps(p);
  assert.ok(ops.some((o) => o.op === 'lego.update' && o.lego_id === 'S0538L03' && o.set.is_new === false));
  assert.ok(ops.some((o) => o.op === 'audio.link' && o.lego_id === 'S0538L03' && o.slot === 'presentation' && o.audio_id === null));
  const ins = ops.find((o) => o.op === 'phrase.insert');
  assert.strictEqual(ins.row.id, 'deu_for_eng:S0538L01U22'); assert.strictEqual(ins.row.position, 12);
  assert.ok(ops.some((o) => o.op === 'audio.link' && o.phrase_id === 'deu_for_eng:S0538L01U22' && o.slot === 'target1' && o.audio_id === 't1-S0538L03U21'));
  assert.deepStrictEqual(ops.filter((o) => /delete/.test(o.op)).map((o) => o.op + ':' + (o.phrase_id || o.lego_id)), ['phrase.delete:deu_for_eng:S0538L03U21']);
  assert.deepStrictEqual(p.dark, ['S0538L03U01: as though she could | als ob sie könnte']);
});
