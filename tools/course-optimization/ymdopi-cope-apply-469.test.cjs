'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { copeFor } = require('./ymdopi-cope-apply-469.cjs');
test('ymdopi English manage → cope; other manage untouched', () => {
  assert.strictEqual(copeFor('I can’t manage on my own', 'fedra i ddim ymdopi ar fy mhen fy hun'), 'I can’t cope on my own');
  assert.strictEqual(copeFor('Managing today', 'ymdopi heddiw'), 'Coping today');
  assert.strictEqual(copeFor('I managed to leave', 'llwyddais i adael'), null);
  assert.strictEqual(copeFor('to manage', 'ymdopi'), 'to cope');
});
