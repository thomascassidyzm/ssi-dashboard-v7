'use strict';
// The fill's two pure rules: an empty Italian slot is found, and a slot counts as filled only on a
// cast voice with live bytes. Pre-fix state (job #580·I): U07 and U09 have both target slots NULL.
const { test } = require('node:test');
const assert = require('node:assert');
const { emptySlots, slotOk, ELSA, BENIGNO } = require('./ita-seed-609-u07-u09-italian-fill-2026-09-28.cjs');

const PRE_FIX = [
  { id: 'ita_for_eng:S0609L01U07', target_text: 'voglio chiedere a mia madre la settimana prossima', target1_audio_id: null, target2_audio_id: null },
  { id: 'ita_for_eng:S0609L01U09', target_text: 'non voglio chiedere a nessuno', target1_audio_id: null, target2_audio_id: null },
];
test('pre-fix: four empty Italian slots, Elsa for target1 and Benigno for target2', () => {
  const s = emptySlots(PRE_FIX);
  assert.deepStrictEqual(s.map(x => `${x.id.split(':')[1]}/${x.role}/${x.voice.voiceName}`), ['S0609L01U07/target1/it-IT-ElsaNeural', 'S0609L01U07/target2/it-IT-BenignoNeural', 'S0609L01U09/target1/it-IT-ElsaNeural', 'S0609L01U09/target2/it-IT-BenignoNeural']);
});
test('post-fix: no empty slots once both ids are set', () => {
  assert.deepStrictEqual(emptySlots(PRE_FIX.map(r => ({ ...r, target1_audio_id: 'a', target2_audio_id: 'b' }))), []);
});
test('a slot is ok only on the cast voice with live bytes', () => {
  assert.strictEqual(slotOk('target1', { voice_id: ELSA.voiceId, s3_key: 'mastered/X.mp3' }), true);
  assert.strictEqual(slotOk('target2', { voice_id: BENIGNO.voiceId, s3_key: 'mastered/X.mp3' }), true);
  assert.strictEqual(slotOk('target1', { voice_id: BENIGNO.voiceId, s3_key: 'mastered/X.mp3' }), false, 'wrong voice for the slot');
  assert.strictEqual(slotOk('target1', { voice_id: ELSA.voiceId, s3_key: 'pending/X' }), false, 'placeholder, no bytes');
  assert.strictEqual(slotOk('target1', null), false);
});
