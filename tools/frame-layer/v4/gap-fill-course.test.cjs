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
