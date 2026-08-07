// The chunk map the autocue draws gap markers from is the same one the recorder
// sizes its silence tolerance from. These pin the contract between them — above
// all that an UNKNOWN chunk map counts as 1, never as a word count.

import { describe, it, expect } from 'vitest'
import { resolvePhraseChunks, legoChunkCount } from './phraseChunks'

describe('resolvePhraseChunks', () => {
  it('prefers recordingChunks, which carry absorbed glue', () => {
    const r = resolvePhraseChunks({
      recordingChunks: [
        { text: 'dw i eisiau', mergedGlue: ['i'], legoId: 'L1' },
        { text: 'siarad', mergedGlue: null, legoId: 'L2' }
      ],
      chunksString: 'ignored|entirely',
      text: 'ignored entirely'
    })
    expect(r.source).toBe('recordingChunks')
    expect(r.chunks.map(c => c.text)).toEqual(['dw i eisiau', 'siarad'])
    expect(r.chunks[0].mergedGlue).toEqual(['i'])
  })

  it('falls back to chunks, then chunksString', () => {
    expect(resolvePhraseChunks({ chunks: ['a', 'b'], chunksString: 'x|y' }).source).toBe('chunks')

    const r = resolvePhraseChunks({ chunksString: 'dw i eisiau | siarad | Cymraeg' })
    expect(r.source).toBe('chunksString')
    // Whitespace around the pipes is the generator's formatting, not content.
    expect(r.chunks.map(c => c.text)).toEqual(['dw i eisiau', 'siarad', 'Cymraeg'])
  })

  it('ignores an empty or single-pipe-only chunksString rather than inventing chunks', () => {
    expect(resolvePhraseChunks({ chunksString: '', text: 'one two' }).source).toBe('words')
    expect(resolvePhraseChunks({ chunksString: '||', text: 'one two' }).source).toBe('words')
  })

  it('word-splits only as a last resort, and says so', () => {
    const r = resolvePhraseChunks({ text: 'dw i eisiau siarad' })
    expect(r.source).toBe('words')
    expect(r.chunks).toHaveLength(4)
  })

  it('survives a missing phrase', () => {
    expect(resolvePhraseChunks(null).chunks).toEqual([])
    expect(resolvePhraseChunks({}).chunks).toEqual([])
  })
})

describe('legoChunkCount', () => {
  it('counts real LEGO chunk maps', () => {
    expect(legoChunkCount({ chunksString: 'a|b|c' })).toBe(3)
    expect(legoChunkCount({ recordingChunks: [{ text: 'a' }, { text: 'b' }] })).toBe(2)
  })

  it('returns 1 when the chunk map is unknown, NOT the word count', () => {
    // This is the load-bearing case. A phrase with no chunk map draws no gap
    // markers, so nobody is being asked to pause in it. Treating its nine words
    // as nine chunks would make the recorder wait out the long silence at the
    // end of every ordinary phrase.
    expect(legoChunkCount({ text: 'one two three four five six seven eight nine' })).toBe(1)
    expect(legoChunkCount({})).toBe(1)
    expect(legoChunkCount(null)).toBe(1)
  })
})
