// The one test that proves the change (Kai's addition, 2026-09-23 17:32Z, job #914·H): "never" must be taught as a
// LEGO at or before seed 490 and DRILLED there. Pre-fix: seed 490 has no "never" LEGO and all 16 of its phrases carry
// never inside one frame ("then I will never trust anyone"); the only earlier teaching is a component. Post-fix: L01
// is कभी नहीं → never, its basket puts never in 4+ English frames, every phrase contains its LEGO on both sides, and the
// 16 old phrases move byte-for-byte. Offline: no DB.
import { describe, it, expect } from 'vitest';
const T = require('./eng-for-hin-seed-490-never-lego-2026-09-23.cjs');

describe('eng_for_hin seed 490: never is taught and drilled', () => {
  it('pre-fix: no never LEGO at 490 and its phrases never move the word (fails)', () => {
    expect(T.OLD_LEGOS.some(l => l.target === 'never')).toBe(false);
    expect(T.neverIsDrilled([...T.OLD_L01_PHRASES, ...T.OLD_L02_PHRASES])).toBe(false);
    expect(T.neverFrames([...T.OLD_L01_PHRASES, ...T.OLD_L02_PHRASES]).size).toBe(1);
  });
  it('post-fix: L01 is कभी नहीं → never, the same piece 309 gave as a component, and its basket drills it (passes)', () => {
    expect(T.LEGOS[0]).toMatchObject({ idx: 1, known: 'कभी नहीं', target: 'never' });
    expect(T.NEVER_COMPONENT).toMatchObject({ known: 'कभी नहीं', target: 'never' });
    expect(T.neverIsDrilled([...T.NEVER_BUILD, ...T.NEVER_USE])).toBe(true);
    expect(T.neverFrames([...T.NEVER_BUILD, ...T.NEVER_USE]).size).toBeGreaterThanOrEqual(6);
    expect(T.NEVER_BUILD.length).toBeGreaterThanOrEqual(3); expect(T.NEVER_USE.length).toBeGreaterThanOrEqual(5);
  });
  it('the premise check: a never LEGO row before 490 would refuse the tool', () => {
    expect(T.neverLegoRowsBefore([{ lego_id: 'S0309L01', seed_number: 309, target_text: "I've never seen" }])).toEqual([]);
    expect(T.neverLegoRowsBefore([{ lego_id: 'S0100L02', seed_number: 100, target_text: 'never' }])).toHaveLength(1);
  });
  it('the whole batch passes the offline rules; old phrases move byte-for-byte; every never row carries कभी', () => {
    expect(T.offlineCheck()).toEqual([]);
    expect(T.LEGOS[1].build.map(p => p.target)).toEqual(T.OLD_L01_PHRASES.filter(p => p.role === 'build').map(p => p.target));
    expect(T.LEGOS[2].use.map(p => p.known)).toEqual(T.OLD_L02_PHRASES.filter(p => p.role === 'use').map(p => p.known));
    expect(T.allRows().filter(r => /\bnever\b/i.test(r.target)).every(r => /कभी/u.test(r.known))).toBe(true);
  });
});
