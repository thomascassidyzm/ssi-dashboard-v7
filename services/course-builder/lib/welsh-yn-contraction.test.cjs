// 'n AFTER A VOWEL IS yn (Aran, Welsh method lead, 2026-10-14, job #338; canon K43).
// The specimen: South sandbox cym_sv2_for_eng seed 1627 "your coffee is ready | mae dy goffi di’n
// barod" with S1627L02 the already-taught "yn barod". Before this rule the tiler could not cover
// "di’n" from "dy goffi di" + "yn barod", and job #332 rewrote the seed to "di yn barod" — wrong.
//
// Run: npx vitest run services/course-builder/lib/welsh-yn-contraction
import { describe, it, expect } from 'vitest'

const { welshExpandYn, isSameWelsh, welshTaughtKeys, welshUntaughtWords } = require('./welsh-mutation.cjs');
const { checkTiling, checkVocabViolations } = require('./validation.cjs');
const { containsWelsh } = require('./new-pairing.cjs');
const S = 'cym_sv2_for_eng';

describe('welshExpandYn', () => {
  it('expands a vowel-final host, either apostrophe', () => {
    expect(welshExpandYn('mae dy goffi di’n barod')).toBe('mae dy goffi di yn barod');
    expect(welshExpandYn("dw i'n barod")).toBe('dw i yn barod');
    expect(welshExpandYn('Mae’n braf.')).toBe('Mae yn braf.');
    expect(welshExpandYn('wyt ti ’n')).toBe('wyt ti yn');
  });
  it('leaves o’n (oeddwn), ’r and non-n clitics alone', () => {
    expect(welshExpandYn('o’n ni angen')).toBe('o’n ni angen');
    expect(welshExpandYn('mae’r coffi')).toBe('mae’r coffi');
  });
});

describe('seed tiling: taught "yn barod" covers "di’n barod"', () => {
  const legos = [{ target: 'dy goffi di' }, { target: 'yn barod' }];
  it('S1627 tiles with the contracted seed (both apostrophes)', () => {
    expect(checkTiling('mae dy goffi di’n barod', legos, S, new Set(['mae'])).valid).toBe(true);
    expect(checkTiling("mae dy goffi di'n barod", legos, S, new Set(['mae'])).valid).toBe(true);
  });
  it('reverse: a taught "dw i’n barod" covers "yn"', () => {
    expect(checkTiling('mae hi yn barod', [{ target: 'mae hi' }], S, new Set(['dw i’n barod'])).valid).toBe(true);
  });
  it('still refuses o’n from o + yn, and is Welsh-only', () => {
    expect(checkTiling('o’n i', [{ target: 'i' }], S, new Set(['o', 'yn'])).valid).toBe(false);
    expect(checkTiling("di'n", [{ target: 'di' }, { target: 'yn' }], 'spa_for_eng', new Set()).valid).toBe(false);
  });
});

describe('phrase vocab check in full context', () => {
  const vocab = new Set(['mae', 'dy goffi di', 'yn barod', 'mae hi']);
  it('"mae dy goffi di’n barod" tiles from the taught chunks', () => {
    expect(checkVocabViolations([{ target: 'mae dy goffi di’n barod' }], vocab, S)).toEqual([]);
    expect(checkVocabViolations([{ target: 'mae’n barod' }], vocab, S)).toEqual([]);
  });
  it('word level: ’n is taught once yn is, and the reverse', () => {
    expect(welshUntaughtWords('mae hi’n', welshTaughtKeys(['mae hi', 'yn barod']))).toEqual([]);
    expect(welshUntaughtWords('mae hi yn', welshTaughtKeys(['mae hi', 'dw i’n barod']))).toEqual([]);
  });
});

describe('same Welsh / containment', () => {
  it('"’n barod" is the same Welsh as "yn barod" (already taught, never a new LEGO)', () => {
    expect(isSameWelsh(S, '’n barod', 'yn barod')).toBe(true);
    expect(isSameWelsh(S, 'o’n i', 'o yn i')).toBe(false);
    expect(isSameWelsh('spa_for_eng', "'n barod", 'yn barod')).toBe(false);
  });
  it('a phrase saying "di’n barod" contains the LEGO "yn barod"', () => {
    expect(containsWelsh(S, 'yn barod', 'mae dy goffi di’n barod')).toBe(true);
  });
});
