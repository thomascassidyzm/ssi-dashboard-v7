/**
 * Unit tests for the pod-switchover READINESS gate (2026-09-02).
 *
 * The failure they exist to prevent: `pod-switchover.cjs` is the only thing standing between
 * a course and a live POD promotion carrying real learner progress. Its readiness query
 * counted five things and refused on three. `no_known_audio` was counted, printed in the
 * readiness log line, and then never pushed onto `blockers`; `known_text` emptiness was not
 * counted at all. So a pod with a complete target side and a SILENT OR EMPTY KNOWN SIDE
 * passed the gate and could be promoted onto the slug the player serves.
 *
 * That hole survived because the blocker computation lived inside main() and was unreachable
 * from a test — the only export was planInflightFold. It is a pure function now, and these
 * are the tests that would have caught it: the two known-side cases below FAIL against the
 * pre-fix predicate (see the header of the report, docs/pods/known-side-gate-2026-09-02.md).
 */

import { describe, it, expect } from 'vitest'

const { readinessBlockers } = require('./pod-switchover.cjs')

/** A staged pod with nothing wrong with it: 231 rows, both sides complete on every one. */
const complete = { n: 231, no_text: 0, draft: 0, no_target_audio: 0, no_known_text: 0, no_known_audio: 0 }

describe('readinessBlockers — the known side', () => {
  it('REFUSES a pod with a complete target side and a silent known side', () => {
    const blockers = readinessBlockers({ ...complete, no_known_audio: 231 })
    expect(blockers).not.toHaveLength(0)
    expect(blockers.join(' ')).toMatch(/no known audio/)
    expect(blockers).toContain('231 staged sentences have no known audio')
  })

  it('REFUSES a pod with a complete target side and an empty known side', () => {
    const blockers = readinessBlockers({ ...complete, no_known_text: 231 })
    expect(blockers).not.toHaveLength(0)
    expect(blockers.join(' ')).toMatch(/no known text/)
    expect(blockers).toContain('231 staged sentences have no known text')
  })

  it('refuses on a PARTIAL known-side hole too — one silent row is enough', () => {
    expect(readinessBlockers({ ...complete, no_known_audio: 1 }))
      .toEqual(['1 staged sentences have no known audio'])
  })
})

describe('readinessBlockers — a complete pod still passes', () => {
  it('returns zero blockers for a pod that is complete on both sides', () => {
    expect(readinessBlockers(complete)).toEqual([])
  })

  it('is unbothered by pg returning the counts as strings', () => {
    expect(readinessBlockers({ n: '231', no_text: '0', draft: '0', no_target_audio: '0', no_known_text: '0', no_known_audio: '0' })).toEqual([])
  })

  it('tolerates a count row from before no_known_text existed (undefined, not zero)', () => {
    const { no_known_text, ...older } = complete
    expect(readinessBlockers(older)).toEqual([])
  })
})

describe('readinessBlockers — the target side still refuses, individually', () => {
  it('refuses untranslated rows', () => {
    expect(readinessBlockers({ ...complete, no_text: 7 })).toEqual(['7 staged sentences have no target text'])
  })
  it('refuses draft rows', () => {
    expect(readinessBlockers({ ...complete, draft: 108 })).toEqual(['108 staged sentences are still marked draft'])
  })
  it('refuses rows without target audio', () => {
    expect(readinessBlockers({ ...complete, no_target_audio: 4 })).toEqual(['4 staged sentences have no target audio'])
  })
  it('refuses an empty pod', () => {
    expect(readinessBlockers({ n: 0, no_text: 0, draft: 0, no_target_audio: 0, no_known_text: 0, no_known_audio: 0 }))
      .toEqual(['staged pod has no sentences'])
  })
  it('names every failure at once, target side before known side', () => {
    expect(readinessBlockers({ n: 231, no_text: 1, draft: 2, no_target_audio: 3, no_known_text: 4, no_known_audio: 5 })).toEqual([
      '1 staged sentences have no target text',
      '2 staged sentences are still marked draft',
      '3 staged sentences have no target audio',
      '4 staged sentences have no known text',
      '5 staged sentences have no known audio',
    ])
  })
})

describe('readinessBlockers — --rehearsal', () => {
  it('waives ALL FOUR content blockers, known side included', () => {
    const counts = { n: 231, no_text: 1, draft: 2, no_target_audio: 3, no_known_text: 4, no_known_audio: 5 }
    expect(readinessBlockers(counts, { rehearsal: true })).toEqual([])
  })

  it('still refuses a zero-sentence pod — that is not content readiness', () => {
    expect(readinessBlockers({ n: 0, no_text: 0, draft: 0, no_target_audio: 0, no_known_text: 0, no_known_audio: 0 }, { rehearsal: true }))
      .toEqual(['staged pod has no sentences'])
  })
})

describe('readinessBlockers — ara_sy_for_eng, the one real staged POD 1 among the 46', () => {
  it('refuses it on draft rows and missing target audio, and on nothing else', () => {
    expect(readinessBlockers({ n: 231, no_text: 0, draft: 108, no_target_audio: 4, no_known_text: 0, no_known_audio: 0 })).toEqual([
      '108 staged sentences are still marked draft',
      '4 staged sentences have no target audio',
    ])
  })
})
