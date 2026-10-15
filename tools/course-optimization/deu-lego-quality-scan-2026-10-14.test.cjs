'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { scan } = require('./deu-lego-quality-scan-2026-10-14.cjs');

test('P2 detects a component first taught in a later seed', () => {
  const lego = (seed, known, target) => ({
    seed_number: seed, lego_index: 1, lego_id: `S${seed}L01`,
    known_text: known, target_text: target, is_new: true,
  });
  const { out } = scan({
    seeds: [], phrases: [],
    legos: [lego(1, 'with my brother', 'mit meinem Bruder'), lego(2, 'my brother', 'meinem Bruder')],
  });
  assert.equal(out.P2.length, 1);
  assert.equal(out.P2[0].laterLego, 'S2L01');
});
