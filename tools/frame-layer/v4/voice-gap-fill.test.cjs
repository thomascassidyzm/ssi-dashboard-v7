// node:test — run with: node --test tools/frame-layer/v4/voice-gap-fill.test.cjs
const test = require('node:test');
const assert = require('node:assert');
const { planSlots } = require('./voice-gap-fill.cjs');

test('voices the Bengali known side (Ananya/Rubel, job #118) but never touches a filled slot', () => {
  const rows = [{ id: 'a', known_text: 'আমি', target_text: 'I', known_audio_id: null, target1_audio_id: 'x', target2_audio_id: null }];
  const slots = planSlots('eng_for_ben', rows);
  assert.deepStrictEqual(slots.map(s => s.role), ['known', 'target2']);
  assert.strictEqual(slots[0].voiceId, 'cartesia_2ba861ea-7cdc-43d1-8608-4045b5a41de5'); // Ananya (f) by hash split
  assert.strictEqual(slots[1].voiceId, 'cartesia_8fef4d59-0a7e-4ad2-a261-6a3bb50734d2'); // Tom, male slot
});

test('French known in Tom, target1 female, target2 male', () => {
  const slots = planSlots('fra_for_eng', [{ id: 'b', known_text: 'I want', target_text: 'je veux' }]);
  assert.deepStrictEqual(slots.map(s => [s.role, s.text]), [['known', 'I want'], ['target1', 'je veux'], ['target2', 'je veux']]);
});
