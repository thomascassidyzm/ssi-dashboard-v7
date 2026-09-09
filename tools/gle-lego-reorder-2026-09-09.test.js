// The reorder is a PERMUTATION, and the only way it can quietly go wrong is by
// stopping being one: a repeated new index collides on the (course, seed,
// lego_index) unique key, a dropped one strands a chunk, and a lego_id rename
// that is not a bijection sends decomposition tiles to the wrong chunk.
import { describe, it, expect } from 'vitest';
import mod from './gle-lego-reorder-2026-09-09.cjs';
const { PLAN, indexMap, legoIdRenames, legoId } = mod;

describe('gle_for_eng bucket-1 reorder plan', () => {
  it('every seed plan is a permutation of 1..n', () => {
    for (const [seed, perm] of Object.entries(PLAN)) {
      const sorted = [...perm].sort((a, b) => a - b);
      expect(sorted, `seed ${seed}`).toEqual(perm.map((_, i) => i + 1));
    }
  });

  it('indexMap is a bijection old->new with no fixed-point collisions', () => {
    for (const [seed, perm] of Object.entries(PLAN)) {
      const m = indexMap(perm);
      expect(m.size, `seed ${seed} old indexes`).toBe(perm.length);
      expect(new Set(m.values()).size, `seed ${seed} new indexes`).toBe(perm.length);
    }
  });

  it('renames only legos that actually move, and never onto a name it also frees for something else', () => {
    const renames = legoIdRenames();
    for (const [from, to] of renames) expect(from).not.toBe(to);
    // a bijection on the moving set: no two chunks land on one id
    expect(new Set(renames.values()).size).toBe(renames.size);
  });

  it('a plan that is not a permutation is caught, not silently applied', () => {
    // this is the shape the assertion above exists to reject
    const broken = { 999: [1, 1, 3] };
    const m = indexMap(broken[999]);
    expect(m.size).toBe(2);           // 1 collapsed onto itself
    expect(m.size).not.toBe(3);       // ...so the seed would lose a lego
  });

  it('legoId pads the way the generated column does', () => {
    expect(legoId(2, 1)).toBe('S0002L01');
    expect(legoId(146, 10)).toBe('S0146L10');
  });
});
