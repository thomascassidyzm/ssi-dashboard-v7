'use strict';
// node --test tools/course-optimization/welsh-question-marks-hold.test.cjs
// The hold on job #504 (Tom, 2026-10-13: a meaning-changing '?' is a distinct recording):
// rows that had a take go back to their old text with every take still linked; rows with
// no take keep their '?'.
const test = require('node:test');
const assert = require('node:assert');
const { holdOps } = require('./welsh-question-marks-hold.cjs');

const plan = {
  ops: [
    { op: 'audio.update', audio_id: 'clipA', set: { text: 'wyt ti’n dod?' }, expect: { text: 'wyt ti’n dod' } },
    { op: 'phrase.update', phrase_id: 'P1', set: { known_text: 'are you coming?', target_text: 'wyt ti’n dod?' },
      expect: { known_text: 'are you coming', target_text: 'wyt ti’n dod', known_audio_id: null, target1_audio_id: 'legacyB', target2_audio_id: 'clipA' } },
    { op: 'phrase.update', phrase_id: 'P2', set: { known_text: 'is it?', target_text: 'ydy o?' },
      expect: { known_text: 'is it', target_text: 'ydy o', known_audio_id: null, target1_audio_id: null, target2_audio_id: null } },
    { op: 'audio.link', target: 'phrase', phrase_id: 'P1', slot: 'target1', audio_id: 'legacyB', allow_text_mismatch: true },
  ],
};

test('only rows with a take are reverted, the clip text first', () => {
  const { ops, rows } = holdOps(plan);
  assert.deepStrictEqual(rows.map((r) => r.phrase_id), ['P1']);
  assert.deepStrictEqual(ops[0], { op: 'audio.update', audio_id: 'clipA', set: { text: 'wyt ti’n dod' }, expect: { text: 'wyt ti’n dod?' } });
  assert.strictEqual(ops[1].phrase_id, 'P1');
  assert.deepStrictEqual(ops[1].set, { known_text: 'are you coming', target_text: 'wyt ti’n dod' });
  assert.ok(!ops.some((o) => o.phrase_id === 'P2'), 'a row with no take keeps its "?"');
});

test('every slot the row had is linked back', () => {
  const { ops } = holdOps(plan);
  const links = ops.filter((o) => o.op === 'audio.link').map((o) => `${o.slot}:${o.audio_id}`).sort();
  assert.deepStrictEqual(links, ['target1:legacyB', 'target2:clipA']);
});
