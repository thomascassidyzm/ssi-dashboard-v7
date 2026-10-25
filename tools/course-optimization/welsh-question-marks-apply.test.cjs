'use strict';
// node --test tools/course-optimization/welsh-question-marks-apply.test.cjs
// P1 #11: holding one row must also hold every row that shares a clip with it, or the shared clip is relabelled under the held row.
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildOps, clipRefs } = require('./welsh-question-marks-apply.cjs');

const course = 'cym_nv2_for_eng';
const shared = '11111111-1111-4111-8111-111111111111';
const missing = '22222222-2222-4222-8222-222222222222';
const row = (id, audio) => ({ kind: 'seed', id, known: 'are you ready?', target: 'wyt ti’n barod', newKnown: null, newTarget: 'wyt ti’n barod?', audio: { known: null, target1: shared, target2: null, ...audio } });
const world = (rows) => ({ courseCode: course, seeds: rows.map((c) => ({ seed_number: c.id, target1_audio_id: c.audio.target1, target2_audio_id: c.audio.target2, legos: [] })) });
const clips = () => new Map([[shared, { course_code: course, text: 'wyt ti’n barod' }]]);

test('a row held for an unfound clip also holds the row sharing its clip; no op relabels the shared clip', () => {
  const rows = [row(1, {}), row(2, { target2: missing })];
  const plan = buildOps(course, world(rows), rows, clips(), clipRefs([world(rows)]));
  assert.deepEqual(plan.ops, []);
  assert.deepEqual(plan.holds.map((h) => h.id).sort(), [1, 2]);
});

test('the hold propagates through a chain (1 shares with 2, 2 shares with 3, 3 is the one that is held)', () => {
  const other = '33333333-3333-4333-8333-333333333333';
  const rows = [row(1, {}), row(2, { target2: other }), row(3, { target1: other, target2: missing })];
  const cl = clips(); cl.set(other, { course_code: course, text: 'wyt ti’n barod' });
  const plan = buildOps(course, world(rows), rows, cl, clipRefs([world(rows)]));
  assert.deepEqual(plan.ops, []);
  assert.equal(plan.holds.length, 3);
});

test('rows that share nothing with a held row still go ahead', () => {
  const alone = '44444444-4444-4444-8444-444444444444';
  const rows = [row(1, { target1: alone }), row(2, { target2: missing })];
  const cl = clips(); cl.set(alone, { course_code: course, text: 'wyt ti’n barod' });
  const plan = buildOps(course, world(rows), rows, cl, clipRefs([world(rows)]));
  assert.deepEqual(plan.holds.map((h) => h.id), [2]);
  assert.ok(plan.ops.some((o) => o.op === 'audio.update' && o.audio_id === alone));
});
