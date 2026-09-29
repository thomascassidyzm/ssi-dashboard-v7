'use strict';
// node --test tools/course-optimization/ita-sicuro-di-wh-2026-09-29.test.cjs
// The proving test for job #733·I: the end-state rule FAILS on the pre-fix course (the live rows of 2026-09-29,
// reduced to what the plan reads) and PASSES once the plan is applied.
const test = require('node:test');
const assert = require('node:assert');
const T = require('./ita-sicuro-di-wh-2026-09-29.cjs');

const P = (kind, id, known, target) => ({ kind, sn: Number(id.slice(1, 5)), id, known, target });
function preFix() {
  return [
    { kind: 'lego', sn: 10, id: 'S0010L02', known: "I'm not sure", target: 'non sono sicuro', is_new: true },
    { kind: 'lego', sn: 80, id: 'S0080L01', known: "I'm not sure", target: 'non sono sicuro', is_new: false },
    ...[['S0012L03', "what's going to happen", 'cosa succederà'], ['S0017L02', 'what is', 'qual è'], ['S0017L03', 'the answer', 'la risposta'], ['S0020L02', 'his name', 'il suo nome'], ['S0043L02', 'how to answer', 'come rispondere'], ['S0241L01', 'to give it to him', 'darglielo']]
      .map(([id, known, target]) => ({ kind: 'lego', sn: Number(id.slice(1, 5)), id, known, target, is_new: true })),
    { kind: 'lego', sn: 80, id: 'S0080L02', known: "when I'll be ready", target: 'quando sarò pronto', is_new: true },
    P('seed', 'S0080', "I'm not sure when I'll be ready", 'non sono sicuro di quando sarò pronto'),
    P('seed', 'S0510', "she's gone to look for somewhere safe to park the car", 'È andata a cercare un posto sicuro dove parcheggiare la macchina'),
    ...T.EDITS.map((e) => P(e.id.includes('B') ? 'build' : 'use', e.id, e.before.known, e.before.target)),
    ...T.DELETES.map((d) => P('build', d.id, d.known, d.target)),
    ...T.COMPONENTS.map((c) => P('component', c.id, c.before.known, c.before.target)),
    P('use', 'S0080L02U01', "I'm not sure when I'll be ready", 'non sono sicuro di quando sarò pronto'),
    P('use', 'S0490L01U03', "then I'm not sure what to do", 'allora non sono sicuro di cosa fare'),
    P('use', 'S0010L03U01', "I'm not sure if I can speak Italian today", 'non sono sicuro se posso parlare italiano oggi'),
  ];
}

test('the rule fails on the pre-fix course', () => {
  const probs = T.endStateProblems(preFix());
  assert.ok(probs.some((p) => p.startsWith('S0010L02U01: sicuro + question word without di')));
  assert.ok(probs.some((p) => p.startsWith('S0241L01U09: sicuro + question word without di')));
  assert.ok(probs.some((p) => p.startsWith('S0043L02U06: sicuro di + question word at seed 43')));
  assert.ok(probs.some((p) => p.startsWith('S0080L01 does not teach')));
});

test('the rule holds once the plan is applied', () => {
  assert.deepStrictEqual(T.endStateProblems(T.applyPlanToRows(preFix())), []);
  assert.deepStrictEqual(T.planProblems(preFix()), []);
});

test('sicuro se / sicuro che / posto sicuro dove are never findings', () => {
  for (const t of ['non sono sicuro se posso', 'sono sicuro che starà bene', 'un posto sicuro dove parcheggiare', 'sei sicuro che non ti dispiace'])
    assert.strictEqual(T.bareSicuroWh(t), false, t);
  for (const t of ['non sono sicuro come', 'non sono sicuro qual è', 'ma non sono sicuro quando', 'non era sicuro che cosa fare'])
    assert.strictEqual(T.bareSicuroWh(t), true, t);
});
