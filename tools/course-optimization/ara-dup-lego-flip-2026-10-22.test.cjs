'use strict';
// node --test tools/course-optimization/ara-dup-lego-flip-2026-10-22.test.cjs
// Proof of Kai's duplicate rule on ara_for_eng (job #513): only an EXACT both-sides match of an earlier LEGO goes not new; a
// one-diacritic difference is not a duplicate; a seed left with no new LEGO is held; a seed sentence played only under the
// flipped LEGO is copied under the seed's last remaining new LEGO with clips that speak its words.
const test = require('node:test');
const assert = require('node:assert');
const T = require('./ara-dup-lego-flip-2026-10-22.cjs');

const L = (seed, i, known, target, is_new = true) => ({ lego_id: `S0${seed}L0${i}`, seed_number: seed, lego_index: i, known_text: known, target_text: target, is_new });
const R = (id, known, target, role = 'use', pos = 1) => ({ id: `ara_for_eng:${id}`, phrase_role: role, known_text: known, target_text: target, position: pos, word_count: 3, known_audio_id: `k-${id}`, target1_audio_id: `t1-${id}`, target2_audio_id: `t2-${id}`, metadata: {} });
const S = (n, known, target, approved_at = null) => ({ seed_number: n, known_text: known, target_text: target, approved_at, known_audio_id: `k-s${n}`, target1_audio_id: `t1-s${n}`, target2_audio_id: `t2-s${n}` });
const db = () => ({
  seeds: [S(414, 'please', 'مِنْ فَضْلِكَ'), S(500, 'a good idea', 'فِكْرَةٌ جَيِّدَة'), S(630, 'something please', 'شَيْئاً مِنْ فَضْلِكَ', '2026-01-01'), S(640, 'a good idea', 'فِكْرَةٌ جَيِّدَةٌ')],
  legos: [L(414, 1, 'please', 'مِنْ فَضْلِكَ'), L(500, 1, 'a good idea', 'فِكْرَةٌ جَيِّدَة'),
    L(630, 1, 'something', 'شَيْئاً'), L(630, 2, 'please', 'مِنْ فَضْلِكَ'),
    L(640, 1, 'a good idea', 'فِكْرَةٌ جَيِّدَةٌ')],
  phrases: [R('S0630L01U01', 'something good', 'شَيْئاً جَيِّداً', 'use', 4), R('S0630L02U01', 'something please', 'شَيْئاً مِنْ فَضْلِكَ', 'use', 6)],
});

test('BEFORE: S0630L02 is new and matches S0414L01 exactly on both sides', () => {
  const d = db();
  assert.strictEqual(d.legos[3].is_new, true);
  assert.strictEqual(d.legos[3].known_text, d.legos[0].known_text); assert.strictEqual(d.legos[3].target_text, d.legos[0].target_text);
});

test('AFTER: exact duplicate flipped with a before-text expect; diacritic variant untouched; seed sentence copied; seed unapproved', () => {
  const p = T.plan(db()); const ops = T.editOps(p);
  assert.deepStrictEqual(p.flips.map((f) => f.lego), ['S0630L02']);
  const up = ops.find((o) => o.op === 'lego.update');
  assert.deepStrictEqual(up.set, { is_new: false }); assert.deepStrictEqual(up.expect, { is_new: true, known_text: 'please', target_text: 'مِنْ فَضْلِكَ' });
  assert.ok(!p.flips.concat(p.held).some((f) => f.lego === 'S0640L01'), 'one tanwin differs: not a duplicate');
  const ins = ops.find((o) => o.op === 'phrase.insert');
  assert.strictEqual(ins.row.id, 'ara_for_eng:S0630L01U02'); assert.strictEqual(ins.row.position, 5); assert.strictEqual(ins.row.target_text, 'شَيْئاً مِنْ فَضْلِكَ');
  assert.ok(ops.some((o) => o.op === 'audio.link' && o.phrase_id === 'ara_for_eng:S0630L01U02' && o.slot === 'target1' && o.audio_id === 't1-s630'));
  assert.ok(ops.some((o) => o.op === 'seed.update' && o.seed_number === 630 && o.set.approved_at === null));
  assert.ok(!ops.some((o) => /delete/.test(o.op)), 'nothing deleted');
});

test('HELD: a duplicate that is its seed\'s only new LEGO is not flipped', () => {
  const d = db(); d.legos.push(L(700, 1, 'please', 'مِنْ فَضْلِكَ')); d.seeds.push(S(700, 'please', 'مِنْ فَضْلِكَ'));
  const p = T.plan(d);
  assert.deepStrictEqual(p.held.map((h) => h.lego), ['S0700L01']);
  assert.ok(!T.editOps(p).some((o) => o.lego_id === 'S0700L01'));
});
