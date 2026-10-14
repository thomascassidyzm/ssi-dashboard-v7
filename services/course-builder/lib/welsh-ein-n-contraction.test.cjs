// 'n AS ein, ONLY in front of a taught "ein X" LEGO (Aran, Welsh method lead, 2026-10-14, job #348).
// The specimen: South sandbox cym_sv2_for_eng S0181 "ours want to discuss everything | ma’n rhai ni’n
// moyn trafod popeth". Its LEGO was the bare "’n rhai ni" (a bare ’n is never taught); the LEGO is now
// "ein rhai ni" and the seed + practice phrases keep the spoken "ma’n rhai ni". K43 (’n = yn) had made
// the old seed pass falsely — via yn, not ein. These tests pin the narrow rule: ein is read only where
// an "ein …" LEGO's own tail follows, and tiling must succeed with NO yn taught at all.
//
// Run: npx vitest run services/course-builder/lib/welsh-ein-n-contraction
import { describe, it, expect } from 'vitest'

const { welshExpandEin, welshContainsLego } = require('./welsh-mutation.cjs');
const { checkTiling, checkVocabViolations } = require('./validation.cjs');
const { containsWelsh } = require('./new-pairing.cjs');
const S = 'cym_sv2_for_eng';
const LEGO = 'ein rhai ni';

describe('welshExpandEin', () => {
  it('reads host’n as "host ein" only in front of the ein-LEGO tail', () => {
    expect(welshExpandEin('ma’n rhai ni yn barod', [LEGO])).toBe('ma ein rhai ni yn barod');
    expect(welshExpandEin("cofio'n rhai ni", [LEGO])).toBe('cofio ein rhai ni');
    // the tail's last word carries its own clitic: the real S0181 seed and its use phrase
    expect(welshExpandEin('ma’n rhai ni’n moyn trafod popeth', [LEGO])).toBe('ma ein rhai ni’n moyn trafod popeth');
  });
  it('does NOT read ’n as ein generally', () => {
    expect(welshExpandEin('ma’n barod', [LEGO])).toBe('ma’n barod');          // tail does not follow
    expect(welshExpandEin('ma’n rhai ni', ['yn barod'])).toBe('ma’n rhai ni');  // no ein LEGO taught
    expect(welshExpandEin('ma’n rhai ni', [])).toBe('ma’n rhai ni');
    expect(welshExpandEin('ma’n rhai ni', ['ein'])).toBe('ma’n rhai ni');       // bare ein has no tail
  });
});

describe('S0181 seed tiling reads ein, not yn', () => {
  const legos = [{ target: LEGO }];
  const seed = 'ma’n rhai ni';
  const realSeed = 'ma’n rhai ni’n moyn trafod popeth';
  it('tiles with NO yn taught anywhere (so it cannot be passing via K43)', () => {
    const r = checkTiling(seed, legos, S, new Set(['ma fe']));
    expect(r.valid).toBe(true);
  });
  it('the real S0181 seed reads ein too (its ni’n still needs yn, which is taught)', () => {
    const r = checkTiling(realSeed, [{ target: 'trafod' }, { target: LEGO }], S, new Set(['ma fe', 'ni', 'yn moyn', 'popeth']));
    expect(r.valid).toBe(true);
  });
});

describe('phrases', () => {
  const vocab = new Set(['ma fe', 'yn barod', LEGO]);
  it('"ma’n rhai ni yn barod" tiles from ma + ein rhai ni + yn barod', () => {
    expect(checkVocabViolations([{ target: 'ma’n rhai ni yn barod' }], vocab, S)).toEqual([]);
    expect(welshContainsLego(S, LEGO, 'ma’n rhai ni’n moyn gweithio i’r cyngor')).toBe(true);
  });
  it('contains the ein LEGO; ’n before anything else does not', () => {
    expect(welshContainsLego(S, LEGO, 'maen nhw’n moyn i ni hala llai o amser gyda’n rhai ni')).toBe(true);
    expect(welshContainsLego(S, LEGO, 'ma’n barod')).toBe(false);
    expect(welshContainsLego('spa_for_eng', LEGO, 'ma’n rhai ni')).toBe(false);
    expect(containsWelsh(S, LEGO, 'o’n ni’n moyn helpu’n rhai ni')).toBe(true);
  });
});
