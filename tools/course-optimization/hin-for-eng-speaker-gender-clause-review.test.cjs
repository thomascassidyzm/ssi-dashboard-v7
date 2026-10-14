'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { plan } = require('./hin-for-eng-speaker-gender-2026-10-14.cjs');

test('a female speaker does not change the male subject after और', () => {
  const p = plan([{ kind: 'use', id: 'review-case', sn: 1,
    k: 'I was tired and he was sleeping', t: 'मैं थका था और वह सो रहा था।' }]);
  assert.equal(p.expansions[0].expanded_f, 'मैं थकी थी और वह सो रहा था।');
});
