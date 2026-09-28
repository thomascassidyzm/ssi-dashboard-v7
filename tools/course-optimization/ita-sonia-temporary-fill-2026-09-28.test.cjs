// tools/course-optimization/ita-sonia-temporary-fill-2026-09-28.test.cjs
// The restore check is the whole point of the tool: a cast with the temporary Sonia row still in
// it must NOT read as restored, and the snapshot must compare on every column, not just voice_id.
//   node --test tools/course-optimization/ita-sonia-temporary-fill-2026-09-28.test.cjs
const test = require('node:test');
const assert = require('node:assert');
const { sameCast, TEMP_ROW } = require('./ita-sonia-temporary-fill-2026-09-28.cjs');
const t = new Date('2026-09-23T14:16:00Z');
const charlotte = { slot: 'known', language: 'eng', gender: 'f', rank: 0, voice_id: 'cartesia_71a7ad14-091c-4e8e-a314-022ece01c121', notes: 'x', assigned_by: 'kai', created_at: t, updated_at: t };
test('a cast that still carries the temporary Sonia row is NOT restored', () => {
  assert.equal(sameCast([charlotte], [charlotte, { ...TEMP_ROW, notes: null, assigned_by: 'sweep', created_at: t, updated_at: t }]), false);
});
test('the same rows, byte for byte, are restored; a changed note or timestamp is not', () => {
  assert.equal(sameCast([charlotte], [{ ...charlotte }]), true);
  assert.equal(sameCast([charlotte], [{ ...charlotte, notes: 'y' }]), false);
  assert.equal(sameCast([charlotte], [{ ...charlotte, updated_at: new Date('2026-09-28T00:00:00Z') }]), false);
});
