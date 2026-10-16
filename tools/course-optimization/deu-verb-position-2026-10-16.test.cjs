'use strict';
// Proof for deu_for_eng job #246: every German text this pass replaces breaks a verb-position family or is a known
// mis-ordered row, and the replacement breaks none — the test fails on the pre-fix rows and passes on the post-fix rows.
const test = require('node:test');
const assert = require('node:assert');
const { verbPositionFamilies } = require('./deu-verb-position-2026-10-16.cjs');
const { ROWS } = require('./deu-verb-position-2026-10-16.data.cjs');

const was = (r) => r[5].replace(/^was: /, '');
test('the finder flags the pre-fix seed 269 / 267 / 212 / 202 / 122 rows', () => {
  for (const r of ROWS.filter((x) => /^S0(269|267|212|202|122)L/.test(x[0]))) {
    assert.ok(verbPositionFamilies(was(r)).length > 0, `${r[0]} pre-fix text not flagged: ${was(r)}`);
  }
});
test('no replacement text breaks a family', () => {
  for (const r of ROWS) assert.deepStrictEqual(verbPositionFamilies(r[3][1]), [], `${r[0]}: ${r[3][1]}`);
});
test('every row really changes the German, and ids are unique', () => {
  assert.strictEqual(new Set(ROWS.map((r) => r[0])).size, ROWS.length);
  for (const r of ROWS) assert.notStrictEqual(r[3][1], was(r), r[0]);
});
