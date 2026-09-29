'use strict';
// node --test tools/course-optimization/ita-female-tiles-and-raccontato-2026-09-29.test.cjs
const test = require('node:test');
const assert = require('node:assert');
const { speakerReference } = require('./ita-bare-adjective-female-forms-2026-09-29.cjs');
const { swapDetto, EDITS } = require('./ita-raccontato-527-2026-09-29.cjs');

test('the English names the speaker → keep the female form', () => {
  for (const e of ['manage on my own', 'to leave me on my own', 'we had to take the train by ourselves', "I'm not sure"]) assert.ok(speakerReference(e), e);
});
test('a bare adjective has no speaker → no female form', () => {
  for (const e of ['tired', 'ready to go', 'too close to the edge', 'very dirty', 'brave to say it']) assert.ok(!speakerReference(e), e);
});
test('raccontato swap: only "ha detto", every edit is from seed 527 on', () => {
  assert.strictEqual(swapDetto('mi ha detto molte storie'), 'mi ha raccontato molte storie');
  for (const e of EDITS) { assert.ok(Number(e.id.slice(1, 5)) >= 527); assert.strictEqual(swapDetto(e.before), e.after); }
});
