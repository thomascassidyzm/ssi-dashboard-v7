'use strict';
// node --test tools/course-optimization/ita-390-391-the-one-2026-09-28.test.cjs
// Pure-rule tests for Kai's approval of 2026-09-28 22:54Z (job #636·I): S0390L01 trims to "the one | quella".
// No DB. BEFORE is the LIVE text of the rows as it stood after job #622·I (the pre-fix content): the
// "before" assertions FAIL on that content and the "after" assertions PASS on the plan.
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('./ita-390-391-the-one-2026-09-28.cjs');

const BEFORE = [
  { kind: 'lego', sn: 390, id: 'S0390L01', known: 'the one who', target: 'quella che', is_new: true, components: [{ known: 'the one (f)', target: 'quella' }, { known: 'who', target: 'che' }] },
  { kind: 'lego', sn: 390, id: 'S0390L02', known: 'who is standing', target: 'che sta in piedi', is_new: true, components: [] },
  { kind: 'lego', sn: 390, id: 'S0390L03', known: 'near the entrance', target: "vicino all'ingresso", is_new: true, components: [] },
  { kind: 'lego', sn: 391, id: 'S0391L01', known: 'who is walking', target: 'che sta camminando', is_new: true, components: [] },
  { kind: 'lego', sn: 391, id: 'S0391L02', known: 'towards the bus', target: "verso l'autobus", is_new: true, components: [] },
  { kind: 'component', sn: 390, id: 'S0390L01C01', known: 'the one', target: 'quella' },
  { kind: 'component', sn: 390, id: 'S0390L01C02', known: 'who', target: 'che' },
  { kind: 'build', sn: 390, id: 'S0390L01B01', known: 'the one who', target: 'quella che' },
  { kind: 'build', sn: 390, id: 'S0390L01B02', known: 'the one who asked', target: 'quella che ha chiesto' },
  { kind: 'build', sn: 390, id: 'S0390L01B03', known: 'the one who works with you', target: 'quella che lavora con te' },
  { kind: 'use', sn: 390, id: 'S0390L01U01', known: 'the one who works with you asked me', target: 'quella che lavora con te mi ha chiesto' },
  { kind: 'use', sn: 390, id: 'S0390L01U03', known: 'the one who agreed with her', target: "quella che era d'accordo con lei" },
  { kind: 'build', sn: 391, id: 'S0391L01B01', known: 'who is walking', target: 'che sta camminando' },
  { kind: 'build', sn: 391, id: 'S0391L01B02', known: 'the one who is walking', target: 'quello che sta camminando' },
  { kind: 'build', sn: 391, id: 'S0391L01B03', known: 'the one who is walking over there', target: 'quello che sta camminando laggiù' },
  { kind: 'use', sn: 391, id: 'S0391L01U01', known: 'the one who is walking asked me', target: 'quello che sta camminando mi ha chiesto' },
  { kind: 'use', sn: 391, id: 'S0391L01U02', known: 'I asked the one who is walking', target: 'ho chiesto a quello che sta camminando' },
  { kind: 'use', sn: 391, id: 'S0391L01U03', known: "the one who is walking didn't agree", target: "quello che sta camminando non era d'accordo" },
  { kind: 'use', sn: 391, id: 'S0391L01U04', known: "the one who is walking didn't ask", target: 'quello che sta camminando non ha chiesto' },
  { kind: 'use', sn: 391, id: 'S0391L02U01', known: 'the one who is walking towards the bus', target: "quello che sta camminando verso l'autobus" },
  { kind: 'use', sn: 391, id: 'S0391L02U02', known: 'I asked the one who is walking towards the bus', target: "ho chiesto a quello che sta camminando verso l'autobus" },
  { kind: 'use', sn: 391, id: 'S0391L02U03', known: 'did you see the one who is walking towards the bus?', target: "hai visto quello che sta camminando verso l'autobus?" },
  { kind: 'use', sn: 391, id: 'S0391L02U05', known: 'the one who asked was walking towards the bus', target: "quello che ha chiesto stava camminando verso l'autobus" },
  // later in the course: "what | quello che" is not "the one who" and must not be listed as knock-on
  { kind: 'lego', sn: 409, id: 'S0409L02', known: 'what we do', target: 'quello che facciamo', is_new: true, components: [] },
  { kind: 'use', sn: 409, id: 'S0409L02U01', known: 'this is what we do', target: 'è quello che facciamo' },
];
const legosOf = (rows, sn) => rows.filter((r) => r.kind === 'lego' && r.sn === sn);

test('BEFORE the fix seed 390 does not tile (L01 and L02 share "che"); AFTER the plan both seeds tile without overlap', () => {
  assert.equal(T.legosTileSeed(legosOf(BEFORE, 390), T.SEEDS[390].target), false, 'pre-fix: quella che + che sta in piedi + … is not the seed');
  const D = T.plan(BEFORE);
  assert.deepEqual(D.problems, [], D.problems.join('\n'));
  assert.equal(D.tiling[390], true);
  assert.equal(D.tiling[391], true, '391 = quella (taught at 390) + who is walking + towards the bus');
  assert.equal(T.LEGO.to.known, 'the one'); assert.equal(T.LEGO.to.target, 'quella');
  assert.ok(T.containsWords(T.LEGO.from.known, T.LEGO.to.known) && T.containsWords(T.LEGO.from.target, T.LEGO.to.target), 'trim, not a rewrite');
});

test('BEFORE the fix seed 391 says quello for "the one" against its own seed; AFTER every 390/391 row says quella, and every phrase still contains its LEGO', () => {
  const quello = BEFORE.filter((r) => r.sn === 391 && /\bquello\b/.test(r.target) && /\bthe one\b/.test(r.known));
  assert.equal(quello.length, 10, 'ten pre-fix rows');
  assert.ok(quello.some((r) => r.known === T.SEEDS[391].known), 'one of them is the seed sentence itself');
  for (const c of T.PHRASES) {
    assert.ok(!/\bquello\b/.test(c.after.target), c.id);
    if (c.id !== 'S0390L01B01') assert.equal(c.before.known, c.after.known, `${c.id}: English untouched`);
    const l = BEFORE.find((r) => r.id === c.id.slice(0, 8));
    const lego = l.id === T.LEGO.id ? T.LEGO.to : l;
    assert.ok(T.phraseContainsLego(c.after, lego), `${c.id} contains ${lego.known} | ${lego.target}`);
  }
  const D = T.plan(BEFORE);
  assert.equal(D.kept.length, 4, 'the other rows under "the one | quella" already contain it and are kept');
});

test('the plan refuses live rows that moved under it (sibling job), and lists nothing later in the course as knock-on', () => {
  const D = T.plan(BEFORE);
  assert.deepEqual(D.knockOn, [], '"what | quello che" at 409 is not "the one who"');
  const moved = BEFORE.map((r) => (r.id === 'S0391L01U02' ? { ...r, known: 'I asked the one who is walking now' } : r));
  assert.ok(T.plan(moved).problems.some((p) => p.startsWith('S0391L01U02: live reads')));
  const taughtEarlier = [...BEFORE, { kind: 'lego', sn: 300, id: 'S0300L09', known: 'the one', target: 'quella', is_new: true, components: [] }];
  assert.ok(T.plan(taughtEarlier).problems.some((p) => /L17\/P25/.test(p)), 'an earlier "the one | quella" would need an L17/P25 decision, not this plan');
});
