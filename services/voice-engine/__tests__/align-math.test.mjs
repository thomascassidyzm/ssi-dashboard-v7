import { describe, it, expect } from 'vitest'
import alignMod from '../align.cjs'

const {
  parseSilenceOutput,
  invertSilenceSpans,
  mapVoicedToChunks,
  transferBoundaries,
} = alignMod

describe('parseSilenceOutput', () => {
  it('extracts silence spans from ffmpeg silencedetect stderr', () => {
    const text = [
      '[silencedetect @ 0x0] silence_start: 0.52',
      '[silencedetect @ 0x0] silence_end: 0.81 | silence_duration: 0.29',
      '[silencedetect @ 0x0] silence_start: 1.4',
      '[silencedetect @ 0x0] silence_end: 1.72 | silence_duration: 0.32',
    ].join('\n')
    expect(parseSilenceOutput(text)).toEqual([
      { startMs: 520, endMs: 810 },
      { startMs: 1400, endMs: 1720 },
    ])
  })

  it('clamps negative silence_start to 0 and ignores dangling ends', () => {
    const text = 'silence_start: -0.01\nsilence_end: 0.2\nsilence_end: 5.0'
    expect(parseSilenceOutput(text)).toEqual([{ startMs: 0, endMs: 200 }])
  })
})

describe('invertSilenceSpans', () => {
  it('inverts silences into voiced regions over the full duration', () => {
    const voiced = invertSilenceSpans(3000, [
      { startMs: 500, endMs: 800 },
      { startMs: 1500, endMs: 1700 },
    ])
    expect(voiced).toEqual([
      { startMs: 0, endMs: 500 },
      { startMs: 800, endMs: 1500 },
      { startMs: 1700, endMs: 3000 },
    ])
  })

  it('drops voiced blips shorter than minVoicedMs (clicks, breaths)', () => {
    const voiced = invertSilenceSpans(1000, [
      { startMs: 0, endMs: 400 },
      { startMs: 430, endMs: 900 }, // 30ms blip between silences
    ], 60)
    expect(voiced).toEqual([{ startMs: 900, endMs: 1000 }])
  })

  it('handles leading and trailing silence', () => {
    const voiced = invertSilenceSpans(2000, [
      { startMs: 0, endMs: 300 },
      { startMs: 1800, endMs: 2000 },
    ])
    expect(voiced).toEqual([{ startMs: 300, endMs: 1800 }])
  })

  it('tolerates overlapping/out-of-order cursor advances', () => {
    const voiced = invertSilenceSpans(1000, [
      { startMs: 100, endMs: 500 },
      { startMs: 400, endMs: 450 }, // contained in previous
    ])
    expect(voiced).toEqual([
      { startMs: 0, endMs: 100 },
      { startMs: 500, endMs: 1000 },
    ])
  })
})

describe('mapVoicedToChunks — the QA gate', () => {
  const regions = [
    { startMs: 0, endMs: 400 },
    { startMs: 600, endMs: 1100 },
    { startMs: 1300, endMs: 2000 },
  ]

  it('maps 1:1 when counts match (Cyrillic text fine — identity is data, not filename)', () => {
    const r = mapVoicedToChunks(regions, ['јас сакам', 'да зборувам', 'македонски'])
    expect(r.ok).toBe(true)
    expect(r.chunks.map(c => c.text)).toEqual(['јас сакам', 'да зборувам', 'македонски'])
    expect(r.chunks[1]).toMatchObject({ startMs: 600, endMs: 1100, durationMs: 500 })
  })

  it('REFUSES on chunk-count mismatch — never guesses', () => {
    const r = mapVoicedToChunks(regions, ['a', 'b'])
    expect(r.ok).toBe(false)
    expect(r.expectedCount).toBe(2)
    expect(r.detectedCount).toBe(3)
    expect(r.reason).toMatch(/mismatch/)
  })
})

describe('transferBoundaries — slow alignment → natural take (proportional)', () => {
  it('maps cumulative voiced-duration fractions onto the natural voiced span', () => {
    // Slow chunks: 400ms, 400ms, 200ms voiced (gaps irrelevant) = 1000ms total.
    const slowChunks = [
      { text: 'a', startMs: 0, endMs: 400 },
      { text: 'b', startMs: 700, endMs: 1100 },
      { text: 'c', startMs: 1500, endMs: 1700 },
    ]
    // Natural voiced span: 100..600 (500ms).
    const out = transferBoundaries(slowChunks, 100, 600)
    expect(out.map(c => [c.startMs, c.endMs])).toEqual([
      [100, 300], // 0.0–0.4 of 500
      [300, 500], // 0.4–0.8
      [500, 600], // 0.8–1.0
    ])
    expect(out.every(c => c.method === 'transferred')).toBe(true)
    expect(out[0].durationMs).toBe(200)
  })

  it('boundaries are contiguous and cover the whole span exactly', () => {
    const slowChunks = [
      { text: 'x', startMs: 0, endMs: 333 },
      { text: 'y', startMs: 500, endMs: 944 },
    ]
    const out = transferBoundaries(slowChunks, 250, 1250)
    expect(out[0].startMs).toBe(250)
    expect(out[out.length - 1].endMs).toBe(1250)
    for (let i = 1; i < out.length; i++) {
      expect(out[i].startMs).toBe(out[i - 1].endMs)
    }
  })

  it('throws on empty inputs rather than guessing', () => {
    expect(() => transferBoundaries([], 0, 100)).toThrow()
    expect(() => transferBoundaries([{ text: 'a', startMs: 0, endMs: 100 }], 100, 100)).toThrow()
  })
})
