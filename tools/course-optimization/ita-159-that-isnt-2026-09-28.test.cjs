'use strict';
// node --test tools/course-optimization/ita-159-that-isnt-2026-09-28.test.cjs
// Pure-rule tests for Kai's approval of 2026-09-28 (job #673·I): S0159L01 "isn't | non è" → "that isn't | non è".
// No DB. BEFORE is the live text of seed 159 as it stood before the job (plus the two precedent LEGOs), so
// the "before" assertions FAIL on the pre-fix content and the "after" assertions PASS on the plan.
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('./ita-159-that-isnt-2026-09-28.cjs');

const BEFORE = [
  { kind: 'seed', sn: 159, id: 'S0159', known: T.SENTENCE.known, target: T.SENTENCE.target },
  { kind: 'lego', sn: 28, id: 'S0028L01', known: "it's useful", target: 'è utile', is_new: true, components: [{ known: "it's", target: 'è' }, { known: 'useful', target: 'utile' }] },
  { kind: 'lego', sn: 80, id: 'S0080L01', known: "I'm not sure", target: 'non sono sicuro', is_new: true, components: [{ known: 'not', target: 'non' }, { known: 'sure', target: 'sicuro' }] },
  { kind: 'lego', sn: 159, id: 'S0159L01', known: "isn't", target: 'non è', is_new: true, components: null },
  { kind: 'lego', sn: 159, id: 'S0159L02', known: "I'm trying to say", target: 'sto provando a dire', is_new: true, components: [{ known: "I'm trying to", target: 'sto provando a' }, { known: 'say', target: 'dire' }] },
  { kind: 'lego', sn: 282, id: 'S0282L01', known: "that's not", target: 'non è', is_new: true, components: [{ known: 'not', target: 'non' }, { known: 'is', target: 'è' }] },
  { kind: 'build', sn: 159, id: 'S0159L01B01', known: "isn't", target: 'non è' },
  { kind: 'build', sn: 159, id: 'S0159L01B02', known: "isn't", target: 'non è' },
  { kind: 'build', sn: 159, id: 'S0159L01B03', known: "that isn't", target: 'quello non è' },
  { kind: 'build', sn: 159, id: 'S0159L01B04', known: "that isn't what", target: 'non è quello che' },
  { kind: 'use', sn: 159, id: 'S0159L01U01', known: "that isn't the same thing", target: 'non è la stessa cosa' },
  { kind: 'use', sn: 159, id: 'S0159L01U02', known: "that isn't a good idea", target: 'non è una buona idea' },
  { kind: 'use', sn: 159, id: 'S0159L01U03', known: "that isn't what I think", target: 'non è quello che penso' },
  { kind: 'use', sn: 159, id: 'S0159L01U04', known: "that isn't what I wanted", target: 'non è quello che volevo' },
  { kind: 'use', sn: 159, id: 'S0159L01U05', known: "that isn't what you said", target: 'non è quello che hai detto' },
  { kind: 'use', sn: 159, id: 'S0159L01U08', known: "that isn't exactly what I meant", target: 'non è esattamente quello che intendo' },
  { kind: 'use', sn: 159, id: 'S0159L02U04', known: "that isn't what I'm trying to say", target: 'non è quello che sto provando a dire' },
];

test("BEFORE the fix, 'that isn't' maps to TWO Italians (the K2 hold) and the LEGO names nobody; AFTER, one Italian and the LEGO carries 'that'", () => {
  const D = T.plan(BEFORE);
  assert.deepEqual(D.k2.before, ['quello non è'], 'pre-fix: B03 is the one row with that English');
  assert.deepEqual(D.k2.wouldBe.sort(), ['non è', 'quello non è'], "re-glossing without deleting B03 = two Italians under 'that isn't' — the K2 hold K28's sweep listed");
  assert.deepEqual(D.k2.after, ['non è']);
  assert.equal(T.LEGO.from.known, "isn't");
  assert.equal(T.LEGO.to.known, "that isn't");
  assert.equal(T.LEGO.to.target, T.LEGO.from.target, 'Italian unchanged');
  assert.ok(T.containsWords(T.SENTENCE.known, T.LEGO.to.known), 'L26: the new LEGO is a piece of its seed');
  assert.ok(T.componentsTileTarget(T.LEGO.to) && T.componentsTileKnown(T.LEGO.to));
});

test('the plan has no problems: every remaining row under S0159L01 contains the LEGO on both sides, B03 is the one deletion, 282 L01 is not a duplicate, K29 witnesses stand', () => {
  const D = T.plan(BEFORE);
  assert.deepEqual(D.problems, []);
  assert.equal(D.del.id, 'S0159L01B03');
  assert.equal(D.kept.length, 7, 'B04 + U01/U02/U03/U04/U05/U08');
  assert.ok(D.kept.every((p) => T.phraseContainsLego(p, T.LEGO.to)));
  assert.equal(D.precedent.duplicate, false);
  assert.ok(D.k29.every((w) => w.ok));
  assert.deepEqual(D.isntLeft, [], "no row is left glossed bare \"isn't\"");
});

test('the intro quotes the LEGO in full and its example contains the LEGO (mirror)', () => {
  assert.ok(T.INTRO.text.includes(`'${T.LEGO.to.known}'`));
  assert.ok(T.containsWords(T.INTRO.example, T.LEGO.to.known));
  assert.doesNotMatch(T.INTRO.text, /[()[\]]/);
});

test('guards: the plan refuses when the live LEGO has moved, when B03 is not what it expects, or when the precedent became a duplicate', () => {
  const moved = BEFORE.map((r) => (r.id === 'S0159L01' ? { ...r, known: 'it isn\'t' } : r));
  assert.ok(T.plan(moved).problems.some((p) => /S0159L01: live reads/.test(p)));
  const noB03 = BEFORE.filter((r) => r.id !== 'S0159L01B03');
  assert.ok(T.plan(noB03).problems.some((p) => /S0159L01B03: not live/.test(p)));
  const dup = BEFORE.map((r) => (r.id === 'S0282L01' ? { ...r, known: "that isn't" } : r));
  assert.ok(T.plan(dup).problems.some((p) => /duplicate|precedent moved/.test(p)));
  const noWitness = BEFORE.map((r) => (r.id === 'S0028L01' ? { ...r, components: [{ known: "it's useful", target: 'è utile' }] } : r));
  assert.ok(T.plan(noWitness).problems.some((p) => /K29/.test(p)));
});
