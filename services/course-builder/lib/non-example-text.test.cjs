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
})
