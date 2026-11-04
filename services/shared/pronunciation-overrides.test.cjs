// zho 得 = děi is SENT as Cartesia IPA; the stored words never change, and 得 read de / dé is never touched (job #250·AD).
import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { spokenFor, restoreWordTimings, linesFor, RULES } = require('./pronunciation-overrides.cjs')
const C = 'zho_for_eng'

describe('pronunciation overrides — zho_for_eng 得 = děi', () => {
  it('sends the listed lines with 得 as <<t|e|i>>, punctuation kept', () => {
    expect(spokenFor({ courseCode: C, text: '她得来' })).toBe('她<<t|e|i>>来')
    expect(spokenFor({ courseCode: C, text: '得带' })).toBe('<<t|e|i>>带')
    expect(spokenFor({ courseCode: C, text: '你几天后就得走吗？' })).toBe('你几天后就<<t|e|i>>走吗？')
  })

  it('swaps only the marked 得 in a line that also has a de 得', () => {
    expect(spokenFor({ courseCode: C, text: '我觉得我们得带孩子' })).toBe('我觉得我们<<t|e|i>>带孩子')
  })

  it('never touches a de / dé line', () => {
    for (const t of ['做得', '说得很好', '你做得很好', '我可以免费得到这个吗', '他因为太晚了不得不离开', '我觉得', '记得带', '得多', '行得通'])
      expect(spokenFor({ courseCode: C, text: t })).toBeNull()
  })

  it('sends the bare LEGO 得 as děi: S0549L01 "have to" is the sense a learner hears (job #262·AD)', () => {
    expect(spokenFor({ courseCode: C, text: '得' })).toBe('<<t|e|i>>')
  })

  it('applies to its own course only', () => {
    expect(spokenFor({ courseCode: 'zho_for_spa', text: '她得来' })).toBeNull()
    expect(spokenFor({ courseCode: null, text: '她得来' })).toBeNull()
  })

  it('every listed line marks only 得, and its spoken form has no 得 left where it was marked', () => {
    const lines = linesFor(C)
    expect(lines.length).toBe(RULES[C].lines.length)
    for (const l of lines) {
      expect(l.text).toBe(l.marked.replace(/[[\]]/g, ''))
      expect(l.spoken.split(RULES[C].say).join('得')).toBe(l.text)
    }
  })

  it('puts 得 back in the word timings, and drops timings the provider split', () => {
    const t = { source: 'cartesia', words: ['她', '<<t|e|i>>', '来'], starts: [0, 0.2, 0.4], ends: [0.2, 0.4, 0.6] }
    expect(restoreWordTimings(t, C).words).toEqual(['她', '得', '来'])
    expect(restoreWordTimings({ ...t, words: ['她', '<<t|e', 'i>>来'] }, C)).toBeNull()
  })
})
