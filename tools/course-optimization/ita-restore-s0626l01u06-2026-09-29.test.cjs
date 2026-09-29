// node --test tools/course-optimization/ita-restore-s0626l01u06-2026-09-29.test.cjs
const test = require('node:test');
const assert = require('node:assert');
const { ROW } = require('./ita-restore-s0626l01u06-2026-09-29.cjs');
test('the restored row is the one #887 deleted, with all three of its clips', () => {
  assert.strictEqual(ROW.known, 'are you thirsty? would you like something to drink?');
  assert.strictEqual(ROW.target, 'hai sete? vuoi qualcosa da bere?');
  assert.deepStrictEqual(Object.keys(ROW.clips).sort(), ['known', 'target1', 'target2']);
});
