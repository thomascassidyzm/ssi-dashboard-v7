import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { checkNonExampleText } = require('./validation.cjs')

describe('checkNonExampleText: every submitted string is later spoken, so no [labels]', () => {
  it('catches the ara_lb_for_eng S0372L01C03 shape (a particle glossed [progressive])', () => {
    const bad = checkNonExampleText([{ idx: 1, known: 'what she was trying to do', target: 'شو كانت عم تحاول تعمل',
      components: [{ known: 'she was', target: 'كانت' }, { known: '[progressive]', target: 'عم' }] }])
    expect(bad).toEqual([{ where: 'L01 component 2', field: 'known', text: '[progressive]' }])
  })
  it('catches braces in a phrase of either shape', () => {
    expect(checkNonExampleText([{ idx: 2, known: 'a', target: 'b', build: [{ known: 'x {masc}', target: 'y' }], use: [['p', 'q [f]']] }])).toHaveLength(2)
  })
  it('passes a clean LEGO', () => {
    expect(checkNonExampleText([{ idx: 1, known: 'she\'s trying', target: 'عم تحاول', components: [{ known: 'she was', target: 'كانت' }], use: [{ known: 'a', target: 'b' }] }])).toEqual([])
  })
  // #486 (Tom 2026-10-13: "No brackets anywhere!!!! ... We do not explain anything."): afr_for_eng carried 132 LEGOs glossed
  // "interesting (predicative)" / "very/a lot" because the door only refused [] and {} — the apml zero-explanation gate was
  // never wired and the standard TTS path silently stripped (...) so nobody heard it. The Tom-voice intros do speak it.
  it('refuses a parenthetical note — the afr_for_eng "interesting (predicative)" shape', () => {
    expect(checkNonExampleText([{ idx: 1, known: 'interesting (predicative)', target: 'interessant' }])).toEqual([{ where: 'L01', field: 'known', text: 'interesting (predicative)' }])
  })
  it('refuses a slash-separated list of glosses — "very/a lot" — in a LEGO, a phrase or a component', () => {
    const bad = checkNonExampleText([{ idx: 3, known: 'very/a lot', target: 'baie', components: [{ known: 'have/get', target: 'hê' }], build: [{ known: "it's nice/fun", target: 'dit is lekker' }] }])
    expect(bad.map((b) => b.text)).toEqual(['very/a lot', 'have/get', "it's nice/fun"])
  })
  it('refuses full-width brackets (Japanese/Chinese notes)', () => {
    expect(checkNonExampleText([{ idx: 1, known: 'to eat', target: '食べる（動詞）' }])).toHaveLength(1)
  })
  it('lets a slash between digits through — 24/7, 3/4 are written numbers, not alternatives', () => {
    expect(checkNonExampleText([{ idx: 1, known: 'three quarters', target: '3/4' }])).toEqual([])
  })
  it('refuses a word slash even when one neighbour is a digit — "one/1", "1/one" (#528)', () => {
    const bad = checkNonExampleText([{ idx: 1, known: 'one/1', target: 'een' }, { idx: 2, known: '1/one', target: 'een' }, { idx: 3, known: 'two', target: '2/two' }])
    expect(bad.map((b) => b.text)).toEqual(['one/1', '1/one', '2/two'])
  })
})
