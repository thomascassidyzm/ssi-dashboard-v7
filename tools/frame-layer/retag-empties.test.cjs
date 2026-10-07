/**
 * THE RULE (reviews #115, #128): every cached answer with no frames is suspect
 * until the strict parser has answered it, including {frames:[], opener:true},
 * which the old parser made from "1: O unable to classify".
 *
 * Run: node --test tools/frame-layer/retag-empties.test.cjs
 */
const test = require('node:test');
const assert = require('node:assert');
const { selectSuspects } = require('./retag-empties.cjs');

test('every frameless answer the old parser wrote is selected, opener or not; strict-parser answers are not', () => {
  const rows = [
    { k: 'a', text: 'a', frames: [], opener: false },                    // old bare negative
    { k: 'b', text: 'b', frames: [], opener: true },                     // old "O unable to classify" (#128)
    { k: 'c', text: 'c', frames: ['P1'], opener: true },                 // has frames: not suspect
    { k: 'd', text: 'd', frames: [], opener: false, parser: 2 },         // strict parser said '-'
    { k: 'e', text: 'e', frames: [], opener: true },
    { k: 'e', text: 'e', frames: [], opener: true, retag: '115b' },      // already re-asked: latest row wins
    { k: 'f', text: 'f', frames: ['P2'], opener: false },
    { k: 'f', text: 'f', frames: [], opener: true },                     // latest is frameless and old
  ];
  assert.deepStrictEqual(selectSuspects(rows).map(r => r.k), ['a', 'b', 'f']);
});
