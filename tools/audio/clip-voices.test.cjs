'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { groupByVoice } = require('./clip-voices.cjs');

test('groups clips by voice and reports ids with no row', () => {
  const rows = [
    { id: 'a', voice_id: 'human_aran_cym_n', origin: 'human', role: 'target1', course_code: 'c', text: 't' },
    { id: 'b', voice_id: 'cartesia_x', origin: 'tts', role: 'target2', course_code: 'c', text: 'u' },
  ];
  const r = groupByVoice(['a', 'b', 'b', 'z'], rows);
  assert.deepStrictEqual(Object.keys(r.voices).sort(), ['cartesia_x', 'human_aran_cym_n']);
  assert.strictEqual(r.voices.cartesia_x.length, 1);
  assert.deepStrictEqual(r.missing, ['z']);
});

test('carries created_at, so a caller can tell a clip that already existed from one rendered later (job #751)', () => {
  const rows = [{ id: 'a', voice_id: 'cartesia_x', origin: 'tts', role: 'known', course_code: 'c', text: 't', created_at: '2026-10-01T00:00:00Z' }];
  assert.strictEqual(groupByVoice(['a'], rows).voices.cartesia_x[0].created_at, '2026-10-01T00:00:00Z');
});
