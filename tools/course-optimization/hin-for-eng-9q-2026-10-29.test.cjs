'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { dot, unfem, toYaqeen, Q6_ROWS, Q6_LEGO } = require('./hin-for-eng-9q-2026-10-29.cjs');

test('Q1 nukta: her whole-grid spelling, idempotent, and never double-dots माफ़', () => {
  assert.strictEqual(dot('मुझे यकीन नहीं है'), 'मुझे यक़ीन नहीं है');
  assert.strictEqual(dot('खत्म हफ्ते काफी खुश'), 'ख़त्म हफ़्ते काफ़ी ख़ुश');
  assert.strictEqual(dot('माफ माफ़ माफी'), 'माफ़ माफ़ माफ़ी');
  assert.strictEqual(dot(dot('गलत गलती खुद फिल्म तरीका')), dot('गलत गलती खुद फिल्म तरीका'));
});
test('Q3: the speaker is masculine in seeds 177/645', () => {
  assert.strictEqual(unfem('मैं उससे पूछूँगी कि वो कहाँ जाना चाहती है।'), 'मैं उससे पूछूँगा कि वो कहाँ जाना चाहती है।');
  assert.strictEqual(unfem('मैं आपकी मदद कर सकती हूँ मैडम।'), 'मैं आपकी मदद कर सकता हूँ मैडम।');
});
test('Q5: I\'m not sure is यक़ीन नहीं है, never पक्का', () => {
  assert.strictEqual(toYaqeen('मुझे पक्का नहीं है कि मैं कर सकता हूँ।'), 'मुझे यक़ीन नहीं है कि मैं कर सकता हूँ।');
});
test('Q6: every seed-207 basket row carries the new LEGO on both sides', () => {
  for (const [id, row] of Object.entries(Q6_ROWS)) {
    if (!row) continue;
    assert.ok(row[0].includes(Q6_LEGO.known_text), `${id} known`);
    assert.ok(row[1].includes(Q6_LEGO.target_text), `${id} target`);
  }
});
