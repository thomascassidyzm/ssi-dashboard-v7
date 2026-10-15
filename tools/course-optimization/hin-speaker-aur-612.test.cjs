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

test('#706 a first-person clause after और is the speaker even when मुझे-clause precedes it', () => {
  assert.equal(
    femaleReading('मुझे लगा फिल्म बिल्कुल बेकार थी और मैं अपने पैसे वापस चाहता हूँ।'),
    'मुझे लगा फिल्म बिल्कुल बेकार थी और मैं अपने पैसे वापस चाहती हूँ।');
  assert.equal(
    femaleReading('मुझे अच्छा लगता है और बोलना चाहता हूँ।'),
    'मुझे अच्छा लगता है और बोलना चाहती हूँ।');
  assert.equal(femaleReading('मैं थकी थी और सो रहा था।'), 'मैं थकी थी और सो रही थी।');
});

test('#706 वो/आप as objects after मैं do not cut the speaker off from her verb', () => {
  assert.equal(femaleReading('मैं वो शब्द भूल गया।'), 'मैं वो शब्द भूल गई।');
  assert.equal(femaleReading('मैं आप सबकी मदद कर सकता हूँ।'), 'मैं आप सबकी मदद कर सकती हूँ।');
});
