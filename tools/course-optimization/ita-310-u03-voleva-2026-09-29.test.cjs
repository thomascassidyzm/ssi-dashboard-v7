'use strict';
// node --test tools/course-optimization/ita-310-u03-voleva-2026-09-29.test.cjs
const test = require('node:test');
const assert = require('node:assert');
const { containsWords, zutClashes, BEFORE, AFTER, LEGO } = require('./ita-310-u03-voleva-2026-09-29.cjs');

// The row S0313L01U03 as it stands live: the taught "he could | poteva" reading of the same sentence.
const S0313L01U03 = { id: 'ita_for_eng:S0313L01U03', known_text: 'he said he could write a story about that man', target_text: "ha detto che poteva scrivere una storia su quell'uomo" };

test('the before-text of S0310L02U03 is a ZUT clash with S0313L01U03', () => {
  assert.strictEqual(zutClashes([S0313L01U03], 'ita_for_eng:S0310L02U03', BEFORE.known, BEFORE.target).length, 1);
});
test('the after-text clashes with nothing S0313 teaches', () => {
  assert.strictEqual(zutClashes([S0313L01U03], 'ita_for_eng:S0310L02U03', AFTER.known, AFTER.target).length, 0);
});
test('the after-text still contains its LEGO on both sides', () => {
  assert.ok(containsWords(AFTER.known, LEGO.known));
  assert.ok(containsWords(AFTER.target, LEGO.target));
});
