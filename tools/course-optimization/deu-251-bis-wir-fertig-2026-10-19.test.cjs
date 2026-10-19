'use strict';
// node --test tools/course-optimization/deu-251-bis-wir-fertig-2026-10-19.test.cjs
// The proof for job #188: "bis nachdem" (the English "until after" copied word for word) is in seed 251 as it stood on 19 Oct,
// and is gone — with the LEGO still whole in every phrase (P17) and the decompositions still tiling — after the plan.
const test = require('node:test');
const assert = require('node:assert');
const T = require('./deu-251-bis-wir-fertig-2026-10-19.cjs');

const dec = (parts) => parts.map(([target, legoId]) => ({ known: '', legoId: legoId || null, target, isGhost: !legoId }));
const ph = (suffix, known, target, decomposition) => ({ id: `deu_for_eng:S0251L02${suffix}`, phrase_role: suffix[0] === 'B' ? 'build' : 'use', known_text: known, target_text: target, decomposition });
const before = () => ({
  seeds: [{ seed_number: 251, known_text: "I don't want to find out until after we finish", target_text: T.OLD_SEED_TARGET, approved_at: '2026-04-13T13:58:53Z' }],
  legos: [{ lego_id: 'S0251L02', seed_number: 251, known_text: 'until after we finish', target_text: 'bis nachdem wir fertig sind', components: [{ known: 'until after we finish', target: 'bis nachdem wir fertig sind' }] }],
  phrases: T.PHRASES.map(([s, k, o]) => ph(s, k, o, s === 'B02'
    ? dec([['Ich kann', 'S0010L02'], [' nicht', 'S0010L01'], [' antworten'], [' bis nachdem wir fertig sind', 'S0251L02']])
    : s === 'B01' ? dec([['Bis nachdem wir fertig sind', 'S0251L02']]) : null)).concat([ph('U08', 'I can\'t tell you until after we finish what we have to do today', 'Ich kann es dir nicht sagen, bis wir fertig sind mit dem, was wir heute machen müssen', null)]),
});
const zutless = { auditRows: () => ({ bidirectional: { violationsStrict: [] } }) };

test('BEFORE: the seed, the LEGO, its component and 7 phrases carry "bis nachdem"; U08 already reads right', () => {
  const db = before();
  assert.ok(T.hasBisNachdem(db.seeds[0].target_text));
  assert.ok(T.hasBisNachdem(db.legos[0].target_text));
  assert.strictEqual(db.phrases.filter((r) => T.hasBisNachdem(r.target_text)).length, 7);
  assert.strictEqual(T.hasBisNachdem('Ich kann es dir nicht sagen, bis wir fertig sind'), false);
  assert.strictEqual(T.containsLego(db.phrases[0], T.NEW_LEGO), false, 'the old rows do not hold the new LEGO');
});

test('AFTER: nothing says "bis nachdem", every phrase holds the whole LEGO, "bis" is the subordinator, the English is untouched', () => {
  const db = before(), p = T.plan(db);
  assert.strictEqual(p.phraseUpdates.length, 7);
  assert.ok(T.carriesSubordinator(T.NEW_LEGO));
  const post = T.simulate(db, p);
  assert.strictEqual(post.seeds[0].target_text, 'Ich will es nicht herausfinden, bis wir fertig sind');
  assert.strictEqual(post.legos[0].target_text, 'bis wir fertig sind');
  assert.deepStrictEqual(post.legos[0].components, [{ known: 'until after we finish', target: 'bis wir fertig sind' }]);
  for (const r of post.phrases) {
    assert.strictEqual(T.hasBisNachdem(r.target_text), false, r.id);
    assert.strictEqual(T.containsLego(r, T.NEW_LEGO), true, r.id);
    assert.ok(T.decompositionTiles(r.decomposition, r.target_text), `${r.id} decomposition tiles the target`);
  }
  for (const u of p.phraseUpdates) assert.strictEqual(u.set.known_text, undefined);
  assert.strictEqual(p.phraseUpdates.find((u) => u.id.endsWith('U11')).set.target_text, 'Ich will mit dir reden, bis wir fertig sind mit der Arbeit');
});

test('the ops unapprove the seed, link only German slots, and the plan is idempotent', () => {
  const db = before(), p = T.plan(db);
  const clips = new Map(T.clipAsks(p).flatMap((a) => [[`${a.role}\u0000${a.text}\u0000${a.legoId || ''}`, `clip-${a.role}-${a.text}`]]));
  const ops = T.editOps(p, clips);
  const seedOp = ops.find((o) => o.op === 'seed.update');
  assert.strictEqual(seedOp.set.approved_at, null);
  assert.ok(ops.filter((o) => o.op === 'audio.link').every((o) => o.slot === 'target1' || o.slot === 'target2'));
  assert.strictEqual(ops.filter((o) => o.op === 'audio.link').length, 2 * (1 + 1 + 7));
  assert.ok(!ops.some((o) => o.op === 'lego.delete' || o.op === 'lego.insert'), 'a LEGO is never deleted');
  const again = T.plan({ ...T.simulate(db, p), seeds: T.simulate(db, p).seeds });
  assert.strictEqual(again.seed, null); assert.strictEqual(again.lego, null); assert.strictEqual(again.phraseUpdates.length, 0);
  assert.ok(T.problems(db, p, zutless).list.every((m) => !/bis nachdem|P17/.test(m)), 'no breach left on the plan');
});
