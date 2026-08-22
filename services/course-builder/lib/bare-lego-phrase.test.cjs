/**
 * Unit tests for the bare-LEGO padding fix (2026-08-06).
 *
 * The bug: the generator met the per-LEGO phrase floor by copying the LEGO's own
 * text out as a practice phrase. 20-32% of rows in generated courses were such
 * copies (vs 0.1% in hand-built Welsh). They are never played — the round
 * generator renders intro and debut straight from course_legos and claims that
 * phrase id — so they only inflated the count.
 *
 * The fix: bare-LEGO phrases never count toward the floor, and generateBuildupPhrases
 * no longer emits the LEGO itself as a build row.
 *
 * Run: npx vitest run services/course-builder/lib/bare-lego-phrase
 */

import { describe, it, expect } from 'vitest'

const {
  isBareLegoPhrase, partitionBareLegoPhrases, checkBuildUsePhrases, generateBuildupPhrases,
} = require('./phrase-structure.cjs')

const COURSE = 'ita_for_eng'

function phrase(known, target, extra = {}) {
  return { known, target, ...extra }
}

// A LEGO at seed 10 (floor: 3 BUILD, 5 USE) with real practice phrases.
function legoWithRealPhrases() {
  return {
    idx: 1,
    type: 'A',
    known: 'I want',
    target: 'voglio',
    build: [
      phrase('I want to speak', 'voglio parlare'),
      phrase('I want to go', 'voglio andare'),
      phrase('I want it now', 'lo voglio adesso'),
    ],
    use: [
      phrase('I want to speak with you', 'voglio parlare con te', { known_score: 8, target_score: 8 }),
      phrase('I want to go there tomorrow', 'voglio andare lì domani', { known_score: 8, target_score: 8 }),
      phrase('I want to try again', 'voglio provare di nuovo', { known_score: 7, target_score: 7 }),
      phrase('I want to see it', 'voglio vederlo', { known_score: 7, target_score: 7 }),
      phrase('I want to know why', 'voglio sapere perché', { known_score: 8, target_score: 8 }),
    ],
  }
}

describe('isBareLegoPhrase', () => {
  it('catches an exact copy of the LEGO target', () => {
    expect(isBareLegoPhrase('voglio', 'voglio')).toBe(true)
  })

  it('catches a copy differing only in case or punctuation', () => {
    expect(isBareLegoPhrase('Voglio.', 'voglio')).toBe(true)
    expect(isBareLegoPhrase('voglio!', 'Voglio')).toBe(true)
  })

  it('leaves a real practice phrase alone', () => {
    expect(isBareLegoPhrase('voglio parlare', 'voglio')).toBe(false)
    expect(isBareLegoPhrase('lo voglio', 'voglio')).toBe(false)
  })

  it('is false for an empty LEGO target rather than matching everything', () => {
    expect(isBareLegoPhrase('', '')).toBe(false)
    expect(isBareLegoPhrase('voglio', '')).toBe(false)
  })
})

describe('partitionBareLegoPhrases', () => {
  it('splits both row shapes ({target} and {target_text})', () => {
    const { kept, bare } = partitionBareLegoPhrases(
      [{ target: 'voglio' }, { target: 'voglio parlare' }, { target_text: 'voglio' }, { target_text: 'lo voglio' }],
      'voglio',
    )
    expect(bare).toHaveLength(2)
    expect(kept).toHaveLength(2)
  })
})

describe('checkBuildUsePhrases — the floor cannot be padded', () => {
  it('accepts a LEGO whose floor is met by real phrases', () => {
    const result = checkBuildUsePhrases(legoWithRealPhrases(), COURSE, 10)
    expect(result.valid).toBe(true)
    expect(result.details.build).toBe(3)
    expect(result.details.use).toBe(5)
    expect(result.details.bare).toBe(0)
  })

  it('rejects a LEGO that reaches the BUILD floor only via a bare-LEGO copy', () => {
    const lego = legoWithRealPhrases()
    lego.build = [lego.build[0], lego.build[1], phrase('I want', 'voglio')]
    const result = checkBuildUsePhrases(lego, COURSE, 10)
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/BUILD: need 3\+, got 2/)
    expect(result.error).toMatch(/bare-LEGO/)
    expect(result.details.bare).toBe(1)
  })

  it('rejects a LEGO that reaches the USE floor only via a bare-LEGO copy', () => {
    const lego = legoWithRealPhrases()
    lego.use = [...lego.use.slice(0, 4), phrase('I want', 'Voglio.', { known_score: 7, target_score: 7 })]
    const result = checkBuildUsePhrases(lego, COURSE, 10)
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/USE: need 5\+, got 4/)
    expect(result.error).toMatch(/bare-LEGO/)
  })

  it('still passes when a bare copy sits ON TOP of a satisfied floor', () => {
    const lego = legoWithRealPhrases()
    lego.build = [...lego.build, phrase('I want', 'voglio')]
    const result = checkBuildUsePhrases(lego, COURSE, 10)
    expect(result.valid).toBe(true)
    expect(result.details.build).toBe(3)   // the copy is not counted
    expect(result.details.bare).toBe(1)
  })
})

describe('generateBuildupPhrases — no bare-LEGO row', () => {
  const mLego = {
    seed: 12,
    idx: 2,
    known: 'I want to speak',
    target: 'voglio parlare',
    components: [
      { known: 'I want', target: 'voglio' },
      { known: 'to speak', target: 'parlare' },
    ],
  }

  it('emits components only — never the LEGO itself', () => {
    const { buildupPhrases } = generateBuildupPhrases(mLego, COURSE)
    expect(buildupPhrases).toHaveLength(2)
    expect(buildupPhrases.every(p => p.phrase_role === 'component')).toBe(true)
    expect(buildupPhrases.some(p => p.target_text === mLego.target)).toBe(false)
  })

  it('counts no build role and starts practice right after the components', () => {
    const { startPosition, roleCounts } = generateBuildupPhrases(mLego, COURSE)
    expect(roleCounts).toEqual({ component: 2, build: 0, use: 0 })
    expect(startPosition).toBe(3)
  })
})
