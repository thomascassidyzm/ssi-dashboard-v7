/**
 * The chunk floor — the smallest piece a recordist is asked to pause around.
 *
 * Kai, 2026-08-19, after Sascha's first Austrian German session: "the Austrian
 * german has some VERY tiny chunks. that made the recording sound unnatural."
 * There was no minimum chunk length anywhere: the only merge step absorbed
 * non-LEGO glue, so two adjacent one-word LEGOs stayed two one-word chunks.
 *
 * The examples below are REAL lines from deu_at_for_eng, tiled as the live
 * optimiser tiles them.
 */
import { describe, it, expect } from 'vitest'
const {
  mergeShortChunks, isShortChunk, SHORT_CHUNK_CHARS, MAX_MERGED_CHUNK_WORDS,
} = require('./chunking.cjs')

const chunks = (...texts) => texts.map(text => ({ text, legoId: null, isLego: true }))
const texts = (cs) => cs.map(c => c.text)

describe('what counts as too small', () => {
  it('calls a short single word too small', () => {
    for (const w of ['i', 'des', 'wos', 'ned', 'wia']) expect(isShortChunk(w)).toBe(true)
  })

  it('leaves longer words alone — they are content, not glue', () => {
    for (const w of ['iatz', 'Zeit', 'Deitsch', 'sogn']) expect(isShortChunk(w)).toBe(false)
  })

  it('never calls a multi-word chunk too small, however short its words', () => {
    expect(isShortChunk('i wü')).toBe(false)
  })

  it('measures spoken weight, not punctuation', () => {
    expect(isShortChunk('wos,')).toBe(true)
    expect(SHORT_CHUNK_CHARS).toBe(3)
  })
})

describe('absorbing the fragments', () => {
  it('folds a short word into the chunk before it', () => {
    // "i wü | iatz | wos | auf Deitsch | sogn" — the line Sascha read straight
    // through with no pauses at all, which align then refused.
    const out = mergeShortChunks(chunks('i wü', 'iatz', 'wos', 'auf Deitsch', 'sogn'))
    expect(texts(out)).toEqual(['i wü', 'iatz wos', 'auf Deitsch', 'sogn'])
  })

  it('folds a leading fragment forwards — there is nothing to its left', () => {
    expect(texts(mergeShortChunks(chunks('i', 'versuch', 'zum lernen')))).toEqual(['i versuch', 'zum lernen'])
  })

  it('keeps going until nothing short is left', () => {
    // Absorbing one fragment can leave its neighbour still short.
    const out = mergeShortChunks(chunks('i', 'wü', 'mit', 'dir lernen'))
    expect(out.every(c => !isShortChunk(c.text))).toBe(true)
  })

  it('refuses a merge that would build an unreadably long chunk', () => {
    // The ceiling is why two ≤3-char fragments survive across the whole course
    // rather than none: a nine-word chunk is a worse read than the fragment.
    const long = 'one two three four five six'
    const out = mergeShortChunks(chunks(long, 'des'))
    expect(texts(out)).toEqual([long, 'des'])
    expect(MAX_MERGED_CHUNK_WORDS).toBe(6)
  })

  it('merges up to the ceiling but not past it', () => {
    expect(texts(mergeShortChunks(chunks('one two three four five', 'des')))).toEqual(['one two three four five des'])
  })

  it('leaves a line that has no fragments completely untouched', () => {
    const clean = chunks('auf Deitsch', 'sogn', 'mit da Gruppn')
    expect(texts(mergeShortChunks(clean))).toEqual(texts(clean))
  })

  it('never drops or reorders a single word of the line', () => {
    const before = chunks('i', 'wü', 'iatz', 'wos', 'auf Deitsch', 'sogn')
    const after = mergeShortChunks(before)
    expect(texts(after).join(' ')).toBe(texts(before).join(' '))
  })

  it('never returns more chunks than it was given', () => {
    const before = chunks('i', 'wü', 'iatz', 'wos', 'auf Deitsch', 'sogn')
    expect(mergeShortChunks(before).length).toBeLessThanOrEqual(before.length)
  })

  it('leaves a single chunk, or nothing, exactly as it is', () => {
    expect(texts(mergeShortChunks(chunks('des')))).toEqual(['des'])
    expect(mergeShortChunks([])).toEqual([])
  })

  it('keeps a lego id and any glue the merged pieces carried', () => {
    const out = mergeShortChunks([
      { text: 'iatz', legoId: 'L1', isLego: true, mergedGlue: ['a'] },
      { text: 'wos', legoId: 'L2', isLego: true, mergedGlue: ['b'] },
    ])
    expect(out[0].legoId).toBe('L1')
    expect(out[0].mergedGlue).toEqual(['a', 'b'])
  })
})
