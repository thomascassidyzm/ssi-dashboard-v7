'use strict';
// node --test tools/course-optimization/ita-noun-subject-pronoun-2026-09-28.test.cjs
// Pure-rule tests for Kai's 2026-09-28 ruling on noun-subject LEGOs (job #577·I; canon K28).
// No DB. The plan is exercised on the LIVE text of the listed rows as it stood BEFORE the job
// (so this test fails on the pre-fix plan if the rule is wrong, and the rule is what it pins).
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('./ita-noun-subject-pronoun-2026-09-28.cjs');

test('K28: a complete Italian clause whose seed subject is a noun outside the LEGO takes the noun\'s pronoun', () => {
  assert.deepEqual(T.decideLego({ subject: { kind: 'noun', text: 'the children' }, standalone: true }).pronoun, 'they');
  assert.equal(T.decideLego({ subject: { kind: 'noun', text: 'my grandfather' }, standalone: true }).pronoun, 'he');
  assert.equal(T.decideLego({ subject: { kind: 'noun', text: 'that woman' }, standalone: true }).pronoun, 'she');
  assert.equal(T.decideLego({ subject: { kind: 'noun', text: 'the news' }, standalone: true }).pronoun, 'it');
  assert.equal(T.decideLego({ subject: { kind: 'noun', text: 'everybody else' }, standalone: true }).pronoun, 'they');
});

test('K28 is narrow: no pronoun where the Italian does not stand alone, or the seed\'s subject is itself a subject word', () => {
  assert.equal(T.decideLego({ subject: { kind: 'noun', text: 'too many ideas' }, standalone: false }).action, 'list');
  assert.equal(T.decideLego({ subject: { kind: 'wh', text: 'what' }, standalone: true }).action, 'list');
  assert.equal(T.decideLego({ subject: { kind: 'wh', text: 'nobody' }, standalone: true }).action, 'list');
  assert.equal(T.decideLego({ subject: { kind: 'wh', text: 'nothing' }, standalone: true }).action, 'list');
});

test('the plan on the pre-fix rows: "were tired | erano stanchi" → "they were tired", components tile, noun phrases kept, wh LEGOs listed', () => {
  const rows = [
    { kind: 'lego', sn: 455, id: 'S0455L04', known: 'were tired', target: 'erano stanchi', components: [{ known: 'were', target: 'erano' }, { known: 'tired', target: 'stanchi' }] },
    { kind: 'build', sn: 455, id: 'S0455L04B01', known: 'were tired', target: 'erano stanchi' },
    { kind: 'build', sn: 455, id: 'S0455L04B02', known: 'the children were tired', target: 'i bambini erano stanchi' },
    { kind: 'use', sn: 455, id: 'S0455L04U02', known: 'she said they were tired', target: 'ha detto che erano stanchi' },
    { kind: 'lego', sn: 347, id: 'S0347L01', known: 'was happening', target: 'stava succedendo', components: [] },
  ];
  // the other listed LEGOs are absent from this fixture → reported as problems, which is the guard working; filter to the two we planted
  const D = T.plan(rows);
  const lego = D.changes.find((c) => c.id === 'S0455L04');
  assert.equal(lego.to, 'they were tired');
  assert.deepEqual(lego.components.map((c) => c.known), ['they were', 'tired']);
  assert.equal(D.changes.find((c) => c.id === 'S0455L04B01').to, 'they were tired');
  assert.ok(!D.changes.some((c) => c.id === 'S0455L04B02'), 'the seed\'s own noun phrase is kept');
  assert.ok(D.kept.some((k) => k.id === 'S0455L04B02' && /subject before the chunk/.test(k.why)));
  assert.ok(D.kept.some((k) => k.id === 'S0455L04U02' && k.why === 'carries the LEGO'));
  assert.ok(D.kai.some((k) => k.id === 'S0347L01' && /"what" itself/.test(k.why)));
  assert.ok(!D.changes.some((c) => c.id === 'S0347L01'));
  assert.ok(!D.problems.some((p) => /^S0455L04|^S0347L01/.test(p)), D.problems.join('\n'));
});

test('a LEGO that already carries its pronoun is a problem, never double-pronouned', () => {
  const D = T.plan([{ kind: 'lego', sn: 455, id: 'S0455L04', known: 'they were tired', target: 'erano stanchi', components: [] }]);
  assert.ok(D.problems.some((p) => /S0455L04: already carries a pronoun/.test(p)));
  assert.ok(!D.changes.some((c) => c.id === 'S0455L04'));
});
