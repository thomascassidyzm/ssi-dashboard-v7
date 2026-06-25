import { describe, it, expect } from 'vitest'
import { buildSplicePlan } from '../splicer.cjs'
import { buildUniverse, normalizeForMatching } from '../chunking.cjs'

// Macedonian-flavoured fixture (Cyrillic throughout — the persona course).
const universe = buildUniverse([
  { lego_id: 'S0001L01', target_text: 'јас сакам', type: 'M' },
  { lego_id: 'S0001L02', target_text: 'да зборувам', type: 'M' },
  { lego_id: 'S0002L01', target_text: 'македонски', type: 'A' },
  { lego_id: 'S0003L01', target_text: 'кафе', type: 'A' },
])

function seg(text, cadence, n) {
  return {
    id: `00000000-0000-4000-8000-00000000000${n}`,
    text,
    textKey: normalizeForMatching(text),
    cadence,
    s3Key: `segments/mkd_for_fra/human_marija_mkd/00000000-0000-4000-8000-00000000000${n}.mp3`,
  }
}

function makeIdx(entries) {
  const idx = new Map()
  for (const e of entries) idx.set(`${e.textKey}|${e.cadence}`, e)
  return idx
}

const fullIdx = makeIdx([
  seg('јас сакам', 'natural', 1),
  seg('да зборувам', 'natural', 2),
  seg('македонски', 'natural', 3),
])

describe('buildSplicePlan', () => {
  it('plans a phrase whose chunks all have natural segments', () => {
    const plan = buildSplicePlan({
      phrases: [{ id: 'p1', text: 'јас сакам да зборувам македонски' }],
      universe,
      segmentIdx: fullIdx,
    })
    expect(plan.items).toHaveLength(1)
    expect(plan.items[0].chunks.map(c => c.text)).toEqual(['јас сакам', 'да зборувам', 'македонски'])
    expect(plan.items[0].chunks.every(c => c.cadence === 'natural')).toBe(true)
    expect(plan.items[0].chunks.every(c => /[0-9a-f-]{36}\.mp3$/i.test(c.s3Key))).toBe(true)
  })

  it('PREFER-TAKE-OVER-SPLICE: a recorded whole-phrase natural take always wins', () => {
    const text = 'јас сакам да зборувам македонски'
    const plan = buildSplicePlan({
      phrases: [{ id: 'p1', text }],
      universe,
      segmentIdx: fullIdx,
      wholeTakeTexts: new Set(['јас сакам да зборувам македонски']),
    })
    expect(plan.items).toHaveLength(0)
    expect(plan.skipped.coveredByTake).toHaveLength(1)
    expect(plan.skipped.coveredByTake[0].text).toBe(text)
  })

  it('skips phrases already registered for this (course, role, voice)', () => {
    const plan = buildSplicePlan({
      phrases: [{ id: 'p1', text: 'јас сакам да зборувам македонски' }],
      universe,
      segmentIdx: fullIdx,
      existingAudioTexts: new Set(['јас сакам да зборувам македонски']),
    })
    expect(plan.items).toHaveLength(0)
    expect(plan.skipped.alreadyRegistered).toHaveLength(1)
  })

  it('missing chunks → gap report, NEVER a partial splice', () => {
    const plan = buildSplicePlan({
      phrases: [
        { id: 'p1', text: 'јас сакам кафе' },           // 'кафе' has no segment
        { id: 'p2', text: 'јас сакам да зборувам' },    // fully covered
        { id: 'p3', text: 'да зборувам кафе' },         // 'кафе' missing again
      ],
      universe,
      segmentIdx: fullIdx,
    })
    expect(plan.items.map(i => i.phraseId)).toEqual(['p2'])
    expect(plan.skipped.missingChunks).toHaveLength(2)
    expect(plan.gapReport[0]).toEqual({ chunkText: 'кафе', blockedPhrases: 2 })
  })

  it('cadence is per PHRASE: falls back to an all-slow splice when natural is incomplete', () => {
    const idx = makeIdx([
      seg('јас сакам', 'natural', 1),
      seg('јас сакам', 'slow', 6),
      seg('да зборувам', 'slow', 2), // no natural segment for this chunk
    ])
    const plan = buildSplicePlan({
      phrases: [{ id: 'p1', text: 'јас сакам да зборувам' }],
      universe,
      segmentIdx: idx,
    })
    expect(plan.items).toHaveLength(1)
    // One (voice_id, cadence) per phrase — never natural+slow mixed.
    expect(plan.items[0].chunks.map(c => c.cadence)).toEqual(['slow', 'slow'])
  })

  it('NEVER mixes cadences: phrase splicable only by mixing goes to the gap report', () => {
    const idx = makeIdx([
      seg('јас сакам', 'natural', 1), // natural only
      seg('да зборувам', 'slow', 2),  // slow only
    ])
    const plan = buildSplicePlan({
      phrases: [{ id: 'p1', text: 'јас сакам да зборувам' }],
      universe,
      segmentIdx: idx,
    })
    expect(plan.items).toHaveLength(0)
    expect(plan.skipped.missingChunks).toHaveLength(1)
    // Missing reported against the first-preference cadence (natural).
    expect(plan.skipped.missingChunks[0].missing).toEqual(['да зборувам'])
    expect(plan.gapReport[0]).toEqual({ chunkText: 'да зборувам', blockedPhrases: 1 })
  })

  it('dedupes candidates by normalized text and reports honest stats', () => {
    const plan = buildSplicePlan({
      phrases: [
        { id: 'p1', text: 'Јас сакам да зборувам' },
        { id: 'p2', text: 'јас сакам да зборувам' }, // case dupe
      ],
      universe,
      segmentIdx: fullIdx,
    })
    expect(plan.items).toHaveLength(1)
    expect(plan.stats).toMatchObject({ candidates: 1, planned: 1, missingChunks: 0 })
  })

  it('glue words ride their LEGO chunk (planner parity)', () => {
    const idx = makeIdx([
      seg('јас сакам и', 'natural', 4), // segment recorded WITH the merged glue
      seg('кафе', 'natural', 5),
    ])
    const plan = buildSplicePlan({
      phrases: [{ id: 'p1', text: 'јас сакам и кафе' }], // 'и' is glue → merges left
      universe,
      segmentIdx: idx,
    })
    expect(plan.items).toHaveLength(1)
    expect(plan.items[0].chunks.map(c => c.text)).toEqual(['јас сакам и', 'кафе'])
  })
})
