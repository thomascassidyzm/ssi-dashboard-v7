'use strict';
// node --test tools/course-optimization/deu-k48-group-a-2026-10-19.test.cjs
// The proof for job #252: on the rows as they stood on 19 Oct the K48 LEGOs lack their subordinator and their baskets do
// not hold the grown LEGO (P17); after each plan, every LEGO starts with its trigger and every basket row holds it whole.
const test = require('node:test');
const assert = require('node:assert');
const T = require('./deu-k48-group-a-2026-10-19.cjs');

// Seed 344 exactly as Popty listed it on 19 Oct 2026 (job #252 dump), BUILD/USE rows only.
const BEFORE_344 = [
  ['B01', 'build', 'happy to help you', 'dir gern hilft'],
  ['B02', 'build', 'that he is happy to help you', 'dass er dir gern hilft'],
  ['B03', 'build', 'because he is happy to help you', 'weil er dir gern hilft'],
  ['U01', 'use', 'who said that he is happy to help you', 'der gesagt hat, dass er dir gern hilft'],
  ['U02', 'use', 'I am sure that he is happy to help you', 'ich bin mir sicher, dass er dir gern hilft'],
  ['U03', 'use', 'do you think he is happy to help you?', 'denkst du, dass er dir gern hilft?'],
  ['U04', 'use', 'she has said that he is happy to help you', 'sie hat gesagt, dass er dir gern hilft'],
  ['U05', 'use', 'I met someone who said that he is happy to help you', 'ich habe jemanden getroffen, der gesagt hat, dass er dir gern hilft'],
  ['U06', 'use', 'I am sure that he is happy to help you with the group', 'ich bin mir sicher, dass er dir gern mit der Gruppe hilft'],
  ['U07', 'use', "who said that he's happy to help you", 'der gesagt hat, dass er dir gern hilft'],
];
const row = (lego, [s, role, known_text, target_text], i) => ({ id: `deu_for_eng:${lego}${s}`, phrase_role: role, known_text, target_text, position: i + 4, seed_number: 344, metadata: {} });
const db344 = () => ({
  seeds: [{ seed_number: 344, known_text: "who said that he's happy to help you", target_text: 'der gesagt hat, dass er dir gern hilft', approved_at: '2026-04-01T00:00:00Z' }],
  legos: [
    { lego_id: 'S0344L01', seed_number: 344, lego_index: 1, is_new: true, known_text: 'gladly', target_text: 'gern', components: [] },
    { lego_id: 'S0344L02', seed_number: 344, lego_index: 2, is_new: true, known_text: 'happy to help you', target_text: 'dir gern hilft', components: [], presentation_audio_id: 'old-intro' },
  ],
  phrases: BEFORE_344.map((r, i) => row('S0344L02', r, i)),
});
const spec = T.PLAN.APPLY.find((p) => p.lego === 'S0344L02');

test('BEFORE: the LEGO lacks its subordinator and 4 of its rows do not hold the grown LEGO', () => {
  const db = db344();
  assert.strictEqual(T.carriesSubordinator({ target: db.legos[1].target_text }), false);
  const missing = db.phrases.filter((r) => !T.containsLego(r, spec.new)).map((r) => r.id.slice(-3));
  assert.deepStrictEqual(missing, ['B01', 'B03', 'U03', 'U06']);
});

test('AFTER: the LEGO starts with dass, every row holds it whole on both sides, none in main-clause order', () => {
  const db = db344(), p = T.plan(db, ['S0344L02']);
  const post = T.simulate(db, p);
  const lego = post.legos.find((l) => l.lego_id === 'S0344L02');
  assert.strictEqual(lego.target_text, 'dass er dir gern hilft');
  assert.ok(T.carriesSubordinator({ target: lego.target_text }));
  for (const r of post.phrases) {
    assert.ok(T.containsLego(r, spec.new), `${r.id}: ${r.known_text} | ${r.target_text}`);
    assert.ok(!spec.slip.test(r.target_text), r.id);
  }
  assert.strictEqual(new Set(post.phrases.map((r) => T.fold(r.target_text))).size, post.phrases.length, 'no German repeated in the basket');
  assert.strictEqual(p.seedUnapprove.length, 1, 'O5: the touched seed is unapproved');
});

test('known side is contraction-tolerant (K6) but the target side is exact', () => {
  assert.ok(T.containsLego({ known_text: 'I am sure that he is happy to help you', target_text: 'dass er dir gern hilft' }, spec.new));
  assert.ok(!T.containsLego({ known_text: "that he's happy to help you", target_text: 'dass er dir gern mit der Gruppe hilft' }, spec.new));
});

test('ops never delete a LEGO, re-link the intro, and a re-voice refusal resolves to the clip it names', () => {
  const db = db344(), p = T.plan(db, ['S0344L02']);
  const clips = new Map(T.clipAsks(p).map((a) => [`${a.role}\u0000${a.text}\u0000${a.legoId || ''}`, `clip:${a.role}:${a.text}`]));
  const ops = T.editOps(p, clips);
  assert.ok(!ops.some((o) => /delete/.test(o.op)));
  assert.ok(ops.some((o) => o.op === 'audio.link' && o.target === 'lego' && o.slot === 'presentation'));
  assert.strictEqual(T.existingClip({ code: 'RERECORD_NOT_PERMITTED', error: 'TTS door (403) RERECORD_NOT_PERMITTED: deu_for_eng target1 "dass er dir gern hilft" already has a working clip (72d8cece-e55b-483f-906e-907436b939d9 in ara). Re-recording needs…' }), '72d8cece-e55b-483f-906e-907436b939d9');
  assert.strictEqual(T.existingClip({ code: 'DAILY_TOTAL_CAP', error: 'x' }), null);
});

test('every planned LEGO starts with its trigger and stays within 8 syllables; every held one names its rule', () => {
  for (const s of T.PLAN.APPLY) { assert.ok(T.carriesSubordinator(s.new), s.lego); assert.ok(T.syllables(s.new.target) <= 8, s.lego); }
  for (const h of T.PLAN.HELD) assert.ok(h.lego && h.rule && h.why, JSON.stringify(h));
});
