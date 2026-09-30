'use strict';
// node --test tools/course-optimization/ita-919-small-fixes-2026-09-30.test.cjs
// Job #919·I: the end-state rule FAILS on the pre-fix rows (bare half-idiom LEGOs, bare B01, old 312 order, B03 present) and PASSES on the planned ones.
const test = require('node:test');
const assert = require('node:assert');
const T = require('./ita-919-small-fixes-2026-09-30.cjs');
const planned = () => {
  const rows = [];
  for (const p of T.LEGO_PLANS) {
    rows.push({ kind: 'lego', sn: p.seed, id: p.id, ...p.after });
    for (const [id, role, known, target] of p.rows) rows.push({ kind: role, sn: p.seed, id: `${p.id}${id}`, known, target });
  }
  for (const [id, known, target] of T.S129.rows) rows.push({ kind: 'component', sn: 129, id, known, target });
  rows.push({ kind: 'lego', sn: 312, id: 'S0312L01', known: 'she said that she could', target: 'ha detto che poteva' }, { kind: 'lego', sn: 312, id: 'S0312L02', known: 'the other room', target: "l'altra stanza" });
  return rows;
};
test('fails before', () => {
  const pre = [
    { kind: 'lego', sn: 72, id: 'S0072L02', known: "I think that you're doing", target: 'penso che tu stia andando' },
    { kind: 'lego', sn: 655, id: 'S0655L01', known: "that you're doing", target: 'che stia andando' },
    { kind: 'build', sn: 72, id: 'S0072L02B01', known: "you're doing", target: 'tu stia andando' },
    { kind: 'build', sn: 1, id: 'S0001L04B03', known: 'with you I want to speak', target: 'con te voglio parlare' },
    { kind: 'lego', sn: 312, id: 'S0312L01', known: 'the other room', target: "l'altra stanza" },
  ];
  const p = T.endStateProblems(pre);
  assert.ok(p.some((x) => x.startsWith('S0072L02 is not')) && p.some((x) => x.startsWith('S0655L01 is not')) && p.some((x) => x.includes('S0001L04B03')) && p.some((x) => x.startsWith('S0312L01 is not the frame')));
});
test('passes after; every planned phrase holds the whole LEGO, the madam ones end madam', () => {
  assert.deepStrictEqual(T.endStateProblems(planned()), []);
  const m = T.LEGO_PLANS.find((p) => p.id === 'S0655L01');
  assert.ok(m.rows.every(([, , k, t]) => /, madam$/.test(k) && /, signora$/.test(t)));
});
