// The one test that proves the re-cut (job #871, 2026-09-23). Kai's rule: a LEGO that needs a gap
// on either side is not a good LEGO. Against the live cut (OLD_LEGOS, S0128L01 "आप ( ) की तरह हैं")
// the gap assertion FAILS; against the new cut (LEGOS) it passes — and the new cut still tiles the
// seed on both sides, and every build and use phrase carries its LEGO on both sides. Offline: no DB.
import { describe, it, expect } from 'vitest';
const { SEED_TEXT, OLD_LEGOS, LEGOS, S0140_FIX, isGapFree, phraseContainsLego, legosTileSeed } = require('./eng-for-hin-seed-128-recut-2026-09-23.cjs');

describe('eng_for_hin seed 128: re-cut with no gaps', () => {
  it('the live cut carries a gap marker (the pre-fix state fails the rule)', () => {
    expect(OLD_LEGOS.some(l => !isGapFree(l.known) || !isGapFree(l.target))).toBe(true);
    expect(isGapFree(OLD_LEGOS[0].known)).toBe(false);
  });

  it('every new LEGO is gap-free on both sides (the post-fix state passes)', () => {
    for (const l of LEGOS) {
      expect(isGapFree(l.known), l.known).toBe(true);
      expect(isGapFree(l.target), l.target).toBe(true);
    }
  });

  it('the new LEGOs read in order ARE the seed, on both sides', () => {
    expect(legosTileSeed(LEGOS, SEED_TEXT)).toBe(true);
    expect(legosTileSeed(OLD_LEGOS.map(l => ({ known: l.known, target: l.target })), SEED_TEXT)).toBe(false); // the gap breaks tiling too
  });

  it('every build and use phrase contains its LEGO on both sides, and baskets are full', () => {
    for (const l of LEGOS) {
      expect(l.build.length).toBeGreaterThanOrEqual(3);
      expect(l.use.length).toBeGreaterThanOrEqual(5);
      for (const p of [...l.build, ...l.use]) expect(phraseContainsLego(l, p), `${l.idx}: ${p.target}`).toBe(true);
      for (const p of [...l.build, ...l.use]) expect(isGapFree(p.known) && isGapFree(p.target), p.target).toBe(true);
    }
  });

  it('no phrase in the new baskets leans on the bare "someone" chunk that the cut removes', () => {
    for (const l of LEGOS) for (const p of [...l.build, ...l.use]) {
      expect(p.target.includes("you're like someone") || !/\bsomeone\b/.test(p.target), p.target).toBe(true);
    }
    expect(/\bsomeone\b/.test(S0140_FIX.to.target)).toBe(false);
    expect(S0140_FIX.to.target.startsWith("I can't see")).toBe(true);
  });
});
