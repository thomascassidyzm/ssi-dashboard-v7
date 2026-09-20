/**
 * The rule this holds still: a pool that has stopped serving ends the run.
 * Without it, a five-hour session limit hit at seed 64 spends the rest of the
 * range failing one basket at a time and then reports the run COMPLETE.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const { isPoolExhausted } = require('./run-course-v3.cjs');

test('the real session-limit message ends the run', () => {
  assert.equal(isPoolExhausted(
    'claude --print --model opus failed (code=1, signal=none, killed=false) | stdout-head: '
    + "You've hit your session limit · resets 2am (UTC)"), true);
});

test('weekly-usage and rate-limit refusals end it too', () => {
  assert.equal(isPoolExhausted('Claude usage limit reached'), true);
  assert.equal(isPoolExhausted('429 Too Many Requests'), true);
});

test('an ordinary bad-output failure is a per-basket failure, not the end', () => {
  assert.equal(isPoolExhausted('no JSON object in model output'), false);
  assert.equal(isPoolExhausted("Expected property name or '}' in JSON at position 2"), false);
  assert.equal(isPoolExhausted(undefined), false);
});
