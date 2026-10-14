'use strict';
// node --test tools/course-optimization/ita-ask-question-fare-2026-10-14.test.cjs
// Proves K44 on ita_for_eng (Kai, 2026-10-14, job #345): the BEFORE picture of seeds 190 and 223 breaks the rule
// "ask a question = fare una domanda, ask something = chiedere, no bare light verb"; the AFTER picture holds it. Pure — no DB.
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('./ita-ask-question-fare-2026-10-14.cjs');

test('BEFORE: seed 190 L01 is a bare "ti faccio" glossed "ask", and 223 U05 says chiedere + domanda', () => {
  const before = [...T.OLD_190, { id: T.EDIT_223.id, known: T.EDIT_223.before[0], target: T.EDIT_223.before[1] },
    ...T.OLD_LEGOS.map((l) => ({ id: `S0190L0${l.idx}`, known: l.known, target: l.target }))];
  const found = T.askDefects(before).map((d) => d.split(' ')[0]).sort();
  assert.deepEqual(found, ['S0190L01', 'S0190L01B01', 'S0190L01B05', 'S0190L01B06', 'S0190L01B07', 'S0190L01B08', 'S0190L01B09', 'S0190L01B10', 'S0190L01B11', 'S0223L01U05']);
});

test('the rule accepts what the course already teaches', () => {
  const ok = [
    { id: 'a', known: "do you mind if I ask you a question?", target: 'ti dispiace se ti faccio una domanda?' },
    { id: 'b', known: 'she asked a question', target: 'ha fatto una domanda' },
    { id: 'c', known: 'I wanted to ask you something yesterday', target: 'volevo chiederti qualcosa ieri' },
    { id: 'd', known: 'I have some questions', target: 'ho alcune domande' },
  ];
  assert.deepEqual(T.askDefects(ok), []);
});

test('AFTER: the plan passes every rule it is judged by', () => {
  assert.deepEqual(T.checkPlan(), []);
  assert.equal(T.NEW_LEGOS[1].intro, "When you talk about asking questions, we use a different word. The Italian for 'I ask you some questions' is:");
  assert.ok(T.NEW_190.some((r) => r.target === 'ti dispiace se ti faccio alcune domande più tardi?'));
  assert.deepEqual(T.DELETES_190.map((d) => d.id), ['S0190L01B07', 'S0190L01B08', 'S0190L01B09', 'S0190L01B10', 'S0190L01B11']);
});
