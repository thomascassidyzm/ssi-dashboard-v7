/**
 * The course_audio.word_timings contract (Tom, 2026-09-12).
 * Pure — no network, no DB. Run: npx vitest run services/shared/word-timings
 */
import { describe, it, expect } from 'vitest'

const { wordTimingsFromCartesia, toWordTimingsColumn } = require('./word-timings.cjs')

describe('wordTimingsFromCartesia — Cartesia timestamps → the row contract', () => {
  it('maps words/start/end onto source/words/starts/ends, seconds, equal length', () => {
    const t = wordTimingsFromCartesia({ words: ['Ciao', 'a', 'tutti'], start: [0, 0.31, 0.42], end: [0.28, 0.4, 0.71] })
    expect(t).toEqual({ source: 'cartesia', words: ['Ciao', 'a', 'tutti'], starts: [0, 0.31, 0.42], ends: [0.28, 0.4, 0.71] })
  })

  it('rounds to milliseconds and accepts numeric strings', () => {
    const t = wordTimingsFromCartesia({ words: ['x'], start: ['0.12345'], end: [0.98765] })
    expect(t.starts).toEqual([0.123])
    expect(t.ends).toEqual([0.988])
  })

  it('is NULL for nothing, for empty, and for ragged arrays — never a half-shape', () => {
    expect(wordTimingsFromCartesia(null)).toBeNull()
    expect(wordTimingsFromCartesia(undefined)).toBeNull()
    expect(wordTimingsFromCartesia({ words: [], start: [], end: [] })).toBeNull()
    expect(wordTimingsFromCartesia({ words: ['a', 'b'], start: [0], end: [0.1, 0.2] })).toBeNull()
    expect(wordTimingsFromCartesia({ words: ['a'], start: [0.5], end: [0.1] })).toBeNull() // end before start
    expect(wordTimingsFromCartesia({ words: ['a'], start: ['nope'], end: [0.1] })).toBeNull()
  })
})

describe('toWordTimingsColumn — what the writer is allowed to store', () => {
  it('passes a valid contract object through unchanged', () => {
    const t = { source: 'cartesia', words: ['Ciao'], starts: [0], ends: [0.3] }
    expect(toWordTimingsColumn(t)).toEqual(t)
  })

  it('stores NULL for null, for a foreign source, and for a broken shape', () => {
    expect(toWordTimingsColumn(null)).toBeNull()
    expect(toWordTimingsColumn(undefined)).toBeNull()
    expect(toWordTimingsColumn({ source: 'azure', words: ['a'], starts: [0], ends: [1] })).toBeNull()
    expect(toWordTimingsColumn({ source: 'cartesia', words: ['a', 'b'], starts: [0], ends: [1] })).toBeNull()
  })
})
