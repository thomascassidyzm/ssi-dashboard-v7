import { describe, it, expect } from 'vitest'
import textOps from '../text-ops.cjs'

const {
  stripParens, detectSlashOptions, applySlashChoice,
  ensureQuestionMark, isPunctuationOnlyDiff, lowercaseFirst, stripTerminalPunct,
} = textOps

describe('stripParens', () => {
  it('removes ascii parentheticals and trims', () => {
    expect(stripParens('I want (to)')).toEqual({ text: 'I want', changed: true })
    expect(stripParens('the (small) cat')).toEqual({ text: 'the cat', changed: true })
  })
  it('removes fullwidth ROUND parens', () => {
    expect(stripParens('語（がいこく）').text).toBe('語')
  })
  it('PRESERVES square + CJK lenticular brackets (real content, not glosses)', () => {
    // BUG 3 fix: [sic], array[0], 【note】 must NOT be stripped.
    expect(stripParens('I said [sic] hello')).toEqual({ text: 'I said [sic] hello', changed: false })
    expect(stripParens('word【gloss】')).toEqual({ text: 'word【gloss】', changed: false })
  })
  it('refuses to empty a field outright', () => {
    expect(stripParens('(whole thing)')).toEqual({ text: '(whole thing)', changed: false })
  })
  it('no-ops when no parens', () => {
    expect(stripParens('plain text')).toEqual({ text: 'plain text', changed: false })
  })
  it('handles non-strings safely', () => {
    expect(stripParens(null)).toEqual({ text: null, changed: false })
  })
})

describe('detectSlashOptions / applySlashChoice', () => {
  it('detects alternations', () => {
    expect(detectSlashOptions('他/她')).toEqual({ hasSlash: true, options: ['他', '她'] })
  })
  it('ignores pure numeric slashes (fractions/dates)', () => {
    expect(detectSlashOptions('1/2').hasSlash).toBe(false)
    expect(detectSlashOptions('24/7').hasSlash).toBe(false)
  })
  it('never auto-picks; requires a valid chosen form', () => {
    expect(applySlashChoice('他/她', '他')).toEqual({ text: '他', changed: true })
    expect(() => applySlashChoice('他/她', '它')).toThrow(/not one of/)
  })
  it('no-op on text without slashes', () => {
    expect(applySlashChoice('plain', 'plain')).toEqual({ text: 'plain', changed: false })
  })
})

describe('ensureQuestionMark — language aware', () => {
  it('default languages get ?', () => {
    expect(ensureQuestionMark('do you want', 'spa')).toEqual({ text: '¿do you want?', changed: true })
    expect(ensureQuestionMark('willst du', 'deu')).toEqual({ text: 'willst du?', changed: true })
  })
  it('Arabic family gets ؟ not ?', () => {
    const r = ensureQuestionMark('هل تريد', 'ara')
    expect(r.text.endsWith('؟')).toBe(true)
    expect(r.text.includes('?')).toBe(false)
  })
  it('Spanish gets opening ¿', () => {
    expect(ensureQuestionMark('quieres', 'spa').text).toBe('¿quieres?')
  })
  it('replaces an existing wrong terminal mark', () => {
    expect(ensureQuestionMark('quieres.', 'deu').text).toBe('quieres?')
  })
  it('no-op when already correct', () => {
    expect(ensureQuestionMark('willst du?', 'deu')).toEqual({ text: 'willst du?', changed: false })
  })
})

describe('isPunctuationOnlyDiff', () => {
  it('true for period/case-only changes (no audio null needed)', () => {
    expect(isPunctuationOnlyDiff('Hola', 'hola.')).toBe(true)
    expect(isPunctuationOnlyDiff('hola', 'Hola')).toBe(true)
  })
  it('false for a real word change (audio must be nulled)', () => {
    expect(isPunctuationOnlyDiff('hola', 'adios')).toBe(false)
  })
  it('a ?-adding change registers as text-affecting at the audio layer', () => {
    // ? is stripped by stripTerminalPunct, so by THIS helper it is punctuation-only.
    // The operation layer treats ? specially (see editPhrase audio policy).
    expect(isPunctuationOnlyDiff('hola', 'hola?')).toBe(true)
  })
})

describe('lowercaseFirst', () => {
  it('only acts when forced', () => {
    expect(lowercaseFirst('È vero', { force: true })).toEqual({ text: 'è vero', changed: true })
    expect(lowercaseFirst('È vero')).toEqual({ text: 'È vero', changed: false })
  })
})

describe('stripTerminalPunct', () => {
  it('strips trailing marks of any flavour', () => {
    expect(stripTerminalPunct('hola؟')).toBe('hola')
    expect(stripTerminalPunct('hola？')).toBe('hola')
    expect(stripTerminalPunct('hola...')).toBe('hola')
  })
})
