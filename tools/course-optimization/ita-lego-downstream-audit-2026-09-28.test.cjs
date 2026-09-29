'use strict';
// Job #591·I (Kai's ruling 2026-09-28 19:30Z): each test fails on the BEFORE state and passes on the AFTER state.
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('./ita-lego-downstream-audit-2026-09-28.cjs');

const LEGO = { lego_id: 'S0261L01', seed_number: 261, lego_index: 1, is_new: false, known_text: 'I think that', target_text: 'penso che' };
const B01 = { id: 'ita_for_eng:S0261L01B01', seed_number: 261, lego_index: 1, position: 1, phrase_role: 'build', known_text: 'I think', target_text: 'penso che' };
const B02 = { id: 'ita_for_eng:S0261L01B02', seed_number: 261, lego_index: 1, position: 2, phrase_role: 'build', known_text: 'I think that', target_text: 'penso che' };
const B03 = { id: 'ita_for_eng:S0261L01B03', seed_number: 261, lego_index: 1, position: 3, phrase_role: 'build', known_text: 'I think that it is', target_text: 'penso che sia' };
const C01 = { id: 'ita_for_eng:S0261L01C01', seed_number: 261, lego_index: 1, position: 0, phrase_role: 'component', known_text: 'I think', target_text: 'penso che' };

test('BEFORE: the bare-fragment row still says the pre-change gloss and is the one to drop; AFTER: nothing is stale', () => {
  assert.deepEqual(T.staleBareFragments(LEGO, [B01, B02, B03]).map((r) => r.id), ['ita_for_eng:S0261L01B01']);
  const plan = T.rowToDrop(LEGO, [B01, B02, B03]);
  assert.equal(plan.drop.id, 'ita_for_eng:S0261L01B01');
  assert.equal(plan.keep.id, 'ita_for_eng:S0261L01B02');
  assert.deepEqual(T.staleBareFragments(LEGO, [B02, B03]), []);
  assert.equal(T.rowToDrop(LEGO, [B02, B03]), null);
});

test('a stale row with NO sibling already carrying the new gloss is a rewrite, not a delete; components are never stale rows', () => {
  assert.equal(T.rowToDrop(LEGO, [B01, B03]), null);
  assert.deepEqual(T.staleBareFragments(LEGO, [C01, B02]), []);
});

test('the audit F check flags the stale row under the changed LEGO and clears once it is gone', () => {
  const changes = [{ id: 'S0261L01', seed: 261, net: true, first: { known: 'I think', target: 'penso che' }, now: { known: 'I think that', target: 'penso che', is_new: false } }];
  const before = T.audit({ legos: [LEGO], phrases: [C01, B01, B02, B03], changes });
  assert.deepEqual(before.F.map((f) => f.id), ['ita_for_eng:S0261L01B01']);
  const after = T.audit({ legos: [LEGO], phrases: [C01, B02, B03], changes });
  assert.deepEqual(after.F, []);
});

test('foldChanges reads every event shape the day\'s tools wrote into one before→after per LEGO', () => {
  const live = { S0047L01: { known_text: 'I think', target_text: 'penso', is_new: true }, S0061L02: { known_text: 'say it', target_text: 'dirlo', is_new: true }, S0201L03: { known_text: 'what was going to happen', target_text: 'che cosa sarebbe successo', is_new: true } };
  const events = [
    { surface: 'a.cjs', scope: {}, detail: { changes: [{ seed: 47, legos: { update: [{ idx: 1, from: { known: 'I think that', target: 'penso che' }, to: { known: 'I think', target: 'penso' } }] } }] } },
    { surface: 'b.cjs', scope: { lego_ids: ['S0061L02'] }, detail: { legos: [{ id: 'S0061L02', known_from: 'say that', known_to: 'say it' }] } },
    { surface: 'c.cjs', scope: { seed_numbers: [201], lego_ids: ['S0201L01', 'S0201L02', 'S0201L03'] }, detail: { from: [{ idx: 3, known: 'happen', target: 'successo' }], to: [{ idx: 3, known: 'what was going to happen', target: 'che cosa sarebbe successo' }] } },
  ];
  const c = T.foldChanges(events, live);
  assert.deepEqual(c.map((x) => [x.id, x.first.known, x.now.known, x.net]), [['S0047L01', 'I think that', 'I think', true], ['S0061L02', 'say that', 'say it', true], ['S0201L03', 'happen', 'what was going to happen', true]]);
});

test("foldChanges reads the changes[{id, from, to}] shape (ita-152-grow-lavrei / ita-159-that-isnt) — job #673·I found the audit blind to it", () => {
  const live = { S0159L01: { lego_id: 'S0159L01', known_text: "that isn't", target_text: 'non è', is_new: true } };
  const events = [{ surface: 'tools/course-optimization/ita-159-that-isnt-2026-09-28.cjs', operation: 'lego-edit', scope: { lego_ids: ['S0159L01'], seed_numbers: [159] },
    detail: { changes: [{ id: 'S0159L01', from: { known: "isn't", target: 'non è', components: null }, to: { known: "that isn't", target: 'non è', components: [{ known: "that isn't", target: 'non è' }] } }] } }];
  const c = T.foldChanges(events, live);
  assert.equal(c.length, 1, 'BEFORE the clause: 0 — the event was silently skipped');
  assert.deepEqual(c[0].first, { known: "isn't", target: 'non è' });
  assert.equal(c[0].net, true);
  assert.equal(c[0].liveDiffersFromLastEvent, false);
});
