// The mi/fe particle (Aran, 2026-10-07: "mi fedra i" = "medra i") must fold whether or not the rest
// of the words also mutate. Cross-check of the North sandbox run (2026-10-07) found that once the
// particle was stripped, an otherwise IDENTICAL remainder was rejected as "identical texts", so
// "mi fedra i" vs "fedra i" and "mi fyddai fo" vs "fyddai fo" came out false (a ZUT fork).
//
// Run: npx vitest run services/course-builder/lib/welsh-mutation
import { describe, it, expect } from 'vitest'

const { isSoftMutationVariant } = require('./welsh-mutation.cjs');
const C = 'cym_nv2_for_eng';

describe('isSoftMutationVariant — the mi/fe particle', () => {
  it('particle only: mi fedra i = fedra i, both directions', () => {
    expect(isSoftMutationVariant(C, 'mi fedra i', 'fedra i')).toBe(true);
    expect(isSoftMutationVariant(C, 'fedra i', 'mi fedra i')).toBe(true);
  });
  it('particle only: mi fyddai fo = fyddai fo; fe fydda i = fydda i', () => {
    expect(isSoftMutationVariant(C, 'mi fyddai fo', 'fyddai fo')).toBe(true);
    expect(isSoftMutationVariant('cym_sv2_for_eng', 'fe fydda i', 'fydda i')).toBe(true);
  });
  it('particle plus mutation still folds: mi fedra i = medra i', () => {
    expect(isSoftMutationVariant(C, 'mi fedra i', 'medra i')).toBe(true);
  });
  it('identical texts are still the caller\'s plain duplicate, not a variant', () => {
    expect(isSoftMutationVariant(C, 'fedra i', 'fedra i')).toBe(false);
    expect(isSoftMutationVariant(C, 'mi fedra i', 'mi fedra i')).toBe(false);
  });
  it('a non-particle extra word is not folded, and non-Welsh courses never fold', () => {
    expect(isSoftMutationVariant(C, 'i mi', 'mi')).toBe(false);
    expect(isSoftMutationVariant(C, 'dw i fedra i', 'fedra i')).toBe(false);
    expect(isSoftMutationVariant('spa_for_eng', 'mi fedra i', 'fedra i')).toBe(false);
  });
});

// Aran, 2026-10-07 (job #57): "Nasal and aspirate mutated forms stay NEW items." The re-teach marking of
// the Welsh sandboxes (tools/course-optimization/weave-cym-reteach-count.cjs) relies on this: only the
// soft mutation folds, so a nasal or aspirate form is a different, new item and is never marked taught.
describe('isSoftMutationVariant — nasal and aspirate stay NEW (Aran ruling 2026-10-07)', () => {
  it('soft mutation folds, as the control: gath = cath, ddiwrnod = diwrnod', () => {
    expect(isSoftMutationVariant(C, 'gath', 'cath')).toBe(true);
    expect(isSoftMutationVariant(C, 'ddiwrnod', 'diwrnod')).toBe(true);
  });
  it('nasal does not fold: nghath/cath, nhad/tad, mhen/pen, nhad/dad', () => {
    for (const [a, b] of [['nghath', 'cath'], ['nhad', 'tad'], ['mhen', 'pen'], ['nghath', 'gath'], ['mhen', 'ben']]) {
      expect(isSoftMutationVariant(C, a, b)).toBe(false);
      expect(isSoftMutationVariant(C, b, a)).toBe(false);
    }
  });
  it('aspirate does not fold: chath/cath, thad/tad, phen/pen, haf/af', () => {
    for (const [a, b] of [['chath', 'cath'], ['thad', 'tad'], ['phen', 'pen'], ['haf', 'af']]) {
      expect(isSoftMutationVariant(C, a, b)).toBe(false);
      expect(isSoftMutationVariant(C, b, a)).toBe(false);
    }
  });
  it('inside a phrase: fy nghath i stays different from fy nghath i / a cath one', () => {
    expect(isSoftMutationVariant(C, 'fy nghath i', 'fy ngath i')).toBe(false);
    expect(isSoftMutationVariant(C, 'ei chath hi', 'ei gath hi')).toBe(false);
  });
});
