'use strict';
// node tools/course-optimization/zho-545-learner-feedback-2026-11-03.test.cjs — the Chinese gates of the #545 pass.
const assert = require('assert');
const T = require('./zho-545-learner-feedback-2026-11-03.cjs');
const cs = T.chunkSet(['我想', '明天', '去', '北京']);
assert.deepStrictEqual(T.uncoveredChars('我想明天去北京。', cs), []);           // tiles from whole taught chunks
assert.deepStrictEqual(T.uncoveredChars('我想明天坐车去北京', cs), ['坐', '车']); // untaught chars are named
// a reorder (time to the front) adds nothing untaught; a new verb does
assert.deepStrictEqual(T.newlyUntaught(cs, '我想去北京明天', '明天我想去北京'), []);
assert.deepStrictEqual(T.newlyUntaught(cs, '我想去北京明天', '明天我想飞北京'), ['飞']);
// a phrase's pre-existing untileable particle is not blamed on the edit
assert.deepStrictEqual(T.newlyUntaught(cs, '我想去北京了', '明天我想去北京了'), []);
const dz = require('../../services/phrase-decomposer.cjs');
assert.strictEqual(T.holdsZh(dz, '明天我想去北京', { lego_id: 'S0001L01', target_text: '去北京', known_text: 'go to Beijing' }), true);
assert.strictEqual(T.holdsZh(dz, '明天我想去上海', { lego_id: 'S0001L01', target_text: '去北京', known_text: 'go to Beijing' }), false);
assert.ok(T.introLine('take the bus', 'are you ready?').startsWith("The Chinese for: 'take the bus', as in — 'are you ready?', is:"));
console.log('zho-545 gates: ok');
