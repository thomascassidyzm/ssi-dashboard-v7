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

// ---------------------------------------------------------------------------
// THE TWO-POOL SCRIPT (Kai, 2026-08-21)
// ---------------------------------------------------------------------------

const { buildTwoPoolScriptItems, ISOLATED_CADENCE } = require('./recording-script-items.cjs')
const { planScriptTakeFiling } = require('./script-take-filing.cjs')
const { groupTakesByPhrase } = require('./voice-engine/provenance-adapter.cjs')

const POOL_A = [
  { target: 'seit zirka ana Wochn', known: 'for about a week', kind: 'lego', legoId: 'S0038L02' },
  { target: 'zirka', known: 'about', kind: 'component', legoId: 'S0038L02' },
]
const POOL_B = [
  { target: 'i lern seit zirka ana Wochn', known: "i've been learning for about a week", seedNumber: 38,
    source: 'seed', wordCount: 5, chunks: [{ text: 'i lern' }, { text: 'seit zirka ana Wochn' }],
    chunksString: 'i lern|seit zirka ana Wochn', chunkCount: 2 },
]

describe('buildTwoPoolScriptItems', () => {
  it('reads a Pool A item ONCE and a Pool B line twice', () => {
    const items = buildTwoPoolScriptItems({ poolA: POOL_A, poolB: POOL_B })
    expect(items.filter(i => i.pool === 'A')).toHaveLength(POOL_A.length)
    expect(items.filter(i => i.pool === 'B')).toHaveLength(POOL_B.length * 2)
    expect(items.filter(i => i.pool === 'B').map(i => i.cadence)).toEqual(['natural', 'slow'])
  })

  it('marks Pool A unspliceable and gives it its own cadence, never "slow"', () => {
    const items = buildTwoPoolScriptItems({ poolA: POOL_A, poolB: POOL_B })
    for (const item of items.filter(i => i.pool === 'A')) {
      expect(item.cadence).toBe(ISOLATED_CADENCE)
      expect(item.cadence).not.toBe('slow')
      expect(item.spliceable).toBe(false)
      expect(item.chunkCount).toBe(1)   // an isolated read has no internal pause
    }
  })

  it('numbers items in reading order and can put Pool A last', () => {
    const first = buildTwoPoolScriptItems({ poolA: POOL_A, poolB: POOL_B })
    expect(first[0].pool).toBe('A')
    const last = buildTwoPoolScriptItems({ poolA: POOL_A, poolB: POOL_B, poolAFirst: false })
    expect(last[0].pool).toBe('B')
    expect(last[last.length - 1].pool).toBe('A')
    expect(last.map(i => i.index)).toEqual(last.map((_, n) => n))
  })
})

describe('the two guards that make Kai\'s ruling true', () => {
  const course = { target_lang: 'de-AT', known_lang: 'en' }

  it('FILES an isolated take — it is the unit\'s teaching clip', () => {
    const plan = planScriptTakeFiling({
      metadata: { cadence: ISOLATED_CADENCE, text: 'zirka', role: 'target1' },
      voiceId: 'human_sasha', course,
    })
    expect(plan.file).toBe(true)
    expect(plan.text).toBe('zirka')
  })

  it('still refuses a slow take, so the two cadences cannot be confused', () => {
    const plan = planScriptTakeFiling({
      metadata: { cadence: 'slow', text: 'zirka', role: 'target1' }, voiceId: 'human_sasha', course,
    })
    expect(plan.file).toBe(false)
  })

  it('keeps an isolated take OUT of the splicer entirely', () => {
    const takes = [
      { phraseText: 'zirka', s3Key: 'a.mp3', cadence: ISOLATED_CADENCE, chunksString: 'zirka', recordedAt: '2026-08-22' },
      { phraseText: 'i lern', s3Key: 'b.mp3', cadence: 'natural', chunksString: 'i lern', recordedAt: '2026-08-22' },
    ]
    const groups = groupTakesByPhrase(takes)
    expect([...groups.keys()]).toEqual(['i lern'])
  })
})
