'use strict';
// node --test tools/course-optimization/ita-513-151-607-2026-09-28.test.cjs
// The proving test for job #667·I: the end-state rule FAILS on the pre-fix course (the live rows of
// 2026-09-28 23:40Z, reduced to the seeds the job touches) and PASSES once the plan is applied.
const test = require('node:test');
const assert = require('node:assert');
const T = require('./ita-513-151-607-2026-09-28.cjs');

const L = (sn, id, known, target, is_new, components = null) => ({ kind: 'lego', sn, id, known, target, is_new, components });
const P = (kind, sn, id, known, target) => ({ kind, sn, id, known, target });
const SEED = (sn, id, known, target) => ({ kind: 'seed', sn, id, known, target });

/** The pre-fix course, as it stood (only what the plan reads). */
function preFix() {
  return [
    SEED(86, 'S0086', "it wasn't possible, unfortunately", 'non era possibile, purtroppo'),
    L(86, 'S0086L01', "it wasn't", 'non era', true, [{ known: "it wasn't", target: 'non era' }]),
    P('use', 86, 'S0086L01U04', "it wasn't what I wanted to say", 'non era quello che volevo dire'),
    L(112, 'S0112L01', 'it was', 'era', true), L(123, 'S0123L01', 'idea', 'idea', true), L(143, 'S0143L01', 'the same thing', 'la stessa cosa', true), L(143, 'S0143L02', 'we were talking', 'parlavamo', true),
    SEED(151, 'S0151', "that wasn't what I was hoping would happen", 'non era quello che speravo succedesse'),
    L(151, 'S0151L01', "wasn't", 'non era', true), L(151, 'S0151L02', 'I was hoping would happen', 'speravo succedesse', true),
    P('build', 151, 'S0151L01B01', "wasn't", 'non era'), P('build', 151, 'S0151L01B02', "wasn't", 'non era'), P('build', 151, 'S0151L01B03', "that wasn't", 'quello non era'), P('build', 151, 'S0151L01B04', "that wasn't easy", 'quello non era facile'),
    P('component', 151, 'S0151L01C01', 'not', 'non'), P('component', 151, 'S0151L01C02', 'was', 'era'),
    P('use', 151, 'S0151L01U01', "that wasn't the same thing", 'non era la stessa cosa'), P('use', 151, 'S0151L01U02', "that wasn't a good idea", 'non era una buona idea'),
    P('use', 151, 'S0151L01U03', "that wasn't what I was thinking", 'non era quello che pensavo'), P('use', 151, 'S0151L01U04', "that wasn't what I thought", 'non era quello che pensavo'),
    P('use', 151, 'S0151L01U06', "that wasn't what I wanted to say", 'non era quello che volevo dire'), P('use', 151, 'S0151L01U07', "that wasn't what we were talking about", 'non era quello di cui parlavamo'),
    P('use', 151, 'S0151L01U09', "it wasn't easy, but it was interesting", 'non era facile, ma era interessante'),
    P('build', 151, 'S0151L02B04', "that wasn't what I was hoping would happen", 'non era quello che speravo succedesse'), P('use', 151, 'S0151L02U03', "that wasn't what I was hoping would happen yesterday", 'non era quello che speravo succedesse ieri'),
    L(152, 'S0152L01', 'I would have done it', "l'avrei fatto", true),
    L(159, 'S0159L01', "that isn't", 'non è', true),
    SEED(513, 'S0513', 'it hurts most when I move my head up and down', 'fa più male quando muovo la testa su e giù'),
    L(513, 'S0513L01', 'when I move', 'quando muovo', true), L(513, 'S0513L02', 'it hurts', 'fa male', true), L(513, 'S0513L03', 'my head', 'la testa', true), L(513, 'S0513L04', 'up and down', 'su e giù', true),
    P('build', 513, 'S0513L03B01', 'my head', 'la testa'), P('build', 513, 'S0513L03B02', 'my head hurts', 'fa male la testa'), P('build', 513, 'S0513L03B03', 'when I move my head', 'quando muovo la testa'),
    P('use', 513, 'S0513L03U01', 'my head hurts', 'la testa fa male'), P('use', 513, 'S0513L03U02', 'my head hurts a lot', 'la testa fa molto male'), P('use', 513, 'S0513L03U03', 'she said her head hurts', 'ha detto che la testa fa male'),
    P('use', 513, 'S0513L03U04', 'my head hurts when I move', 'la testa fa male quando muovo'), P('use', 513, 'S0513L03U05', 'it hurts most when I move my head', 'fa più male quando muovo la testa'),
    P('build', 513, 'S0513L04B01', 'up and down', 'su e giù'), P('build', 513, 'S0513L04B02', 'my head up and down', 'la testa su e giù'), P('build', 513, 'S0513L04B03', 'hurts when I move my head up and down', 'fa male la testa su e giù'),
    P('use', 513, 'S0513L04U01', 'it hurts most when I move my head up and down', 'fa più male quando muovo la testa su e giù'), P('use', 513, 'S0513L04U02', 'it hurts when I move up and down', 'fa male quando muovo su e giù'),
    P('use', 513, 'S0513L04U03', 'she said her head hurts when she moves up and down', 'ha detto che la testa fa male quando muovo su e giù'), P('use', 513, 'S0513L04U04', "please don't move your head up and down now", 'per favore non muovo la testa su e giù adesso'),
    P('use', 513, 'S0513L04U05', 'it hurts most when I move my head just a little up and down', "fa più male quando muovo la testa solo un po' su e giù"),
    SEED(607, 'S0607', "if I'd known I'd have done things differently", 'se avessi saputo, avrei fatto le cose diversamente'),
    L(607, 'S0607L01', 'the things', 'le cose', true), L(607, 'S0607L02', 'I would have done', 'avrei fatto', false, [{ known: 'I would have', target: 'avrei' }, { known: 'done', target: 'fatto' }]),
    P('use', 607, 'S0607L01U01', "I'd have done things differently", 'avrei fatto le cose diversamente'),
  ];
}

test('the plan holds against the pre-fix course', () => {
  const D = T.plan(preFix());
  assert.deepStrictEqual(D.problems, []);
});
test('the end-state rule FAILS on the pre-fix course', () => {
  const p = T.endStateProblems(preFix());
  assert.ok(p.length >= 15, p.join('\n'));
  assert.ok(p.some((x) => /S0513L04U04/.test(x)), 'non muovo caught');
  assert.ok(p.some((x) => /S0151L01 is not the not-new twin/.test(x)));
  assert.ok(p.some((x) => /S0607L02 is not new/.test(x)));
});
test('the end-state rule PASSES once the plan is applied', () => {
  const post = T.applyPlanToRows(preFix());
  assert.deepStrictEqual(T.endStateProblems(post), []);
});
test('rails: 151 L01 is a both-sides duplicate of 86 L01; 607 L02 no longer duplicates the grown 152 L01; 607 never says "it"', () => {
  assert.ok(T.isDuplicate(T.S151.lego.to, T.S151.earlier));
  assert.ok(!T.isDuplicate(T.S607.lego, T.S607.grown152));
  for (const a of T.S607.adds) { assert.ok(T.phraseContainsLego(a, T.S607.lego), a.id); assert.ok(!/would have done it/.test(a.known), a.id); }
});
test('rails: every rehomed row contains its NEW landing LEGO on both sides, still says non era, and the two unrehomeable rows are listed not dropped', () => {
  const post = T.applyPlanToRows(preFix());
  const byId = Object.fromEntries(post.map((r) => [r.id, r]));
  for (const m of T.S151.moves) { assert.ok(byId[m.to] && byId[m.lego].is_new && T.phraseContainsLego(byId[m.to], byId[m.lego]), m.to); assert.ok(!byId[m.from], `${m.from} gone`); }
  for (const s of T.S151.stay) assert.ok(byId[s.id], `${s.id} stays`);
  assert.ok(!byId.S0151L01B03 && !byId.S0151L01U06);
  assert.strictEqual(post.filter((r) => r.kind === 'lego').length, preFix().filter((r) => r.kind === 'lego').length, 'never delete a LEGO');
});
test('the 513 intro is a free line that quotes the LEGO, with no brackets and no template colon/dash', () => {
  assert.ok(T.S513.intro.includes("'my head'") && T.S513.intro.includes("'your head'"));
  assert.ok(!/[()\[\]—]/.test(T.S513.intro) && !/:\s*'/.test(T.S513.intro));
  assert.ok(T.S607.intro.startsWith("The Italian for: 'I would have done', as in — '"));
});
