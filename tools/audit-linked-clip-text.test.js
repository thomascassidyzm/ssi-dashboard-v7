// Run: npx vitest run tools/audit-linked-clip-text.test.js
import { describe, it, expect } from 'vitest'
import { sameWords, compareRows, comparePresentations } from './audit-linked-clip-text.cjs'

describe('audit-linked-clip-text', () => {
  it('ignores case, whitespace and punctuation', () => {
    expect(sameWords('Ich will,  jetzt.', 'ich will jetzt')).toBe(true)
    expect(sameWords('ich will', 'ich wollte')).toBe(false)
  })
  it('flags a linked clip that speaks the OLD words, and a dangling link', () => {
    const clips = new Map([['a', { text: 'ich kann', voice_id: 'v' }], ['b', { text: 'Ich will.', voice_id: 'v' }]])
    const rows = [{ ref: 'S1L1', target_text: 'ich will', known_text: 'I want', target1_audio_id: 'a', target2_audio_id: 'b', known_audio_id: 'zz' }]
    const m = compareRows('lego', rows, clips)
    expect(m.map((x) => [x.role, x.problem])).toEqual([['known', 'DANGLING'], ['target1', 'TEXT']])
  })
  it('checks a presentation clip against the LEGO known text', () => {
    const clips = new Map([['p', { text: "The German for: 'I can', is:", voice_id: 'v' }]])
    expect(comparePresentations([{ known_text: 'I want', presentation_audio_id: 'p' }], clips)).toHaveLength(1)
    expect(comparePresentations([{ known_text: 'I can', presentation_audio_id: 'p' }], clips)).toHaveLength(0)
  })
})
