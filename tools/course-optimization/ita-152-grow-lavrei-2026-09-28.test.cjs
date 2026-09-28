'use strict';
// node --test tools/course-optimization/ita-152-grow-lavrei-2026-09-28.test.cjs
// Pure-rule tests for Kai's approval of 2026-09-28 (job #649·I): S0152L01 grows to take the seed's l'.
// No DB. BEFORE is the live text of seed 152/153 as it stood before the job, so the "before" assertions
// FAIL against the pre-fix content and the "after" assertions PASS on the plan.
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('./ita-152-grow-lavrei-2026-09-28.cjs');

const BEFORE = [
  { kind: 'seed', sn: 152, id: 'S0152', known: 'I would have done it differently if I had known what you wanted', target: "l'avrei fatto diversamente se avessi saputo cosa volevi" },
  { kind: 'lego', sn: 152, id: 'S0152L01', known: 'I would have done', target: 'avrei fatto', is_new: true, components: [{ known: 'would have done', target: 'avrei fatto' }] },
  { kind: 'lego', sn: 152, id: 'S0152L02', known: 'differently', target: 'diversamente', is_new: true, components: null },
  { kind: 'lego', sn: 153, id: 'S0153L01', known: "I wouldn't have said it", target: "non l'avrei detto", is_new: true, components: [{ known: "I wouldn't have said it", target: "non l'avrei detto" }] },
  ...T.PHRASES.map((c) => ({ kind: /B\d\d$/.test(c.id) ? 'build' : 'use', sn: 152, id: c.id, known: c.before.known, target: c.before.target })),
  { kind: 'use', sn: 152, id: 'S0152L02U02', known: 'I would have done that differently', target: 'avrei fatto quello diversamente' },
  { kind: 'use', sn: 130, id: 'S0130L01U01', known: 'something early', target: 'qualcosa presto' },
];

test("BEFORE the fix, seed 152's l' is a piece of the seed no LEGO covers; the grown LEGO covers it and is a piece of the seed", () => {
  const legos152 = BEFORE.filter((r) => r.kind === 'lego' && r.sn === 152);
  assert.ok(!legos152.some((l) => /\bl'/.test(l.target)), "pre-fix: no 152 LEGO carries l'");
  assert.match(T.LEGO.to.target, /^l'avrei fatto$/);
  assert.ok(T.containsWords(T.SENTENCE.known, T.LEGO.to.known));
  assert.ok(T.componentsTileTarget(T.LEGO.to) && T.componentsTileKnown(T.LEGO.to), 'components tile both sides');
});

test('BEFORE the fix, no phrase under S0152L01 contains the grown LEGO; AFTER the plan every one does, and the plan has no problems', () => {
  const under = BEFORE.filter((r) => r.id.startsWith('S0152L01') && (r.kind === 'build' || r.kind === 'use'));
  assert.equal(under.length, 10);
  assert.ok(under.every((p) => !T.phraseContainsLego(p, T.LEGO.to)), 'pre-fix rows carry avrei fatto without l\'');
  assert.ok(T.PHRASES.every((c) => T.phraseContainsLego(c.after, T.LEGO.to)), 'post-fix rows contain the grown LEGO on both sides');
  const D = T.plan(BEFORE);
  assert.deepEqual(D.problems, [], D.problems.join('\n'));
  assert.equal(D.kept.length, 0);
  assert.equal(D.oldGlossElsewhere.length, 1, 'the 152 L02 row keeps bare avrei fatto and is listed, not changed');
});

test('S0153L01 is not a both-sides duplicate of the grown LEGO, so it stays as it is; a true duplicate would stop the tool', () => {
  const D = T.plan(BEFORE);
  assert.equal(D.neighbour.duplicate, false);
  assert.match(D.neighbour.verdict, /not a duplicate/);
  const dup = T.plan(BEFORE.map((r) => (r.id === 'S0153L01' ? { ...r, known: 'I would have done it', target: "l'avrei fatto" } : r)));
  assert.ok(dup.problems.some((p) => /duplicate/.test(p)));
});

test('the plan refuses drifted live text and any l\'avrei before seed 152 (P27)', () => {
  const drift = T.plan(BEFORE.map((r) => (r.id === 'S0152L01U05' ? { ...r, target: 'avrei fatto tutto ieri' } : r)));
  assert.ok(drift.problems.some((p) => /S0152L01U05: live reads/.test(p)));
  const early = T.plan([...BEFORE, { kind: 'use', sn: 140, id: 'S0140L01U01', known: 'x', target: "l'avrei detto" }]);
  assert.ok(early.problems.some((p) => /before seed 152/.test(p)));
});
