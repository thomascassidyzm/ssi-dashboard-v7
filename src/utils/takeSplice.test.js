import { describe, it, expect } from 'vitest'
import {
  SPLICE_CONFIG,
  detectVoicedRegions,
  alignSlowGap,
  sliceChunk,
  concatChunks,
  peakNormalise,
} from './takeSplice.js'

const SR = 16000

/**
 * Build a synthetic slow read: alternating tone bursts and silence, with a
 * little room tone underneath so the noise-floor guard is exercised rather
 * than dodged by a mathematically perfect zero.
 */
function synth(segments, { noise = 0.0005, sampleRate = SR } = {}) {
  const total = segments.reduce((n, s) => n + Math.round((s.ms / 1000) * sampleRate), 0)
  const x = new Float32Array(total)
  let o = 0
  let phase = 0
  for (const s of segments) {
    const n = Math.round((s.ms / 1000) * sampleRate)
    for (let i = 0; i < n; i++) {
      // deterministic pseudo-noise — no Math.random, so failures reproduce
      const hiss = (((o + i) * 2654435761) % 2001) / 1000 - 1
      const amp = s.voiced ? 0.4 : 0
      phase += (2 * Math.PI * 220) / sampleRate
      x[o + i] = amp * Math.sin(phase) + hiss * noise
    }
    o += n
  }
  return x
}

describe('detectVoicedRegions', () => {
  it('finds one region per burst when gaps clear the 150 ms minimum', () => {
    const x = synth([
      { ms: 300, voiced: false },
      { ms: 500, voiced: true },
      { ms: 400, voiced: false },
      { ms: 600, voiced: true },
      { ms: 400, voiced: false },
      { ms: 450, voiced: true },
      { ms: 300, voiced: false },
    ])
    const { regions } = detectVoicedRegions(x, SR)
    expect(regions).toHaveLength(3)
    // first burst starts ~300 ms in; allow a frame of slop either way
    expect(regions[0].startMs).toBeGreaterThan(250)
    expect(regions[0].startMs).toBeLessThan(350)
    expect(regions[0].endMs - regions[0].startMs).toBeGreaterThan(400)
  })

  it('merges across a gap shorter than SILENCE_MIN_MS — the rushed slow read', () => {
    const x = synth([
      { ms: 200, voiced: false },
      { ms: 400, voiced: true },
      { ms: 80, voiced: false },   // under 150 ms: not a boundary
      { ms: 400, voiced: true },
      { ms: 200, voiced: false },
    ])
    const { regions } = detectVoicedRegions(x, SR)
    expect(regions).toHaveLength(1)
  })

  // Note the size: the 25 ms analysis window smears a burst by roughly its own
  // length, so a burst has to be well under MIN_VOICED_MS to be discarded — a
  // 30 ms one measures ~65 ms and survives. A real mouth click or chair creak
  // is a few milliseconds, so this is the honest threshold, not 60 ms exactly.
  it('discards a voiced blip shorter than MIN_VOICED_MS', () => {
    const x = synth([
      { ms: 200, voiced: false },
      { ms: 10, voiced: true },    // a click, not a chunk
      { ms: 300, voiced: false },
      { ms: 400, voiced: true },
      { ms: 200, voiced: false },
    ])
    const { regions } = detectVoicedRegions(x, SR)
    expect(regions).toHaveLength(1)
    expect(regions[0].endMs - regions[0].startMs).toBeGreaterThan(300)
  })

  it('flags a noisy room instead of collapsing the take into one chunk', () => {
    const loud = synth(
      [
        { ms: 200, voiced: false },
        { ms: 400, voiced: true },
        { ms: 300, voiced: false },
        { ms: 400, voiced: true },
        { ms: 200, voiced: false },
      ],
      { noise: 0.05 }   // room tone well above -35 dB of peak
    )
    const det = detectVoicedRegions(loud, SR)
    expect(det.noisy).toBe(true)
    // and the guard keeps the split working rather than finding one blob
    expect(det.regions.length).toBe(2)
  })
})

describe('alignSlowGap', () => {
  const threeBursts = synth([
    { ms: 250, voiced: false },
    { ms: 450, voiced: true },
    { ms: 350, voiced: false },
    { ms: 450, voiced: true },
    { ms: 350, voiced: false },
    { ms: 450, voiced: true },
    { ms: 250, voiced: false },
  ])

  it('labels each region with its chunk when the counts agree', () => {
    const r = alignSlowGap(threeBursts, SR, ['I want to', 'learn', 'a little more'])
    expect(r.ok).toBe(true)
    expect(r.chunks.map((c) => c.text)).toEqual(['I want to', 'learn', 'a little more'])
    expect(r.chunks.every((c) => c.durationMs > 0)).toBe(true)
    expect(r.chunks[0].endMs).toBeLessThanOrEqual(r.chunks[1].startMs)
  })

  it('REFUSES on a count mismatch rather than redistributing boundaries', () => {
    const r = alignSlowGap(threeBursts, SR, ['a', 'b', 'c', 'd'])
    expect(r.ok).toBe(false)
    expect(r.expectedCount).toBe(4)
    expect(r.detectedCount).toBe(3)
    expect(r.chunks).toBeUndefined()
  })
})

describe('sliceChunk / concatChunks', () => {
  const x = synth([
    { ms: 200, voiced: false },
    { ms: 400, voiced: true },
    { ms: 300, voiced: false },
    { ms: 400, voiced: true },
    { ms: 200, voiced: false },
  ])

  it('slices with PAD_MS of padding on each side', () => {
    const piece = sliceChunk(x, SR, 200, 600)
    const expected = Math.round(((400 + 2 * SPLICE_CONFIG.PAD_MS) / 1000) * SR)
    expect(piece.length).toBe(expected)
  })

  it('clamps the padding at the edges of the take', () => {
    const piece = sliceChunk(x, SR, 0, 100)
    expect(piece.length).toBe(Math.round(((100 + SPLICE_CONFIG.PAD_MS) / 1000) * SR))
  })

  it('joins pieces end to end, and honours a gap', () => {
    const a = sliceChunk(x, SR, 200, 600, 0)
    const b = sliceChunk(x, SR, 900, 1300, 0)
    const joined = concatChunks([a, b], SR, { gapMs: 0 })
    expect(joined.length).toBe(a.length + b.length)

    const spaced = concatChunks([a, b], SR, { gapMs: 100 })
    expect(spaced.length).toBe(a.length + b.length + Math.round(0.1 * SR))
  })

  it('levels each piece so a quiet piece does not disappear next to a loud one', () => {
    const loud = new Float32Array(SR / 2).fill(0.8)
    const quiet = new Float32Array(SR / 2).fill(0.02)
    const joined = concatChunks([loud, quiet], SR, { gapMs: 0, fadeMs: 0 })
    const mid = joined[Math.floor(joined.length * 0.75)]
    expect(Math.abs(mid)).toBeGreaterThan(0.9)
  })

  it('does not mutate the caller’s buffers', () => {
    const src = new Float32Array(SR / 2).fill(0.5)
    const before = src[0]
    concatChunks([src], SR, { fadeMs: 10 })
    expect(src[0]).toBe(before)
  })

  it('peakNormalise leaves a silent buffer alone', () => {
    const silent = new Float32Array(100)
    expect(peakNormalise(silent)).toBe(silent)
  })
})
