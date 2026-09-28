'use strict';
// The proving test for job #630·I: Kai's in-testa rule (a phrase uses "in testa" only where it is the correct
// Italian for "in MY head" — an owner in the sentence, never "nella mia testa") FAILS on the BEFORE rows of
// seed 131 and PASSES on the AFTER rows; and every row under the grown L04 contains "mi girano in testa".
const { test } = require('node:test');
const assert = require('node:assert/strict');
const T = require('./ita-seed-131-in-testa-2026-09-28.cjs');

test('the in-testa rule: owner present passes, ownerless and "nella mia testa" fail, fragments pass', () => {
  assert.equal(T.inTestaAnchored('ho troppe idee in testa'), true);
  assert.equal(T.inTestaAnchored('troppe idee mi girano in testa'), true);
  assert.equal(T.inTestaAnchored('ci sono troppe idee che mi girano in testa'), true, 'the seed itself');
  assert.equal(T.inTestaAnchored('in testa'), true, 'a build fragment');
  assert.equal(T.inTestaAnchored('idee in testa'), true);
  assert.equal(T.inTestaAnchored('troppe cose sono in testa'), false);
  assert.equal(T.inTestaAnchored('è in testa adesso'), false, '"è in testa" is "is in the lead"');
  assert.equal(T.inTestaAnchored('ci sono molte cose in testa'), false);
  assert.equal(T.inTestaAnchored('ho troppe idee nella mia testa'), false, 'never nella mia testa');
  assert.equal(T.inTestaAnchored('ho troppe idee nella testa'), false);
  assert.equal(T.inTestaAnchored('la testa fa male'), true, 'not an in-testa row: out of the rule');
});
test('seed 131 BEFORE breaks the rule in seven rows; AFTER breaks it in none', () => {
  const broken = (rows) => rows.filter(r => !T.inTestaAnchored(r.target)).map(r => r.id);
  assert.deepEqual(broken(T.BEFORE_ROWS()), ['S0131L03U02', 'S0131L03U03', 'S0131L03U04', 'S0131L03U05', 'S0131L03U06', 'S0131L03U07', 'S0131L03U08']);
  assert.deepEqual(broken(T.AFTER_ROWS()), []);
});
test('L04 grown: BEFORE, five rows under L04 lacked "in testa"; AFTER every row under L04 contains "mi girano in testa"', () => {
  const under = (rows) => rows.filter(r => r.lego === 'S0131L04');
  assert.equal(under(T.BEFORE_ROWS()).filter(r => !T.containsWords(r.target, T.L04_AFTER.target)).length, 5);
  assert.equal(under(T.AFTER_ROWS()).filter(r => !T.containsWords(r.target, T.L04_AFTER.target)).length, 0);
  assert.equal(T.L04_AFTER.known, "they're going around in my head");
  assert.equal(T.L04_AFTER.target, 'mi girano in testa');
});
test('components tile the grown LEGO on both sides; the intro quotes its LEGO; static guards hold', () => {
  const c = T.L04_AFTER.components;
  assert.ok(T.sameWords(c.map(x => x.known).join(' '), T.L04_AFTER.known));
  assert.ok(T.sameWords(c.map(x => x.target).join(' '), T.L04_AFTER.target));
  assert.ok(T.INTRO_L03.text.includes("'in my head'"));
  assert.ok(T.containsWords(T.INTRO_L03.example, 'in my head'));
  assert.deepEqual(T.staticProblems(), []);
});
test('no two AFTER rows put the same English over different Italian (ZUT inside the seed)', () => {
  const byKnown = {};
  for (const r of T.AFTER_ROWS()) { const k = T.norm(r.known); (byKnown[k] = byKnown[k] || new Set()).add(T.norm(r.target)); }
  for (const [k, ts] of Object.entries(byKnown)) assert.equal(ts.size, 1, k);
});
