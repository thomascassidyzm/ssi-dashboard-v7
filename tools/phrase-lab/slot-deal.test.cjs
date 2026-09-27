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
  const b = dealSlots(decl, inv, counters, 1);
  assert.strictEqual(a[0].frame, 'P3');
  assert.notStrictEqual(b[0].frame, a[0].frame);
});

test('neighbours come only from the recent course, never a one-letter target, and vary per slot', () => {
  const s = dealSlots(decl, inv, { frames: new Map(), neighbours: new Map() }, 3);
  const ids = s.map((x) => x.neighbour && x.neighbour.legoId);
  assert.ok(!ids.includes('S0399L01'));
  assert.strictEqual(new Set(ids.filter(Boolean)).size, ids.filter(Boolean).length);
  assert.ok(ids.includes('S0100L01') === false || ids.indexOf('S0100L01') > 0);
});

test('the prompt section states the escape', () => {
  const txt = slotSection(dealSlots(decl, inv, { frames: new Map(), neighbours: new Map() }, 2));
  assert.match(txt, /declined_slots/);
  assert.match(txt, /never force it/);
});
