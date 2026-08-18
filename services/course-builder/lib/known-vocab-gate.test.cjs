/**
 * Unit tests for the known-side vocab gate (vocab-gate breach fix 2026-07-27).
 *
 * The breach: glg_for_eng seed 1 shipped "yes I want to speak" when only
 * "I want" + "to speak" were introduced. The known-side check silently skipped
 * every course without a pair-contract (glg had none) and was warn-only where
 * it did run. Fix: _default_eng contract fallback for all *_for_eng courses +
 * isKnownVocabBreach() promotes unknown/not-yet-introduced glosses to errors.
 *
 * Run: npx vitest run services/course-builder/lib/known-vocab-gate
 */

import { describe, it, expect } from 'vitest'

const {
  loadPairContract, compileKnownContract, checkKnownSide, isKnownVocabBreach, stemKnownGloss, tokenizeKnown,
} = require('./validation.cjs')

// Minimal ctx mirroring buildKnownSideSeedCtx for glg_for_eng at seed 1:
// introduced glosses = "I want" (L1, component "I") + "to speak" (L2).
function ctxFor(contract, glosses, currentSeed) {
  const stemFirstPos = new Map()
  for (const { text, seed } of glosses) {
    for (const tok of tokenizeKnown(text)) {
      const s = stemKnownGloss(tok)
      if (s && (!stemFirstPos.has(s) || stemFirstPos.get(s) > seed)) stemFirstPos.set(s, seed)
    }
  }
  return { ...compileKnownContract(contract), stemFirstPos, consPos: {}, unitPos: [] }
}

const GLOSSES = [
  { text: 'I', seed: 1 }, { text: 'I want', seed: 1 }, { text: 'to speak', seed: 1 },
]

describe('loadPairContract default fallback', () => {
  it('falls back to _default_eng for a *_for_eng course with no contract file', () => {
    const c = loadPairContract('glg_for_eng')
    expect(c).toBeTruthy()
    expect(c.is_default).toBe(true)
    expect(c.known_lang).toBe('eng')
  })

  it('still returns the pair-specific contract when one exists', () => {
    const c = loadPairContract('fra_for_eng')
    expect(c).toBeTruthy()
    expect(c.is_default).toBeUndefined()
    expect(c.course_code).toBe('fra_for_eng')
  })

  // Superseded 2026-08-18 (known-side script fix). This used to assert that a non-English-known
  // pair with no contract file returns null — i.e. that the gate silently did not run. That
  // silence WAS the defect: a course the gate skipped was indistinguishable from a course that
  // passed. The loader now falls back to a known-LANGUAGE brief (`_known_<lang>.contract.cjs`),
  // because the 2026-06 briefs describe a known language but were filed under one course code.
  it('falls back to the known-language brief for a non-English-known pair', () => {
    const c = loadPairContract('eng_for_kor')
    expect(c).toBeTruthy()
    expect(c.known_lang).toBe('kor')
  })

  it('lends a pair-specific brief to another course with the same known language', () => {
    // kor_for_hin has no file of its own; eng_for_hin's Hindi brief is valid for it.
    const c = loadPairContract('kor_for_hin')
    expect(c).toBeTruthy()
    expect(c.known_lang).toBe('hin')
  })

  it('still returns null when no brief exists for the known language at all', () => {
    // A course whose known language has no brief must return null so the caller can report
    // UNCHECKED(no_contract) — never a pass.
    expect(loadPairContract('eng_for_zzznosuchlang')).toBeNull()
  })
})

describe('checkKnownSide — the glg breach case', () => {
  const contract = loadPairContract('glg_for_eng')
  const ctx = ctxFor(contract, GLOSSES, 1)

  it('flags "yes I want to speak" — yes was never introduced', () => {
    const probs = checkKnownSide('yes I want to speak', 1, ctx)
    expect(probs.length).toBeGreaterThan(0)
    expect(probs.some(p => /unknown gloss "yes"/.test(p))).toBe(true)
  })

  it('passes "I want to speak" — fully introduced', () => {
    expect(checkKnownSide('I want to speak', 1, ctx)).toEqual([])
  })

  it('flags a not-yet-introduced gloss by position', () => {
    const ctx2 = ctxFor(contract, [...GLOSSES, { text: 'galician', seed: 2 }], 1)
    const probs = checkKnownSide('I want to speak galician', 1, ctx2)
    expect(probs.some(p => /"galician" not introduced until 2/.test(p))).toBe(true)
  })

  it('free glue passes without introduction', () => {
    expect(checkKnownSide('I want to speak to it', 1, ctx)).toEqual([])
  })

  it('negation with no negation-construction in contract requires the word be introduced', () => {
    const probs = checkKnownSide('I want not to speak', 1, ctx)
    expect(probs.some(p => /unknown gloss "not"/.test(p))).toBe(true)
    const ctx3 = ctxFor(contract, [...GLOSSES, { text: 'not', seed: 1 }], 1)
    expect(checkKnownSide('I want not to speak', 1, ctx3)).toEqual([])
  })
})

describe('isKnownVocabBreach severity split', () => {
  it('unknown gloss and not-introduced block', () => {
    expect(isKnownVocabBreach('unknown gloss "yes"')).toBe(true)
    expect(isKnownVocabBreach('gloss "galician" not introduced until 2')).toBe(true)
    expect(isKnownVocabBreach('gloss-unit "have got" not introduced until 5')).toBe(true)
  })
  it('construction/licensing advisories stay warnings', () => {
    expect(isKnownVocabBreach("construction 'going-to' not licensed until 12")).toBe(false)
    expect(isKnownVocabBreach('NPI token "any" without negation')).toBe(false)
    expect(isKnownVocabBreach('negation "not" not licensed until 6')).toBe(false)
    expect(isKnownVocabBreach('machinery "been" needs have-you-been (unlicensed)')).toBe(false)
  })
})
