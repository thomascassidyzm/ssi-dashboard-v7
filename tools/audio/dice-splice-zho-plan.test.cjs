/** tools/audio/dice-splice-zho-plan.cjs — a span is reusable only if contiguous, in the same order, on unit boundaries (job #340). */
import { describe, it, expect } from 'vitest'
import p from './dice-splice-zho-plan.cjs'
const { tokenize, cutsIn, spanIndex, cover } = p

// The course's own units for seed 1 (LEGOs 现在 / 和你(和|你) / 说 / 中文 / 我想(我|想)).
const lex = new Set(['现在', '和', '你', '说', '中文', '我', '想'])
const seed1 = tokenize('我现在想和你说中文。', lex)

describe('dice-splice-zho finder', () => {
  it('tokenises on the course units', () => {
    expect(seed1.tokens).toEqual(['我', '现在', '想', '和', '你', '说', '中文'])
  })
  it('a substring that cuts a unit in half is NOT a reusable span', () => {
    expect(cutsIn('在想', seed1)).toEqual([])          // a substring of the text, but it splits 现在
    expect(cutsIn('中', seed1)).toEqual([])            // splits 中文
    expect(cutsIn('和你说', seed1)).toEqual([{ start: 4, end: 7 }])
  })
  it('one piece must keep the base order: 中文说 is not cut from 我现在想和你说中文', () => {
    const ix = spanIndex(); ix.addBase('s1', seed1)
    expect(cover(tokenize('中文说', lex), ix, { maxPieces: 1 })).toBeNull()
    expect(cover(tokenize('说中文', lex), ix, { maxPieces: 1 })).toHaveLength(1)
  })
  it('a target is covered only by pieces that start and end on its own boundaries', () => {
    const ix = spanIndex(); ix.addBase('s1', seed1)
    const c = cover(tokenize('我想说中文', lex), ix, { maxPieces: 3 })
    expect(c.map((x) => x.text)).toEqual(['我', '想', '说中文'])
    expect(c[2]).toMatchObject({ baseFinal: true, targetFinal: true })
  })
})
