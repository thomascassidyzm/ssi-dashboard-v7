import { describe, it, expect } from 'vitest'
import ladder from '../ladder.cjs'
import partition from '../partition.cjs'
import alignMod from '../../../../services/voice-engine/align.cjs'
import SEEDS from '../health-seeds.json'

const { planLadder, takesFor, boothLoad, RUNG_FULL } = ladder
const { classifySplit, CLASS_BLOCKED, CLASS_CONNECTIVES, CLASS_EXACT } = partition
const { mapVoicedToChunks } = alignMod

describe('the LEAN ladder never needs the splicer', () => {
  it('every rung of every cuttable seed is a contiguous, forward span of that seed', () => {
    for (const seed of SEEDS) {
      for (const rung of planLadder(seed)) {
        expect(rung.to, `${seed.code} rung ${rung.rung}`).toBeGreaterThanOrEqual(rung.from)
        expect(rung.to, `${seed.code} rung ${rung.rung}`).toBeLessThan(seed.chunks.length)
        expect(rung.from, `${seed.code} rung ${rung.rung}`).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('the full-sentence rung is the natural take whole, never a cut', () => {
    for (const seed of SEEDS) {
      const full = planLadder(seed).filter((r) => r.kind === RUNG_FULL)
      expect(full, seed.code).toHaveLength(1)
      expect(full[0].source, seed.code).toBe('natural-whole')
      expect(full[0].from, seed.code).toBe(0)
      expect(full[0].to, seed.code).toBe(seed.chunks.length - 1)
    }
  })

  it('a seed with n chunks has 2n-1 rungs, and a single-chunk seed has one', () => {
    for (const seed of SEEDS) {
      const n = seed.chunks.length
      expect(planLadder(seed).length, seed.code).toBe(n === 1 ? 1 : 2 * n - 1)
    }
  })
})

describe('the recording unit', () => {
  it('is two takes per voice, and one for a seed with no joints', () => {
    for (const seed of SEEDS) {
      expect(takesFor(seed).length, seed.code).toBe(seed.chunks.length <= 1 ? 1 : 2)
    }
  })

  it('costs 112 takes per voice against 337 LEAN lines read whole', () => {
    const load = boothLoad(SEEDS)
    expect(load.seeds).toBe(57)
    expect(load.takesPerVoice).toBe(112)
    expect(load.takesBothVoices).toBe(224)
    // 337, not job #991's 339: #991 emits both the chunk-alone rung and the
    // full-sentence rung for HG12 and HG13, which have one chunk each and so
    // are the same line twice. The other 55 seeds agree exactly.
    expect(load.ladderLinesPerVoice).toBe(337)
  })
})

describe('classifySplit scans at word level, not string level', () => {
  it('calls a MERGED chunk cuttable when the sentence keeps a connective inside it', () => {
    // HG02's chunk 3 is #991's merge of two mapping rows that the sentence
    // separates with `ac`, so the chunk STRING appears nowhere in the sentence.
    // A string-level scan calls that blocked and throws a recordable seed away;
    // as a span of audio it is perfectly cuttable, short only by one connective.
    const hg02 = SEEDS.find((s) => s.code === 'HG02')
    const result = classifySplit(hg02)
    expect(result.class).toBe(CLASS_CONNECTIVES)
    expect(result.dropped).toContain('ac')
  })

  it('blocks the four splits that have no span to cut, each for its own reason', () => {
    const reasons = Object.fromEntries(
      SEEDS.filter((s) => classifySplit(s).class === CLASS_BLOCKED)
        .map((s) => [s.code, classifySplit(s).reason]))
    expect(Object.keys(reasons).sort()).toEqual(['HG05', 'HG16', 'HG19', 'HG46'])
    expect(reasons.HG19).toMatch(/discontinuous/)
    expect(reasons.HG16).toMatch(/scaffold/)
    expect(reasons.HG46).toMatch(/alternation/)
    // HG05: the chunk's citation form is `gair`, the sentence has `air` — soft
    // mutation. The chunk-alone rung and the in-sentence rung are different audio.
    expect(reasons.HG05).toMatch(/"gair"/)
  })

  it('agrees with the staged batches: blocked seeds are batch 0 and nothing else is', () => {
    for (const seed of SEEDS) {
      const isBlocked = classifySplit(seed).class === CLASS_BLOCKED
      expect(seed.batch === 0, seed.code).toBe(isBlocked)
    }
    expect(SEEDS.filter((s) => s.batch === 1)).toHaveLength(5)
    expect(SEEDS.filter((s) => classifySplit(s).class === CLASS_EXACT)).toHaveLength(30)
    expect(SEEDS.filter((s) => classifySplit(s).class === CLASS_CONNECTIVES)).toHaveLength(23)
  })
})

describe('the chunk-count gate the assembler relies on', () => {
  const seed = SEEDS.find((s) => s.code === 'HG32')   // four chunks
  const expected = seed.chunks.map((c) => c.target)

  it('maps 1:1 when the gapped read has exactly as many voiced regions as chunks', () => {
    const voiced = [
      { startMs: 0, endMs: 900 }, { startMs: 1300, endMs: 2200 },
      { startMs: 2700, endMs: 3600 }, { startMs: 4100, endMs: 5000 },
    ]
    const res = mapVoicedToChunks(voiced, expected)
    expect(res.ok).toBe(true)
    expect(res.chunks.map((c) => c.text)).toEqual(expected)
  })

  it('FAILS LOUDLY rather than guessing when the reader runs two chunks together', () => {
    const voiced = [
      { startMs: 0, endMs: 900 }, { startMs: 1300, endMs: 3600 }, { startMs: 4100, endMs: 5000 },
    ]
    const res = mapVoicedToChunks(voiced, expected)
    expect(res.ok).toBe(false)
    expect(res.expectedCount).toBe(4)
    expect(res.detectedCount).toBe(3)
  })
})
