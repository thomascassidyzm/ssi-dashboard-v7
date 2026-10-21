'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { classify } = require('./welsh-question-marks.cjs');
const { buildOps, clipRefs } = require('./welsh-question-marks-apply.cjs');

test('a question after a when-clause remains a question', () => {
  assert.equal(classify('when I arrive, are you ready', "pan dw i'n cyrraedd, wyt ti'n barod").cls, 'CERTAIN_Q');
});

test('holding one row also holds changes to its shared clip and dependent row', () => {
  const course = 'cym_nv2_for_eng';
  const shared = '11111111-1111-4111-8111-111111111111';
  const missing = '22222222-2222-4222-8222-222222222222';
  const a = { kind: 'seed', id: 1, known: 'are you ready?', target: 'wyt ti’n barod', newKnown: null,
    newTarget: 'wyt ti’n barod?', audio: { known: null, target1: shared, target2: null } };
  const b = { ...a, id: 2, audio: { ...a.audio, target2: missing } };
  const data = { courseCode: course, seeds: [a, b].map(c => ({ seed_number: c.id,
    target1_audio_id: c.audio.target1, target2_audio_id: c.audio.target2, legos: [] })) };
  const clips = new Map([[shared, { course_code: course, text: a.target }]]);
  const plan = buildOps(course, data, [a, b], clips, clipRefs([data]));
  assert.deepEqual(plan.ops, [], 'neither row nor shared clip may change while a referencing row is held');
});
