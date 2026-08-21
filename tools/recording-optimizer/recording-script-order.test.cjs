/**
 * Unit tests for the recording script's READING ORDER (no DB, no audio, no spend).
 * Run: npx vitest run tools/recording-optimizer/recording-script-order
 *
 * The claim under test is narrow and it is the whole point of the option:
 * `order: 'course'` changes the SEQUENCE the recordist reads, and nothing else.
 * The same lines are selected by the same coverage algorithm either way — so a
 * weekend session read straight through in course order can be picked up on
 * Monday by whoever runs the coverage-optimised concatenation, with the lines
 * already recorded being lines that pass would have asked for anyway.
 */

import { describe, it, expect } from 'vitest'

const { orderSelectedPhrases } = require('./generate-recording-script.cjs');

// A miniature "selected" list in the shape greedySetCover emits: coverage order,
// which is deliberately NOT course order.
const SELECTED = [
  { phrase: 'covers the most', seedNumber: 333, legoIndex: 2, position: 4, source: 'practice' },
  { phrase: 'seed twelve itself', seedNumber: 12, legoIndex: 0, position: 0, source: 'seed' },
  { phrase: 'seed twelve lego one, second phrase', seedNumber: 12, legoIndex: 1, position: 2, source: 'practice' },
  { phrase: 'seed twelve lego one, first phrase', seedNumber: 12, legoIndex: 1, position: 1, source: 'practice' },
  { phrase: 'seed one', seedNumber: 1, legoIndex: 0, position: 0, source: 'seed' },
];

describe('orderSelectedPhrases', () => {
  it('leaves coverage order exactly as the algorithm produced it', () => {
    const out = orderSelectedPhrases(SELECTED, 'coverage');
    expect(out).toBe(SELECTED);
  });

  it('treats an absent or unknown order as coverage — the default is off', () => {
    expect(orderSelectedPhrases(SELECTED)).toBe(SELECTED);
    expect(orderSelectedPhrases(SELECTED, 'COURSE')).toBe(SELECTED);
    expect(orderSelectedPhrases(SELECTED, 'sequential')).toBe(SELECTED);
  });

  it('sorts by seed, then lego, then position when order is course', () => {
    const out = orderSelectedPhrases(SELECTED, 'course');
    expect(out.map(s => s.phrase)).toEqual([
      'seed one',
      'seed twelve itself',
      'seed twelve lego one, first phrase',
      'seed twelve lego one, second phrase',
      'covers the most',
    ]);
  });

  it('reads the seed sentence before practice phrases that tie on lego index', () => {
    const tied = [
      { phrase: 'practice', seedNumber: 5, legoIndex: 0, position: 0, source: 'practice' },
      { phrase: 'the seed', seedNumber: 5, legoIndex: 0, position: 0, source: 'seed' },
    ];
    expect(orderSelectedPhrases(tied, 'course').map(s => s.phrase)).toEqual(['the seed', 'practice']);
  });

  it('does not mutate the input array', () => {
    const copy = [...SELECTED];
    orderSelectedPhrases(SELECTED, 'course');
    expect(SELECTED).toEqual(copy);
  });

  it('selects nothing and drops nothing — course order is a permutation', () => {
    const out = orderSelectedPhrases(SELECTED, 'course');
    expect(out).toHaveLength(SELECTED.length);
    expect(new Set(out.map(s => s.phrase))).toEqual(new Set(SELECTED.map(s => s.phrase)));
  });

  it('sends lines with no seed number to the END rather than the front', () => {
    const ragged = [
      { phrase: 'no seed', seedNumber: null, legoIndex: null, position: null, source: 'practice' },
      { phrase: 'seed 9', seedNumber: 9, legoIndex: 0, position: 0, source: 'seed' },
    ];
    expect(orderSelectedPhrases(ragged, 'course').map(s => s.phrase)).toEqual(['seed 9', 'no seed']);
  });

  it('is deterministic for identical keys — same input, same order twice', () => {
    const dupes = [
      { phrase: 'bravo', seedNumber: 3, legoIndex: 1, position: 1, source: 'practice' },
      { phrase: 'alpha', seedNumber: 3, legoIndex: 1, position: 1, source: 'practice' },
    ];
    const first = orderSelectedPhrases(dupes, 'course').map(s => s.phrase);
    const second = orderSelectedPhrases(dupes, 'course').map(s => s.phrase);
    expect(first).toEqual(second);
    expect(first).toEqual(['alpha', 'bravo']);
  });
});
