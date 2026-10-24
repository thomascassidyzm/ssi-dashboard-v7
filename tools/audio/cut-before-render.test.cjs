// cut-before-render: where a phrase is cut out of a longer cast-voice clip (job #374).
// Run: npx vitest run tools/audio/cut-before-render.test.cjs
import { describe, it, expect } from 'vitest'
const { sourceSpan, bestSource } = require('./cut-before-render.cjs')

// 我想说中文。 per character, a pause after 想 (0.50 → 0.62) and none after 说 (0.80 → 0.81)
const src = { id: 's', voice_id: 'v', text: '我想，说中文。', duration_ms: 1500,
  word_timings: { words: ['我', '想', '说', '中', '文'], starts: [0.05, 0.30, 0.62, 0.81, 1.05], ends: [0.28, 0.50, 0.80, 1.02, 1.30] } }

describe('sourceSpan', () => {
  it('opens at the clip start and closes in the pause; the char span indexes the raw text (punctuation kept out)', () => {
    expect(sourceSpan(src, '我想')).toEqual({ charStart: 0, charEnd: 2, startSec: 0, endSec: 0.56, closes: false, tailGap: 0.12 })
  })
  it('a span that ends the clip keeps the clip\'s own tail; one that starts mid-speech is refused', () => {
    expect(sourceSpan(src, '说中文')).toMatchObject({ charStart: 3, charEnd: 6, startSec: 0.56, endSec: 1.5, closes: true })
    expect(sourceSpan(src, '中文')).toBeNull()
  })
  it('refuses a cut that would end mid-speech, the whole text, words not in the source, and timings that do not spell it', () => {
    expect(sourceSpan(src, '我想说')).toBeNull()
    expect(sourceSpan(src, '我想说中文')).toBeNull()
    expect(sourceSpan(src, '你好')).toBeNull()
    expect(sourceSpan({ ...src, word_timings: { words: ['我', '想'], starts: [0, 0.3], ends: [0.28, 0.5] } }, '我想')).toBeNull()
  })
  it('bestSource takes only the cast voice and prefers a cut that ends its clip', () => {
    const other = { ...src, id: 'o', text: '我想。', duration_ms: 600, word_timings: { words: ['我', '想'], starts: [0.05, 0.3], ends: [0.28, 0.5] } }
    const tail = { ...src, id: 't', text: '他说我想', duration_ms: 1200, word_timings: { words: ['他', '说', '我', '想'], starts: [0, 0.2, 0.6, 0.8], ends: [0.18, 0.45, 0.78, 0.95] } }
    expect(bestSource([src, tail, { ...tail, id: 'x', voice_id: 'old' }], { text: '我想' }, 'v').source.id).toBe('t')
    expect(sourceSpan(other, '我想')).toBeNull() // its words ARE the text: not a cut
  })
})
