// node:test — run with: node --test tools/frame-layer/v4/gap-fill-course.test.cjs
const test = require('node:test');
const assert = require('node:assert');
const { registerBreach } = require('./gap-fill-course.cjs');

test('tu-first: bare formal vous is cut, but plural vous the course teaches or the English marks is kept', () => {
  assert.ok(registerBreach('fra_for_eng', 'je vous aime', 'I love you', 'aime'));
  assert.strictEqual(registerBreach('fra_for_eng', 'je vais parler avec vous tous', "I'm going to speak with you all", 'avec vous tous'), null);
  assert.strictEqual(registerBreach('fra_for_eng', 'je veux vous voir', 'I want to see you all', 'je veux'), null);
  assert.strictEqual(registerBreach('fra_for_eng', 'je veux te voir', 'I want to see you', 'je veux'), null);
});

test('a weekly limit or a tag lost to one stops the course instead of failing every window (#924)', () => {
  const { isUsageRefusal } = require('./gap-fill-course.cjs');
  assert.ok(isUsageRefusal("claude --print failed: You've hit your weekly limit · resets Oct 12 — Command failed"));
  assert.ok(isUsageRefusal('frame-tagger: "x" is not tagged; call ensureTagged first'));
  assert.ok(!isUsageRefusal('model error: no JSON in model output'));
});
