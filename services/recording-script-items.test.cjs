/**
 * The reading list the autocue shows (no DB, no audio, no spend).
 * Run: npx vitest run services/recording-script-items
 *
 * Two claims, and they are the whole feature:
 *   - coverage order is EXACTLY what it has always been — natural then slow,
 *     every line, phrases then direct items;
 *   - course order reads each line ONCE, at natural speed (Kai, 2026-08-21),
 *     and changes nothing else about the item it emits.
 */

import { describe, it, expect } from 'vitest'

const { buildScriptItems, isNaturalOnly } = require('./recording-script-items.cjs')

const PHRASES = [
  {
    target: 'wos mechatst?', known: 'what do you want?', wordCount: 2,
    coversLegos: ['L1', 'L2'], source: 'seed', seedNumber: 3,
    recordingChunks: [{ text: 'wos' }, { text: 'mechatst' }],
    legoChunks: [{ text: 'wos' }], chunksString: 'wos | mechatst', chunkCount: 2,
  },
  {
    target: 'i mecht des ned', known: "i don't want that", wordCount: 4,
    coversLegos: ['L3'], source: 'practice', seedNumber: 5,
  },
]
const DIRECT = [{ target: 'mecht', known: 'want', legoId: 'L9' }]

describe('isNaturalOnly', () => {
  it('is on only for the exact string course', () => {
    expect(isNaturalOnly('course')).toBe(true)
    expect(isNaturalOnly('coverage')).toBe(false)
    expect(isNaturalOnly('COURSE')).toBe(false)
    expect(isNaturalOnly(undefined)).toBe(false)
  })
})

describe('buildScriptItems — coverage order (the default, unchanged)', () => {
  const items = buildScriptItems({ phrases: PHRASES, directItems: DIRECT, order: 'coverage' })

  it('reads every line twice: natural then slow', () => {
    expect(items).toHaveLength(6)
    expect(items.map(i => i.cadence)).toEqual(
      ['natural', 'slow', 'natural', 'slow', 'natural', 'slow']
    )
  })

  it('defaults to coverage when no order is given', () => {
    expect(buildScriptItems({ phrases: PHRASES, directItems: DIRECT })).toHaveLength(6)
    expect(buildScriptItems({ phrases: PHRASES, directItems: DIRECT, order: 'sequential' }))
      .toHaveLength(6)
  })

  it('numbers items in reading sequence and keeps phrases before direct items', () => {
    expect(items.map(i => i.index)).toEqual([0, 1, 2, 3, 4, 5])
    expect(items.map(i => i.type)).toEqual(
      ['phrase', 'phrase', 'phrase', 'phrase', 'direct', 'direct']
    )
  })

  it('carries the full item payload the autocue expects', () => {
    expect(items[0]).toMatchObject({
      index: 0, text: 'wos mechatst?', cadence: 'natural', type: 'phrase',
      phraseIndex: 0, wordCount: 2, coversLegos: ['L1', 'L2'],
      known: 'what do you want?', phraseOrigin: 'seed', seedNumber: 3,
      chunksString: 'wos | mechatst', chunkCount: 2,
    })
    // A direct item is one LEGO, so it is one chunk by definition.
    expect(items[4]).toMatchObject({
      text: 'mecht', cadence: 'natural', type: 'direct', legoId: 'L9',
      chunksString: 'mecht', chunkCount: 1,
    })
    expect(items[4].recordingChunks).toEqual([{ text: 'mecht', legoId: 'L9', isLego: true }])
  })
})

describe('buildScriptItems — course order (natural only)', () => {
  const items = buildScriptItems({ phrases: PHRASES, directItems: DIRECT, order: 'course' })

  it('reads every line exactly once, at natural speed', () => {
    expect(items).toHaveLength(3)
    expect(items.every(i => i.cadence === 'natural')).toBe(true)
    expect(items.some(i => i.cadence === 'slow')).toBe(false)
  })

  it('halves the session without dropping a single line', () => {
    const coverage = buildScriptItems({ phrases: PHRASES, directItems: DIRECT, order: 'coverage' })
    expect(items.map(i => i.text)).toEqual(
      coverage.filter(i => i.cadence === 'natural').map(i => i.text)
    )
    expect(items).toHaveLength(coverage.length / 2)
  })

  it('emits the same item payload the slow pass would have shared', () => {
    const coverageNatural = buildScriptItems({ phrases: PHRASES, directItems: DIRECT, order: 'coverage' })
      .filter(i => i.cadence === 'natural')
    // Same content, re-indexed for the shorter run.
    expect(items.map(({ index, ...rest }) => rest))
      .toEqual(coverageNatural.map(({ index, ...rest }) => rest))
    expect(items.map(i => i.index)).toEqual([0, 1, 2])
  })

  it('still carries chunk data — the line may be read slow another day', () => {
    expect(items[0].chunksString).toBe('wos | mechatst')
    expect(items[0].chunkCount).toBe(2)
  })
})

describe('buildScriptItems — empty input', () => {
  it('is an empty list, not a crash, in either order', () => {
    expect(buildScriptItems({})).toEqual([])
    expect(buildScriptItems({ phrases: [], directItems: [], order: 'course' })).toEqual([])
  })
})
