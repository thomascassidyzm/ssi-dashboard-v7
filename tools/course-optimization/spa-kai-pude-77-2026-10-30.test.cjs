'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { englishLost, DECISIONS } = require('./spa-kai-pude-77-2026-10-30.cjs');

// Kai 30 Oct (item 77): the LEGO 'I could | pude' and its own B01 stay; existing negatives stay.
test('item 77 never touches the LEGO row, its B01, or an existing negative', () => {
  const ids = DECISIONS.map((d) => d[0]);
  assert.ok(!ids.includes('S0148L02B01'));
  for (const id of ['S0148L02U05', 'S0148L02U09', 'S0148L02U02', 'S0148L02U12', 'S0148L02U07', 'S0148L02U15']) assert.ok(!ids.includes(id), id);
  for (const d of DECISIONS.filter((x) => x.length === 4)) assert.match(d[2], /couldn't/);
});

test("under S0148L02, \"I couldn't …\" holds the LEGO 'I could' on the English side (else the ruling would delete every row)", () => {
  assert.strictEqual(englishLost('S0148L02', 'I could answer', "I couldn't answer", 'I could'), false);
  assert.strictEqual(englishLost('S0148L02', 'I could answer', 'I answered', 'I could'), true);
  assert.strictEqual(englishLost('S0999L01', 'I could go', "I couldn't go", 'I could'), true); // only the ruled LEGO
});
