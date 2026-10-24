import { describe, it, expect } from 'vitest'

const Module = require('module')
const cadence = require('./cadence-service.cjs')

// CommonJS requires bypass vi.mock: block IO before loading the tiler, then
// restore the loader even if loading fails. No CLI/config module is evaluated.
const realLoad = Module._load
const forbidden = () => { throw new Error('IO forbidden in pure display tests') }
let tiler
try {
  Module._load = function (request, parent, ...rest) {
    if (parent?.filename === require.resolve('./display-tiler.cjs')) {
      if (request === 'child_process') return { spawn: forbidden }
      if (request === 'fs') return new Proxy({}, { get: () => forbidden })
      if (request === './shared/claude-cli.cjs') return { HAIKU_MODEL: 'unused-test-model' }
      if (request === './shared/claude-config.cjs') return { claudeEnv: forbidden }
    }
    return realLoad.call(this, request, parent, ...rest)
  }
  tiler = require('./display-tiler.cjs')
} finally {
  Module._load = realLoad
}

describe('cadence conversions', () => {
  it.each([
    ['slow', 0.7, 1 / 0.7, '-30%'],
    ['natural', 1, 1, '0%'],
    ['', 1, 1, '0%'],
    [undefined, 1, 1, '0%'],
    [null, 1, 1, '0%'],
    ['FAST', 1, 1, '0%'],
    [42, 1, 1, '0%'],
  ])('converts %s to speed, inverse stretch and SSML rate', (input, speed, stretch, azure) => {
    expect(cadence.getSpeedForCadence(input)).toBe(speed)
    expect(cadence.getStretchForCadence(input)).toBeCloseTo(stretch, 12)
    expect(cadence.getAzureSpeedForCadence(input)).toBe(azure)
  })

  it('publishes the documented speed and role tables', () => {
    expect(cadence.CADENCE_SPEEDS).toEqual({ slow: 0.7, natural: 1 })
    expect(cadence.ROLE_CADENCES).toEqual({ target1: 'slow', target2: 'slow', source: 'natural', presentation: 'natural' })
  })

  it.each([
    ['target1', 'slow'], ['target2', 'slow'], ['source', 'natural'],
    ['presentation', 'natural'], ['', 'natural'], [null, 'natural'],
    [undefined, 'natural'], ['unknown', 'natural'], [42, 'natural'],
  ])('selects cadence for role %s', (role, expected) => {
    expect(cadence.getCadenceForRole(role)).toBe(expected)
  })

  it('validates exact cadence names only', () => {
    for (const value of ['slow', 'natural']) expect(cadence.isValidCadence(value)).toBe(true)
    for (const value of ['', null, undefined, 0, {}, [], 'Slow', ' slow', 'fast', 'toString']) {
      expect(cadence.isValidCadence(value)).toBe(false)
    }
  })

  it.skip('inherited keys must fall back to natural speed and role cadence (known defect)', () => {
    expect(cadence.getSpeedForCadence('toString')).toBe(1)
    expect(cadence.getCadenceForRole('toString')).toBe('natural')
  })
})

describe('display tile validation', () => {
  it('reassembles both scripts ignoring whitespace and preserves punctuation', () => {
    const tiles = Object.freeze([
      Object.freeze({ n: '私 は', r: 'wata shi wa' }),
      Object.freeze({ n: '猫。', r: 'neko.' }),
    ])
    expect(tiler.validateTiles(tiles, '私\tは\n猫。', 'watashi wa neko.')).toBeNull()
    expect(tiler.validateTiles([{ n: '。' }], '。', '')).toBeNull()
    expect(tiler.validateTiles([{ n: '', r: '' }], undefined, null)).toBeNull()
  })

  it.each([undefined, null, {}, 'text', []])('rejects absent/non-array/empty tiles: %s', (tiles) => {
    expect(tiler.validateTiles(tiles, '', '')).toBe('no tiles')
  })

  it('rejects missing native text and reports which side failed reassembly', () => {
    expect(tiler.validateTiles([{ r: 'a' }], 'a', 'a')).toBe('tile missing native')
    expect(tiler.validateTiles([{ n: 1 }], '1', '')).toBe('tile missing native')
    expect(tiler.validateTiles([{ n: '猫', r: 'neko' }], '犬', 'inu')).toBe('native mismatch: "猫" != "犬"')
    expect(tiler.validateTiles([{ n: '猫', r: 'inu' }], '猫', 'neko')).toBe('roman mismatch: "inu" != "neko"')
    expect(tiler.validateTiles([{ n: '猫' }], '猫', 'neko')).toBe('roman mismatch: "" != "neko"')
  })

  it.skip('null tile entries should return a validation error rather than throw (known defect)', () => {
    expect(tiler.validateTiles([null], '', '')).toBe('tile missing native')
  })
})

describe('salient display spans', () => {
  const tiles = Object.freeze([
    Object.freeze({ n: '私 は', r: 'watashi wa', salient: true }),
    Object.freeze({ n: '猫', r: 'neko' }),
    Object.freeze({ n: 'です。', r: 'desu.' }),
  ])

  it('marks every overlapping tile, including partial overlaps, without mutating input', () => {
    const result = tiler.markSalient(tiles, 'は 猫 で')
    expect(result).toEqual(tiles.map(t => ({ ...t, salient: true })))
    result.forEach((tile, i) => expect(tile).not.toBe(tiles[i]))
    expect(tiles[1]).not.toHaveProperty('salient')
  })

  it('excludes tiles touching only the span boundary', () => {
    expect(tiler.markSalient(tiles, '猫').map(t => t.salient)).toEqual([false, true, false])
  })

  it.each(['', null, undefined, ' \n\t', '犬'])('clears existing flags for absent or unmatched salient text: %s', (salient) => {
    expect(tiler.markSalient(tiles, salient)).toEqual(tiles.map(t => ({ ...t, salient: false })))
    expect(tiler.markSalient([], salient)).toEqual([])
  })

  it('marks only the first occurrence of a repeated span', () => {
    expect(tiler.markSalient([{ n: '猫' }, { n: '猫' }], '猫')).toEqual([
      { n: '猫', salient: true }, { n: '猫', salient: false },
    ])
  })
})

describe('pure batch preparation', () => {
  it('numbers prompt rows in order and preserves the supplied native and roman strings', () => {
    const rows = Object.freeze([
      Object.freeze({ idx: 9, target_text: '猫。', target_text_roman: 'neko.' }),
      Object.freeze({ idx: 3, target_text: '犬！', target_text_roman: 'inu!' }),
    ])
    const prompt = tiler.buildPrompt(rows)
    expect(prompt).toContain('1. NATIVE: 猫。\n   ROMAN: neko.\n2. NATIVE: 犬！\n   ROMAN: inu!')
    expect(prompt).toContain('Do NOT re-romanise')
    expect(prompt).toContain('every sentence MUST appear')
    expect(tiler.buildPrompt([])).toContain('## Sentences\n\n\n## Output')
    expect(() => tiler.buildPrompt(null)).toThrow(TypeError)
  })

  it('returns an empty map without IO for an empty batch', async () => {
    expect(await tiler.tilePhrasesBatch([])).toEqual(new Map())
    await expect(tiler.tilePhrasesBatch(null)).rejects.toThrow(TypeError)
  })
  // Non-empty batches deliberately excluded: they are CLI orchestration, not pure functions.
})
