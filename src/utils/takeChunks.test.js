/**
 * The cut maths for chunk-level review playback.
 *
 * A slow-pass take is one recording of a whole phrase with a deliberate pause
 * at each LEGO boundary. These tests pin what the pauses turn INTO: the ranges
 * the review screen plays, and — just as important — when it refuses to name
 * them.
 */
import { describe, it, expect } from 'vitest'
import { chunkRangesFromGaps, buildTakeChunks } from './takeChunks'

// A clean 3-chunk slow read: speech, pause, speech, pause, speech, then the
// final silence the VAD cut the take on (open — speech never resumed).
const THREE_CHUNK_GAPS = [
  { startMs: 900, endMs: 1600 },
  { startMs: 2400, endMs: 3100 },
  { startMs: 3900, endMs: null }
]
const THREE_CHUNK_TAKE_MS = 4700

describe('chunkRangesFromGaps', () => {
  it('cuts a three-chunk take into three ranges that skip the pauses', () => {
    const ranges = chunkRangesFromGaps(THREE_CHUNK_GAPS, THREE_CHUNK_TAKE_MS, { paddingMs: 0 })
    expect(ranges.map(r => [r.startMs, r.endMs])).toEqual([
      [0, 900],
      [1600, 2400],
      [3100, 3900]
    ])
  })

  it('ends the last chunk where speech stopped, not where the take stopped', () => {
    // The take runs on for the whole silenceDuration after the last word. A
    // chunk that included it would play the pause the recordist is judging.
    const ranges = chunkRangesFromGaps(THREE_CHUNK_GAPS, THREE_CHUNK_TAKE_MS, { paddingMs: 0 })
    expect(ranges[ranges.length - 1].endMs).toBe(3900)
    expect(THREE_CHUNK_TAKE_MS - 3900).toBe(800)
  })

  it('pads each cut outwards without running past the take', () => {
    const ranges = chunkRangesFromGaps(THREE_CHUNK_GAPS, THREE_CHUNK_TAKE_MS, { paddingMs: 40 })
    expect(ranges[0].startMs).toBe(0)        // clamped, never negative
    expect(ranges[0].endMs).toBe(940)
    expect(ranges[1].startMs).toBe(1560)
  })

  it('gives a phrase read straight through a single range covering the speech', () => {
    const ranges = chunkRangesFromGaps([{ startMs: 1500, endMs: null }], 2300, { paddingMs: 0 })
    expect(ranges).toHaveLength(1)
    expect(ranges[0]).toMatchObject({ startMs: 0, endMs: 1500 })
  })

  it('handles a take the VAD reported no pauses at all in', () => {
    expect(chunkRangesFromGaps([], 2000, { paddingMs: 0 })).toEqual([
      { index: 0, startMs: 0, endMs: 2000, durationMs: 2000 }
    ])
  })

  it('drops a sliver too short to be a piece anyone can judge', () => {
    // A click between two pauses is not a LEGO.
    const gaps = [
      { startMs: 900, endMs: 1600 },
      { startMs: 1650, endMs: 2300 },
      { startMs: 3100, endMs: null }
    ]
    const ranges = chunkRangesFromGaps(gaps, 3900, { paddingMs: 0 })
    expect(ranges.map(r => r.durationMs)).toEqual([900, 800])
  })

  it('refuses to invent ranges from nonsense', () => {
    expect(chunkRangesFromGaps(null, 0)).toEqual([])
    expect(chunkRangesFromGaps([{ startMs: NaN, endMs: 5 }], 1000, { paddingMs: 0 }))
      .toEqual([{ index: 0, startMs: 0, endMs: 1000, durationMs: 1000 }])
  })

  it('ignores a gap that ends after the take, rather than cutting past the audio', () => {
    const ranges = chunkRangesFromGaps([{ startMs: 500, endMs: 9999 }], 1200, { paddingMs: 0 })
    expect(ranges).toEqual([{ index: 0, startMs: 0, endMs: 500, durationMs: 500 }])
  })
})

describe('buildTakeChunks', () => {
  it('names each piece with its own LEGO text when the counts agree', () => {
    const built = buildTakeChunks({
      gaps: THREE_CHUNK_GAPS,
      durationMs: THREE_CHUNK_TAKE_MS,
      chunkTexts: ['dw i', 'eisiau', 'siarad']
    })
    expect(built.matchesScript).toBe(true)
    expect(built.chunks.map(c => c.label)).toEqual(['dw i', 'eisiau', 'siarad'])
  })

  it('withholds the names when the take was not cut the way the script says', () => {
    // A missed pause welds two LEGOs into one piece. Pairing 2 pieces against
    // the first 2 of 3 texts would answer the very question the control exists
    // to ask, and answer it wrongly.
    const built = buildTakeChunks({
      gaps: [{ startMs: 900, endMs: 1600 }, { startMs: 3200, endMs: null }],
      durationMs: 4000,
      chunkTexts: ['dw i', 'eisiau', 'siarad']
    })
    expect(built.matchesScript).toBe(false)
    expect(built.detected).toBe(2)
    expect(built.expected).toBe(3)
    expect(built.chunks.map(c => c.label)).toEqual(['Piece 1', 'Piece 2'])
    expect(built.chunks.every(c => c.text === null)).toBe(true)
  })

  it('numbers the pieces when the script carries no chunk map at all', () => {
    const built = buildTakeChunks({ gaps: THREE_CHUNK_GAPS, durationMs: THREE_CHUNK_TAKE_MS })
    expect(built.expected).toBe(0)
    expect(built.matchesScript).toBe(false)
    expect(built.chunks).toHaveLength(3)
  })
})
