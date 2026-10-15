'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { femaleReading } = require('./hin-for-eng-speaker-gender-2026-10-14.cjs');

test('और preserves speaker agreement when it means more or shares the speaker subject', () => {
  assert.deepEqual([
    femaleReading('मैं और थका था।'),
    femaleReading('मैं थका था और सो रहा था।'),
  ], [
    'मैं और थकी थी।',
    'मैं थकी थी और सो रही थी।',
  ]);
});
