'use strict';
// kor_for_eng #565: the LEGO follows the seed. Fixture = seed 74 as it was live before the pass (LEGO 이해할 수 있게 도와줘서,
// seed 이해하게 도와줘서 …) plus a later phrase that uses the LEGO. Before: the seed's Korean is not held by its LEGO. After the
// planned ops: it is, the later phrase follows, the seed text is never edited, and the seed is unapproved.
const test = require('node:test');
const assert = require('node:assert');
const { plan, editOps } = require('./kor-lego-follow-seed-565-2026-10-29.cjs');

const blk = (legoId, known, target) => ({ legoId, known, target, isGhost: false });
const ph = (id, seed, role, known, target, dec, extra = {}) => ({ id: `kor_for_eng:${id}`, seed_number: seed, phrase_role: role, known_text: known, target_text: target, decomposition: dec, metadata: {}, ...extra });
const db = {
  seeds: [{ seed_number: 74, known_text: 'thank you very much for helping me to understand', target_text: '이해하게 도와줘서 정말 고마워요', approved_at: '2026-01-01' },
    { seed_number: 99, known_text: 'x', target_text: 'x', approved_at: null }],
  legos: [{ lego_id: 'S0074L01', seed_number: 74, known_text: 'for helping me to understand', target_text: '이해할 수 있게 도와줘서', components: [{ known: 'to be able to understand', target: '이해할 수 있게' }, { known: 'for helping', target: '도와줘서' }], type: 'M', is_new: true, presentation_audio_id: 'p1' },
    { lego_id: 'S0099L01', seed_number: 99, known_text: 'x', target_text: 'x', components: null, type: 'A', is_new: true },
    { lego_id: 'S0073L01', seed_number: 73, known_text: 'thank you', target_text: '고마워요', components: null, type: 'A', is_new: true }],
  phrases: [
    ph('S0074L01B04', 74, 'build', 'thank you very much for helping me to understand', '이해할 수 있게 도와줘서 고마워요', [blk('S0074L01', 'for helping me to understand', '이해할 수 있게 도와줘서'), blk('S0073L01', 'thank you', ' 고마워요')]),
    ph('S0074L01C01', 74, 'component', 'to be able to understand', '이해할 수 있게', [], { metadata: { component_index: 0 } }),
    ph('S0074L01C02', 74, 'component', 'for helping', '도와줘서', [], { metadata: { component_index: 1 } }),
    ph('S0099L01U01', 99, 'use', 'thank you for helping me to understand', '이해할 수 있게 도와줘서 고마워요', [blk('S0074L01', 'for helping me to understand', '이해할 수 있게 도와줘서'), blk('S0073L01', 'thank you', ' 고마워요')]),
  ],
};

test('the LEGO takes the seed Korean, its users follow, the seed is untouched', () => {
  assert.ok(!db.seeds[0].target_text.includes(db.legos[0].target_text)); // before: the seed departs from its LEGO
  const p = plan(db, { only: [74] });
  assert.deepStrictEqual(p.skipped, []);
  const ops = editOps(p, new Map([...['target1', 'target2'].flatMap((r) => ['이해하게 도와줘서', '이해하게 도와줘서 고마워요'].map((t) => [`${r}\u0000${t}`, `clip-${r}-${t}`]))]));
  const lego = ops.find((o) => o.op === 'lego.update');
  assert.strictEqual(lego.set.target_text, '이해하게 도와줘서');
  assert.deepStrictEqual(lego.set.components.map((c) => c.target), ['이해하게', '도와줘서']);
  assert.ok(db.seeds[0].target_text.includes(lego.set.target_text)); // after: the seed's Korean holds the LEGO
  const upd = ops.filter((o) => o.op === 'phrase.update');
  assert.deepStrictEqual(upd.map((o) => o.phrase_id).sort(), ['kor_for_eng:S0074L01B04', 'kor_for_eng:S0074L01C01', 'kor_for_eng:S0099L01U01']);
  assert.ok(upd.filter((o) => !o.phrase_id.includes('C0')).every((o) => !('known_text' in o.set))); // the English side of practice phrases never moves
  assert.strictEqual(upd.find((o) => o.phrase_id.endsWith('B04')).set.target_text, '이해하게 도와줘서 고마워요'); // = the seed's own sentence minus 정말
  assert.strictEqual(ops.filter((o) => o.op === 'seed.update').length, 1);
  assert.deepStrictEqual(ops.find((o) => o.op === 'seed.update').set, { approved_at: null }); // seed text never edited; O5 unapprove only
  assert.ok(ops.some((o) => o.op === 'audio.link' && o.slot === 'presentation' && o.audio_id === 'p1')); // intro put back
});

// Job #703: the gate comparison counts offending rows per basket, so a WORSENED existing failure is a regression
// (the first version compared failing gate NAMES only and let it through).
test('gate: a failure that was already there but gets worse is a regression', () => {
  const { worsened } = require('./kor-lego-follow-seed-565-2026-10-29.gate.cjs');
  const mk = (n) => ({ failingGates: ['bareLego'], gates: { bareLego: { pass: false, dropped: n } } });
  const nameOnly = (b, a) => a.failingGates.filter((x) => !b.failingGates.includes(x)); // the old rule
  assert.deepStrictEqual(nameOnly(mk(2), mk(3)), []);
  assert.deepStrictEqual(worsened(mk(2), mk(3)), [{ gate: 'bareLego', before: 2, after: 3 }]);
  assert.deepStrictEqual(worsened(mk(2), mk(2)), []);
  assert.deepStrictEqual(worsened(mk(2), mk(1)), []);
  assert.deepStrictEqual(worsened({ failingGates: [], gates: {} }, mk(1)), [{ gate: 'bareLego', before: 0, after: 1 }]);
});

// verify: reads the planned rows back from a fresh dump and checks the text AND what the clips say.
test('verify: flags a wrong clip, a stale LEGO, a changed seed; passes the right rows', async () => {
  const { verify } = require('./kor-lego-follow-seed-565-2026-10-29.cjs');
  const p = plan(db, { only: [74] });
  p.seedText = { 74: db.seeds[0].target_text };
  const text = { c1: '이해하게 도와줘서', c2: '이해하게 도와줘서', c3: '이해하게 도와줘서 고마워요', c4: '이해하게 도와줘서 고마워요', wrong: '다른 말' };
  const live = (over = {}) => ({
    seeds: [{ ...db.seeds[0], approved_at: null, ...(over.seed || {}) }],
    legos: [{ ...db.legos[0], target_text: '이해하게 도와줘서', components: [{ known: 'to understand', target: '이해하게' }, { known: 'for helping', target: '도와줘서' }], target1_audio_id: 'c1', target2_audio_id: 'c2', presentation_audio_id: 'p1', ...(over.lego || {}) }],
    phrases: [{ ...db.phrases[0], target_text: '이해하게 도와줘서 고마워요', target1_audio_id: 'c3', target2_audio_id: 'c4' }, { ...db.phrases[3], target_text: '이해하게 도와줘서 고마워요', target1_audio_id: 'c3', target2_audio_id: over.badClip || 'c4' },
      { ...db.phrases[1], known_text: 'to understand', target_text: '이해하게' }, { ...db.phrases[2], target_text: '도와줘서' }],
  });
  const say = async (a) => text[a] ?? null;
  const good = await verify(live(), p, say);
  assert.deepStrictEqual(good.bad, []);
  assert.ok(good.ok.length >= 5);
  assert.ok((await verify(live({ badClip: 'wrong' }), p, say)).bad.some((b) => b.id === 'S0099L01U01'));
  assert.ok((await verify(live({ lego: { target_text: '이해할 수 있게 도와줘서' } }), p, say)).bad.some((b) => b.id === 'S0074L01'));
  assert.ok((await verify(live({ seed: { target_text: '바뀜' } }), p, say)).bad.some((b) => b.id === 'seed 74 text'));
  assert.ok((await verify(live({ seed: { approved_at: '2026-10-29' } }), p, say)).bad.some((b) => b.id === 'seed 74'));
});
