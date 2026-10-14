'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('./deu-yet-noch-519-baby-2026-10-14.cjs');

test('refuse an incomplete audio map before generating a batch that changes spoken text', () => {
  const audio = Object.fromEntries(T.slotRequests().map(r => [`${r.role}|${r.text}`, '00000000-0000-4000-8000-000000000001']));
  delete audio['target2|ihr neues Baby'];
  assert.throws(() => T.linkOps(audio), /missing|no clip|audio/i);
});
