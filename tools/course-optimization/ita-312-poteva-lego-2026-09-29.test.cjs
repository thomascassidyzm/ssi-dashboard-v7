'use strict';
// node --test tools/course-optimization/ita-312-poteva-lego-2026-09-29.test.cjs
// Job #889·I: seed 312 says poteva and has its own LEGO. FAILS on the pre-fix rows, PASSES once the plan is applied.
const test = require('node:test');
const assert = require('node:assert');
const T = require('./ita-312-poteva-lego-2026-09-29.cjs');
const pre = () => [
  { kind: 'seed', sn: 312, id: 'S0312', known: T.SEED_AFTER.known, target: "ha detto che potrebbe usare l'altra stanza domani sera" },
  { kind: 'lego', sn: 312, id: 'S0312L01', known: 'the other room', target: "l'altra stanza" },
  ...T.L01_EDITS.map((e) => ({ kind: e.id.includes('B') ? 'build' : 'use', sn: 312, id: e.id, known: e.known, target: e.before })),
];
test('fails before', () => { const p = T.endStateProblems(pre()); assert.ok(p.some((x) => x.startsWith('seed 312')) && p.some((x) => x.includes('S0312L02')) && p.some((x) => x.startsWith('S0312L01U02'))); });
test('passes after; every new played row contains the LEGO', () => { assert.deepStrictEqual(T.endStateProblems(T.applyPlanToRows(pre())), []); assert.ok(T.NEW_ROWS.filter((r) => r.role !== 'component').every((r) => /che poteva/.test(r.target) && /she said that she could/.test(r.known))); });
