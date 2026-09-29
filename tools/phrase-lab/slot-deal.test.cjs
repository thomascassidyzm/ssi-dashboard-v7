/**
 * Slot dealing (audit #423 option (a), pilot): the dealer spreads frames and
 * neighbours across baskets by least-used-first, and every recipe carries the
 * decline escape. Run: node --test tools/phrase-lab/slot-deal.test.cjs
 */
const test = require('node:test');
const assert = require('node:assert');
const { dealSlots, slotSection } = require('./slot-deal.cjs');

const decl = { frame_pool: { seed_ids: ['P1', 'P2', 'P3', 'P9'], pod: [] } };
const inv = { seedNumber: 400, available: [
  { kind: 'lego', legoId: 'S0390L01', seedNumber: 390, known: 'the station', target: 'la stazione' },
  { kind: 'lego', legoId: 'S0395L02', seedNumber: 395, known: 'tired', target: 'stanco' },
  { kind: 'lego', legoId: 'S0100L01', seedNumber: 100, known: 'the house', target: 'la casa' },
  { kind: 'lego', legoId: 'S0399L01', seedNumber: 399, known: 'a', target: 'a' },
] };

test('the least-used frame is dealt first, and two baskets do not get the same first frame', () => {
  const counters = { frames: new Map([['P1', 50], ['P2', 3]]), neighbours: new Map() };
  const a = dealSlots(decl, inv, counters, 1);
  const b = dealSlots(decl, inv, counters, 1);  // slot 1 of each basket is a frame slot
  assert.strictEqual(a[0].frame, 'P3');
  assert.notStrictEqual(b[0].frame, a[0].frame);
});

test('one axis per slot, rotating frame, neighbour, position', () => {
  const s = dealSlots(decl, inv, { frames: new Map(), neighbours: new Map() }, 6);
  assert.deepStrictEqual(s.map((x) => x.axis), ['frame', 'neighbour', 'position', 'frame', 'neighbour', 'position']);
  for (const x of s) assert.strictEqual([x.frame, x.neighbour, x.position].filter(Boolean).length, 1);
  const ids = s.map((x) => x.neighbour && x.neighbour.legoId).filter(Boolean);
  assert.ok(!ids.includes('S0399L01') && !ids.includes('S0100L01'), 'recent, never a one-letter target');
  assert.strictEqual(new Set(ids).size, ids.length);
});

test('the prompt section states the escape', () => {
  const txt = slotSection(dealSlots(decl, inv, { frames: new Map(), neighbours: new Map() }, 2));
  assert.match(txt, /declined_slots/);
  assert.match(txt, /never force it/);
});
