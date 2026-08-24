/**
 * Unit tests for the per-voice loudness audit (Tom's 2026-08-24 commission:
 * "Enzo is quite a LOT quieter than Ara and also the known language voices").
 *
 * What is worth testing here is NOT ffmpeg — the ebur128 parse is already tested
 * where it lives, in services/audio-intelligence/tiers/loudness.cjs, and this tool
 * deliberately reuses it rather than owning a second copy. What is worth testing is
 * the ARITHMETIC OF THE ANSWER: the voice grouping (which is where a real voice can
 * be split in half by a provider prefix and produce two fake populations), the
 * median-based gap, and the refusal to let an unmeasurable clip look like a passing
 * one.
 */

import { describe, it, expect } from 'vitest'

const {
  canonicalVoice, voiceEra, buildAudioRef, median, stdev,
  aggregateByVoice, pairwiseGaps, headline, mapLimit,
} = require('./measure-loudness-by-voice.cjs')

const clip = (voiceId, lufs, extra = {}) => ({
  voiceId, lufs, measured: lufs !== null, truePeakDbtp: -1.5, lra: 4, durationMs: 2000, ...extra,
})

describe('canonicalVoice', () => {
  it('folds the provider prefix away — one speaker, one id', () => {
    expect(canonicalVoice('xai_ara')).toBe('ara')
    expect(canonicalVoice('ara')).toBe('ara')
    expect(canonicalVoice('AZURE_it-IT-DiegoNeural')).toBe('it-it-diegoneural')
  })

  it('leaves an unprefixed id alone and survives null', () => {
    expect(canonicalVoice('x7avnu1k')).toBe('x7avnu1k')
    expect(canonicalVoice(null)).toBe('')
  })
})

describe('voiceEra', () => {
  it('keeps the render era the prefix records, without splitting the voice', () => {
    expect(voiceEra('xai_ara')).toBe('xai')
    expect(voiceEra('ara')).toBe('bare')
  })
})

describe('buildAudioRef', () => {
  it('mirrors the learner rule: revision 1 or unknown stays bare', () => {
    expect(buildAudioRef('abc', 1)).toBe('abc')
    expect(buildAudioRef('abc', null)).toBe('abc')
    expect(buildAudioRef('abc', 2)).toBe('abc.v2')
  })
})

describe('median / stdev', () => {
  it('handles even and odd lengths, and refuses to invent a number', () => {
    expect(median([1, 2, 3])).toBe(2)
    expect(median([1, 2, 3, 4])).toBe(2.5)
    expect(median([])).toBeNull()
    expect(stdev([5])).toBeNull()
  })
})

describe('aggregateByVoice', () => {
  it('groups prefixed and unprefixed ids as ONE voice', () => {
    const rows = aggregateByVoice([
      clip('xai_ara', -15.0), clip('ara', -15.4), clip('xai_x7avnu1k', -20.0),
    ])
    expect(rows.map((r) => r.voice).sort()).toEqual(['ara', 'x7avnu1k'])
    const ara = rows.find((r) => r.voice === 'ara')
    expect(ara.n).toBe(2)
    expect(ara.eras.sort()).toEqual(['bare', 'xai'])
  })

  it('counts an unmeasurable clip as unmeasured and keeps it out of the stats', () => {
    const rows = aggregateByVoice([clip('ara', -15.0), clip('ara', null)])
    const ara = rows[0]
    expect(ara.n).toBe(2)
    expect(ara.measured).toBe(1)
    expect(ara.unmeasured).toBe(1)
    expect(ara.medianLufs).toBe(-15)
    // and it must never be counted as in-band
    expect(ara.outOfBand).toBe(0)
  })

  it('splits out-of-band into below and above rather than one lump', () => {
    // default band is -15.5 +/-1.5 => -17.0 .. -14.0
    const rows = aggregateByVoice([clip('v', -21), clip('v', -15.5), clip('v', -12)])
    expect(rows[0].belowBand).toBe(1)
    expect(rows[0].aboveBand).toBe(1)
    expect(rows[0].outOfBand).toBe(2)
  })

  it('sorts loudest first so the quiet voice is last', () => {
    const rows = aggregateByVoice([clip('quiet', -21), clip('loud', -15)])
    expect(rows.map((r) => r.voice)).toEqual(['loud', 'quiet'])
  })
})

describe('pairwiseGaps', () => {
  it('reports every pair, biggest absolute gap first, positive = a louder', () => {
    const rows = aggregateByVoice([
      clip('a', -15), clip('b', -16), clip('c', -21),
    ])
    const gaps = pairwiseGaps(rows)
    expect(gaps).toHaveLength(3)
    expect(gaps[0]).toEqual({ a: 'a', b: 'c', gapDb: 6 })
    expect(gaps.find((g) => g.a === 'a' && g.b === 'b').gapDb).toBe(1)
  })

  it('skips a voice with no usable measurement instead of emitting NaN', () => {
    const rows = aggregateByVoice([clip('a', -15), clip('ghost', null)])
    expect(pairwiseGaps(rows)).toEqual([])
  })
})

describe('headline', () => {
  it('states the gap in the direction Tom asked the question', () => {
    const rows = aggregateByVoice([clip('enzo', -21), clip('ara', -15.4), clip('eng', -15.6)])
    const s = headline(rows, 'xai_enzo', { enzo: 'Enzo', ara: 'Ara', eng: 'the English voice' })
    expect(s).toMatch(/^Enzo is /)
    expect(s).toContain('5.6 dB quieter than Ara')
    expect(s).toContain('5.4 dB quieter than the English voice')
  })

  it('says so plainly when the subject was never measured', () => {
    expect(headline([], 'enzo')).toBe('no measurement for enzo')
  })
})

describe('mapLimit', () => {
  it('preserves order and never exceeds the concurrency cap', async () => {
    let inFlight = 0
    let peak = 0
    const out = await mapLimit([1, 2, 3, 4, 5, 6, 7], 3, async (x) => {
      inFlight++; peak = Math.max(peak, inFlight)
      await new Promise((r) => setTimeout(r, 5))
      inFlight--
      return x * 2
    })
    expect(out).toEqual([2, 4, 6, 8, 10, 12, 14])
    expect(peak).toBeLessThanOrEqual(3)
  })
})
