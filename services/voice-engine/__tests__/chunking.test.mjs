import { describe, it, expect } from 'vitest'
import chunking from '../chunking.cjs'

const {
  parseChunks,
  chunkPhraseByLegos,
  mergeGlueIntoLegos,
  recordingChunksForPhrase,
  buildUniverse,
  normalizeForMatching,
} = chunking

const universe = buildUniverse([
  { lego_id: 'S0001L01', target_text: 'je veux', type: 'M', seed_number: 1, lego_index: 1 },
  { lego_id: 'S0001L02', target_text: 'parler', type: 'A', seed_number: 1, lego_index: 2 },
  { lego_id: 'S0002L01', target_text: 'macédonien', type: 'A', seed_number: 2, lego_index: 1 },
])

describe('parseChunks (chunksString contract)', () => {
  it('splits the pipe-delimited pause map', () => {
    expect(parseChunks('je veux|parler|macédonien')).toEqual(['je veux', 'parler', 'macédonien'])
  })
  it('strips edge punctuation but keeps internal spaces', () => {
    expect(parseChunks('¿quiero hablar?|"bien"')).toEqual(['quiero hablar', 'bien'])
  })
  it('falls back to whitespace split without a delimiter', () => {
    expect(parseChunks('сакам да зборувам')).toEqual(['сакам', 'да', 'зборувам'])
  })
})

describe('chunkPhraseByLegos (max-munch, planner parity)', () => {
  it('prefers the longest LEGO at each position', () => {
    const chunks = chunkPhraseByLegos('Je veux parler macédonien', universe)
    expect(chunks.map(c => c.text)).toEqual(['Je veux', 'parler', 'macédonien'])
    expect(chunks.map(c => c.isLego)).toEqual([true, true, true])
    expect(chunks[0].legoId).toBe('S0001L01')
  })

  it('marks uncovered words as glue', () => {
    const chunks = chunkPhraseByLegos('je veux bien parler', universe)
    expect(chunks.map(c => [c.text, c.isLego])).toEqual([
      ['je veux', true], ['bien', false], ['parler', true],
    ])
  })

  it('matches accent-insensitively but preserves original text', () => {
    const chunks = chunkPhraseByLegos('Macédonien', universe)
    expect(chunks[0]).toMatchObject({ text: 'Macédonien', isLego: true })
  })

  it('handles Cyrillic universes (Macedonian) — no Latin assumptions', () => {
    const mk = buildUniverse([
      { lego_id: 'S0001L01', target_text: 'јас сакам', type: 'M' },
      { lego_id: 'S0001L02', target_text: 'да зборувам', type: 'M' },
    ])
    const chunks = chunkPhraseByLegos('јас сакам да зборувам', mk)
    expect(chunks.map(c => c.text)).toEqual(['јас сакам', 'да зборувам'])
    expect(chunks.every(c => c.isLego)).toBe(true)
  })
})

describe('mergeGlueIntoLegos', () => {
  it('absorbs glue into the previous LEGO (left-attach)', () => {
    const merged = recordingChunksForPhrase('je veux bien parler', universe)
    expect(merged.map(c => c.text)).toEqual(['je veux bien', 'parler'])
    expect(merged[0].mergedGlue).toEqual(['bien'])
    expect(merged[0].legoId).toBe('S0001L01') // LEGO identity preserved
  })

  it('attaches leading glue to the next LEGO', () => {
    const merged = recordingChunksForPhrase('et je veux parler', universe)
    expect(merged.map(c => c.text)).toEqual(['et je veux', 'parler'])
    expect(merged[0].mergedGlue).toEqual(['et'])
  })

  it('returns all-glue phrases unchanged (nothing to merge into)', () => {
    const merged = mergeGlueIntoLegos([
      { text: 'foo', isLego: false }, { text: 'bar', isLego: false },
    ])
    expect(merged.map(c => c.text)).toEqual(['foo', 'bar'])
  })
})

describe('normalizeForMatching', () => {
  it('keeps Cyrillic intact (only combining accents stripped)', () => {
    expect(normalizeForMatching('Јас Сакам!')).toBe('јас сакам')
  })
})
