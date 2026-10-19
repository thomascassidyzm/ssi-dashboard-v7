'use strict';
// node --test tools/course-optimization/deu-580-wir-wollten-oft-2026-10-19.test.cjs
// The proof for job #242: "gewollt … zu" / "hinzubringen" after a modal is in seed 580 as it stood on 19 Oct, and is gone after the plan —
// every row under the four LEGOs holds its LEGO on both sides (P17), the seed German holds L03 and L04, and no LEGO is deleted.
const test = require('node:test');
const assert = require('node:assert');
const T = require('./deu-580-wir-wollten-oft-2026-10-19.cjs');

const before = () => ({
  seeds: [{ seed_number: 580, known_text: "we've often wanted to take the children somewhere a little warmer", target_text: T.OLD_SEED_TARGET, approved_at: null }],
  legos: [
    { lego_id: 'S0580L01', seed_number: 580, known_text: 'children', target_text: 'Kinder', components: [] },
    { lego_id: 'S0580L02', seed_number: 580, known_text: 'a little', target_text: 'ein bisschen', components: [{ known: 'a', target: 'ein' }] },
    { lego_id: 'S0580L03', seed_number: 580, known_text: 'to take there', target_text: 'hinzubringen', components: [], presentation_audio_id: 'p3' },
    { lego_id: 'S0580L04', seed_number: 580, known_text: "we've often wanted", target_text: 'wir haben oft gewollt', components: [{ known: "we've often wanted", target: 'wir haben oft gewollt' }], presentation_audio_id: 'p4' },
  ],
  phrases: T.PHRASES.map((r) => ({ id: `deu_for_eng:${r.id}`, phrase_role: r.id[7 + 1] === 'B' || /L0\dB/.test(r.id) ? 'build' : 'use', known_text: r.oldKnown, target_text: r.oldTarget })),
});
const zutless = { auditRows: () => ({ bidirectional: { violationsStrict: [] } }) };

test('BEFORE: the seed, L03, L04 and the broken rows carry the defect', () => {
  const db = before();
  assert.ok(T.defect(db.seeds[0].target_text));
  assert.ok(T.defect('sie kann die Kinder hinzubringen'));
  assert.ok(T.defect('sie hat oft gewollt zu versuchen'));
  assert.ok(T.defect('sie möchte hier aufzuwachsen'));
  assert.ok(!T.defect('sie möchte wissen, wie es ist, hier aufzuwachsen'), 'a zu-infinitive after "es ist" is right');
  assert.ok(db.phrases.filter((r) => T.defect(r.target_text)).length >= 18);
  const l3 = { known: 'to take there', target: 'hinbringen' };
  assert.strictEqual(T.containsLego('she must take the children somewhere', 'sie muss die Kinder irgendwo hinzubringen', l3), false, 'the old "somewhere" row has no "there"');
});

test('AFTER: no defect, every row holds its LEGO on both sides, the seed holds L03 and L04', () => {
  const db = before(), p = T.plan(db);
  assert.strictEqual(p.phraseUpdates.length, 28);
  const post = T.simulate(db, p);
  assert.strictEqual(post.seeds[0].target_text, 'wir wollten oft die Kinder irgendwo ein bisschen wärmer hinbringen');
  for (const r of post.phrases) assert.ok(!T.defect(r.target_text), r.id);
  const lg = new Map(post.legos.map((l) => [l.lego_id, l]));
  for (const r of post.phrases.filter((x) => /S0580L0[34]/.test(x.id))) {
    const l = lg.get(r.id.split(':')[1].slice(0, 8));
    assert.ok(T.containsLego(r.known_text, r.target_text, { known: l.known_text, target: l.target_text }), r.id);
  }
  assert.deepStrictEqual(lg.get('S0580L02').components, [{ known: 'a', target: 'ein' }, { known: 'little', target: 'bisschen' }]);
  assert.ok(T.problems(db, p, zutless).list.every((m) => !/defect|P17/.test(m)));
});

test('the gate fires on a planted bad row', () => {
  const db = before(), p = T.plan(db);
  p.phraseUpdates.find((u) => u.id === 'S0580L03U02').set.target_text = 'sie kann die Kinder bringen';
  assert.ok(T.problems(db, p, zutless).list.some((m) => /P17 S0580L03U02/.test(m)));
});

test('the ops unapprove the seed, never delete a LEGO, re-link the intros, and the plan is idempotent', () => {
  const db = before(), p = T.plan(db);
  const clips = new Map(T.clipAsks(p).map((a) => [`${a.role}\u0000${a.text}\u0000${a.legoId || ''}`, `clip-${a.role}-${a.text}`]));
  const ops = T.editOps(p, clips);
  assert.strictEqual(ops.find((o) => o.op === 'seed.update').set.approved_at, null);
  assert.ok(!ops.some((o) => o.op === 'lego.delete' || o.op === 'lego.insert'));
  assert.deepStrictEqual(ops.filter((o) => o.slot === 'presentation').map((o) => o.audio_id).sort(), ['p3', 'p4']);
  const again = T.plan({ ...db, ...T.simulate(db, p), seeds: T.simulate(db, p).seeds });
  assert.strictEqual(again.seed, null); assert.strictEqual(again.legos.length, 0); assert.strictEqual(again.phraseUpdates.length, 0);
});
