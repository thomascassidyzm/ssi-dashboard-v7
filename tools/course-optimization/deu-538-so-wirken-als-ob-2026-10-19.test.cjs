'use strict';
// node --test tools/course-optimization/deu-538-so-wirken-als-ob-2026-10-19.test.cjs
// The proof for job #241: on the 19 Oct rows, S0538L01 "to seem | so wirken" is held by NONE of its ten non-seed phrases (P17),
// L03 says "as if" where the seed says "as though", and L02 U01/U07 are wrong; after the plan the grown LEGO
// "to seem as though | so wirken, als ob" sits whole in every L01 row, L03 reads "as though" throughout, and L02 is fixed.
const test = require('node:test');
const assert = require('node:assert');
const T = require('./deu-538-so-wirken-als-ob-2026-10-19.cjs');

const old = [['B01', 'so', 'so'], ['B02', 'so that', 'so dass'], ['B03', 'so bad', 'so schlecht'], ['U01', 'that is so', 'das ist so'], ['U02', 'she said it is so', 'sie hat gesagt, das ist so'],
  ['U03', 'it is not so bad', 'es ist nicht so schlecht'], ['U04', 'it is so bad', 'es ist so schlecht'], ['U05', 'not so', 'nicht so'], ['U06', 'she said it is not so', 'sie hat gesagt, es ist nicht so'], ['U07', 'she said it is not so', 'sie hat gesagt, das ist nicht so']];
const ph = (lego, s, k, t, role) => ({ id: `deu_for_eng:${lego}${s}`, phrase_role: role || (s[0] === 'B' ? 'build' : 'use'), known_text: k, target_text: t });
const before = () => ({
  seeds: [{ seed_number: 538, known_text: "I don't want to seem as though I don't care", target_text: 'Ich will nicht so wirken, als ob es mir egal ist' }],
  legos: [
    { lego_id: 'S0538L01', seed_number: 538, known_text: 'to seem', target_text: 'so wirken', components: [{ known: 'to seem', target: 'so wirken' }], is_new: true, presentation_audio_id: 'i1' },
    { lego_id: 'S0538L02', seed_number: 538, known_text: 'to seem', target_text: 'wirken', components: [], is_new: false },
    { lego_id: 'S0538L03', seed_number: 538, known_text: 'as if', target_text: 'als ob', components: [], is_new: true, presentation_audio_id: 'i3' },
  ],
  phrases: [
    ...old.map(([s, k, t]) => ph('S0538L01', s, k, t)),
    ph('S0538L01', 'U21', "I don't want to seem as though I don't care", 'ich will nicht so wirken, als ob es mir egal ist'),
    ph('S0538L02', 'U01', 'she wants to seem good', 'sie will nicht so schlecht wirken'),
    ph('S0538L02', 'U07', "she doesn't want to seem that way", 'sie will nicht so wirken'),
    ph('S0538L03', 'B02', 'as if', 'als ob'), ph('S0538L03', 'B03', 'as though she can do it', 'als ob sie das kann'), ph('S0538L03', 'U03', 'as if she can', 'als ob sie kann'),
  ],
});
const zutless = { auditRows: () => ({ bidirectional: { violationsStrict: [] } }) };

test('BEFORE: no L01 non-seed phrase holds the LEGO; L03 says "as if"', () => {
  const db = before();
  assert.strictEqual(db.phrases.filter((r) => r.id.includes('L01') && T.containsLego(r, T.NEW_L1)).length, 1, 'only the seed row U21');
  assert.ok(db.phrases.some((r) => /\bas if\b/.test(r.known_text)));
});

test('AFTER: every L01 row holds the whole LEGO, K48 subordinator carried, L03 says "as though", components tile', () => {
  const db = before(), p = T.plan(db);
  assert.ok(T.carriesSubordinator(T.NEW_L1));
  const post = T.simulate(db, p);
  for (const r of post.phrases.filter((r) => r.id.includes('S0538L01'))) assert.strictEqual(T.containsLego(r, T.NEW_L1), true, r.id);
  for (const r of post.phrases.filter((r) => r.id.includes('S0538L03'))) { assert.strictEqual(T.containsLego(r, T.NEW_L3), true, r.id); assert.ok(!/\bas if\b/i.test(r.known_text)); }
  const l1 = post.legos.find((l) => l.lego_id === 'S0538L01');
  assert.strictEqual(l1.target_text, 'so wirken, als ob');
  assert.strictEqual(l1.is_new, true, 'is_new is kept');
  assert.deepStrictEqual(l1.components, T.NEW_L1_COMPONENTS);
  assert.strictEqual(post.phrases.find((r) => r.id.endsWith('L02U01')).target_text, 'sie will gut wirken');
  assert.strictEqual(post.phrases.find((r) => r.id.endsWith('L02U07')).target_text, 'sie will nicht gut wirken');
});

test('ops never delete a LEGO or flip is_new, relink audio after the text, and the plan is idempotent', () => {
  const db = before(), p = T.plan(db);
  const clips = new Map(T.clipAsks(p).map((a) => [`${a.role}\u0000${a.text}\u0000${a.legoId || ''}`, `clip-${a.role}-${a.text}`]));
  const ops = T.editOps(p, clips);
  assert.ok(!ops.some((o) => /delete|insert/.test(o.op)));
  assert.ok(!ops.some((o) => o.set && 'is_new' in o.set));
  const firstLink = ops.findIndex((o) => o.op === 'audio.link');
  assert.ok(ops.slice(firstLink).every((o) => o.op === 'audio.link'));
  assert.strictEqual(T.swapAsIf('as if she can'), 'as though she can');
  assert.deepStrictEqual(T.problems(db, { ...p }, zutless).list.filter((m) => /P17|K48|L4/.test(m)), [], 'the plan breaches nothing it checks here');
  const after = T.simulate(db, p);
  const again = T.plan({ ...after, seeds: db.seeds });
  assert.strictEqual(again.phraseUpdates.length, 0); assert.strictEqual(again.l1, null); assert.strictEqual(again.l3, null);
});
